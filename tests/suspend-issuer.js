#!/usr/bin/env node
// Test helper: suspend / reactivate an issuer so we can exercise the UNVERIFIABLE verdict.
// Usage: node tests/suspend-issuer.js <issuer_id> [--restore]
const db = require('../backend-node/src/db');
const id = process.argv[2];
const restore = process.argv.includes('--restore');
if (!id) { console.error('usage: node tests/suspend-issuer.js <issuer_id> [--restore]'); process.exit(1); }
const row = db.prepare('SELECT status FROM issuers WHERE issuer_id = ?').get(id);
if (!row) { console.error('issuer not found'); process.exit(1); }
db.prepare('UPDATE issuers SET status = ? WHERE issuer_id = ?').run(restore ? 'active' : 'suspended', id);
console.log(`  issuer ${id} -> ${restore ? 'active' : 'suspended'}`);
