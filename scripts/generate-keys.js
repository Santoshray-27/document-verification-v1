// Generates an ECDSA P-256 key pair for the demo issuer and registers it in issuer_keys.
// Private key -> keys/<kid>.pem (chmod 600, git-ignored). Public key -> DB.
require('../backend-node/node_modules/dotenv').config({ path: require('path').join(__dirname, '../backend-node/.env') });
const fs = require('fs');
const path = require('path');
const db = require('../backend-node/src/db');
const cryptoSvc = require('../backend-node/src/services/crypto.service');

const ISSUER_ID = process.env.DEMO_ISSUER_ID || 'iss_demo01';
const ISSUER_NAME = process.env.DEMO_ISSUER_NAME || 'Meridian Institute of Technology';

function ensureIssuer() {
  const row = db.prepare('SELECT * FROM issuers WHERE issuer_id = ?').get(ISSUER_ID);
  if (!row) {
    db.prepare('INSERT INTO issuers (issuer_id, name, org_type, status, created_at) VALUES (?,?,?,?,?)').run(
      ISSUER_ID,
      ISSUER_NAME,
      'university',
      'active',
      new Date().toISOString()
    );
    console.log(`issuer created: ${ISSUER_ID} (${ISSUER_NAME})`);
  } else {
    console.log(`issuer exists: ${ISSUER_ID}`);
  }
}

function ensureKey() {
  const existing = db
    .prepare("SELECT * FROM issuer_keys WHERE issuer_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1")
    .get(ISSUER_ID);
  if (existing && fs.existsSync(path.join(__dirname, '..', 'keys', `${existing.kid}.pem`))) {
    console.log(`active key exists: ${existing.kid}`);
    return existing;
  }
  const kid = cryptoSvc.newId('key');
  const { publicKeyPem, privatePath } = cryptoSvc.generateKeyPair(kid);
  db.prepare(
    `INSERT INTO issuer_keys (kid, issuer_id, public_key_pem, private_key_path, algorithm, status, created_at)
     VALUES (?,?,?,?,?,?,?)`
  ).run(kid, ISSUER_ID, publicKeyPem, path.relative(path.join(__dirname, '../backend-node'), privatePath), cryptoSvc.ALGORITHM, 'active', new Date().toISOString());
  console.log(`key generated: ${kid}`);
  console.log(`  private -> ${privatePath} (git-ignored, mode 600)`);
  console.log(`  public  -> stored in issuer_keys.public_key_pem`);
  return db.prepare('SELECT * FROM issuer_keys WHERE kid = ?').get(kid);
}

ensureIssuer();
const key = ensureKey();
console.log('\nPEM headers:');
const pub = db.prepare('SELECT public_key_pem FROM issuer_keys WHERE kid = ?').get(key.kid).public_key_pem.trim().split('\n');
console.log('  public :', pub[0], '...', pub[pub.length - 1]);
const priv = fs.readFileSync(path.join(__dirname, '..', 'keys', `${key.kid}.pem`), 'utf8').trim().split('\n');
console.log('  private:', priv[0], '...', priv[priv.length - 1]);
