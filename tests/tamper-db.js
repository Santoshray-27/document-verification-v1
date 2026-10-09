#!/usr/bin/env node
// Test helper: flip one byte of a document's stored manifest (and restore it) so we can
// prove the signature check actually catches registry tampering.
// Usage: node tests/tamper-db.js <doc_id> [--restore]
const fs = require('fs');
const path = require('path');
const db = require('../backend-node/src/db');

const docId = process.argv[2];
const restore = process.argv.includes('--restore');
const backup = path.join(__dirname, '.manifest-backup.json');

if (!docId) {
  console.error('usage: node tests/tamper-db.js <doc_id> [--restore]');
  process.exit(1);
}
const row = db.prepare('SELECT manifest_json FROM documents WHERE doc_id = ?').get(docId);
if (!row) { console.error('doc not found'); process.exit(1); }

if (restore) {
  if (!fs.existsSync(backup)) { console.error('no backup to restore'); process.exit(1); }
  const b = JSON.parse(fs.readFileSync(backup, 'utf8'));
  db.prepare('UPDATE documents SET manifest_json = ? WHERE doc_id = ?').run(b.manifest, b.doc_id);
  fs.unlinkSync(backup);
  console.log('  manifest restored');
} else {
  fs.writeFileSync(backup, JSON.stringify({ doc_id: docId, manifest: row.manifest_json }));
  // flip one character inside the manifest -> signature must no longer verify
  const m = row.manifest_json;
  const idx = m.indexOf('"schema_version":"1.0"') >= 0 ? m.indexOf('1.0') : 5;
  const tampered = m.slice(0, idx) + (m[idx] === '1' ? '9' : '1') + m.slice(idx + 1);
  db.prepare('UPDATE documents SET manifest_json = ? WHERE doc_id = ?').run(tampered, docId);
  console.log('  manifest tampered (1 char flipped)');
}
