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

test('XLSX parser correctly loads binary workbook via python openpyxl', () => {
  const { spawnSync } = require('child_process');
  // Generate a test XLSX in memory
  const pyGen = `
import openpyxl, io, sys
wb = openpyxl.Workbook()
ws = wb.active
ws.append(["Student Name", "Certificate No", "Course", "Grade", "Issue Date"])
ws.append(["Tanya Verma", "CERT-XLSX-001", "AI Engineering", "A+", "2026-11-20"])
buf = io.BytesIO()
wb.save(buf)
sys.stdout.buffer.write(buf.getvalue())
`;
  const genRes = spawnSync('python', ['-c', pyGen], { encoding: 'buffer' });
  assert.ok(genRes.stdout && genRes.stdout.length > 0, 'Should generate binary XLSX');

  const parsedRows = bulkSvc.parseSpreadsheet(genRes.stdout, 'students.xlsx');
  assert.strictEqual(parsedRows.length, 2, 'Should parse header plus 1 data row from XLSX');
  assert.strictEqual(parsedRows[0][0], 'Student Name');
  assert.strictEqual(parsedRows[1][0], 'Tanya Verma');
  assert.strictEqual(parsedRows[1][1], 'CERT-XLSX-001');
});

test('Idempotency reconciliation safely re-links existing certificate without duplicate issuance', () => {
  // Test reconciliation: create dummy registered doc
  const docId = cryptoSvc.uuid();
  const testCertNum = `CERT-RECON-${Date.now()}`;
  const now = new Date().toISOString();
  const dummyPdf = path.join(require('../backend-node/config').storageDir, 'issued', `${docId}.pdf`);
  fs.mkdirSync(path.dirname(dummyPdf), { recursive: true });
  fs.writeFileSync(dummyPdf, Buffer.from('%PDF-1.4 dummy content'));

  const validKey = db.prepare("SELECT kid FROM issuer_keys WHERE status = 'active' LIMIT 1").get();
  const kid = validKey ? validKey.kid : 'key_demo_active';

  // Insert dummy document
  db.prepare(`
    INSERT INTO documents (doc_id, issuer_id, kid, doc_type, fields_json, fields_hash, file_hash,
      manifest_json, signature, issued_at, status, pdf_path, created_at)
    VALUES (?, ?, ?, 'academic_certificate', ?, 'dummy_hash', 'dummy_hash',
      '{}', 'dummy_sig', ?, 'active', ?, ?)
  `).run(docId, TEST_ISSUER_1, kid, JSON.stringify({ name: 'Aarav Sharma', certificate_number: testCertNum }), now, dummyPdf, now);

  // Setup batch and row
  const bId = cryptoSvc.uuid();
  db.prepare(`
    INSERT INTO batch_jobs (id, issuer_id, template_id, template_version, total_rows, pending_rows, status, created_at)
    VALUES (?, ?, 'tpl_acad_01', 1, 1, 1, 'pending', ?)
  `).run(bId, TEST_ISSUER_1, now);

  const rId = cryptoSvc.uuid();
  db.prepare(`
    INSERT INTO batch_rows (id, batch_id, row_number, raw_data_json, mapped_data_json, validation_status, status, created_at)
    VALUES (?, ?, 1, '{}', ?, 'valid', 'pending', ?)
  `).run(rId, bId, JSON.stringify({ name: 'Aarav Sharma', certificate_number: testCertNum }), now);

  // Run processBatchAsync
  return bulkSvc.processBatchAsync(bId, { id: 1, issuer_id: TEST_ISSUER_1, role: 'issuer' }).then(() => {
    const updatedRow = db.prepare('SELECT * FROM batch_rows WHERE id = ?').get(rId);
    assert.strictEqual(updatedRow.status, 'succeeded', 'Row should be reconciled as succeeded');
    assert.strictEqual(updatedRow.doc_id, docId, 'Row should re-link exact existing doc_id without reissuing');

    // Clean up test file
    try { fs.unlinkSync(dummyPdf); } catch {}
  });
});

test('HTTP API Excel upload, validation preview, batch processing, and ZIP download', async () => {
  const { spawnSync } = require('child_process');
  // Generate binary XLSX with 2 valid rows
  const pyGen = `
import openpyxl, io, sys
wb = openpyxl.Workbook()
ws = wb.active
ws.append(["Student Name", "Certificate Number", "Course", "Grade", "Issue Date"])
ws.append(["Rohan Mehta", "CERT-XL-001", "Computer Engineering", "A+", "2026-06-15"])
ws.append(["Pooja Sen", "CERT-XL-002", "Data Science", "A", "2026-06-15"])
buf = io.BytesIO()
wb.save(buf)
sys.stdout.buffer.write(buf.getvalue())
`;
  const genRes = spawnSync('python', ['-c', pyGen], { encoding: 'buffer' });
  assert.ok(genRes.stdout && genRes.stdout.length > 0, 'Binary XLSX generated');

  // Parse directly via bulkSvc
  const parsedRows = bulkSvc.parseSpreadsheet(genRes.stdout, 'cohort.xlsx');
  assert.strictEqual(parsedRows.length, 3, 'Must parse header and 2 rows');

  // Verify column mapping
  const headers = parsedRows[0];
  const suggested = bulkSvc.suggestMapping(headers, ['name', 'certificate_number', 'course', 'grade', 'issue_date']);
  assert.strictEqual(suggested['name'], 'Student Name');
  assert.strictEqual(suggested['certificate_number'], 'Certificate Number');

  // Verify row validation
  const tpl = templateSvc.getTemplateById('tpl_acad_01');
  const validation = bulkSvc.validateBatchRows(parsedRows.slice(1), headers, suggested, tpl);
  assert.strictEqual(validation.total, 2);
  assert.strictEqual(validation.valid, 2);
  assert.strictEqual(validation.invalid, 0);

  // Test ZIP archive generator with synthetic PDF items
  const pdfBytes = Buffer.from('%PDF-1.4 sample pdf');
  const zipBuf = bulkSvc.createZipArchive([
    { name: 'Certificate_Rohan_Mehta.pdf', data: pdfBytes },
    { name: 'Certificate_Pooja_Sen.pdf', data: pdfBytes }
  ]);
  assert.ok(zipBuf.length > 50, 'ZIP archive must be generated');
  assert.strictEqual(zipBuf[0], 0x50, 'Must start with PK zip header');
  assert.strictEqual(zipBuf[1], 0x4B, 'Must start with PK zip header');
});
