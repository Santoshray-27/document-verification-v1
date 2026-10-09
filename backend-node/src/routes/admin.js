// Admin routes: audit log + integrity check + issuer onboarding.
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const config = require('../../config');
const audit = require('../services/audit.service');
const cryptoSvc = require('../services/crypto.service');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

router.get('/audit', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const rows = audit.list({
    limit, offset,
    docId: req.query.doc_id ? String(req.query.doc_id).slice(0, 64) : null,
    action: req.query.action ? String(req.query.action).slice(0, 32).toUpperCase() : null,
  });
  const total = db.prepare('SELECT COUNT(*) n FROM audit_log').get().n;
  res.json({
    ok: true, total, limit, offset,
    entries: rows.map((r) => ({ ...r, detail: safeJson(r.detail_json) })),
  });
});

router.get('/audit/integrity', (req, res) => {
  const result = audit.verifyChain();
  audit.append({
    actorId: req.user.id, actorRole: req.user.role, action: 'INTEGRITY_CHECK',
    detail: { valid: result.valid, entries_checked: result.entries_checked, broken_at: result.broken_at },
  });
  res.json({ ok: true, ...result });
});

router.get('/issuers', (_req, res) => {
  const rows = db.prepare(
    `SELECT i.issuer_id, i.name, i.org_type, i.status, i.created_at,
            (SELECT COUNT(*) FROM documents d WHERE d.issuer_id = i.issuer_id) AS documents,
            (SELECT kid FROM issuer_keys k WHERE k.issuer_id = i.issuer_id AND k.status='active' ORDER BY k.created_at DESC LIMIT 1) AS active_kid
     FROM issuers i ORDER BY i.created_at DESC`
  ).all();
  res.json({ ok: true, issuers: rows });
});

/** Onboard an issuer: create issuer + ECDSA key pair + issuer login user. */
router.post('/issuers', (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim().slice(0, 100);
    const orgType = String(req.body?.org_type || 'university').slice(0, 24);
    const email = String(req.body?.email || '').trim().toLowerCase();
    const userName = String(req.body?.user_name || name).slice(0, 80);
    if (!name || !email) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name and email are required' } });
    if (db.prepare('SELECT id FROM users WHERE lower(email) = ?').get(email)) {
      return res.status(409).json({ error: { code: 'EMAIL_TAKEN', message: 'That email is already registered' } });
    }

    const issuerId = cryptoSvc.newId('iss');
    const now = new Date().toISOString();
    db.prepare('INSERT INTO issuers (issuer_id, name, org_type, status, created_at) VALUES (?,?,?,?,?)')
      .run(issuerId, name, orgType, 'active', now);

    const kid = cryptoSvc.newId('key');
    const { publicKeyPem, privatePath } = cryptoSvc.generateKeyPair(kid);
    db.prepare(`INSERT INTO issuer_keys (kid, issuer_id, public_key_pem, private_key_path, algorithm, status, created_at)
                VALUES (?,?,?,?,?,?,?)`)
      .run(kid, issuerId, publicKeyPem, `../keys/${kid}.pem`, cryptoSvc.ALGORITHM, 'active', now);

    const password = String(req.body?.password || config.demoPassword);
    db.prepare('INSERT INTO users (name, email, password_hash, role, issuer_id, created_at) VALUES (?,?,?,?,?,?)')
      .run(userName, email, bcrypt.hashSync(password, 10), 'issuer', issuerId, now);

    audit.append({ actorId: req.user.id, actorRole: req.user.role, action: 'ISSUER_CREATE', detail: { issuer_id: issuerId, kid, email } });
    audit.append({ actorId: req.user.id, actorRole: req.user.role, action: 'KEY_GENERATE', detail: { issuer_id: issuerId, kid } });

    res.status(201).json({
      ok: true, issuer_id: issuerId, kid, email,
      public_key_pem: publicKeyPem,
      private_key_path: `keys/${kid}.pem`,
      note: 'The private key stays on the server. It is never returned by any API and never sent to a client.',
    });
  } catch (e) { next(e); }
});

function safeJson(s) { try { return JSON.parse(s); } catch { return {}; } }

module.exports = router;
