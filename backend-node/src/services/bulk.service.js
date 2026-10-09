// Bulk issuance service:
// Safe CSV/XLSX parsing, template-driven column mapping, row-level validation,
// async batch processing queue with concurrency control, formula-injection safe CSV reports,
// and zero-dependency ZIP archive generation.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../db');
const config = require('../../config');
const issueSvc = require('./issue.service');
const templateSvc = require('./template.service');

const MAX_BULK_ROWS = 500;
const MAX_BULK_FILE_SIZE = 10 * 1024 * 1024; // 10MB cap

/**
 * Robust RFC-4180 compliant CSV parser that handles CRLF/LF, quoted multi-line fields, escaped quotes.
 */
function parseCsv(content) {
  if (typeof content !== 'string') content = content.toString('utf8');
  // Strip UTF-8 BOM if present
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }

  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;
  let i = 0;
  const len = content.length;

  while (i < len) {
    const char = content[i];

    if (insideQuotes) {
      if (char === '"') {
        if (i + 1 < len && content[i + 1] === '"') {
          // Escaped quote: "" -> "
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          insideQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (i + 1 < len && content[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
      }
    }
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Sniff uploaded spreadsheet buffer and extract rows as array of arrays.
 * Supports CSV directly, and XLSX using openpyxl via Python helper / python command when available.
 */
function parseSpreadsheet(buffer, filename = '') {
  if (!buffer || buffer.length === 0) {
    throw new Error('Spreadsheet file is empty');
  }
  if (buffer.length > MAX_BULK_FILE_SIZE) {
    throw new Error(`Spreadsheet exceeds maximum allowed size (${MAX_BULK_FILE_SIZE / 1024 / 1024}MB)`);
  }

  const ext = (path.extname(filename) || '').toLowerCase();

  // Check if buffer is XLSX (ZIP file signature: 0x50 0x4B 0x03 0x04)
  const isZip = buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04;

  if (ext === '.xlsx' || isZip) {
    // Parse XLSX using Python openpyxl subprocess
    const { spawnSync } = require('child_process');
    const pyScript = `
import sys, io, json
try:
    import openpyxl
    raw = sys.stdin.buffer.read()
    wb = openpyxl.load_workbook(io.BytesIO(raw), data_only=True)
    ws = wb.active
    rows = []
    for r in ws.iter_rows(values_only=True):
        if any(cell is not None and str(cell).strip() != '' for cell in r):
            rows.append([str(c) if c is not None else '' for c in r])
    print(json.dumps({'ok': True, 'rows': rows}))
except Exception as e:
    print(json.dumps({'ok': False, 'error': str(e)}))
`;
    const res = spawnSync('python', ['-c', pyScript], {
      input: buffer,
      maxBuffer: 20 * 1024 * 1024,
      encoding: 'buffer',
    });

    if (res.error) {
      throw new Error(`Failed to process XLSX: ${res.error.message}`);
    }
    const output = res.stdout ? res.stdout.toString('utf8').trim() : '';
    let parsed;
    try {
      parsed = JSON.parse(output);
    } catch {
      throw new Error(`Failed to parse XLSX output: ${output.slice(0, 200)}`);
    }
    if (!parsed.ok) {
      throw new Error(`Error reading XLSX spreadsheet: ${parsed.error}`);
    }
    return parsed.rows;
  }

  // Otherwise parse as UTF-8 CSV
  return parseCsv(buffer);
}

/**
 * Prevent spreadsheet formula injection (CSV Injection / CWE-1236).
 * Prepends a single quote `'` if the cell begins with `=`, `+`, `-`, `@`, `\t`, or `\r`.
 */
function sanitizeFormulaInjection(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/^[=\+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Suggest automatic column mapping between spreadsheet headers and template fields.
 */
function suggestMapping(headers, templateFields) {
  const mapping = {};
  const normalizedHeaders = headers.map(h => ({
    original: h,
    normalized: h.toLowerCase().replace(/[^a-z0-9]/g, '')
  }));

  const ALIASES = {
    name: ['studentname', 'recipientname', 'fullname', 'candidatename', 'name', 'student', 'candidate'],
    certificate_number: ['certificatenumber', 'certificateno', 'certno', 'rollnumber', 'rollno', 'registrationno', 'regno', 'id', 'serialno'],
    course: ['course', 'coursename', 'program', 'programname', 'degree', 'department', 'branch', 'designation', 'title'],
    grade: ['grade', 'marks', 'percentage', 'cgpa', 'gpa', 'score', 'division', 'result', 'status'],
    issue_date: ['issuedate', 'dateofissue', 'date', 'awarddate', 'completiondate', 'timestamp']
  };

  for (const field of templateFields) {
    const aliases = ALIASES[field] || [field.toLowerCase().replace(/[^a-z0-9]/g, '')];
    let matched = null;

    for (const h of normalizedHeaders) {
      if (aliases.includes(h.normalized)) {
        matched = h.original;
        break;
      }
    }

    if (!matched) {
      // Partial search
      for (const h of normalizedHeaders) {
        if (aliases.some(a => h.normalized.includes(a) || a.includes(h.normalized))) {
          matched = h.original;
          break;
        }
      }
    }

    if (matched) {
      mapping[field] = matched;
    }
  }

  return mapping;
}

/**
 * Validate parsed rows against template requirements and field constraints.
 */
function validateBatchRows(rows, headers, mapping, template) {
  if (!rows || rows.length === 0) {
    return {
      total: 0,
      valid: 0,
      invalid: 0,
      duplicates: 0,
      rows: []
    };
  }

  const requiredFields = template.required_json ? JSON.parse(template.required_json) : ['name', 'certificate_number', 'course', 'grade', 'issue_date'];
  const supportedFields = template.fields_json ? JSON.parse(template.fields_json) : ['name', 'certificate_number', 'course', 'grade', 'issue_date'];

  const validatedRows = [];
  const seenCertNumbers = new Set();
  let validCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;

  for (let idx = 0; idx < rows.length; idx++) {
    const rowValues = rows[idx];
    const rowNumber = idx + 1;
    const rawData = {};
    for (let c = 0; c < headers.length; c++) {
      rawData[headers[c]] = rowValues[c] !== undefined ? String(rowValues[c]).trim() : '';
    }

    const mappedData = {};
    const errors = [];

    // Map fields
    for (const field of supportedFields) {
      const colHeader = mapping[field];
      if (colHeader && rawData[colHeader] !== undefined) {
        mappedData[field] = rawData[colHeader];
      } else {
        mappedData[field] = '';
      }
    }

    // Default issue_date if empty to today's date
    if (!mappedData.issue_date || mappedData.issue_date.trim() === '') {
      mappedData.issue_date = new Date().toISOString().slice(0, 10);
    }

    // Validate required fields
    for (const req of requiredFields) {
      const val = mappedData[req];
      if (!val || String(val).trim() === '') {
        errors.push(`Missing required field '${req}'`);
      } else if (String(val).length > 120) {
        errors.push(`Field '${req}' exceeds maximum length of 120 chars`);
      }
    }

    // Check date format if present
    if (mappedData.issue_date && !/^\d{4}-\d{2}-\d{2}$/.test(mappedData.issue_date)) {
      errors.push(`Invalid issue_date '${mappedData.issue_date}' (must be YYYY-MM-DD)`);
    }

    // Check certificate number uniqueness within the uploaded batch
    let isDuplicate = false;
    const certNum = mappedData.certificate_number ? mappedData.certificate_number.toLowerCase() : null;
    if (certNum) {
      if (seenCertNumbers.has(certNum)) {
        isDuplicate = true;
        duplicateCount++;
        errors.push(`Duplicate certificate_number '${mappedData.certificate_number}' within this spreadsheet`);
      } else {
        seenCertNumbers.add(certNum);
      }
    }

    let validationStatus = 'valid';
    if (errors.length > 0) {
      if (isDuplicate) {
        validationStatus = 'duplicate';
      } else {
        validationStatus = 'invalid';
        invalidCount++;
      }
    } else {
      validCount++;
    }

    validatedRows.push({
      row_number: rowNumber,
      raw_data: rawData,
      mapped_data: mappedData,
      validation_status: validationStatus,
      errors: errors,
      is_valid: errors.length === 0
    });
  }

  return {
    total: rows.length,
    valid: validCount,
    invalid: invalidCount,
    duplicates: duplicateCount,
    rows: validatedRows
  };
}

/**
 * Zero-dependency standard ZIP file generator.
 */
function createZipArchive(files) {
  // files: array of { name: string, data: Buffer }
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  // Precomputed CRC-32 lookup table
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c >>> 0;
  }

  function calcCrc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, 'utf8');
    const crc = calcCrc32(file.data);
    const size = file.data.length;

    // Local file header (30 bytes + name length)
    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0); // signature
    local.writeUInt16LE(20, 4);          // version needed
    local.writeUInt16LE(0, 6);           // flags
    local.writeUInt16LE(0, 8);           // compression method: 0 (store)
    local.writeUInt16LE(0, 10);          // mod time
    local.writeUInt16LE(0, 12);          // mod date
    local.writeUInt32LE(crc, 14);        // crc32
    local.writeUInt32LE(size, 18);       // compressed size
    local.writeUInt32LE(size, 22);       // uncompressed size
    local.writeUInt16LE(nameBuf.length, 26); // file name length
    local.writeUInt16LE(0, 28);          // extra field length
    nameBuf.copy(local, 30);

    localHeaders.push(local, file.data);

    // Central directory header (46 bytes + name length)
    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0); // signature
    central.writeUInt16LE(20, 4);          // version made by
    central.writeUInt16LE(20, 6);          // version needed
    central.writeUInt16LE(0, 8);           // flags
    central.writeUInt16LE(0, 10);          // compression: 0 (store)
    central.writeUInt16LE(0, 12);          // mod time
    central.writeUInt16LE(0, 14);          // mod date
    central.writeUInt32LE(crc, 16);        // crc32
    central.writeUInt32LE(size, 20);       // compressed size
    central.writeUInt32LE(size, 24);       // uncompressed size
    central.writeUInt16LE(nameBuf.length, 28); // file name length
    central.writeUInt16LE(0, 30);          // extra field length
    central.writeUInt16LE(0, 32);          // comment length
    central.writeUInt16LE(0, 34);          // disk number start
    central.writeUInt16LE(0, 36);          // internal attributes
    central.writeUInt32LE(0, 38);          // external attributes
    central.writeUInt32LE(offset, 42);     // relative offset of local header
    nameBuf.copy(central, 46);

    centralHeaders.push(central);
    offset += local.length + size;
  }

  const centralSize = centralHeaders.reduce((acc, h) => acc + h.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); // end of central dir signature
  end.writeUInt16LE(0, 4);          // disk number
  end.writeUInt16LE(0, 6);          // start disk
  end.writeUInt16LE(files.length, 8);  // entries on disk
  end.writeUInt16LE(files.length, 10); // total entries
  end.writeUInt32LE(centralSize, 12);  // central dir size
  end.writeUInt32LE(offset, 16);       // offset of central dir
  end.writeUInt16LE(0, 20);            // comment length

  return Buffer.concat([...localHeaders, ...centralHeaders, end]);
}

/**
 * Generate CSV outcome report with formula injection sanitization.
 */
function generateOutcomeReportCsv(batch, rows) {
  const headers = ['Row Number', 'Status', 'Document ID', 'Recipient Name', 'Certificate Number', 'Course', 'Grade', 'Issue Date', 'Errors'];
  const lines = [headers.map(h => `"${h}"`).join(',')];

  for (const r of rows) {
    let mapped = {};
    try { mapped = JSON.parse(r.mapped_data_json || '{}'); } catch {}
    let errors = [];
    try { errors = JSON.parse(r.validation_errors_json || '[]'); } catch {}

    const colRow = r.row_number;
    const colStatus = r.status;
    const colDocId = r.doc_id || '';
    const colName = sanitizeFormulaInjection(mapped.name || '');
    const colCertNo = sanitizeFormulaInjection(mapped.certificate_number || '');
    const colCourse = sanitizeFormulaInjection(mapped.course || '');
    const colGrade = sanitizeFormulaInjection(mapped.grade || '');
    const colDate = sanitizeFormulaInjection(mapped.issue_date || '');
    const colErr = sanitizeFormulaInjection(r.error_message || errors.join('; ') || '');

    const rowCells = [
      colRow,
      `"${colStatus.replace(/"/g, '""')}"`,
      `"${colDocId.replace(/"/g, '""')}"`,
      `"${colName.replace(/"/g, '""')}"`,
      `"${colCertNo.replace(/"/g, '""')}"`,
      `"${colCourse.replace(/"/g, '""')}"`,
      `"${colGrade.replace(/"/g, '""')}"`,
      `"${colDate.replace(/"/g, '""')}"`,
      `"${colErr.replace(/"/g, '""')}"`
    ];

    lines.push(rowCells.join(','));
  }

  return lines.join('\r\n');
}

/**
 * Background worker loop for processing a batch.
 */
async function processBatchAsync(batchId, user) {
  const batch = db.prepare('SELECT * FROM batch_jobs WHERE id = ?').get(batchId);
  if (!batch || batch.status !== 'pending') return;

  db.prepare("UPDATE batch_jobs SET status = 'processing', started_at = ? WHERE id = ?")
    .run(new Date().toISOString(), batchId);

  const policy = JSON.parse(batch.policy_json || '{}');
  const skipInvalid = policy.skip_invalid !== false;

  const rows = db.prepare('SELECT * FROM batch_rows WHERE batch_id = ? ORDER BY row_number ASC').all(batchId);

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of rows) {
    // If job was cancelled
    const currentBatch = db.prepare('SELECT status FROM batch_jobs WHERE id = ?').get(batchId);
    if (currentBatch && currentBatch.status === 'cancelled') {
      break;
    }

    if (row.validation_status !== 'valid') {
      if (skipInvalid) {
        db.prepare("UPDATE batch_rows SET status = 'skipped', error_message = ? WHERE id = ?")
          .run('Skipped due to validation errors', row.id);
        skipped++;
        db.prepare('UPDATE batch_jobs SET skipped_rows = ?, pending_rows = pending_rows - 1 WHERE id = ?')
          .run(skipped, batchId);
        continue;
      } else {
        db.prepare("UPDATE batch_rows SET status = 'failed', error_message = ? WHERE id = ?")
          .run('Row failed validation', row.id);
        failed++;
        db.prepare('UPDATE batch_jobs SET failed_rows = ?, pending_rows = pending_rows - 1 WHERE id = ?')
          .run(failed, batchId);
        continue;
      }
    }

    // Check if row was already issued (idempotency check)
    if (row.doc_id && row.status === 'succeeded') {
      succeeded++;
      continue;
    }

    // Safety reconciliation: if crash occurred after document registration but before batch_row update
    const mappedData = JSON.parse(row.mapped_data_json || '{}');
    let existingDoc = null;
    if (mappedData.certificate_number) {
      const candidates = db.prepare(`
        SELECT doc_id, fields_json, pdf_path FROM documents
        WHERE issuer_id = ? AND status = 'active'
        ORDER BY created_at DESC LIMIT 50
      `).all(batch.issuer_id);

      for (const cand of candidates) {
        try {
          const parsed = JSON.parse(cand.fields_json || '{}');
          if (
            parsed.certificate_number === mappedData.certificate_number &&
            (!mappedData.name || parsed.name === mappedData.name)
          ) {
            existingDoc = cand;
            break;
          }
        } catch {}
      }
    }

    if (existingDoc && existingDoc.pdf_path && fs.existsSync(existingDoc.pdf_path)) {
      db.prepare(`
        UPDATE batch_rows
        SET status = 'succeeded', doc_id = ?, error_message = NULL, updated_at = ?
        WHERE id = ?
      `).run(existingDoc.doc_id, new Date().toISOString(), row.id);

      succeeded++;
      db.prepare(`
        UPDATE batch_jobs
        SET succeeded_rows = ?, running_rows = 0, pending_rows = pending_rows - 1
        WHERE id = ?
      `).run(succeeded, batchId);
      continue;
    }

    db.prepare("UPDATE batch_rows SET status = 'running' WHERE id = ?").run(row.id);
    db.prepare('UPDATE batch_jobs SET running_rows = 1 WHERE id = ?').run(batchId);

    try {
      const docType = policy.doc_type || 'academic_certificate';
      const templateId = batch.template_id;

      // Issue single certificate using the existing single-certificate service
      const issueResult = await issueSvc.issueDocumentSingle({
        user,
        fields: mappedData,
        docType,
        templateId
      });

      db.prepare(`
        UPDATE batch_rows
        SET status = 'succeeded', doc_id = ?, error_message = NULL, updated_at = ?
        WHERE id = ?
      `).run(issueResult.doc_id, new Date().toISOString(), row.id);

      succeeded++;
      db.prepare(`
        UPDATE batch_jobs
        SET succeeded_rows = ?, running_rows = 0, pending_rows = pending_rows - 1
        WHERE id = ?
      `).run(succeeded, batchId);

    } catch (e) {
      failed++;
      db.prepare(`
        UPDATE batch_rows
        SET status = 'failed', error_message = ?, updated_at = ?
        WHERE id = ?
      `).run(e.message, new Date().toISOString(), row.id);

      db.prepare(`
        UPDATE batch_jobs
        SET failed_rows = ?, running_rows = 0, pending_rows = pending_rows - 1
        WHERE id = ?
      `).run(failed, batchId);
    }
  }

  const finalStatus = failed === 0 ? 'completed' : (succeeded > 0 ? 'completed' : 'failed');
  db.prepare(`
    UPDATE batch_jobs
    SET status = ?, completed_at = ?, running_rows = 0, pending_rows = 0
    WHERE id = ?
  `).run(finalStatus, new Date().toISOString(), batchId);
}

module.exports = {
  MAX_BULK_ROWS,
  MAX_BULK_FILE_SIZE,
  parseCsv,
  parseSpreadsheet,
  suggestMapping,
  validateBatchRows,
  sanitizeFormulaInjection,
  createZipArchive,
  generateOutcomeReportCsv,
  processBatchAsync
};
