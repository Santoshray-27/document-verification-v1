// Unit tests for the verdict engine — every verdict path, plus the worker-down fallback.
const test = require('node:test');
const assert = require('node:assert');
const { decide, V } = require('../backend-node/src/services/verdict.engine');

const RECORD = {
  doc_id: 'd-1', file_hash: 'a'.repeat(64), status: 'active', expires_at: null,
  revoke_reason: null, revoked_at: null,
};
const ISSUER = { issuer_id: 'iss_1', name: 'Meridian Institute of Technology', status: 'active' };
const KEY = { kid: 'key_1', algorithm: 'ECDSA-P256-SHA256', public_key_pem: 'x' };
const REG_FIELDS = {
  name: 'Aarav Sharma', certificate_number: 'AGN-2026-001', course: 'B.Tech Computer Science',
  grade: 'A+', issue_date: '2026-02-14', issuer_name: 'Meridian Institute of Technology',
};

const base = (over = {}) => ({
  fileValid: true, fileKind: 'PDF', fileSizeKb: 180,
  fileHash: 'a'.repeat(64), docId: 'd-1', docIdSource: 'qr',
  record: RECORD, issuer: ISSUER, key: KEY,
  signatureValid: true, hashMatch: true, revoked: false, expired: false,
  workerAvailable: true,
  qr: { found: true, doc_id: 'd-1' },
  ocr: { fields: { ...REG_FIELDS }, avg_confidence: 88 },
  diff: { ssim_score: 0.99, changed_regions: [], region_count: 0 },
  metadata: { signals: [] },
  registryFields: REG_FIELDS,
  ...over,
});

test('GENUINE — exact hash match, High', () => {
  const r = decide(base());
  assert.strictEqual(r.verdict, V.GENUINE);
  assert.strictEqual(r.confidence_level, 'High');
  assert.strictEqual(r.evidence_score, 100);
  assert.ok(r.checks.find((c) => c.id === 'hash_compare').status === 'passed');
});

test('NOT ISSUED — no registry record, High', () => {
  const r = decide(base({ record: null, hashMatch: null }));
  assert.strictEqual(r.verdict, V.NOT_ISSUED);
  assert.strictEqual(r.confidence_level, 'High');
});

test('UNABLE TO ASSESS — no doc_id at all', () => {
  const r = decide(base({ docId: null, qr: { found: false }, record: null, hashMatch: null }));
  assert.strictEqual(r.verdict, V.UNABLE);
  assert.strictEqual(r.confidence_level, 'Low');
});

test('FORGED — signature does not verify, High', () => {
  const r = decide(base({ signatureValid: false, hashMatch: null }));
  assert.strictEqual(r.verdict, V.FORGED);
  assert.strictEqual(r.confidence_level, 'High');
});

test('UNVERIFIABLE — suspended issuer (never called "fake")', () => {
  const r = decide(base({ issuer: { ...ISSUER, status: 'suspended' }, hashMatch: null }));
  assert.strictEqual(r.verdict, V.UNVERIFIABLE);
  assert.ok(/not proof the document is fake/i.test(r.reasons[0].detail));
});

test('UNVERIFIABLE — signing key missing', () => {
  const r = decide(base({ key: null, hashMatch: null }));
  assert.strictEqual(r.verdict, V.UNVERIFIABLE);
});

test('REVOKED — even when the file bytes are the original', () => {
  const r = decide(base({ revoked: true, hashMatch: true, record: { ...RECORD, status: 'revoked', revoke_reason: 'wrong grade issued', revoked_at: '2026-03-01T00:00:00Z' } }));
  assert.strictEqual(r.verdict, V.REVOKED);
  assert.ok(/wrong grade issued/.test(r.reasons[0].detail));
});

test('EXPIRED', () => {
  const r = decide(base({ expired: true, hashMatch: true, record: { ...RECORD, expires_at: '2026-01-01T00:00:00Z' } }));
  assert.strictEqual(r.verdict, V.EXPIRED);
});

test('GENUINE COPY — hash differs, fields match, ssim 0.97 -> High', () => {
  const r = decide(base({ fileHash: 'b'.repeat(64), hashMatch: false, diff: { ssim_score: 0.97, changed_regions: [], region_count: 0 } }));
  assert.strictEqual(r.verdict, V.GENUINE_COPY);
  assert.strictEqual(r.confidence_level, 'High');
});

test('GENUINE COPY — Medium when ssim is 0.86', () => {
  const r = decide(base({
    fileHash: 'b'.repeat(64), hashMatch: false,
    diff: { ssim_score: 0.86, changed_regions: [{ x: 1, y: 1, w: 20, h: 20 }], region_count: 1 },
  }));
  assert.strictEqual(r.verdict, V.GENUINE_COPY);
  assert.strictEqual(r.confidence_level, 'Medium');
});

test('GENUINE COPY — a noisy scan (ssim 0.80, many regions) still a copy, Medium', () => {
  const regions = Array.from({ length: 6 }, (_, i) => ({ x: i, y: i, w: 30, h: 30 }));
  const r = decide(base({
    fileHash: 'b'.repeat(64), hashMatch: false,
    diff: { ssim_score: 0.802, changed_regions: regions, region_count: regions.length },
  }));
  assert.strictEqual(r.verdict, V.GENUINE_COPY, 'a scan must not be called ALTERED');
  assert.strictEqual(r.confidence_level, 'Medium');
});

test('UNABLE TO ASSESS — content matches but the scan is far too degraded (ssim 0.5)', () => {
  const r = decide(base({
    fileHash: 'b'.repeat(64), hashMatch: false,
    diff: { ssim_score: 0.5, changed_regions: [{ x: 1, y: 1, w: 400, h: 400 }], region_count: 1 },
  }));
  assert.strictEqual(r.verdict, V.ALTERED, 'falls through to the minor-difference branch');
  assert.strictEqual(r.confidence_level, 'Medium');
});

test('ALTERED — a field is present in the registry but GONE from the page (redaction)', () => {
  // OCR overall was reliable (87%), so a missing issue_date is evidence, not noise.
  const fields = { ...REG_FIELDS };
  delete fields.issue_date;
  const r = decide(base({
    fileHash: 'b'.repeat(64), hashMatch: false,
    ocr: { fields, avg_confidence: 87 },
    diff: { ssim_score: 0.997, changed_regions: [{ x: 1, y: 1, w: 40, h: 20 }, { x: 2, y: 2, w: 40, h: 20 }], region_count: 2 },
  }));
  assert.strictEqual(r.verdict, V.ALTERED, 'a redacted field must not pass as a genuine copy');
  assert.strictEqual(r.confidence_level, 'Medium', 'only a secondary field is affected');
});

test('missing field is excused when OCR as a whole was unreliable', () => {
  const fields = { ...REG_FIELDS };
  delete fields.issue_date;
  const r = decide(base({
    fileHash: 'b'.repeat(64), hashMatch: false,
    ocr: { fields, avg_confidence: 42 },
    diff: { ssim_score: 0.99, changed_regions: [], region_count: 0 },
  }));
  assert.strictEqual(r.verdict, V.GENUINE_COPY, 'low OCR confidence must not manufacture a mismatch');
});

test('FORGED — certificate number changed together with other key fields (rebuilt document)', () => {
  const r = decide(base({
    fileHash: 'b'.repeat(64), hashMatch: false,
    ocr: {
      fields: { ...REG_FIELDS, certificate_number: 'AGN-FAKE-999', name: 'Fake Candidate', course: 'PhD Quantum Forgery' },
      avg_confidence: 88,
    },
    // a rebuild from the same template looks visually identical — layout is NOT the signal
    diff: { ssim_score: 0.985, changed_regions: [{ x: 1, y: 1, w: 40, h: 20 }], region_count: 5 },
  }));
  assert.strictEqual(r.verdict, V.FORGED);
  assert.ok(r.reasons.some((x) => x.code === 'QR_CONTENT_MISMATCH'));
});

test('ALTERED High — critical field (name) changed', () => {
  const r = decide(base({
    fileHash: 'b'.repeat(64), hashMatch: false,
    ocr: { fields: { ...REG_FIELDS, name: 'Rohan Verma' }, avg_confidence: 87 },
    diff: { ssim_score: 0.83, changed_regions: [{ x: 100, y: 300, w: 220, h: 40 }], region_count: 1 },
  }));
  assert.strictEqual(r.verdict, V.ALTERED);
  assert.strictEqual(r.confidence_level, 'High');
  assert.ok(r.reasons.some((x) => x.code === 'FIELD_MISMATCH'));
});

test('ALTERED Medium — only a secondary field differs', () => {
  const r = decide(base({
    fileHash: 'b'.repeat(64), hashMatch: false,
    ocr: { fields: { ...REG_FIELDS, course: 'B.Tech Mechanical' }, avg_confidence: 85 },
    diff: { ssim_score: 0.72, changed_regions: [{ x: 1, y: 1, w: 20, h: 20 }, { x: 2, y: 2, w: 20, h: 20 }, { x: 3, y: 3, w: 20, h: 20 }], region_count: 3 },
  }));
  assert.strictEqual(r.verdict, V.ALTERED);
  assert.strictEqual(r.confidence_level, 'Medium');
});

test('FORGED — copied genuine QR on different content (QR-content mismatch)', () => {
  const r = decide(base({ fileHash: 'b'.repeat(64), hashMatch: false, qr: { found: true, doc_id: 'other-doc-999' } }));
  assert.strictEqual(r.verdict, V.FORGED);
  assert.ok(r.reasons.some((x) => x.code === 'QR_CONTENT_MISMATCH'));
});

test('UNABLE TO ASSESS — OCR dead and visual evidence too weak', () => {
  const r = decide(base({
    fileHash: 'b'.repeat(64), hashMatch: false,
    ocr: { fields: {}, avg_confidence: 0 },
    diff: { ssim_score: 0.31, changed_regions: [{ x: 1, y: 1, w: 300, h: 300 }], region_count: 1 },
  }));
  assert.strictEqual(r.verdict, V.UNABLE);
  assert.strictEqual(r.confidence_level, 'Low');
});

test('FAIL SAFE — worker down still returns a crypto verdict, forensics marked unavailable', () => {
  const r = decide(base({
    fileHash: 'b'.repeat(64), hashMatch: false, workerAvailable: false,
    ocr: null, diff: null, metadata: null, qr: null,
  }));
  assert.strictEqual(r.verdict, V.ALTERED);
  assert.strictEqual(r.confidence_level, 'Low');
  assert.ok(r.checks.filter((c) => c.status === 'skipped').length >= 4);
  assert.ok(r.reasons.some((x) => x.code === 'FORENSICS_UNAVAILABLE'));
  // crypto checks must still be present and passed
  assert.ok(r.checks.find((c) => c.id === 'signature_verify').status === 'passed');
});

test('invalid file -> UNABLE TO ASSESS, nothing else runs', () => {
  const r = decide(base({ fileValid: false, docId: null, record: null, hashMatch: null }));
  assert.strictEqual(r.verdict, V.UNABLE);
  assert.strictEqual(r.checks.length, 1);
});

test('confidence is only ever High / Medium / Low', () => {
  const cases = [base(), base({ record: null, hashMatch: null }), base({ signatureValid: false, hashMatch: null })];
  for (const c of cases) assert.ok(['High', 'Medium', 'Low'].includes(decide(c).confidence_level));
});

test('evidence_score is 0..100 and never presented as a probability', () => {
  for (const c of [base(), base({ fileHash: 'b'.repeat(64), hashMatch: false })]) {
    const r = decide(c);
    assert.ok(r.evidence_score >= 0 && r.evidence_score <= 100);
    assert.ok(!JSON.stringify(r).includes('% genuine'));
  }
});

test('similarity handles OCR noise but not a different name', () => {
  const { similarity } = require('../backend-node/src/services/verdict.engine');
  assert.ok(similarity('Aarav Sharma', 'aarav  sharma') > 0.95);
  assert.ok(similarity('Aarav Sharma', 'Aarav Sharma.') > 0.9);
  assert.ok(similarity('Aarav Sharma', 'Rohan Verma') < 0.5);
});
