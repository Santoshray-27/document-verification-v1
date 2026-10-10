// Verification pipeline (Section 8 of the spec). Node orchestrates, the Python worker only
// supplies forensic data, and verdict.engine decides. Fails safe when the worker is down.
const fs = require('fs');
const path = require('path');
const db = require('../db');
const config = require('../../config');
const cryptoSvc = require('./crypto.service');
const worker = require('./worker.client');
const jobs = require('../jobs');
const audit = require('./audit.service');
const engine = require('./verdict.engine');
const reportSvc = require('./report.service');
const llmSvc = require('./llm.service');
const semanticEngine = require('./semantic.engine');
const { sanitizeText } = require('./sanitize');

const STEPS = [
  { id: 'upload', label: 'Upload received' },
  { id: 'validate', label: 'Validating file type and size' },
  { id: 'hash', label: 'Computing SHA-256' },
  { id: 'qr_extract', label: 'Extracting QR code' },
  { id: 'registry_lookup', label: 'Looking up the registry' },
  { id: 'signature_verify', label: 'Verifying digital signature' },
  { id: 'status_check', label: 'Checking revocation / expiry' },
  { id: 'hash_compare', label: 'Comparing file hash' },
  { id: 'ocr_fields', label: 'Reading key fields (OCR)' },
  { id: 'qr_content', label: 'Checking QR / content consistency' },
  { id: 'metadata', label: 'Inspecting metadata' },
  { id: 'visual_diff', label: 'Visual difference analysis' },
  { id: 'semantic_checks', label: 'Semantic consistency checks' },
  { id: 'verdict', label: 'Composing verdict' },
  { id: 'ai_explanation', label: 'Generating AI explanation' },
  { id: 'report', label: 'Generating report' },
];

const MAGIC = [
  { kind: 'PDF', ext: 'pdf', test: (b) => b.length > 4 && b.subarray(0, 5).toString('latin1') === '%PDF-' },
  { kind: 'JPEG', ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { kind: 'PNG', ext: 'png', test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
];

function detectKind(buf) {
  return MAGIC.find((m) => m.test(buf)) || null;
}

function startVerifyJob({ buffer, originalName, manualDocId = null, verifier = null }) {
  const jobId = jobs.newJob('verify', verifier?.id ?? null, STEPS);
  runVerify(jobId, { buffer, originalName, manualDocId, verifier }).catch((e) => {
    jobs.fail(jobId, e.message || 'Verification failed', 'validate');
  });
  return jobId;
}

async function runVerify(jobId, { buffer, originalName, manualDocId, verifier }) {
  const t0 = Date.now();

  // 1. upload
  jobs.start(jobId, 'upload', `${originalName || 'file'} · ${(buffer.length / 1024).toFixed(1)} KB`);
  jobs.finish(jobId, 'upload', 'passed', `${originalName || 'file'} received · ${(buffer.length / 1024).toFixed(1)} KB`);

  // 2. validate magic bytes + size
  jobs.start(jobId, 'validate', 'Checking magic bytes and size');
  const kind = detectKind(buffer);
  const maxBytes = config.maxUploadMb * 1024 * 1024;
  if (buffer.length > maxBytes) {
    const msg = `File is ${(buffer.length / 1048576).toFixed(1)} MB — the limit is ${config.maxUploadMb} MB`;
    jobs.finish(jobId, 'validate', 'failed', msg);
    return finishWith(jobId, { verdict: engine.V.UNABLE, confidence_level: 'Low', evidence_score: 0, checks: [], reasons: [{ code: 'FILE_TOO_LARGE', title: 'File too large', detail: msg, severity: 'error' }] }, { fileValid: false, durationMs: Date.now() - t0, verifier, docId: null, fileHash: null, originalName });
  }
  if (!kind) {
    const msg = 'Not a valid PDF, PNG or JPEG (magic bytes did not match)';
    jobs.finish(jobId, 'validate', 'failed', msg);
    return finishWith(jobId, { verdict: engine.V.UNABLE, confidence_level: 'Low', evidence_score: 0, checks: [], reasons: [{ code: 'UNSUPPORTED_FILE_TYPE', title: 'Unsupported file type', detail: msg, severity: 'error' }] }, { fileValid: false, durationMs: Date.now() - t0, verifier, docId: null, fileHash: null, originalName });
  }
  jobs.finish(jobId, 'validate', 'passed', `${kind.kind} confirmed by magic bytes`);

  // 3. hash
  jobs.start(jobId, 'hash', 'SHA-256 over the exact uploaded bytes');
  const fileHash = cryptoSvc.sha256Hex(buffer);
  jobs.finish(jobId, 'hash', 'passed', `${fileHash.slice(0, 16)}…${fileHash.slice(-8)}`, { sha256: fileHash });

  // 4. worker analysis (QR + OCR + metadata) — degrades to unavailable
  const healthState = await worker.health();
  const workerAvailable = healthState.ok;
  let analysis = null;
  if (workerAvailable) {
    jobs.start(jobId, 'qr_extract', 'Scanning for a verification QR');
    try {
      analysis = await worker.analyze(buffer, originalName || `upload.${kind.ext}`);
      const qr = analysis.qr || { found: false };
      jobs.finish(jobId, 'qr_extract', qr.found ? 'passed' : 'warning',
        qr.found ? `QR found → ${qr.doc_id || qr.raw_text}` : 'No QR code detected in this file', qr);
    } catch (e) {
      jobs.finish(jobId, 'qr_extract', 'warning', `QR extraction failed: ${e.message}`);
    }
  } else {
    jobs.finish(jobId, 'qr_extract', 'skipped', 'Forensic worker offline — QR scan unavailable');
  }

  // 5. resolve doc_id
  const qrDocId = analysis?.qr?.doc_id || null;
  const docId = qrDocId || (manualDocId ? sanitizeText(manualDocId, 'doc_id') : null);
  const docIdSource = qrDocId ? 'qr' : manualDocId ? 'manual' : null;

  // 6. registry lookup (needed before signature/status/hash steps)
  let record = null;
  let issuer = null;
  let key = null;
  if (docId) {
    record = db.prepare('SELECT * FROM documents WHERE doc_id = ?').get(docId) || null;
    if (record) {
      issuer = db.prepare('SELECT * FROM issuers WHERE issuer_id = ?').get(record.issuer_id) || null;
      key = db.prepare('SELECT * FROM issuer_keys WHERE kid = ?').get(record.kid) || null;
    }
  }

  // 7. signature
  let signatureValid = null;
  if (record && key) {
    signatureValid = cryptoSvc.verifySignature(record.manifest_json, record.signature, key.public_key_pem);
  }

  // 8. status
  const now = Date.now();
  const revoked = !!record && record.status === 'revoked';
  const expired = !!record && !revoked && record.expires_at && Date.parse(record.expires_at) < now;

  // 9. hash compare
  const hashMatch = record ? cryptoSvc.safeEqual(fileHash, record.file_hash) : null;

  // 10. forensic layer — only worth running when the bytes differ
  let ocr = null;
  let metadata = analysis?.metadata || null;
  let diff = null;
  const needForensics = !!record && hashMatch === false && !revoked && !expired;

  if (analysis?.ocr) {
    ocr = {
      fields: analysis.ocr.fields || {},
      avg_confidence: analysis.ocr.avg_confidence || 0,
      text: (analysis.ocr.text || '').slice(0, 2000),
    };
  }

  if (needForensics && workerAvailable) {
    let snapB64 = null;
    let resolvedSnapPath = null;

    // Check primary record snapshot_path
    if (record.snapshot_path && fs.existsSync(record.snapshot_path)) {
      resolvedSnapPath = record.snapshot_path;
    } else {
      // Check relative storageDir fallback
      const fallbackSnapPath = path.join(config.storageDir, 'snapshots', `${record.doc_id}.png`);
      if (fs.existsSync(fallbackSnapPath)) {
        resolvedSnapPath = fallbackSnapPath;
      }
    }

    if (resolvedSnapPath) {
      try {
        snapB64 = fs.readFileSync(resolvedSnapPath).toString('base64');
      } catch (err) {
        snapB64 = null;
      }
    }

    // If snapshot file doesn't exist on disk (common in ephemeral/cloud environments),
    // dynamically regenerate the original certificate snapshot from registered fields and issuer
    if (!snapB64 && record.fields_json) {
      try {
        const regFields = JSON.parse(record.fields_json);
        const issuedTime = record.issued_at || new Date().toISOString();
        const genRes = await worker.renderCertificate({
          fields: regFields,
          doc_id: record.doc_id,
          qr_text: `https://evidentia.vercel.app/verify/${record.doc_id}`,
          issuer_name: issuer?.name || 'PIEMR',
          issued_at: issuedTime,
          doc_type: record.doc_type || 'academic_certificate',
        });
        if (genRes && genRes.snapshot_png_base64) {
          snapB64 = genRes.snapshot_png_base64;
          // Cache it for subsequent requests
          const snapSavePath = path.join(config.storageDir, 'snapshots', `${record.doc_id}.png`);
          fs.mkdirSync(path.dirname(snapSavePath), { recursive: true });
          fs.writeFileSync(snapSavePath, Buffer.from(snapB64, 'base64'));
          try {
            db.prepare('UPDATE documents SET snapshot_path = ? WHERE doc_id = ?').run(snapSavePath, record.doc_id);
          } catch {}
        }
      } catch (genErr) {
        // Regeneration fallback failed
      }
    }

    if (snapB64) {
      jobs.start(jobId, 'visual_diff', 'Aligning pages and computing SSIM');
      try {
        const d = await worker.diffCheck(buffer, originalName || `upload.${kind.ext}`, snapB64);
        if (d && d.ok) {
          diff = d;
          if (d.heatmap_png_base64) {
            const heatmapsDir = path.join(config.storageDir, 'heatmaps');
            fs.mkdirSync(heatmapsDir, { recursive: true });
            const heatPath = path.join(heatmapsDir, `${fileHash.slice(0, 24)}.png`);
            fs.writeFileSync(heatPath, Buffer.from(d.heatmap_png_base64, 'base64'));
            diff.heatmap_url = `/static/heatmaps/${path.basename(heatPath)}`;
          }
          if (d.combined_png_base64) {
            const heatmapsDir = path.join(config.storageDir, 'heatmaps');
            fs.mkdirSync(heatmapsDir, { recursive: true });
            const combPath = path.join(heatmapsDir, `${fileHash.slice(0, 24)}_combined.png`);
            fs.writeFileSync(combPath, Buffer.from(d.combined_png_base64, 'base64'));
            diff.combined_url = `/static/heatmaps/${path.basename(combPath)}`;
          }
        } else {
          jobs.finish(jobId, 'visual_diff', 'warning', d?.error || 'Visual comparison unavailable');
        }
      } catch (e) {
        jobs.finish(jobId, 'visual_diff', 'warning', `Visual comparison failed: ${e.message}`);
      }
    }
  }

  // registry fields for the OCR comparison
  let registryFields = {};
  if (record) {
    try {
      const f = JSON.parse(record.fields_json);
      registryFields = { ...f, issuer_name: issuer?.name, doc_id: record.doc_id };
    } catch {
      registryFields = {};
    }
  }

  jobs.start(jobId, 'semantic_checks', 'Checking semantic consistency');
  const semantic_findings = semanticEngine.checkSemantics(registryFields, analysis?.ocr?.fields || {});
  jobs.finish(jobId, 'semantic_checks', semantic_findings.length > 0 ? (semantic_findings.some(f => f.severity === 'ERROR') ? 'failed' : 'warning') : 'passed', `Generated ${semantic_findings.length} semantic finding(s)`);

  // 11. verdict (deterministic)
  jobs.start(jobId, 'verdict', 'Applying the rule engine');
  const decision = engine.decide({
    fileValid: true, fileKind: kind.kind, fileSizeKb: (buffer.length / 1024).toFixed(1),
    fileHash, docId, docIdSource, record, issuer, key,
    signatureValid, hashMatch, revoked, expired, workerAvailable,
    qr: analysis?.qr || null, ocr, diff, metadata, registryFields,
  });
  jobs.finish(jobId, 'verdict', decision.verdict === engine.V.GENUINE || decision.verdict === engine.V.GENUINE_COPY ? 'passed' : decision.verdict === engine.V.UNABLE ? 'warning' : 'failed',
    `${decision.verdict} · confidence ${decision.confidence_level}`);

  // 12. persist + report
  jobs.start(jobId, 'report', 'Writing the verification record');
  const durationMs = Date.now() - t0;
  const saved = persist({
    docId: record?.doc_id || docId || null, verifier, fileHash, decision,
    ocr, metadata, diff, durationMs,
  });
  let reportUrl = null;
  try {
    reportUrl = await reportSvc.generate({ verificationId: saved.id, decision, record, issuer, ocr, metadata, diff, fileHash, durationMs });
    db.prepare('UPDATE verifications SET report_path = ? WHERE id = ?').run(reportUrl.path, saved.id);
    jobs.finish(jobId, 'report', 'passed', 'Verification report ready');
  } catch (e) {
    jobs.finish(jobId, 'report', 'warning', `Report generation failed: ${e.message}`);
  }

  audit.append({
    actorId: verifier?.id ?? null, actorRole: verifier?.role ?? 'anonymous', action: 'VERIFY',
    docId: record?.doc_id || docId || null,
    detail: { verdict: decision.verdict, confidence: decision.confidence_level, uploaded_file_hash: fileHash },
  });

  const result = {
    verification_id: saved.id,
    doc_id: record?.doc_id || docId || null,
    doc_id_source: docIdSource,
    issuer_name: issuer?.name || null,
    doc_type: record?.doc_type || null,
    issued_at: record?.issued_at || null,
    verdict: decision.verdict,
    confidence_level: decision.confidence_level,
    evidence_score: decision.evidence_score,
    checks: decision.checks,
    reasons: decision.reasons,
    uploaded_file_hash: fileHash,
    expected_file_hash: record?.file_hash || null,
    hash_match: hashMatch,
    signature_valid: signatureValid,
    fields: decision.checks.find((c) => c.id === 'ocr_fields')?.detail?.fields || [],
    registry_fields: record ? registryFields : null,
    ocr_confidence: ocr?.avg_confidence ?? null,
    visual: diff ? { ssim_score: diff.ssim_score, region_count: diff.region_count, regions: diff.changed_regions, heatmap_url: diff.heatmap_url, combined_url: diff.combined_url } : null,
    semantic_findings: semantic_findings,
    metadata: metadata || null,
    worker_available: workerAvailable,
    report_url: reportUrl ? `/api/reports/${saved.id}` : null,
    duration_ms: durationMs,
    created_at: saved.created_at,
  };
  
  try {
    jobs.start(jobId, 'ai_explanation', 'Generating AI explanation');
    result.ai_explanation = await llmSvc.generateExplanation(result);
    jobs.finish(jobId, 'ai_explanation', 'passed', 'AI explanation generated');
  } catch (err) {
    result.ai_explanation = "AI explanation unavailable; deterministic verification is unaffected.";
    jobs.finish(jobId, 'ai_explanation', 'warning', 'AI explanation unavailable');
  }

  jobs.done(jobId, result);
  return result;
}

function persist({ docId, verifier, fileHash, decision, ocr, metadata, diff, durationMs }) {
  const created = new Date().toISOString();
  const info = db.prepare(
    `INSERT INTO verifications (doc_id, verifier_id, uploaded_file_hash, verdict, confidence_level,
       evidence_score, checks_json, reasons_json, ocr_json, metadata_json, heatmap_path, duration_ms, created_at)
     VALUES (@doc_id,@verifier_id,@uploaded_file_hash,@verdict,@confidence_level,
       @evidence_score,@checks_json,@reasons_json,@ocr_json,@metadata_json,@heatmap_path,@duration_ms,@created_at)`
  ).run({
    doc_id: docId, verifier_id: verifier?.id ?? null, uploaded_file_hash: fileHash,
    verdict: decision.verdict, confidence_level: decision.confidence_level,
    evidence_score: decision.evidence_score,
    checks_json: JSON.stringify(decision.checks), reasons_json: JSON.stringify(decision.reasons),
    ocr_json: ocr ? JSON.stringify(ocr) : null, metadata_json: metadata ? JSON.stringify(metadata) : null,
    heatmap_path: null, duration_ms: durationMs, created_at: created,
  });
  return db.prepare('SELECT * FROM verifications WHERE id = ?').get(info.lastInsertRowid);
}

function finishWith(jobId, decision, meta) {
  const saved = persist({
    docId: meta.docId, verifier: meta.verifier, fileHash: meta.fileHash,
    decision, ocr: null, metadata: null, diff: null, durationMs: meta.durationMs,
  });
  audit.append({
    actorId: meta.verifier?.id ?? null, actorRole: meta.verifier?.role ?? 'anonymous', action: 'VERIFY',
    docId: meta.docId, detail: { verdict: decision.verdict, rejected_at: 'validation' },
  });
  jobs.done(jobId, {
    verification_id: saved.id, doc_id: meta.docId, verdict: decision.verdict,
    confidence_level: decision.confidence_level, evidence_score: decision.evidence_score,
    checks: decision.checks, reasons: decision.reasons, uploaded_file_hash: meta.fileHash,
    expected_file_hash: null, hash_match: null, signature_valid: null, fields: [],
    registry_fields: null, ocr_confidence: null, visual: null, semantic_findings: [], metadata: null,
    worker_available: null, report_url: null, duration_ms: meta.durationMs, created_at: saved.created_at,
  });
}

function getVerification(id) {
  return db.prepare('SELECT * FROM verifications WHERE id = ?').get(id) || null;
}

module.exports = { startVerifyJob, detectKind, STEPS, getVerification };
