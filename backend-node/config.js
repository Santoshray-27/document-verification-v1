// Agnitia backend configuration — everything env-driven, safe defaults for local demo.
require('dotenv').config();
const path = require('path');

const ROOT = __dirname;
const num = (v, d) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? d : Number(v));

module.exports = {
  port: num(process.env.PORT, 4000),
  env: process.env.NODE_ENV || 'development',
  dbPath: path.resolve(ROOT, process.env.DB_PATH || './agnitia.db'),
  databaseUrl: process.env.DATABASE_URL,
  useSupabase: process.env.USE_SUPABASE === 'true',
  jwtSecret: process.env.JWT_SECRET || 'agnitia-dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  keysDir: path.resolve(ROOT, process.env.KEYS_DIR || '../keys'),
  storageDir: path.resolve(ROOT, process.env.STORAGE_DIR || './storage'),
  pythonWorkerUrl: process.env.PYTHON_WORKER_URL || 'http://127.0.0.1:8001',
  workerTimeoutMs: num(process.env.WORKER_TIMEOUT_MS, 20000),
  // URL embedded inside the QR code. MUST be publicly reachable for phone scanning.
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || 'http://localhost:5173').replace(/\/$/, ''),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  maxUploadMb: num(process.env.MAX_UPLOAD_MB, 5),
  rateLimitPublicWindowMs: num(process.env.RATE_LIMIT_PUBLIC_WINDOW_MS, 600000),
  rateLimitPublicMax: num(process.env.RATE_LIMIT_PUBLIC_MAX, 30),
  demoPassword: process.env.DEMO_PASSWORD || 'Agnitia@123',
  schemaVersion: '1.0',
};
