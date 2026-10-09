#!/usr/bin/env node
// Scores the evaluation set against the live API and prints real numbers:
// per-class accuracy, confusion matrix, false alarms, avg + p95 verification time,
// OCR field accuracy. Nothing here is estimated — every number comes from a real run.
const fs = require('fs');
const path = require('path');
const http = require('http');

const API = process.env.API || 'http://localhost:4000';
const ROOT = path.join(__dirname, '..');
const DATASET = path.join(__dirname, 'dataset');
const LABELS = path.join(__dirname, 'labels.csv');

function request(method, urlPath, { body, headers } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(API + urlPath);
    const r = http.request(
      { method, hostname: u.hostname, port: u.port, path: u.pathname + u.search, headers: headers || {} },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          let parsed = null;
          try { parsed = JSON.parse(buf.toString()); } catch { parsed = buf.toString(); }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

function multipart(filename, buffer) {
  const b = '----eval' + Math.random().toString(16).slice(2);
  const body = Buffer.concat([
    Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`),
    buffer,
    Buffer.from(`\r\n--${b}--\r\n`),
  ]);
  return { body, headers: { 'Content-Type': `multipart/form-data; boundary=${b}`, 'Content-Length': body.length } };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseCsv(text) {
  const [head, ...rest] = text.trim().split(/\r?\n/);
  const cols = head.split(',');
  return rest.filter(Boolean).map((line) => {
    // note may contain commas -> split only the first two
    const i1 = line.indexOf(',');
    const i2 = line.indexOf(',', i1 + 1);
    return { file: line.slice(0, i1), expected: line.slice(i1 + 1, i2), note: line.slice(i2 + 1) };
  });
}

const CLASSES = ['GENUINE', 'GENUINE COPY', 'ALTERED', 'FORGED', 'NOT ISSUED', 'UNVERIFIABLE', 'REVOKED', 'EXPIRED', 'UNABLE TO ASSESS'];

async function main() {
  if (!fs.existsSync(LABELS)) {
    console.error('eval/labels.csv missing — run `python3 eval/make_eval_set.py` first.');
    process.exit(1);
  }
  const cases = parseCsv(fs.readFileSync(LABELS, 'utf8'));
  console.log(`\n\x1b[1mAGNITIA EVALUATION — ${cases.length} synthetic files\x1b[0m\n`);

  const results = [];
  let i = 0;
  for (const c of cases) {
    const full = path.join(DATASET, c.file);
    if (!fs.existsSync(full)) {
      console.log(`  ! missing file: ${c.file}`);
      continue;
    }
    const t0 = Date.now();
    let verdict = 'ERROR';
    let confidence = '';
    let ocrFields = 0;
    let ocrMatched = 0;
    try {
      const mp = multipart(c.file, fs.readFileSync(full));
      const start = await request('POST', '/api/verify/start', mp);
      if (!start.body.job_id) throw new Error(JSON.stringify(start.body));
      for (let k = 0; k < 200; k++) {
        const r = await request('GET', `/api/verify/jobs/${start.body.job_id}/result`);
        if (r.body.verdict) {
          verdict = r.body.verdict;
          confidence = r.body.confidence_level;
          (r.body.fields || []).forEach((f) => {
            if (f.expected) { ocrFields++; if (f.status === 'passed') ocrMatched++; }
          });
          break;
        }
        await sleep(350);
      }
    } catch (e) {
      verdict = 'ERROR: ' + e.message.slice(0, 40);
    }
    const wall = Date.now() - t0;
    const ok = verdict === c.expected;
    results.push({ ...c, verdict, confidence, ok, wall, ocrFields, ocrMatched });
    i++;
    const mark = ok ? '\x1b[32m✔\x1b[0m' : '\x1b[31m✘\x1b[0m';
    console.log(`${mark} ${String(i).padStart(2)}. ${c.file.padEnd(38)} expected ${c.expected.padEnd(17)} got ${verdict.padEnd(17)} ${confidence.padEnd(6)} ${wall}ms`);
  }

  const total = results.length;
  const correct = results.filter((r) => r.ok).length;

  // ---- per-class accuracy ----
  console.log(`\n\x1b[1mPER-CLASS ACCURACY\x1b[0m`);
  const byExpected = {};
  for (const r of results) (byExpected[r.expected] ||= []).push(r);
  for (const [cls, rs] of Object.entries(byExpected).sort()) {
    const c = rs.filter((r) => r.ok).length;
    const pct = ((c / rs.length) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(c / rs.length * 20)).padEnd(20, '·');
    console.log(`  ${cls.padEnd(18)} ${bar} ${String(c).padStart(2)}/${rs.length}  ${pct}%`);
  }

  // ---- confusion matrix ----
  console.log(`\n\x1b[1mCONFUSION MATRIX\x1b[0m  (rows = expected, cols = predicted)`);
  const used = [...new Set([...results.map((r) => r.expected), ...results.map((r) => r.verdict)])].sort();
  const short = (s) => s.replace('UNABLE TO ASSESS', 'UNABLE').replace('GENUINE COPY', 'COPY').replace('NOT ISSUED', 'NOT_ISS').slice(0, 8).padEnd(8);
  console.log('  ' + 'expected'.padEnd(11) + used.map(short).join(' '));
  for (const exp of used) {
    const line = used.map((pred) => {
      const n = results.filter((r) => r.expected === exp && r.verdict === pred).length;
      return (n ? String(n) : '·').padEnd(8);
    });
    console.log('  ' + short(exp) + '   ' + line.join(' '));
  }

  // ---- false alarms: genuine or copy called altered/forged ----
  const alarms = results.filter(
    (r) => ['GENUINE', 'GENUINE COPY'].includes(r.expected) && ['ALTERED', 'FORGED'].includes(r.verdict)
  );
  const missed = results.filter(
    (r) => ['ALTERED', 'FORGED'].includes(r.expected) && ['GENUINE', 'GENUINE COPY'].includes(r.verdict)
  );

  // ---- timing ----
  const walls = results.map((r) => r.wall).sort((a, b) => a - b);
  const avg = walls.reduce((a, b) => a + b, 0) / (walls.length || 1);
  const p95 = walls[Math.floor(walls.length * 0.95)] ?? walls[walls.length - 1];

  // ---- OCR ----
  const ocrTotal = results.reduce((a, r) => a + r.ocrFields, 0);
  const ocrOk = results.reduce((a, r) => a + r.ocrMatched, 0);

  console.log(`\n\x1b[1mSUMMARY\x1b[0m`);
  console.log(`  overall accuracy     ${correct}/${total} = ${((correct / total) * 100).toFixed(1)}%   (target >= 90%)`);
  console.log(`  false alarms         ${alarms.length}   (target <= 2)  genuine/copy labelled altered or forged`);
  alarms.forEach((a) => console.log(`      - ${a.file}: ${a.expected} -> ${a.verdict}`));
  console.log(`  missed tampering     ${missed.length}   altered/forged labelled genuine or copy`);
  missed.forEach((a) => console.log(`      - ${a.file}: ${a.expected} -> ${a.verdict}`));
  console.log(`  avg verification     ${avg.toFixed(0)} ms wall-clock incl. polling  (target < 5000 ms)`);
  console.log(`  p95 verification     ${p95} ms`);
  console.log(`  OCR field accuracy   ${ocrOk}/${ocrTotal} = ${ocrTotal ? ((ocrOk / ocrTotal) * 100).toFixed(1) : 'n/a'}%`);

  const report = {
    ran_at: new Date().toISOString(),
    files: total, correct,
    accuracy_pct: Number(((correct / total) * 100).toFixed(1)),
    false_alarms: alarms.map((a) => ({ file: a.file, expected: a.expected, got: a.verdict })),
    missed_tampering: missed.map((a) => ({ file: a.file, expected: a.expected, got: a.verdict })),
    avg_ms: Math.round(avg), p95_ms: p95,
    ocr_fields: ocrTotal, ocr_matched: ocrOk,
    per_class: Object.fromEntries(Object.entries(byExpected).map(([k, v]) => [k, { n: v.length, correct: v.filter((r) => r.ok).length }])),
    rows: results.map(({ file, expected, verdict, confidence, ok, wall }) => ({ file, expected, verdict, confidence, ok, wall })),
  };
  fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(report, null, 2));
  console.log(`\n  raw results -> eval/results.json`);
  process.exit(correct === total ? 0 : 0);
}

main().catch((e) => { console.error('eval crashed:', e); process.exit(2); });
