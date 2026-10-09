// Agnitia API — the "brain". Auth, registry, crypto, verdict, audit, reports.
// The Python worker is called internally; clients never talk to it directly.
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const config = require('./config');
require('./src/db'); // ensures schema exists on boot

const worker = require('./src/services/worker.client');
const { notFound, errorHandler } = require('./src/middleware/errorHandler');

const app = express();
app.set('trust proxy', 1); // needed for correct rate-limit keys behind ngrok

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));

// Reject any request whose path still contains traversal segments. Express usually
// normalises `..` away, but the SPA fallback would otherwise answer such a URL with
// index.html (HTTP 200), which is a confusing way to handle an attack.
app.use((req, res, next) => {
  if (req.path.includes('..')) {
    return res.status(400).json({ error: { code: 'BAD_PATH', message: 'Invalid path' } });
  }
  next();
});
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // curl / same-origin / server-to-server
    const host = origin.replace(/^https?:\/\//, '').split('/')[0];
    const allowed = config.allowedOrigins.some((o) => o.replace(/^https?:\/\//, '').split('/')[0] === host)
      || /ngrok-free\.app$|trycloudflare\.com$/.test(host); // demo tunnels
    return allowed ? cb(null, true) : cb(new Error(`Origin ${origin} is not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Never let a private key path be served, whatever route comes later.
app.use((req, res, next) => {
  if (req.path.includes('/keys/') || req.path.endsWith('.pem')) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
  }
  next();
});

// static artifacts (issued PDFs, snapshots, heatmaps). Filenames are random hashes.
app.use('/static', express.static(config.storageDir, {
  index: false, dotfiles: 'deny', maxAge: '1h',
  setHeaders(res) { res.setHeader('X-Content-Type-Options', 'nosniff'); },
}));

app.get('/api/health', async (_req, res) => {
  const h = await worker.health(true);
  res.json({
    ok: true, node: true, worker: h.ok,
    worker_services: h.ok ? h.services : null,
    version: '1.0.0', time: new Date().toISOString(),
  });
});

// The issuer router is mounted twice (once per prefix) so its role guard only applies to
// issuer routes. Mounting it at /api would run requireRole('issuer') on EVERY /api/* request.
const issuerRouter = require('./src/routes/issuer');
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/issue', issuerRouter);   // POST /api/issue/start, GET /api/issue/jobs/:jobId
app.use('/api/issuer', issuerRouter);  // GET /api/issuer/documents, /dashboard, POST .../revoke
app.use('/api/verify', require('./src/routes/verify'));
app.use('/api/public', require('./src/routes/public'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/reports', require('./src/routes/report'));

// ---- serve the built frontend (single origin for the demo: one port, one QR URL) ----
// In dev you would use the Vite server instead; this makes the deployed/demo build work.
const DIST = path.resolve(__dirname, '../frontend-react/dist');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST, { index: false, maxAge: '1h' }));
  // SPA fallback for non-API routes
  app.get(/^\/(?!api\/|static\/).*/, (_req, res) => res.sendFile(path.join(DIST, 'index.html')));
}

app.use('/api', notFound);
app.use(errorHandler);

if (require.main === module) {
  for (const d of ['issued', 'uploaded', 'snapshots', 'heatmaps', 'reports']) {
    fs.mkdirSync(path.join(config.storageDir, d), { recursive: true });
  }
  app.listen(config.port, '0.0.0.0', async () => {
    console.log(`Agnitia API  → http://0.0.0.0:${config.port}`);
    console.log(`Public base  → ${config.publicBaseUrl} (this URL goes inside the QR)`);
    const h = await worker.health(true);
    console.log(`Python worker→ ${h.ok ? 'ONLINE ' + JSON.stringify(h.services) : 'OFFLINE (crypto verification still works)'}`);
  });
}

module.exports = app;
