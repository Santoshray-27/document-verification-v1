#!/usr/bin/env node
// Test helper: rewrite one audit entry's detail_json (and restore it) to prove the
// hash chain detects tampering. Usage: node tests/tamper-audit.js [--restore]
const fs = require('fs');
const path = require('path');
const db = require('../backend-node/src/db');

const restore = process.argv.includes('--restore');
const backup = path.join(__dirname, '.audit-backup.json');

if (restore) {
  if (!fs.existsSync(backup)) { console.error('no backup'); process.exit(1); }
  const b = JSON.parse(fs.readFileSync(backup, 'utf8'));
  db.prepare('UPDATE audit_log SET detail_json = ? WHERE id = ?').run(b.detail_json, b.id);
  fs.unlinkSync(backup);
  console.log('  audit entry restored');
} else {
  const row = db.prepare('SELECT id, detail_json FROM audit_log ORDER BY id DESC LIMIT 1 OFFSET 2').get()
    || db.prepare('SELECT id, detail_json FROM audit_log ORDER BY id ASC LIMIT 1').get();
  if (!row) { console.error('audit log empty'); process.exit(1); }
  fs.writeFileSync(backup, JSON.stringify(row));
  db.prepare('UPDATE audit_log SET detail_json = ? WHERE id = ?').run('{"tampered":true}', row.id);
  console.log(`  audit entry #${row.id} detail_json rewritten (hash chain NOT recomputed)`);
}
