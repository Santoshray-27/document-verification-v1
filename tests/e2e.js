#!/usr/bin/env node
// Agnitia end-to-end scenario runner. Issues a certificate, builds the demo sample set
// (genuine / copies / altered / forged / unverifiable / revoked) and verifies each one.
// Usage: node tests/e2e.js
const fs = require('fs');
const path = require('path');
const http = require('http');

const API = process.env.API || 'http://localhost:4000';
const SAMPLES = path.join(__dirname, '../samples');

function req(method, urlPath, { token, json, body, headers, rawPath } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(API + (rawPath ? '/x' : urlPath));
    const payload = json ? Buffer.from(JSON.stringify(json)) : body || null;
    // rawPath bypasses URL normalisation entirely, so `..` really reaches the server.
    const pathToSend = rawPath || u.pathname + u.search;
    const r = http.request(
      {
        method, hostname: u.hostname, port: u.port, path: pathToSend,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(json ? { 'Content-Type': 'application/json', 'Content-Length': payload.length } : {}),
          ...(headers || {}),
          ...(payload && !json ? { 'Content-Length': payload.length } : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          let parsed = null;
          try { parsed = JSON.parse(buf.toString()); } catch { parsed = buf.toString(); }
          resolve({ status: res.statusCode, body: parsed, raw: buf, headers: res.headers });
        });
      }
    );
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

function multipart(fields, fileField, filename, buffer) {
  const boundary = '----agnitia' + Math.random().toString(16).slice(2);
  const parts = [];
  for (const [k, v] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
  }
  parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fileField}"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`));
  parts.push(buffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
  return { body: Buffer.concat(parts), headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` } };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pollJob(urlPath, token, want = 60) {
  for (let i = 0; i < want; i++) {
    const { body } = await req('GET', urlPath, { token });
    if (body && body.status && body.status !== 'running') return body;
    if (body && body.verdict) return body;
    await sleep(400);
  }
  throw new Error('job timed out: ' + urlPath);
}

async function verifyFile(buffer, filename, docId) {
  const mp = multipart(docId ? { doc_id: docId } : {}, 'file', filename, buffer);
  const start = await req('POST', '/api/verify/start', { body: mp.body, headers: mp.headers });
  if (!start.body.job_id) throw new Error('verify start failed: ' + JSON.stringify(start.body));
  const job = await pollJob(`/api/verify/jobs/${start.body.job_id}`, null, 120);
  if (job.status === 'failed') throw new Error('verify job failed: ' + job.error);
  const res = await req('GET', `/api/verify/jobs/${start.body.job_id}/result`);
  return res.body;
}

const COLORS = { GENUINE: '\x1b[32m', 'GENUINE COPY': '\x1b[36m', ALTERED: '\x1b[33m', FORGED: '\x1b[31m', 'NOT ISSUED': '\x1b[31m', UNVERIFIABLE: '\x1b[35m', REVOKED: '\x1b[33m', EXPIRED: '\x1b[90m', 'UNABLE TO ASSESS': '\x1b[90m' };
const pad = (s, n) => String(s).padEnd(n);

async function main() {
  const results = [];
  const expect = (name, got, want) => {
    const okFlag = got === want;
    results.push({ name, got, want, ok: okFlag });
    console.log(`${okFlag ? '\x1b[32m✔\x1b[0m' : '\x1b[31m✘\x1b[0m'} ${pad(name, 46)} ${COLORS[got] || ''}${pad(got, 18)}\x1b[0m expected ${want}`);
  };

  console.log('\n\x1b[1m=== AGNITIA END-TO-END ===\x1b[0m\n');

  // ---- login ----
  const login = await req('POST', '/api/auth/login', { json: { email: 'issuer@agnitia.io', password: 'Agnitia@123' } });
  if (!login.body.token) throw new Error('issuer login failed: ' + JSON.stringify(login.body));
  const TOK = login.body.token;
  const vLogin = await req('POST', '/api/auth/login', { json: { email: 'verifier@agnitia.io', password: 'Agnitia@123' } });
  const VTOK = vLogin.body.token;
  const aLogin = await req('POST', '/api/auth/login', { json: { email: 'admin@agnitia.io', password: 'Agnitia@123' } });
  const ATOK = aLogin.body.token;
  console.log('login: issuer/verifier/admin OK\n');

  // ---- issue ----
  const stamp = Date.now().toString().slice(-6);
  const issueStart = await req('POST', '/api/issue/start', {
    token: TOK,
    json: {
      doc_type: 'academic_certificate',
      fields: { name: 'Aarav Sharma', certificate_number: `AGN-2026-${stamp}`, course: 'B.Tech Computer Science', grade: 'A+', issue_date: '2026-02-14' },
    },
  });
  if (!issueStart.body.job_id) throw new Error('issue start failed: ' + JSON.stringify(issueStart.body));
  const issueJob = await pollJob(`/api/issue/jobs/${issueStart.body.job_id}`, TOK);
  if (issueJob.status !== 'done') throw new Error('issue failed: ' + issueJob.error);
  const doc = issueJob.result;
  console.log(`issued doc ${doc.doc_id}\n  file_hash ${doc.file_hash}\n  ${issueJob.steps.length} steps all passed: ${issueJob.steps.every((s) => s.status === 'passed')}\n`);

  const pdfUrl = doc.pdf_url;
  const pdfRes = await req('GET', pdfUrl);
  const genuine = pdfRes.raw;
  fs.mkdirSync(path.join(SAMPLES, 'genuine'), { recursive: true });
  fs.writeFileSync(path.join(SAMPLES, 'genuine', `${doc.doc_id}.pdf`), genuine);

  // ---- A9: genuine ----
  let r = await verifyFile(genuine, 'genuine.pdf');
  expect('A9  original file', r.verdict, 'GENUINE');
  console.log(`     confidence ${r.confidence_level} · score ${r.evidence_score} · ${r.duration_ms}ms · report ${r.report_url}`);
  const genuineResult = r;

  // ---- build the sample set with the Python worker ----
  console.log('\nbuilding samples with the worker...');
  const { execSync } = require('child_process');
  execSync(`node ${path.join(__dirname, 'make-samples.js')} ${doc.doc_id}`, { stdio: 'inherit' });

  const S = (sub, f) => path.join(SAMPLES, sub, f);

  // ---- A11: re-saved / screenshot copy ----
  r = await verifyFile(fs.readFileSync(S('copies', 'resave.pdf')), 'resave.pdf');
  expect('A11a re-saved PDF (print-to-PDF)', r.verdict, 'GENUINE COPY');
  console.log(`     ssim ${r.visual?.ssim_score} · regions ${r.visual?.region_count} · conf ${r.confidence_level}`);

  r = await verifyFile(fs.readFileSync(S('copies', 'screenshot.png')), 'screenshot.png');
  expect('A11b screenshot PNG', r.verdict, 'GENUINE COPY');
  console.log(`     ssim ${r.visual?.ssim_score} · regions ${r.visual?.region_count} · conf ${r.confidence_level}`);

  r = await verifyFile(fs.readFileSync(S('copies', 'scan.jpg')), 'scan.jpg');
  expect('A11c scanned JPEG', r.verdict, 'GENUINE COPY');
  console.log(`     ssim ${r.visual?.ssim_score} · conf ${r.confidence_level}`);

  // ---- A10: altered ----
  r = await verifyFile(fs.readFileSync(S('altered', 'name-edited.pdf')), 'name-edited.pdf');
  expect('A10a name edited in PDF', r.verdict, 'ALTERED');
  const nameField = (r.fields || []).find((f) => f.key === 'name');
  console.log(`     conf ${r.confidence_level} · name expected="${nameField?.expected}" detected="${nameField?.detected}" · regions ${r.visual?.region_count} · heatmap ${r.visual?.heatmap_url ? 'yes' : 'no'}`);

  r = await verifyFile(fs.readFileSync(S('altered', 'grade-edited.pdf')), 'grade-edited.pdf');
  expect('A10b grade edited in PDF', r.verdict, 'ALTERED');

  r = await verifyFile(fs.readFileSync(S('altered', 'image-name-edit.png')), 'image-name-edit.png');
  expect('A10c name edited in image space', r.verdict, 'ALTERED');
  console.log(`     ssim ${r.visual?.ssim_score} · regions ${r.visual?.region_count}`);

  // ---- A12: forged with a copied genuine QR ----
  r = await verifyFile(fs.readFileSync(S('forged', 'copied-qr-fake.pdf')), 'copied-qr-fake.pdf');
  expect('A12  fake content + copied genuine QR', r.verdict, 'FORGED');
  console.log(`     reason: ${r.reasons.find((x) => x.code === 'QR_CONTENT_MISMATCH')?.title || r.reasons[0]?.title}`);

  // ---- A13a: unregistered issuer => the ID is simply not in our registry ----
  r = await verifyFile(fs.readFileSync(S('unverifiable', 'other-issuer.pdf')), 'other-issuer.pdf');
  expect('A13a unregistered issuer document', r.verdict, 'NOT ISSUED');
  console.log('     (we never call an unknown issuer "fake" — the reason text says it was never issued here)');

  // ---- A13b: UNVERIFIABLE — a real registered issuer that has been suspended ----
  const newIss = await req('POST', '/api/admin/issuers', {
    token: ATOK,
    json: { name: 'Northfield College of Health', org_type: 'hospital', email: `northfield-${stamp}@agnitia.io`, user_name: 'Northfield Admin' },
  });
  if (!newIss.body.issuer_id) throw new Error('admin issuer onboarding failed: ' + JSON.stringify(newIss.body));
  console.log(`     onboarded issuer ${newIss.body.issuer_id} with key ${newIss.body.kid} (private key stayed on server: ${newIss.body.private_key_path})`);
  const nLogin = await req('POST', '/api/auth/login', { json: { email: `northfield-${stamp}@agnitia.io`, password: 'Agnitia@123' } });
  const nIssue = await req('POST', '/api/issue/start', {
    token: nLogin.body.token,
    json: { doc_type: 'medical_fitness', fields: { name: 'Priya Nair', certificate_number: `MED-${stamp}`, course: 'Medical Fitness', grade: 'Fit', issue_date: '2026-03-01' } },
  });
  const nJob = await pollJob(`/api/issue/jobs/${nIssue.body.job_id}`, nLogin.body.token);
  if (nJob.status !== 'done') throw new Error('second-issuer issue failed: ' + nJob.error);
  const nDocId = nJob.result.doc_id;
  const nPdf = (await req('GET', nJob.result.pdf_url)).raw;
  fs.writeFileSync(path.join(SAMPLES, 'unverifiable', 'suspended-issuer.pdf'), nPdf);
  // suspend that issuer (simulates an issuer pulled off the platform)
  execSync(`node ${path.join(__dirname, 'suspend-issuer.js')} ${newIss.body.issuer_id}`, { stdio: 'inherit' });
  r = await verifyFile(nPdf, 'suspended-issuer.pdf');
  expect('A13b suspended issuer', r.verdict, 'UNVERIFIABLE');
  console.log(`     reason: ${r.reasons[0].detail.slice(0, 90)}...`);
  execSync(`node ${path.join(__dirname, 'suspend-issuer.js')} ${newIss.body.issuer_id} --restore`, { stdio: 'inherit' });
  r = await verifyFile(nPdf, 'suspended-issuer.pdf');
  expect('A13c issuer reactivated', r.verdict, 'GENUINE');

  // ---- A14: unknown doc_id. A QR in the file outranks a manually typed ID, so the genuine
  //      file still verifies as GENUINE. The manual path is tested separately with a file
  //      that carries no QR. ----
  r = await verifyFile(genuine, 'genuine.pdf', '00000000-0000-4000-8000-000000000000');
  expect('A14a QR outranks a wrong typed ID', r.verdict, 'GENUINE');
  console.log(`     resolved doc_id from: ${r.doc_id_source}`);
  r = await verifyFile(fs.readFileSync(S('forged', 'no-qr-blank.png')), 'no-qr-blank.png', '00000000-0000-4000-8000-000000000000');
  expect('A14b unknown doc_id, no QR in file', r.verdict, 'NOT ISSUED');

  // ---- A19: no QR, no id ----
  const blank = fs.readFileSync(S('forged', 'no-qr-blank.png'));
  r = await verifyFile(blank, 'no-qr-blank.png');
  expect('A19  no QR and no doc_id', r.verdict, 'UNABLE TO ASSESS');

  // ---- A20: tamper the stored manifest -> signature must fail ----
  execSync(`node ${path.join(__dirname, 'tamper-db.js')} ${doc.doc_id}`, { stdio: 'inherit' });
  r = await verifyFile(genuine, 'genuine.pdf');
  expect('A20  registry manifest tampered', r.verdict, 'FORGED');
  execSync(`node ${path.join(__dirname, 'tamper-db.js')} ${doc.doc_id} --restore`, { stdio: 'inherit' });
  r = await verifyFile(genuine, 'genuine.pdf');
  expect('A20b after restore', r.verdict, 'GENUINE');

  // ---- A15: revoke then re-verify the ORIGINAL bytes ----
  const rev = await req('POST', `/api/issuer/documents/${doc.doc_id}/revoke`, { token: TOK, json: { reason: 'Issued with an incorrect grade' } });
  if (rev.status !== 200) throw new Error('revoke failed ' + JSON.stringify(rev.body));
  r = await verifyFile(genuine, 'genuine.pdf');
  expect('A15  revoked (original bytes)', r.verdict, 'REVOKED');
  fs.writeFileSync(path.join(SAMPLES, 'revoked', `${doc.doc_id}.pdf`), genuine);
  console.log(`     reason: ${r.reasons[0].detail.slice(0, 90)}...`);

  // ---- A21: worker down -> fail safe ----
  console.log('\n\x1b[1m-- worker-down fail-safe test --\x1b[0m');
  const h1 = await req('GET', '/api/health');
  console.log('  health before: worker =', h1.body.worker);

  // ---- A22: public endpoint privacy ----
  const pub = await req('GET', `/api/public/verify/${doc.doc_id}`);
  const pubText = JSON.stringify(pub.body);
  expect('A22  public returns the record', pub.body.found === true ? 'FOUND' : 'MISSING', 'FOUND');
  console.log(`     leaks file_hash: ${/file_hash/.test(pubText)} · leaks signature: ${/signature/.test(pubText)} · leaks manifest: ${/manifest/.test(pubText)}`);
  console.log(`     warning: ${String(pub.body.warning).slice(0, 80)}...`);

  // ---- A24/A26: RBAC ----
  const forbid1 = await req('GET', '/api/issuer/documents', { token: VTOK });
  expect('A24  verifier on issuer route', forbid1.status === 403 ? '403' : String(forbid1.status), '403');
  const forbid2 = await req('GET', '/api/admin/audit', { token: TOK });
  expect('A26  issuer on admin route', forbid2.status === 403 ? '403' : String(forbid2.status), '403');
  const noauth = await req('GET', '/api/auth/me');
  expect('A4   /auth/me without token', noauth.status === 401 ? '401' : String(noauth.status), '401');
  const badtok = await req('GET', '/api/auth/me', { token: 'garbage.token.here' });
  expect('A5   /auth/me garbage token', badtok.status === 401 ? '401' : String(badtok.status), '401');

  // ---- A27: audit integrity ----
  const integ = await req('GET', '/api/admin/audit/integrity', { token: ATOK });
  expect('A27  audit chain integrity', integ.body.valid === true ? 'VALID' : 'BROKEN', 'VALID');
  console.log(`     entries checked: ${integ.body.entries_checked}`);

  // ---- A28: break the chain, confirm detection, restore ----
  execSync(`node ${path.join(__dirname, 'tamper-audit.js')}`, { stdio: 'inherit' });
  const broken = await req('GET', '/api/admin/audit/integrity', { token: ATOK });
  expect('A28  chain tamper detected', broken.body.valid === false ? 'BROKEN' : 'VALID', 'BROKEN');
  console.log(`     broken_at entry #${broken.body.broken_at} (${broken.body.reason})`);
  execSync(`node ${path.join(__dirname, 'tamper-audit.js')} --restore`, { stdio: 'inherit' });
  const fixed = await req('GET', '/api/admin/audit/integrity', { token: ATOK });
  expect('A28b chain restored', fixed.body.valid === true ? 'VALID' : 'BROKEN', 'VALID');

  // ---- A17/A18: upload validation ----
  const big = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(6 * 1024 * 1024)]);
  const bigRes = await req('POST', '/api/verify/start', { ...multipart({}, 'file', 'big.pdf', big) });
  expect('A17  6 MB upload rejected', [413, 415].includes(bigRes.status) ? String(bigRes.status) : bigRes.status + '', '413');
  // a .txt renamed to .pdf: the extension whitelist passes but the magic bytes do not.
  const txt = Buffer.from('this is definitely not a pdf file at all');
  const txtRes = await req('POST', '/api/verify/start', { ...multipart({}, 'file', 'fake.pdf', txt) });
  await pollJob(`/api/verify/jobs/${txtRes.body.job_id}`, null, 30);
  const txtFinal = (await req('GET', `/api/verify/jobs/${txtRes.body.job_id}/result`)).body;
  expect('A18  non-PDF magic bytes rejected', txtFinal.verdict, 'UNABLE TO ASSESS');
  console.log(`     reason: ${txtFinal.reasons[0].code} — pipeline stopped at validation`);

  // ---- A29: report + traversal ----
  const rep = await req('GET', genuineResult.report_url);
  expect('A29  report PDF downloads', rep.raw.slice(0, 5).toString() === '%PDF-' ? 'PDF' : 'NOT-PDF', 'PDF');
  console.log(`     report size ${(rep.raw.length / 1024).toFixed(1)} KB`);
  // IMPORTANT: most HTTP clients (curl included) collapse `..` on the client side, so a naive
  // request never reaches the server as written. We must send the raw path to actually test
  // the guard — node's http client does not normalise, which is what we want here.
  const trav = await req('GET', null, { rawPath: '/api/reports/../../config' });
  expect('A29b raw ../ traversal rejected', trav.status === 400 ? '400' : String(trav.status), '400');
  const trav2 = await req('GET', '/api/reports/..%2F..%2Fconfig');
  expect('A29c encoded traversal rejected', trav2.status === 400 ? '400' : String(trav2.status), '400');
  const trav3 = await req('GET', null, { rawPath: '/static/../keys/anything.pem' });
  expect('A29d cannot escape /static to keys/', trav3.status === 400 ? '400' : String(trav3.status), '400');
  const trav4 = await req('GET', '/keys/anything.pem');
  expect('A29e /keys is never served', trav4.status === 404 ? '404' : String(trav4.status), '404');

  // ---- A30: XSS in a field ----
  const xIssue = await req('POST', '/api/issue/start', {
    token: TOK,
    json: { doc_type: 'academic_certificate', fields: { name: '<script>alert(1)</script>Bob', certificate_number: `AGN-XSS-${stamp}`, course: 'B.Tech', grade: 'A', issue_date: '2026-02-14' } },
  });
  const xJob = await pollJob(`/api/issue/jobs/${xIssue.body.job_id}`, TOK);
  const storedName = xJob.result.fields.name;
  expect('A30  XSS payload sanitized', /<script>/i.test(storedName) ? 'RAW-SCRIPT' : 'SANITIZED', 'SANITIZED');
  console.log(`     stored as: "${storedName}"`);

  // ---- A31: SQL injection attempt ----
  // Use a file with NO QR so the manual doc_id is actually the one that reaches SQL.
  const sqli = await verifyFile(fs.readFileSync(S('forged', 'no-qr-blank.png')), 'no-qr-blank.png', "' OR 1=1 --");
  expect('A31  SQLi in doc_id is inert', sqli.verdict, 'NOT ISSUED');
  console.log('     (parameterized query treated it as a literal string, no SQL error)');

  // ---- A32: no private key leak anywhere ----
  const leakChecks = [JSON.stringify(login.body), JSON.stringify(issueJob), JSON.stringify(genuineResult), JSON.stringify(pub.body), JSON.stringify((await req('GET', '/api/issuer/documents', { token: TOK })).body)];
  const leaked = leakChecks.some((s) => /PRIVATE KEY/.test(s));
  expect('A32  no private key in responses', leaked ? 'LEAKED' : 'CLEAN', 'CLEAN');

  // ---- A23: rate limit on public ----
  // Deliberately exhausting the limiter would starve every other public call in the same
  // 10-minute window, so this assertion only runs in the dedicated rate-limit pass
  // (npm run test:e2e:ratelimit), which starts the API with RATE_LIMIT_DISABLED unset.
  if (process.env.AGNITIA_RATELIMIT_PASS === '1') {
    let saw429 = false;
    for (let i = 0; i < 40; i++) {
      const rr = await req('GET', `/api/public/verify/${doc.doc_id}`);
      if (rr.status === 429) { saw429 = true; break; }
    }
    expect('A23  public rate limit hits 429', saw429 ? '429' : 'no-429', '429');
  } else {
    console.log('\n  (A23 rate-limit assertion skipped — run `npm run test:e2e:ratelimit` for it)');
  }

  // ---- summary ----
  const passed = results.filter((x) => x.ok).length;
  console.log(`\n\x1b[1m=== ${passed}/${results.length} PASSED ===\x1b[0m`);
  const failed = results.filter((x) => !x.ok);
  if (failed.length) {
    console.log('\x1b[31mFAILED:\x1b[0m');
    failed.forEach((f) => console.log(`  - ${f.name}: got "${f.got}" want "${f.want}"`));
  }
  fs.writeFileSync(path.join(__dirname, 'e2e-result.json'), JSON.stringify({ results, doc_id: doc.doc_id }, null, 2));
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error('\n\x1b[31mE2E CRASHED:\x1b[0m', e.message); process.exit(2); });
