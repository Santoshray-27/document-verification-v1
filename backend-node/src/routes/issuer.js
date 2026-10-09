// Issuer routes. Every query is scoped to the caller's own issuer_id (server-side RBAC).
const express = require('express');
const db = require('../db');
const jobs = require('../jobs');
const audit = require('../services/audit.service');
const issueSvc = require('../services/issue.service');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('issuer'));

/** Issuers may only ever touch their own documents. */
function ownDoc(req, res) {
  const doc = db.prepare('SELECT * FROM documents WHERE doc_id = ? AND issuer_id = ?').get(req.params.docId, req.user.issuer_id);
  if (!doc) {
    res.status(404).json({ error: { code: 'DOC_NOT_FOUND', message: 'No such document under your issuer account' } });
    return null;
  }
  return doc;
}

router.post('/start', (req, res, next) => {
  try {
    const { fields, doc_type: docType, expires_at: expiresAt } = req.body || {};
    const jobId = issueSvc.startIssueJob({ user: req.user, fields, docType, expiresAt });
    res.json({ ok: true, job_id: jobId });
  } catch (e) {
    if (e.code === 'VALIDATION_ERROR') return res.status(400).json({ error: { code: e.code, message: e.message } });
    next(e);
  }
});

router.get('/jobs/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: { code: 'JOB_NOT_FOUND', message: 'Unknown or expired job' } });
  if (job.type !== 'issue') return res.status(404).json({ error: { code: 'JOB_NOT_FOUND', message: 'Not an issue job' } });
  res.json(job);
});

router.get('/documents', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 25, 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const status = ['active', 'revoked', 'expired'].includes(req.query.status) ? req.query.status : null;
  const search = String(req.query.search || '').trim().slice(0, 60);

  const where = ['issuer_id = @issuer_id'];
  const params = { issuer_id: req.user.issuer_id, limit, offset };
  if (status) { where.push('status = @status'); params.status = status; }
  if (search) { where.push('(fields_json LIKE @search OR doc_id LIKE @search)'); params.search = `%${search}%`; }

  const rows = db.prepare(
    `SELECT doc_id, doc_type, fields_json, fields_hash, file_hash, issued_at, expires_at, status,
            revoke_reason, revoked_at, kid
     FROM documents WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT @limit OFFSET @offset`
  ).all(params);
  const total = db.prepare(`SELECT COUNT(*) n FROM documents WHERE ${where.join(' AND ')}`).get(params).n;

  res.json({
    ok: true, total, limit, offset,
    documents: rows.map((r) => ({ ...r, fields: safeJson(r.fields_json) })),
  });
});

router.get('/documents/:docId', (req, res) => {
  const doc = ownDoc(req, res);
  if (!doc) return;
  const issuer = db.prepare('SELECT issuer_id, name FROM issuers WHERE issuer_id = ?').get(doc.issuer_id);
  res.json({
    ok: true,
    document: {
      doc_id: doc.doc_id, issuer, kid: doc.kid, doc_type: doc.doc_type,
      fields: safeJson(doc.fields_json), fields_hash: doc.fields_hash, file_hash: doc.file_hash,
      manifest: safeJson(doc.manifest_json), signature_preview: `${doc.signature.slice(0, 24)}…`,
      issued_at: doc.issued_at, expires_at: doc.expires_at, status: doc.status,
      revoke_reason: doc.revoke_reason, revoked_at: doc.revoked_at,
      pdf_url: `/static/issued/${doc.doc_id}.pdf`,
      snapshot_url: `/static/snapshots/${doc.doc_id}.png`,
      verifications: db.prepare('SELECT COUNT(*) n FROM verifications WHERE doc_id = ?').get(doc.doc_id).n,
    },
  });
});

router.post('/documents/:docId/revoke', (req, res) => {
  const doc = ownDoc(req, res);
  if (!doc) return;
  if (doc.status === 'revoked') {
    return res.status(409).json({ error: { code: 'ALREADY_REVOKED', message: 'This document is already revoked' } });
  }
  const reason = String(req.body?.reason || '').trim().slice(0, 200);
  if (!reason) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'A revocation reason is required' } });
  const now = new Date().toISOString();
  db.prepare("UPDATE documents SET status='revoked', revoke_reason=?, revoked_at=? WHERE doc_id=?").run(reason, now, doc.doc_id);
  audit.append({ actorId: req.user.id, actorRole: req.user.role, action: 'REVOKE', docId: doc.doc_id, detail: { reason } });
  res.json({ ok: true, doc_id: doc.doc_id, status: 'revoked', revoked_at: now, revoke_reason: reason });
});

router.get('/dashboard', (req, res) => {
  const issuerId = req.user.issuer_id;
  const counts = db.prepare(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active,
       SUM(CASE WHEN status='revoked' THEN 1 ELSE 0 END) AS revoked,
       SUM(CASE WHEN expires_at IS NOT NULL AND expires_at < datetime('now') THEN 1 ELSE 0 END) AS expired
     FROM documents WHERE issuer_id = ?`
  ).get(issuerId);
  const verifications = db.prepare(
    `SELECT COUNT(*) n FROM verifications WHERE doc_id IN (SELECT doc_id FROM documents WHERE issuer_id = ?)`
  ).get(issuerId).n;
  const byVerdict = db.prepare(
    `SELECT verdict, COUNT(*) n FROM verifications
     WHERE doc_id IN (SELECT doc_id FROM documents WHERE issuer_id = ?) GROUP BY verdict ORDER BY n DESC`
  ).all(issuerId);
  const recent = db.prepare(
    `SELECT doc_id, fields_json, status, issued_at FROM documents WHERE issuer_id = ? ORDER BY created_at DESC LIMIT 6`
  ).all(issuerId).map((r) => ({ ...r, fields: safeJson(r.fields_json) }));
  const issuer = db.prepare('SELECT issuer_id, name, org_type, status FROM issuers WHERE issuer_id = ?').get(issuerId);

  res.json({
    ok: true, issuer,
    stats: { total: counts.total || 0, active: counts.active || 0, revoked: counts.revoked || 0, expired: counts.expired || 0, verifications },
    by_verdict: byVerdict, recent,
  });
});

function safeJson(s) {
  try { return JSON.parse(s); } catch { return {}; }
}

module.exports = router;
