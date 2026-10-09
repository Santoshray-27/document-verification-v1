const test = require('node:test');
const assert = require('node:assert');
const { checkSemantics } = require('../src/services/semantic.engine');

test('Semantic Engine Tests', async (t) => {
  await t.test('SEM_MISSING_FIELD - A required registered field is missing from OCR output', () => {
    const reg = { name: 'John Doe', course: 'B.Sc' };
    const ocr = { name: 'John Doe' }; // Missing 'course'
    const findings = checkSemantics(reg, ocr);
    
    const missing = findings.find(f => f.rule_id === 'SEM_MISSING_FIELD' && f.field === 'course');
    assert.ok(missing);
    assert.strictEqual(missing.status, 'FLAGGED');
    assert.strictEqual(missing.severity, 'WARNING');
  });

  await t.test('SEM_MISSING_FIELD - All expected fields are present', () => {
    const reg = { name: 'John Doe', course: 'B.Sc' };
    const ocr = { name: 'John Doe', course: 'B.Sc' };
    const findings = checkSemantics(reg, ocr);
    
    const missing = findings.find(f => f.rule_id === 'SEM_MISSING_FIELD');
    assert.strictEqual(missing, undefined);
  });

  await t.test('SEM_MISSING_FIELD - Missing reference information handled safely', () => {
    // registry is null
    const findings = checkSemantics(null, { name: 'John Doe' });
    assert.strictEqual(findings.length, 0);
  });

  await t.test('SEM_EXCEEDS_MAX - Grade is within the currently implemented allowed range', () => {
    const reg = {};
    const ocr = { grade: '85' };
    const findings = checkSemantics(reg, ocr);
    const finding = findings.find(f => f.rule_id === 'SEM_EXCEEDS_MAX');
    assert.ok(finding);
    assert.strictEqual(finding.status, 'PASS');
    assert.strictEqual(finding.severity, 'INFO');
  });

  await t.test('SEM_EXCEEDS_MAX - Grade exceeds the currently implemented limit of 100', () => {
    const reg = {};
    const ocr = { grade: '105' };
    const findings = checkSemantics(reg, ocr);
    const finding = findings.find(f => f.rule_id === 'SEM_EXCEEDS_MAX');
    assert.ok(finding);
    assert.strictEqual(finding.status, 'FLAGGED');
    assert.strictEqual(finding.severity, 'WARNING');
  });

  await t.test('SEM_EXCEEDS_MAX - A normal valid value is not incorrectly flagged', () => {
    const reg = {};
    const ocr = { grade: 'A+' }; // Not parsed as > 100, so skipping
    const findings = checkSemantics(reg, ocr);
    const finding = findings.find(f => f.rule_id === 'SEM_EXCEEDS_MAX');
    assert.strictEqual(finding, undefined);
  });

  await t.test('SEM_FUTURE_DATE - An issue date in the distant future is flagged', () => {
    const reg = {};
    const futureYear = new Date().getFullYear() + 10;
    const ocr = { issue_date: `${futureYear}-01-01` };
    const findings = checkSemantics(reg, ocr);
    const finding = findings.find(f => f.rule_id === 'SEM_FUTURE_DATE');
    assert.ok(finding);
    assert.strictEqual(finding.status, 'FLAGGED');
    assert.strictEqual(finding.severity, 'ERROR');
  });

  await t.test('SEM_FUTURE_DATE - A valid past issue date is not flagged', () => {
    const reg = {};
    const pastYear = new Date().getFullYear() - 10;
    const ocr = { issue_date: `${pastYear}-01-01` };
    const findings = checkSemantics(reg, ocr);
    const finding = findings.find(f => f.rule_id === 'SEM_FUTURE_DATE');
    assert.ok(finding);
    assert.strictEqual(finding.status, 'PASS');
    assert.strictEqual(finding.severity, 'INFO');
  });

  await t.test('SEM_FUTURE_DATE - Invalid or missing dates are handled safely', () => {
    const reg = {};
    const ocr = { issue_date: 'invalid-date-format' };
    const findings = checkSemantics(reg, ocr);
    const finding = findings.find(f => f.rule_id === 'SEM_FUTURE_DATE');
    assert.strictEqual(finding, undefined);
  });

  await t.test('SEM_DATE_ORDER - Expiration occurs before issue date', () => {
    const reg = {};
    const ocr = { issue_date: '2020-05-01', expires_at: '2019-01-01' };
    const findings = checkSemantics(reg, ocr);
    const finding = findings.find(f => f.rule_id === 'SEM_DATE_ORDER');
    assert.ok(finding);
    assert.strictEqual(finding.status, 'FLAGGED');
    assert.strictEqual(finding.severity, 'ERROR');
  });

  await t.test('SEM_DATE_ORDER - Expiration equals issue date', () => {
    const reg = {};
    const ocr = { issue_date: '2020-05-01', expires_at: '2020-05-01' };
    const findings = checkSemantics(reg, ocr);
    const finding = findings.find(f => f.rule_id === 'SEM_DATE_ORDER');
    assert.ok(finding);
    assert.strictEqual(finding.status, 'FLAGGED');
    assert.strictEqual(finding.severity, 'ERROR');
  });

  await t.test('SEM_DATE_ORDER - Expiration occurs after issue date', () => {
    const reg = {};
    const ocr = { issue_date: '2020-05-01', expires_at: '2021-05-01' };
    const findings = checkSemantics(reg, ocr);
    const finding = findings.find(f => f.rule_id === 'SEM_DATE_ORDER');
    assert.ok(finding);
    assert.strictEqual(finding.status, 'PASS');
    assert.strictEqual(finding.severity, 'INFO');
  });
});
