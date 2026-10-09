// Unit tests for the crypto core: canonical JSON stability, hashing, ECDSA sign/verify, tamper detection.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const db = require('../backend-node/src/db');
const c = require('../backend-node/src/services/crypto.service');

test('canonicalize is key-order independent at every depth', () => {
  const a = c.canonicalize({ b: 1, a: { d: [1, { z: 1, y: 2 }], c: 'x' } });
  const b = c.canonicalize({ a: { c: 'x', d: [1, { y: 2, z: 1 }] }, b: 1 });
  assert.strictEqual(a, b);
  assert.strictEqual(a, '{"a":{"c":"x","d":[1,{"y":2,"z":1}]},"b":1}');
});

test('canonicalize drops undefined and has no whitespace', () => {
  const s = c.canonicalize({ a: 1, b: undefined, c: null });
  assert.strictEqual(s, '{"a":1,"c":null}');
  assert.ok(!/\s/.test(s.replace(/" "/g, '')));
});

test('hashFields is stable and changes when a field changes', () => {
  const f = { name: 'Aarav Sharma', certificate_number: 'AGN-2026-001', course: 'B.Tech CSE', grade: 'A+', issue_date: '2026-02-14' };
  const h1 = c.hashFields(f, 'doc-1', 'Meridian Institute of Technology');
  const h2 = c.hashFields({ ...f, grade: 'A+' }, 'doc-1', 'Meridian Institute of Technology');
  const h3 = c.hashFields({ ...f, grade: 'B' }, 'doc-1', 'Meridian Institute of Technology');
  assert.match(h1, /^[0-9a-f]{64}$/);
  assert.strictEqual(h1, h2);
  assert.notStrictEqual(h1, h3);
});

test('ECDSA P-256 sign/verify round-trip with a generated key', () => {
  const kid = `key_test${Math.random().toString(16).slice(2, 8)}`;
  const { publicKeyPem } = c.generateKeyPair(kid);
  const manifest = c.buildManifest({
    docId: c.uuid(), issuerId: 'iss_test', kid,
    fieldsHash: c.sha256Hex('fields'), fileHash: c.sha256Hex('file'),
    issuedAt: new Date().toISOString(), expiresAt: null,
  });
  const sig = c.signManifest(manifest, kid);
  assert.strictEqual(c.verifySignature(manifest, sig, publicKeyPem), true, 'valid signature must verify');

  // tamper the manifest
  const tampered = manifest.replace('"schema_version":"1.0"', '"schema_version":"9.9"');
  assert.strictEqual(c.verifySignature(tampered, sig, publicKeyPem), false, 'tampered manifest must fail');

  // wrong key
  const kid2 = `key_test${Math.random().toString(16).slice(2, 8)}`;
  const other = c.generateKeyPair(kid2);
  assert.strictEqual(c.verifySignature(manifest, sig, other.publicKeyPem), false, 'wrong key must fail');

  // garbage signature must not throw
  assert.strictEqual(c.verifySignature(manifest, 'not-base64!!', publicKeyPem), false);

  // private key file must exist, be 0600, and never be exposed by the module
  const p = path.join(__dirname, '../keys', `${kid}.pem`);
  assert.ok(fs.existsSync(p));
  const mode = (fs.statSync(p).mode & 0o777).toString(8);
  assert.strictEqual(mode, '600');
  // the signer must never return or expose the private key material
  assert.ok(!c.signManifest(manifest, kid).includes('PRIVATE KEY'));
  assert.ok(!c.generateKeyPair.toString().includes('return { privateKeyPem: privateKey, publicKeyPem: publicKey, privatePath: privPath, privateKey'));
  fs.unlinkSync(p);
  fs.unlinkSync(path.join(__dirname, '../keys', `${kid2}.pem`));
});

test('safeEqual is length-safe and correct', () => {
  assert.strictEqual(c.safeEqual('abc', 'abc'), true);
  assert.strictEqual(c.safeEqual('abc', 'abd'), false);
  assert.strictEqual(c.safeEqual('abc', 'abcd'), false);
});

test('sha256Hex matches a known vector', () => {
  // sha256("abc")
  assert.strictEqual(c.sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('manifest builder produces canonical, sorted output', () => {
  const m = c.buildManifest({ docId: 'd', issuerId: 'i', kid: 'k', fieldsHash: 'f', fileHash: 'h', issuedAt: 't', expiresAt: null });
  const parsed = JSON.parse(m);
  assert.deepStrictEqual(Object.keys(parsed), ['doc_id', 'expires_at', 'fields_hash', 'file_hash', 'issued_at', 'issuer_id', 'kid', 'schema_version']);
});

test('demo issuer key exists in DB and its private key file is readable by the signer', () => {
  const row = db.prepare("SELECT * FROM issuer_keys WHERE status='active' ORDER BY created_at DESC LIMIT 1").get();
  assert.ok(row, 'run scripts/generate-keys.js first');
  const manifest = c.buildManifest({ docId: c.uuid(), issuerId: row.issuer_id, kid: row.kid, fieldsHash: 'f', fileHash: 'h', issuedAt: 'now', expiresAt: null });
  const sig = c.signManifest(manifest, row.kid);
  assert.strictEqual(c.verifySignature(manifest, sig, row.public_key_pem), true);
});
