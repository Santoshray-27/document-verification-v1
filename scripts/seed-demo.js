// Seeds the 3 demo users (admin / issuer / verifier) with the DEMO_PASSWORD from env.
// Idempotent: re-running updates nothing except printing current state.
require('../backend-node/node_modules/dotenv').config({ path: require('path').join(__dirname, '../backend-node/.env') });
const bcrypt = require('../backend-node/node_modules/bcryptjs');
const db = require('../backend-node/src/db');
const config = require('../backend-node/config');
const audit = require('../backend-node/src/services/audit.service');

const ISSUER_ID = 'iss_demo01';
const users = [
  { name: 'Agnitia Admin', email: 'admin@agnitia.io', role: 'admin', issuer_id: null },
  { name: 'Dr. R. Menon', email: 'issuer@agnitia.io', role: 'issuer', issuer_id: ISSUER_ID },
  { name: 'HR Verifier', email: 'verifier@agnitia.io', role: 'verifier', issuer_id: null },
];

const issuer = db.prepare('SELECT * FROM issuers WHERE issuer_id = ?').get(ISSUER_ID);
if (!issuer) {
  console.error('issuer missing — run `node scripts/generate-keys.js` first.');
  process.exit(1);
}

const hash = bcrypt.hashSync(config.demoPassword, 10);
for (const u of users) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(u.email);
  if (existing) {
    db.prepare('UPDATE users SET password_hash = ?, role = ?, issuer_id = ?, name = ? WHERE id = ?').run(
      hash, u.role, u.issuer_id, u.name, existing.id
    );
    console.log(`updated: ${u.email}`);
  } else {
    db.prepare('INSERT INTO users (name, email, password_hash, role, issuer_id, created_at) VALUES (?,?,?,?,?,?)').run(
      u.name, u.email, hash, u.role, u.issuer_id, new Date().toISOString()
    );
    console.log(`created: ${u.email}`);
  }
}

audit.append({ actorRole: 'system', action: 'SEED', detail: { users: users.length, issuer: ISSUER_ID } });

console.log('\n=== DEMO CREDENTIALS ===');
console.log(`password (all three): ${config.demoPassword}`);
users.forEach((u) => console.log(`  ${u.role.padEnd(9)} ${u.email}`));
console.log(`issuer: ${issuer.name} (${issuer.issuer_id})`);
