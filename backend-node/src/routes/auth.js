// Auth routes: login + whoami. bcrypt password check, JWT issue, LOGIN audit entry.
const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const audit = require('../services/audit.service');
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

router.get('/me', requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

module.exports = router;
