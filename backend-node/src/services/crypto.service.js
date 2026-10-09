// Evidentia crypto service — Node built-in `crypto` ONLY.
// Canonical JSON + SHA-256 + ECDSA P-256 sign/verify. No custom crypto, no third-party libs.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const config = require('../../config');

const ALGORITHM = 'ECDSA-P256-SHA256';

/**
 * Canonical JSON: object keys sorted at every depth, no whitespace, undefined dropped.
 * Two objects with the same content always produce the same string regardless of key order.
 */
function canonicalize(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return Number.isFinite(value) ? JSON.stringify(value) : 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (typeof value === 'object') {
    const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(value[k])}`).join(',')}}`;
  }
  return 'null';
}

function sha256Hex(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input), 'utf8');
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function sha256File(filePath) {
  return sha256Hex(fs.readFileSync(filePath));
}

/** Constant-time string comparison (length-safe). */
function safeEqual(a, b) {
  const ba = Buffer.from(String(a), 'utf8');
  const bb = Buffer.from(String(b), 'utf8');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/** The exact field set that defines a document's content (locked by design). */
const FIELD_KEYS = ['name', 'certificate_number', 'course', 'grade', 'issue_date', 'issuer_name', 'doc_id'];

function hashFields(fields, docId, issuerName) {
  const payload = {
    name: fields.name ?? '',
    certificate_number: fields.certificate_number ?? '',
    course: fields.course ?? '',
    grade: fields.grade ?? '',
    issue_date: fields.issue_date ?? '',
    issuer_name: issuerName ?? '',
    doc_id: docId,
  };
  return sha256Hex(canonicalize(payload));
}

function buildManifest({ docId, issuerId, kid, fieldsHash, fileHash, issuedAt, expiresAt }) {
  return canonicalize({
    schema_version: config.schemaVersion,
    doc_id: docId,
    issuer_id: issuerId,
    kid,
    fields_hash: fieldsHash,
    file_hash: fileHash,
    issued_at: issuedAt,
    expires_at: expiresAt || null,
  });
}

function privateKeyPathFor(kid) {
  return path.join(config.keysDir, `${kid}.pem`);
}

function readPrivateKey(kid) {
  const p = privateKeyPathFor(kid);
  if (!fs.existsSync(p)) throw new Error(`PRIVATE_KEY_MISSING:${kid}`);
  return fs.readFileSync(p, 'utf8');
}

/** Sign a canonical manifest string with the issuer's ECDSA P-256 private key. */
function signManifest(manifestString, kid) {
  const signer = crypto.createSign('SHA256');
  signer.update(manifestString, 'utf8');
  signer.end();
  const sig = signer.sign({ key: readPrivateKey(kid), dsaEncoding: 'der' });
  return sig.toString('base64');
}

/** Verify a base64 DER signature against a canonical manifest + issuer public key PEM. */
function verifySignature(manifestString, signatureB64, publicKeyPem) {
  try {
    const verifier = crypto.createVerify('SHA256');
    verifier.update(manifestString, 'utf8');
    verifier.end();
    return verifier.verify(
      { key: publicKeyPem, dsaEncoding: 'der' },
      Buffer.from(String(signatureB64 || ''), 'base64')
    );
  } catch {
    return false;
  }
}

function generateKeyPair(kid) {
  fs.mkdirSync(config.keysDir, { recursive: true });
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  const privPath = privateKeyPathFor(kid);
  fs.writeFileSync(privPath, privateKey, { mode: 0o600 });
  return { privateKeyPem: privateKey, publicKeyPem: publicKey, privatePath: privPath };
}

function newId(prefix, bytes = 4) {
  return `${prefix}_${crypto.randomBytes(bytes).toString('hex')}`;
}

module.exports = {
  ALGORITHM,
  FIELD_KEYS,
  canonicalize,
  sha256Hex,
  sha256File,
  safeEqual,
  hashFields,
  buildManifest,
  signManifest,
  verifySignature,
  generateKeyPair,
  privateKeyPathFor,
  newId,
  uuid: () => crypto.randomUUID(),
};
