// Agnitia SQLite layer — schema, connection, pragmas. Parameterized statements only.
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const config = require('../config');

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
const db = new Database(config.dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

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
`;

function migrate() {
  db.exec(SCHEMA);
}

migrate();

module.exports = db;
module.exports.migrate = migrate;
module.exports.tableNames = () =>
  db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((r) => r.name);
