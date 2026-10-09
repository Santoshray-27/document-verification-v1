// Agnitia SQLite layer — schema, connection, pragmas. Parameterized statements only.
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const config = require('../config');

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
const db = new Database(config.dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS issuers (
  issuer_id   TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  org_type    TEXT NOT NULL DEFAULT 'university',
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS issuer_keys (
  kid              TEXT PRIMARY KEY,
  issuer_id        TEXT NOT NULL REFERENCES issuers(issuer_id),
  public_key_pem   TEXT NOT NULL,
  private_key_path TEXT NOT NULL,
  algorithm        TEXT NOT NULL DEFAULT 'ECDSA-P256-SHA256',
  status           TEXT NOT NULL DEFAULT 'active',
  created_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin','issuer','verifier')),
  issuer_id     TEXT REFERENCES issuers(issuer_id),
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  doc_id        TEXT PRIMARY KEY,
  issuer_id     TEXT NOT NULL REFERENCES issuers(issuer_id),
  kid           TEXT NOT NULL REFERENCES issuer_keys(kid),
  doc_type      TEXT NOT NULL DEFAULT 'academic_certificate',
  fields_json   TEXT NOT NULL,
  fields_hash   TEXT NOT NULL,
  file_hash     TEXT NOT NULL,
  manifest_json TEXT NOT NULL,
  signature     TEXT NOT NULL,
  issued_at     TEXT NOT NULL,
  expires_at    TEXT,
  status        TEXT NOT NULL DEFAULT 'active',
  revoke_reason TEXT,
  revoked_at    TEXT,
  pdf_path      TEXT NOT NULL,
  snapshot_path TEXT,
  created_by    INTEGER,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS verifications (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_id             TEXT,
  verifier_id        INTEGER,
  uploaded_file_hash TEXT,
  verdict            TEXT NOT NULL,
  confidence_level   TEXT NOT NULL CHECK (confidence_level IN ('High','Medium','Low')),
  evidence_score     INTEGER NOT NULL DEFAULT 0,
  checks_json        TEXT NOT NULL,
  reasons_json       TEXT NOT NULL,
  ocr_json           TEXT,
  metadata_json      TEXT,
  heatmap_path       TEXT,
  report_path        TEXT,
  duration_ms        INTEGER,
  created_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id    INTEGER,
  actor_role  TEXT,
  action      TEXT NOT NULL,
  doc_id      TEXT,
  detail_json TEXT NOT NULL,
  time        TEXT NOT NULL,
  prev_hash   TEXT NOT NULL,
  entry_hash  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_issuer  ON documents(issuer_id);
CREATE INDEX IF NOT EXISTS idx_documents_status  ON documents(status);
CREATE INDEX IF NOT EXISTS idx_verifications_doc ON verifications(doc_id);
CREATE INDEX IF NOT EXISTS idx_audit_doc         ON audit_log(doc_id);

CREATE TABLE IF NOT EXISTS templates (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  doc_type       TEXT NOT NULL,
  category       TEXT NOT NULL,
  description    TEXT,
  fields_json    TEXT NOT NULL,
  required_json  TEXT NOT NULL,
  org_types_json TEXT NOT NULL,
  tags_json      TEXT NOT NULL,
  is_system      INTEGER NOT NULL DEFAULT 1,
  issuer_id      TEXT REFERENCES issuers(issuer_id),
  version        INTEGER NOT NULL DEFAULT 1,
  status         TEXT NOT NULL DEFAULT 'published',
  background_id  TEXT,
  page_size      TEXT NOT NULL DEFAULT 'A4',
  orientation    TEXT NOT NULL DEFAULT 'portrait',
  layout_config_json TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_templates_org ON templates(org_types_json);
CREATE INDEX IF NOT EXISTS idx_templates_issuer ON templates(issuer_id);

CREATE TABLE IF NOT EXISTS issuer_branding (
  issuer_id         TEXT PRIMARY KEY REFERENCES issuers(issuer_id),
  primary_color     TEXT NOT NULL DEFAULT '#0A1F44',
  accent_color      TEXT NOT NULL DEFAULT '#C9A227',
  primary_logo_id   TEXT,
  event_logo_id     TEXT,
  signatory_id      TEXT,
  seal_id           TEXT,
  sponsor_ids_json  TEXT NOT NULL DEFAULT '[]',
  updated_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS branding_assets (
  id          TEXT PRIMARY KEY,
  issuer_id   TEXT NOT NULL REFERENCES issuers(issuer_id),
  asset_type  TEXT NOT NULL CHECK (asset_type IN ('primary_logo', 'event_logo', 'partner_logo', 'sponsor_logo', 'signatory', 'seal')),
  filename    TEXT NOT NULL,
  mime_type   TEXT NOT NULL,
  file_size   INTEGER NOT NULL,
  display_name TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_branding_assets_issuer ON branding_assets(issuer_id);

CREATE TABLE IF NOT EXISTS template_assets (
  id           TEXT PRIMARY KEY,
  issuer_id    TEXT NOT NULL REFERENCES issuers(issuer_id),
  asset_type   TEXT NOT NULL CHECK (asset_type IN ('background', 'element')),
  filename     TEXT NOT NULL,
  mime_type    TEXT NOT NULL,
  file_size    INTEGER NOT NULL,
  display_name TEXT NOT NULL,
  width        INTEGER,
  height       INTEGER,
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_template_assets_issuer ON template_assets(issuer_id);

CREATE TABLE IF NOT EXISTS batch_jobs (
  id               TEXT PRIMARY KEY,
  issuer_id        TEXT NOT NULL REFERENCES issuers(issuer_id),
  template_id      TEXT NOT NULL REFERENCES templates(id),
  template_version INTEGER NOT NULL DEFAULT 1,
  total_rows       INTEGER NOT NULL DEFAULT 0,
  pending_rows     INTEGER NOT NULL DEFAULT 0,
  running_rows     INTEGER NOT NULL DEFAULT 0,
  succeeded_rows   INTEGER NOT NULL DEFAULT 0,
  failed_rows      INTEGER NOT NULL DEFAULT 0,
  skipped_rows     INTEGER NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'processing', 'completed', 'failed', 'cancelled')),
  mapping_json     TEXT NOT NULL DEFAULT '{}',
  policy_json      TEXT NOT NULL DEFAULT '{}',
  created_by       INTEGER,
  created_at       TEXT NOT NULL,
  started_at       TEXT,
  completed_at     TEXT,
  error_message    TEXT
);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_issuer ON batch_jobs(issuer_id);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON batch_jobs(status);

CREATE TABLE IF NOT EXISTS batch_rows (
  id               TEXT PRIMARY KEY,
  batch_id         TEXT NOT NULL REFERENCES batch_jobs(id) ON DELETE CASCADE,
  row_number       INTEGER NOT NULL,
  raw_data_json    TEXT NOT NULL,
  mapped_data_json TEXT NOT NULL DEFAULT '{}',
  validation_status TEXT NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid', 'duplicate')),
  validation_errors_json TEXT NOT NULL DEFAULT '[]',
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'succeeded', 'failed', 'skipped')),
  doc_id           TEXT REFERENCES documents(doc_id),
  idempotency_key  TEXT,
  error_message    TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT
);
CREATE INDEX IF NOT EXISTS idx_batch_rows_batch ON batch_rows(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_rows_idemp ON batch_rows(idempotency_key);
`;

function migrate() {
  db.exec(SCHEMA);

  // Backward-compatible migrations for existing databases
  const tableCols = (table) => db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  const tplCols = new Set(tableCols('templates'));
  if (!tplCols.has('version')) db.exec("ALTER TABLE templates ADD COLUMN version INTEGER NOT NULL DEFAULT 1");
  if (!tplCols.has('status')) db.exec("ALTER TABLE templates ADD COLUMN status TEXT NOT NULL DEFAULT 'published'");
  if (!tplCols.has('background_id')) db.exec("ALTER TABLE templates ADD COLUMN background_id TEXT");
  if (!tplCols.has('page_size')) db.exec("ALTER TABLE templates ADD COLUMN page_size TEXT NOT NULL DEFAULT 'A4'");
  if (!tplCols.has('orientation')) db.exec("ALTER TABLE templates ADD COLUMN orientation TEXT NOT NULL DEFAULT 'portrait'");
  if (!tplCols.has('layout_config_json')) db.exec("ALTER TABLE templates ADD COLUMN layout_config_json TEXT");
  if (!tplCols.has('updated_at')) db.exec("ALTER TABLE templates ADD COLUMN updated_at TEXT");
}

migrate();

module.exports = db;
module.exports.migrate = migrate;
module.exports.tableNames = () =>
  db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((r) => r.name);
