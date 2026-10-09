// JWT auth + role guards. Every protected route checks the role server-side.
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../../config');

function sign(user) {
  return jwt.sign({ sub: user.id, role: user.role, issuer_id: user.issuer_id }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

function readToken(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

/** Required auth: 401 without a valid token. */
function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'A login token is required' } });
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = db.prepare('SELECT id, name, email, role, issuer_id FROM users WHERE id = ?').get(payload.sub);
    if (!user) return res.status(401).json({ error: { code: 'USER_GONE', message: 'Account no longer exists' } });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired' } });
  }
}

/** Optional auth: attaches req.user when a valid token is present, never blocks. */
function optionalAuth(req, _res, next) {
  const token = readToken(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = db.prepare('SELECT id, name, email, role, issuer_id FROM users WHERE id = ?').get(payload.sub) || null;
  } catch {
    req.user = null;
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'A login token is required' } });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: `This action requires role: ${roles.join(' or ')}` } });
    }
    next();
  };
}

module.exports = { sign, requireAuth, optionalAuth, requireRole };
