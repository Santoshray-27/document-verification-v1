// Public routes — NO auth. Minimal data only, rate limited (anti-enumeration).
const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const config = require('../../config');
const verificationSvc = require('../services/verification.service');
const worker = require('../services/worker.client');
const { upload } = require('../middleware/upload');

const router = express.Router();

const publicLimiter = rateLimit({
  windowMs: config.rateLimitPublicWindowMs,
  max: config.rateLimitPublicMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many public lookups from this address — slow down a little' } },
});

// Kill switch for the automated suite only (see RATE_LIMIT_DISABLED in .env).
if (String(process.env.RATE_LIMIT_DISABLED || '').toLowerCase() !== 'true') {
  router.use(publicLimiter);
} else {
  console.warn('[agnitia] public rate limiting DISABLED via RATE_LIMIT_DISABLED — test mode only');
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Minimal public record. Deliberately excludes: file_hash, signature, manifest,
 * full fields_json, pdf path, snapshot path.
 */
router.get('/verify/:docId', (req, res) => {
  const docId = String(req.params.docId || '').trim();
  if (!UUID_RE.test(docId)) {
    return res.status(400).json({ error: { code: 'BAD_DOC_ID', message: 'That is not a valid document ID format' } });
  }
  const doc = db.prepare('SELECT doc_id, doc_type, issued_at, expires_at, status, issuer_id FROM documents WHERE doc_id = ?').get(docId);
  if (!doc) {
    return res.status(404).json({
      ok: true, found: false, doc_id: docId,
      message: 'No registry record exists for this document ID. It was never issued by a registered issuer, or the ID has been fabricated.',
      warning: 'A QR record could not be found. Upload the file to run a full verification.',
    });
  }
  const issuer = db.prepare('SELECT name, org_type, status FROM issuers WHERE issuer_id = ?').get(doc.issuer_id);
  const expired = doc.expires_at && Date.parse(doc.expires_at) < Date.now();
  res.json({
    ok: true,
    found: true,
    doc_id: doc.doc_id,
    doc_type: doc.doc_type,
    issuer_name: issuer?.name || 'Registered issuer',
    issuer_status: issuer?.status || 'unknown',
    issued_at: doc.issued_at,
    expires_at: doc.expires_at,
    status: doc.status === 'revoked' ? 'revoked' : expired ? 'expired' : 'active',
    message:
      doc.status === 'revoked'
        ? 'This document has been REVOKED by its issuer. Do not accept it.'
        : expired
        ? 'This document has EXPIRED. It was genuinely issued but is no longer valid.'
        : 'A registry record was found for this document ID.',
    warning:
      'A QR record was found. This does NOT prove the file or paper you hold is unchanged — it only proves a record exists. Upload the file for exact verification.',
    verification_count: db.prepare('SELECT COUNT(*) n FROM verifications WHERE doc_id = ?').get(doc.doc_id).n,
  });
});

/** Decode a QR from an uploaded image/PDF so a phone-less user can still use "scan". */
router.post('/extract-qr', (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    if (err) return next(err);
    if (!req.file) return res.status(400).json({ error: { code: 'NO_FILE', message: 'Attach an image or PDF containing the QR' } });
    const h = await worker.health();
    if (!h.ok) {
      return res.status(503).json({ error: { code: 'WORKER_OFFLINE', message: 'QR decoding is temporarily unavailable — enter the document ID instead' } });
    }
    try {
      const out = await worker.extractQr(req.file.buffer, req.file.originalname || 'qr');
      res.json({ ok: true, found: !!out.found, doc_id: out.doc_id || null, raw_text: out.raw_text || null });
    } catch (e) {
      res.status(502).json({ error: { code: 'QR_FAILED', message: `QR decoding failed: ${e.message}` } });
    }
  });
});

/** Directory of registered issuers */
router.get('/issuers', (req, res) => {
  try {
    const issuers = db.prepare(`
      SELECT issuer_id, name, org_type, status, created_at,
             (SELECT COUNT(*) FROM documents d WHERE d.issuer_id = issuers.issuer_id) as doc_count
      FROM issuers
      WHERE status != 'suspended'
      ORDER BY name ASC
    `).all();
    res.json({ ok: true, issuers });
  } catch (e) {
    res.status(500).json({ error: { code: 'DB_ERROR', message: e.message } });
  }
});

module.exports = router;
