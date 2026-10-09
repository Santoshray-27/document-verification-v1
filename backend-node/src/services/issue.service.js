// Issue flow coordinator (Section 7 of the spec, locked order):
// fields -> doc_id -> QR url -> render PDF (worker) -> sha256(final bytes) -> sign manifest -> registry -> audit
const fs = require('fs');
const path = require('path');
const db = require('../db');
const config = require('../../config');
const cryptoSvc = require('./crypto.service');
const worker = require('./worker.client');
const jobs = require('../jobs');
const audit = require('./audit.service');
const { sanitizeText } = require('./sanitize');

const STEPS = [
  { id: 'validate_fields', label: 'Validating fields' },
  { id: 'generate_id', label: 'Generating document UUID' },
  { id: 'create_qr', label: 'Creating verification QR' },
  { id: 'render_pdf', label: 'Rendering certificate PDF' },
  { id: 'compute_hash', label: 'Computing SHA-256 of final bytes' },
  { id: 'sign_manifest', label: 'Signing manifest (ECDSA P-256)' },
  { id: 'save_registry', label: 'Saving to signed registry' },
  { id: 'audit_log', label: 'Appending audit entry' },
  { id: 'ready', label: 'Document ready' },
];

const REQUIRED = ['name', 'certificate_number', 'course', 'grade', 'issue_date'];

function validate(fields) {
  const errors = [];
  if (!fields || typeof fields !== 'object') return ['fields must be an object'];
  for (const k of REQUIRED) {
    const v = fields[k];
    if (v === undefined || v === null || String(v).trim() === '') errors.push(`${k} is required`);
    else if (String(v).length > 120) errors.push(`${k} is too long (max 120)`);
  }
  if (fields.issue_date && !/^\d{4}-\d{2}-\d{2}$/.test(String(fields.issue_date))) errors.push('issue_date must be YYYY-MM-DD');
  if (fields.expires_at && !/^\d{4}-\d{2}-\d{2}$/.test(String(fields.expires_at).slice(0, 10))) errors.push('expires_at must be YYYY-MM-DD');
  return errors;
}

function startIssueJob({ user, fields, docType = 'academic_certificate', expiresAt = null, templateId = null }) {
  const errors = validate(fields);
  if (errors.length) {
    const err = new Error(errors.join('; '));
    err.code = 'VALIDATION_ERROR';
    err.status = 400;
    throw err;
  }
  const jobId = jobs.newJob('issue', user.id, STEPS);
  runIssue(jobId, { user, fields, docType, expiresAt, templateId }).catch((e) => jobs.fail(jobId, e.message, 'render_pdf'));
  return jobId;
}

async function runIssue(jobId, { user, fields, docType, expiresAt, templateId }) {
  // 1. validate + sanitize
  jobs.start(jobId, 'validate_fields', 'Checking required fields');
  const clean = {};
  for (const [k, v] of Object.entries(fields)) clean[k] = sanitizeText(v, k);
  const issuer = db.prepare('SELECT * FROM issuers WHERE issuer_id = ?').get(user.issuer_id);
  if (!issuer) throw new Error('Issuer account is not linked to a registered issuer');
  if (issuer.status !== 'active') throw new Error(`Issuer is ${issuer.status}`);
  const key = db
    .prepare("SELECT * FROM issuer_keys WHERE issuer_id = ? AND status='active' ORDER BY created_at DESC LIMIT 1")
    .get(issuer.issuer_id);
  if (!key) throw new Error('Issuer has no active signing key');
  jobs.finish(jobId, 'validate_fields', 'passed', `${REQUIRED.length} fields valid · issuer "${issuer.name}"`);

  // 2. doc_id
  jobs.start(jobId, 'generate_id', 'Creating a random UUID v4');
  const docId = cryptoSvc.uuid();
  jobs.finish(jobId, 'generate_id', 'passed', `doc_id ${docId}`);

  // 3. QR url — contains ONLY the verification link (the file hash cannot be inside the PDF)
  jobs.start(jobId, 'create_qr', 'Building the public verification URL');
  const qrText = `${config.publicBaseUrl}/public/verify/${docId}`;
  jobs.finish(jobId, 'create_qr', 'passed', qrText.replace(/^https?:\/\//, ''));

  // 4. render PDF via the Python worker
  jobs.start(jobId, 'render_pdf', 'Calling the document worker');
  const issuedAt = new Date().toISOString();
  const brandingSvc = require('./branding.service');
  const brandingPayload = brandingSvc.buildBrandingPayloadForIssuer(issuer.issuer_id);

  let customLayout = null;
  if (templateId) {
    const tplSvc = require('./template.service');
    const tpl = tplSvc.getTemplateById(templateId);
    if (tpl && (tpl.is_system === 1 || tpl.issuer_id === issuer.issuer_id)) {
      let bgBase64 = null;
      if (tpl.background_id) {
        const bgFile = tplSvc.getBackgroundAsset(tpl.background_id, issuer.issuer_id);
        if (bgFile) bgBase64 = bgFile.buffer.toString('base64');
      }
      let fieldsConfig = null;
      if (tpl.layout_config_json) {
        try { fieldsConfig = JSON.parse(tpl.layout_config_json)?.fields || null; } catch {}
      }
      if (bgBase64 || fieldsConfig) {
        customLayout = {
          background_base64: bgBase64,
          fields: fieldsConfig
        };
      }
    }
  }

  const rendered = await worker.renderCertificate({
    fields: clean, doc_id: docId, qr_text: qrText,
    issuer_name: issuer.name, issued_at: issuedAt, doc_type: docType,
    branding: brandingPayload,
    custom_layout: customLayout,
  });
  const pdfBytes = Buffer.from(rendered.pdf_base64, 'base64');
  const snapshotBytes = Buffer.from(rendered.snapshot_png_base64, 'base64');
  const pdfPath = path.join(config.storageDir, 'issued', `${docId}.pdf`);
  const snapPath = path.join(config.storageDir, 'snapshots', `${docId}.png`);
  fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
  fs.writeFileSync(pdfPath, pdfBytes);
  fs.writeFileSync(snapPath, snapshotBytes);
  jobs.finish(jobId, 'render_pdf', 'passed', `${(pdfBytes.length / 1024).toFixed(1)} KB · QR embedded`);

  // 5. hash the FINAL bytes
  jobs.start(jobId, 'compute_hash', 'Hashing the exact file that will be distributed');
  const fileHash = cryptoSvc.sha256Hex(pdfBytes);
  const fieldsHash = cryptoSvc.hashFields(clean, docId, issuer.name);
  jobs.finish(jobId, 'compute_hash', 'passed', `file ${fileHash.slice(0, 16)}… · fields ${fieldsHash.slice(0, 16)}…`,
    { file_hash: fileHash, fields_hash: fieldsHash });

  // 6. sign the manifest
  jobs.start(jobId, 'sign_manifest', `Signing with ${key.kid}`);
  const manifest = cryptoSvc.buildManifest({
    docId, issuerId: issuer.issuer_id, kid: key.kid, fieldsHash, fileHash,
    issuedAt, expiresAt: expiresAt ? `${expiresAt}T23:59:59.000Z` : null,
  });
  const signature = cryptoSvc.signManifest(manifest, key.kid);
  if (!cryptoSvc.verifySignature(manifest, signature, key.public_key_pem)) throw new Error('Self-verification of the new signature failed');
  jobs.finish(jobId, 'sign_manifest', 'passed', `ECDSA P-256 signature created and self-verified`);

  // 7. registry insert
  jobs.start(jobId, 'save_registry', 'Writing the signed record');
  db.prepare(
    `INSERT INTO documents (doc_id, issuer_id, kid, doc_type, fields_json, fields_hash, file_hash,
       manifest_json, signature, issued_at, expires_at, status, pdf_path, snapshot_path, created_by, created_at)
     VALUES (@doc_id,@issuer_id,@kid,@doc_type,@fields_json,@fields_hash,@file_hash,
       @manifest_json,@signature,@issued_at,@expires_at,'active',@pdf_path,@snapshot_path,@created_by,@created_at)`
  ).run({
    doc_id: docId, issuer_id: issuer.issuer_id, kid: key.kid, doc_type: docType,
    fields_json: cryptoSvc.canonicalize(clean), fields_hash: fieldsHash, file_hash: fileHash,
    manifest_json: manifest, signature, issued_at: issuedAt,
    expires_at: expiresAt ? `${expiresAt}T23:59:59.000Z` : null,
    pdf_path: pdfPath, snapshot_path: snapPath, created_by: user.id, created_at: issuedAt,
  });
  jobs.finish(jobId, 'save_registry', 'passed', 'Record stored in the signed registry');

  // 8. audit
  jobs.start(jobId, 'audit_log', 'Appending to the tamper-evident log');
  const entry = audit.append({
    actorId: user.id, actorRole: user.role, action: 'ISSUE', docId,
    detail: { issuer_id: issuer.issuer_id, kid: key.kid, file_hash: fileHash, doc_type: docType },
  });
  jobs.finish(jobId, 'audit_log', 'passed', `entry #${entry.id} · ${entry.entry_hash.slice(0, 16)}…`);

  // 9. ready
  jobs.start(jobId, 'ready', 'Packaging the result');
  const result = {
    doc_id: docId,
    issuer_name: issuer.name,
    fields: clean,
    file_hash: fileHash,
    fields_hash: fieldsHash,
    kid: key.kid,
    signature_preview: `${signature.slice(0, 24)}…`,
    issued_at: issuedAt,
    expires_at: expiresAt ? `${expiresAt}T23:59:59.000Z` : null,
    pdf_url: `/static/issued/${docId}.pdf`,
    snapshot_url: `/static/snapshots/${docId}.png`,
    verify_url: qrText,
    qr_svg: null,
    audit_entry_id: entry.id,
  };
  jobs.finish(jobId, 'ready', 'passed', 'Certificate issued and signed');
  jobs.done(jobId, result);
  return result;
}

/**
 * Direct issuance function for batch processing or programmatic issuance without creating an SSE job.
 * Runs the exact same validation, worker rendering, hashing, signing, registry insert, and audit logging.
 */
async function issueDocumentSingle({ user, fields, docType = 'academic_certificate', expiresAt = null, templateId = null }) {
  const errors = validate(fields);
  if (errors.length) {
    const err = new Error(errors.join('; '));
    err.code = 'VALIDATION_ERROR';
    err.status = 400;
    throw err;
  }

  const clean = {};
  for (const [k, v] of Object.entries(fields)) clean[k] = sanitizeText(v, k);
  const issuer = db.prepare('SELECT * FROM issuers WHERE issuer_id = ?').get(user.issuer_id);
  if (!issuer) throw new Error('Issuer account is not linked to a registered issuer');
  if (issuer.status !== 'active') throw new Error(`Issuer is ${issuer.status}`);
  const key = db
    .prepare("SELECT * FROM issuer_keys WHERE issuer_id = ? AND status='active' ORDER BY created_at DESC LIMIT 1")
    .get(issuer.issuer_id);
  if (!key) throw new Error('Issuer has no active signing key');

  const docId = cryptoSvc.uuid();
  const qrText = `${config.publicBaseUrl}/public/verify/${docId}`;
  const issuedAt = new Date().toISOString();

  const brandingSvc = require('./branding.service');
  const brandingPayload = brandingSvc.buildBrandingPayloadForIssuer(issuer.issuer_id);

  let customLayout = null;
  if (templateId) {
    const tplSvc = require('./template.service');
    const tpl = tplSvc.getTemplateById(templateId);
    if (tpl && (tpl.is_system === 1 || tpl.issuer_id === issuer.issuer_id)) {
      let bgBase64 = null;
      if (tpl.background_id) {
        const bgFile = tplSvc.getBackgroundAsset(tpl.background_id, issuer.issuer_id);
        if (bgFile) bgBase64 = bgFile.buffer.toString('base64');
      }
      let fieldsConfig = null;
      if (tpl.layout_config_json) {
        try { fieldsConfig = JSON.parse(tpl.layout_config_json)?.fields || null; } catch {}
      }
      if (bgBase64 || fieldsConfig) {
        customLayout = {
          background_base64: bgBase64,
          fields: fieldsConfig
        };
      }
    }
  }

  const rendered = await worker.renderCertificate({
    fields: clean, doc_id: docId, qr_text: qrText,
    issuer_name: issuer.name, issued_at: issuedAt, doc_type: docType,
    branding: brandingPayload,
    custom_layout: customLayout,
  });
  const pdfBytes = Buffer.from(rendered.pdf_base64, 'base64');
  const snapshotBytes = Buffer.from(rendered.snapshot_png_base64, 'base64');
  const pdfPath = path.join(config.storageDir, 'issued', `${docId}.pdf`);
  const snapPath = path.join(config.storageDir, 'snapshots', `${docId}.png`);
  fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
  fs.writeFileSync(pdfPath, pdfBytes);
  fs.writeFileSync(snapPath, snapshotBytes);

  const fileHash = cryptoSvc.sha256Hex(pdfBytes);
  const fieldsHash = cryptoSvc.hashFields(clean, docId, issuer.name);

  const manifest = cryptoSvc.buildManifest({
    docId, issuerId: issuer.issuer_id, kid: key.kid, fieldsHash, fileHash,
    issuedAt, expiresAt: expiresAt ? `${expiresAt}T23:59:59.000Z` : null,
  });
  const signature = cryptoSvc.signManifest(manifest, key.kid);
  if (!cryptoSvc.verifySignature(manifest, signature, key.public_key_pem)) {
    throw new Error('Self-verification of the new signature failed');
  }

  db.prepare(
    `INSERT INTO documents (doc_id, issuer_id, kid, doc_type, fields_json, fields_hash, file_hash,
       manifest_json, signature, issued_at, expires_at, status, pdf_path, snapshot_path, created_by, created_at)
     VALUES (@doc_id,@issuer_id,@kid,@doc_type,@fields_json,@fields_hash,@file_hash,
       @manifest_json,@signature,@issued_at,@expires_at,'active',@pdf_path,@snapshot_path,@created_by,@created_at)`
  ).run({
    doc_id: docId, issuer_id: issuer.issuer_id, kid: key.kid, doc_type: docType,
    fields_json: cryptoSvc.canonicalize(clean), fields_hash: fieldsHash, file_hash: fileHash,
    manifest_json: manifest, signature, issued_at: issuedAt,
    expires_at: expiresAt ? `${expiresAt}T23:59:59.000Z` : null,
    pdf_path: pdfPath, snapshot_path: snapPath, created_by: user.id, created_at: issuedAt,
  });

  const entry = audit.append({
    actorId: user.id, actorRole: user.role, action: 'ISSUE', docId,
    detail: { issuer_id: issuer.issuer_id, kid: key.kid, file_hash: fileHash, doc_type: docType, batch: true },
  });

  return {
    doc_id: docId,
    issuer_name: issuer.name,
    fields: clean,
    file_hash: fileHash,
    fields_hash: fieldsHash,
    kid: key.kid,
    signature_preview: `${signature.slice(0, 24)}…`,
    issued_at: issuedAt,
    expires_at: expiresAt ? `${expiresAt}T23:59:59.000Z` : null,
    pdf_path: pdfPath,
    pdf_url: `/static/issued/${docId}.pdf`,
    snapshot_url: `/static/snapshots/${docId}.png`,
    verify_url: qrText,
    audit_entry_id: entry.id,
  };
}

module.exports = { startIssueJob, runIssue, issueDocumentSingle, validate, STEPS };
