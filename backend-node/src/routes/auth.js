// Auth routes: login + whoami. bcrypt password check, JWT issue, LOGIN audit entry.
const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const audit = require('../services/audit.service');
const cryptoSvc = require('../services/crypto.service');
const path = require('path');
const { sign, requireAuth } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many login attempts — try again in a minute' } },
});

router.post('/login', loginLimiter, (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'email and password are required' } });
  }
  const user = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(email);
  // constant-ish behaviour whether or not the user exists
  const hash = user ? user.password_hash : '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const ok = bcrypt.compareSync(password, hash);
  if (!user || !ok) {
    audit.append({ actorRole: 'anonymous', action: 'LOGIN_FAILED', detail: { email } });
    return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' } });
  }
  const token = sign(user);
  audit.append({ actorId: user.id, actorRole: user.role, action: 'LOGIN', detail: { email: user.email } });
  res.json({
    ok: true,
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, issuer_id: user.issuer_id },
  });
});

router.post('/register', loginLimiter, (req, res) => {
  const { name, email, password, org_type = 'university' } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Name, email, and password are required' } });
  }
  const cleanEmail = String(email).trim().toLowerCase();
  
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existing) {
    return res.status(400).json({ error: { code: 'EMAIL_IN_USE', message: 'Email is already in use' } });
  }

  try {
    const issuerId = cryptoSvc.newId('iss');
    const kid = cryptoSvc.newId('key');
    const hash = bcrypt.hashSync(String(password), 10);
    const now = new Date().toISOString();

    db.transaction(() => {
      db.prepare('INSERT INTO issuers (issuer_id, name, org_type, status, created_at) VALUES (?,?,?,?,?)')
        .run(issuerId, String(name).trim(), String(org_type).trim(), 'active', now);

      const { publicKeyPem, privatePath } = cryptoSvc.generateKeyPair(kid);
      db.prepare('INSERT INTO issuer_keys (kid, issuer_id, public_key_pem, private_key_path, algorithm, status, created_at) VALUES (?,?,?,?,?,?,?)')
        .run(kid, issuerId, publicKeyPem, path.relative(path.resolve(__dirname, '..', '..'), privatePath), cryptoSvc.ALGORITHM, 'active', now);

      db.prepare('INSERT INTO users (name, email, password_hash, role, issuer_id, created_at) VALUES (?,?,?,?,?,?)')
        .run(String(name).trim(), cleanEmail, hash, 'issuer', issuerId, now);
    })();
    
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
    const token = sign(user);
    audit.append({ actorId: user.id, actorRole: user.role, action: 'REGISTER', detail: { email: user.email, issuerId } });
    
    res.json({
      ok: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, issuer_id: user.issuer_id },
    });
  } catch (e) {
    res.status(500).json({ error: { code: 'REGISTER_ERROR', message: e.message } });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

module.exports = router;
