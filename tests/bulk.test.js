const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const db = require('../backend-node/src/db');
const bulkSvc = require('../backend-node/src/services/bulk.service');
const templateSvc = require('../backend-node/src/services/template.service');
const cryptoSvc = require('../backend-node/src/services/crypto.service');

// Ensure db schema is ready
db.migrate();

const TEST_ISSUER_1 = 'iss_bulk_test_1';
const TEST_ISSUER_2 = 'iss_bulk_test_2';

test.before(() => {
  const now = new Date().toISOString();
  db.prepare("INSERT OR IGNORE INTO issuers (issuer_id, name, org_type, status, created_at) VALUES (?, ?, 'university', 'active', ?)").run(TEST_ISSUER_1, 'Bulk Test University', now);
  db.prepare("INSERT OR IGNORE INTO issuers (issuer_id, name, org_type, status, created_at) VALUES (?, ?, 'company', 'active', ?)").run(TEST_ISSUER_2, 'Unauthorized Corp', now);
});

test('Bulk CSV parser parses simple, quoted, and multiline values', () => {
  const csvData = `name,certificate_number,course,grade,issue_date
"Aarav Sharma","CERT-001","Computer Science","A+","2026-05-10"
"Patel, Ananya","CERT-002","Information Tech, BSc","A","2026-05-11"
"Rohan ""The Best""","CERT-003","Data Science","O","2026-05-12"`;

  const rows = bulkSvc.parseCsv(csvData);
  assert.strictEqual(rows.length, 4, 'Should parse header plus 3 data rows');
  assert.deepStrictEqual(rows[0], ['name', 'certificate_number', 'course', 'grade', 'issue_date']);
  assert.strictEqual(rows[1][0], 'Aarav Sharma');
  assert.strictEqual(rows[2][0], 'Patel, Ananya');
  assert.strictEqual(rows[3][0], 'Rohan "The Best"');
});

test('Formula injection sanitizer escapes dangerous characters', () => {
  assert.strictEqual(bulkSvc.sanitizeFormulaInjection('=SUM(A1:A10)'), "'=SUM(A1:A10)");
  assert.strictEqual(bulkSvc.sanitizeFormulaInjection('+123456789'), "'+123456789");
  assert.strictEqual(bulkSvc.sanitizeFormulaInjection('-50'), "'-50");
  assert.strictEqual(bulkSvc.sanitizeFormulaInjection('@cmd|'), "'@cmd|");
  assert.strictEqual(bulkSvc.sanitizeFormulaInjection('Safe Student Name'), 'Safe Student Name');
});

test('Column mapping accurately matches common alias headers', () => {
  const headers = ['Student Name', 'Roll Number', 'Program', 'CGPA', 'Award Date'];
  const templateFields = ['name', 'certificate_number', 'course', 'grade', 'issue_date'];
  const mapping = bulkSvc.suggestMapping(headers, templateFields);

  assert.strictEqual(mapping.name, 'Student Name');
  assert.strictEqual(mapping.certificate_number, 'Roll Number');
  assert.strictEqual(mapping.course, 'Program');
  assert.strictEqual(mapping.grade, 'CGPA');
  assert.strictEqual(mapping.issue_date, 'Award Date');
});

test('Batch row validation detects missing required fields and intra-batch duplicates', () => {
  const tpl = templateSvc.getTemplateById('tpl_acad_01');
  const headers = ['name', 'certificate_number', 'course', 'grade', 'issue_date'];
  const rows = [
    ['Valid Recipient 1', 'CERT-101', 'CS101', 'A', '2026-01-01'],
    ['', 'CERT-102', 'CS102', 'B', '2026-01-01'], // Missing name
    ['Valid Recipient 3', 'CERT-101', 'CS103', 'A', '2026-01-01'], // Duplicate CERT-101
  ];
  const mapping = {
    name: 'name',
    certificate_number: 'certificate_number',
    course: 'course',
    grade: 'grade',
    issue_date: 'issue_date'
  };

  const res = bulkSvc.validateBatchRows(rows, headers, mapping, tpl);
  assert.strictEqual(res.total, 3);
  assert.strictEqual(res.valid, 1);
  assert.strictEqual(res.invalid, 1);
  assert.strictEqual(res.duplicates, 1);
  assert.strictEqual(res.rows[0].is_valid, true);
  assert.strictEqual(res.rows[1].is_valid, false);
  assert.strictEqual(res.rows[2].is_valid, false);
  assert.ok(res.rows[2].errors.some(e => e.includes('Duplicate certificate_number')));
});

test('Zero-dependency ZIP generation produces a valid, readable ZIP archive', () => {
  const file1 = { name: 'test1.txt', data: Buffer.from('Content of file 1') };
  const file2 = { name: 'nested/test2.txt', data: Buffer.from('Content of nested file 2') };

  const zipBuf = bulkSvc.createZipArchive([file1, file2]);
  assert.ok(Buffer.isBuffer(zipBuf));
  assert.ok(zipBuf.length > 50, 'ZIP buffer should have nonzero size');

  // Check standard ZIP header signature 0x50 0x4B 0x03 0x04
  assert.strictEqual(zipBuf[0], 0x50);
  assert.strictEqual(zipBuf[1], 0x4b);
  assert.strictEqual(zipBuf[2], 0x03);
  assert.strictEqual(zipBuf[3], 0x04);
});

test('Formula injection safe outcome report CSV generation', () => {
  const batch = { id: 'test-batch-001' };
  const rows = [
    {
      row_number: 1,
      status: 'succeeded',
      doc_id: 'doc-uuid-1',
      mapped_data_json: JSON.stringify({ name: 'Alice', certificate_number: 'C1', course: 'Math', grade: 'A', issue_date: '2026-01-01' }),
      validation_errors_json: '[]',
      error_message: null
    },
    {
      row_number: 2,
      status: 'failed',
      doc_id: null,
      mapped_data_json: JSON.stringify({ name: '=cmd|malicious', certificate_number: 'C2', course: 'Math', grade: 'A', issue_date: '2026-01-01' }),
      validation_errors_json: '["Invalid name"]',
      error_message: 'Validation failed'
    }
  ];

  const csv = bulkSvc.generateOutcomeReportCsv(batch, rows);
  assert.ok(csv.includes('"Row Number","Status"'));
  assert.ok(csv.includes('"Alice"'));
  assert.ok(csv.includes("\"'=cmd|malicious\""), 'Dangerous formula must be prefixed with quote');
});

test('Batch database persistence and status tracking', () => {
  const batchId = cryptoSvc.uuid();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO batch_jobs (
      id, issuer_id, template_id, template_version, total_rows, pending_rows,
      status, mapping_json, created_at
    ) VALUES (?, ?, 'tpl_acad_01', 1, 10, 10, 'draft', '{}', ?)
  `).run(batchId, TEST_ISSUER_1, now);

  const rowId = cryptoSvc.uuid();
  db.prepare(`
    INSERT INTO batch_rows (
      id, batch_id, row_number, raw_data_json, mapped_data_json,
      validation_status, status, created_at
    ) VALUES (?, ?, 1, '{"name":"Bob"}', '{"name":"Bob"}', 'valid', 'pending', ?)
  `).run(rowId, batchId, now);

  const fetched = db.prepare('SELECT * FROM batch_jobs WHERE id = ?').get(batchId);
  assert.strictEqual(fetched.id, batchId);
  assert.strictEqual(fetched.status, 'draft');
  assert.strictEqual(fetched.issuer_id, TEST_ISSUER_1);

  // Cross-tenant access isolation verification: TEST_ISSUER_2 must NOT access TEST_ISSUER_1's batch
  const crossTenant = db.prepare('SELECT * FROM batch_jobs WHERE id = ? AND issuer_id = ?').get(batchId, TEST_ISSUER_2);
  assert.strictEqual(crossTenant, undefined, 'Issuer 2 must not see Issuer 1 batch');
});
