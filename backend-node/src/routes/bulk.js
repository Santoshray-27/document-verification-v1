// Routes for Bulk Certificate Issuance (Stage 4)
// Endpoints:
// - GET  /sample-template?template_id=...: Download sample CSV tailored to the template's required/supported schema
// - POST /validate: Upload CSV/XLSX, parse, run column mapping & row validation, return preview batch draft
// - POST /start: Confirm batch issuance with chosen policy, enqueue background processor
// - GET  /jobs/:batchId: Retrieve persistent batch job progress and row details
// - GET  /jobs/:batchId/download: Download ZIP archive containing all successfully issued PDFs
// - GET  /jobs/:batchId/report: Download formula-injection safe CSV outcome report
const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const bulkSvc = require('../services/bulk.service');
const templateSvc = require('../services/template.service');

const router = express.Router();
router.use(requireAuth, requireRole('issuer'));

/** Helper to verify batch ownership */
function ownBatch(req, res, batchId) {
  const batch = db.prepare('SELECT * FROM batch_jobs WHERE id = ? AND issuer_id = ?').get(batchId, req.user.issuer_id);
  if (!batch) {
    res.status(404).json({ error: { code: 'BATCH_NOT_FOUND', message: 'No such batch under your organization account' } });
    return null;
  }
  return batch;
}

/**
 * GET /api/issue/bulk/sample-template?template_id=...
 * Generates and downloads a matching CSV template populated with sample headers and 2 demo rows.
 */
router.get('/sample-template', (req, res) => {
  const templateId = req.query.template_id || 'tpl_acad_01';
  const tpl = templateSvc.getTemplateById(templateId);
  if (!tpl) {
    return res.status(404).json({ error: { code: 'TEMPLATE_NOT_FOUND', message: 'Template not found' } });
  }

  // Ensure access
  if (tpl.is_system !== 1 && tpl.issuer_id !== req.user.issuer_id) {
    return res.status(403).json({ error: { code: 'UNAUTHORIZED_TEMPLATE', message: 'You do not own this custom template' } });
  }

  const fields = tpl.fields_json ? JSON.parse(tpl.fields_json) : ['name', 'certificate_number', 'course', 'grade', 'issue_date'];
  const sampleHeaders = fields.map(f => {
    switch (f) {
      case 'name': return 'Student Name';
      case 'certificate_number': return 'Certificate Number';
      case 'course': return 'Course';
      case 'grade': return 'Grade';
      case 'issue_date': return 'Issue Date';
      default: return f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
  });

  const row1 = fields.map(f => {
    switch (f) {
      case 'name': return 'Aarav Sharma';
      case 'certificate_number': return 'CERT-2026-001';
      case 'course': return 'Computer Science and Engineering';
      case 'grade': return 'First Class Honours';
      case 'issue_date': return '2026-06-15';
      default: return 'Sample Value';
    }
  });

  const row2 = fields.map(f => {
    switch (f) {
      case 'name': return 'Ananya Patel';
      case 'certificate_number': return 'CERT-2026-002';
      case 'course': return 'Information Technology';
      case 'grade': return 'Distinction';
      case 'issue_date': return '2026-06-15';
      default: return 'Sample Value';
    }
  });

  const csvContent = [
    sampleHeaders.map(h => `"${h}"`).join(','),
    row1.map(v => `"${v}"`).join(','),
    row2.map(v => `"${v}"`).join(',')
  ].join('\r\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="sample-${templateId}.csv"`);
  res.send(csvContent);
});

/**
 * POST /api/issue/bulk/validate
 * Multipart upload of spreadsheet + template_id + optional custom mapping
 */
router.post('/validate', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: { code: 'NO_FILE', message: 'No spreadsheet file uploaded' } });
    }

    const templateId = req.body.template_id;
    if (!templateId) {
      return res.status(400).json({ error: { code: 'MISSING_TEMPLATE', message: 'template_id is required' } });
    }

    const tpl = templateSvc.getTemplateById(templateId);
    if (!tpl) {
      return res.status(404).json({ error: { code: 'TEMPLATE_NOT_FOUND', message: 'Template not found' } });
    }
    if (tpl.is_system !== 1 && tpl.issuer_id !== req.user.issuer_id) {
      return res.status(403).json({ error: { code: 'UNAUTHORIZED_TEMPLATE', message: 'You do not own this custom template' } });
    }

    const originalName = req.file.originalname || 'upload.csv';
    let rows;
    try {
      rows = bulkSvc.parseSpreadsheet(req.file.buffer, originalName);
    } catch (parseErr) {
      return res.status(400).json({ error: { code: 'INVALID_SPREADSHEET', message: parseErr.message } });
    }

    if (!rows || rows.length < 2) {
      return res.status(400).json({ error: { code: 'EMPTY_SPREADSHEET', message: 'Spreadsheet must contain a header row and at least one data row' } });
    }

    const headers = rows[0].map(h => String(h || '').trim());
    const dataRows = rows.slice(1);

    if (dataRows.length > bulkSvc.MAX_BULK_ROWS) {
      return res.status(400).json({
        error: {
          code: 'ROW_LIMIT_EXCEEDED',
          message: `Spreadsheet exceeds maximum allowed rows (${bulkSvc.MAX_BULK_ROWS})`
        }
      });
    }

    // Supported fields from template
    const supportedFields = tpl.fields_json ? JSON.parse(tpl.fields_json) : ['name', 'certificate_number', 'course', 'grade', 'issue_date'];

    // Custom mapping supplied or automatic suggestion
    let mapping = {};
    if (req.body.mapping) {
      try {
        mapping = typeof req.body.mapping === 'string' ? JSON.parse(req.body.mapping) : req.body.mapping;
      } catch {}
    }
    if (!mapping || Object.keys(mapping).length === 0) {
      mapping = bulkSvc.suggestMapping(headers, supportedFields);
    }

    // Run row validation
    const validationResult = bulkSvc.validateBatchRows(dataRows, headers, mapping, tpl);

    // Persist as draft batch job
    const batchId = crypto.randomUUID();
    const now = new Date().toISOString();

    const insertBatch = db.prepare(`
      INSERT INTO batch_jobs (
        id, issuer_id, template_id, template_version, total_rows, pending_rows,
        succeeded_rows, failed_rows, skipped_rows, status, mapping_json, created_by, created_at
      ) VALUES (
        @id, @issuer_id, @template_id, @template_version, @total_rows, @pending_rows,
        0, 0, 0, 'draft', @mapping_json, @created_by, @created_at
      )
    `);

    const insertRow = db.prepare(`
      INSERT INTO batch_rows (
        id, batch_id, row_number, raw_data_json, mapped_data_json,
        validation_status, validation_errors_json, status, created_at
      ) VALUES (
        @id, @batch_id, @row_number, @raw_data_json, @mapped_data_json,
        @validation_status, @validation_errors_json, 'pending', @created_at
      )
    `);

    db.transaction(() => {
      insertBatch.run({
        id: batchId,
        issuer_id: req.user.issuer_id,
        template_id: templateId,
        template_version: tpl.version || 1,
        total_rows: validationResult.total,
        pending_rows: validationResult.valid,
        mapping_json: JSON.stringify(mapping),
        created_by: req.user.id,
        created_at: now
      });

      for (const r of validationResult.rows) {
        insertRow.run({
          id: crypto.randomUUID(),
          batch_id: batchId,
          row_number: r.row_number,
          raw_data_json: JSON.stringify(r.raw_data),
          mapped_data_json: JSON.stringify(r.mapped_data),
          validation_status: r.validation_status,
          validation_errors_json: JSON.stringify(r.errors),
          created_at: now
        });
      }
    })();

    res.json({
      ok: true,
      batch_id: batchId,
      template: {
        id: tpl.id,
        name: tpl.name,
        doc_type: tpl.doc_type,
        version: tpl.version,
        fields: supportedFields,
        required_fields: tpl.required_json ? JSON.parse(tpl.required_json) : []
      },
      headers,
      mapping,
      summary: {
        total_rows: validationResult.total,
        valid_rows: validationResult.valid,
        invalid_rows: validationResult.invalid,
        duplicate_rows: validationResult.duplicates,
        can_proceed: validationResult.valid > 0
      },
      rows_preview: validationResult.rows.slice(0, 50)
    });

  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/issue/bulk/start
 * Authenticated issuer confirms batch start
 */
router.post('/start', async (req, res, next) => {
  try {
    const { batch_id, skip_invalid = true, doc_type } = req.body || {};
    if (!batch_id) {
      return res.status(400).json({ error: { code: 'MISSING_BATCH_ID', message: 'batch_id is required' } });
    }

    const batch = ownBatch(req, res, batch_id);
    if (!batch) return;

    if (batch.status !== 'draft') {
      return res.status(400).json({ error: { code: 'INVALID_STATUS', message: `Batch is already in ${batch.status} status` } });
    }

    const tpl = templateSvc.getTemplateById(batch.template_id);
    if (!tpl) {
      return res.status(400).json({ error: { code: 'TEMPLATE_NOT_FOUND', message: 'Assigned template is no longer available' } });
    }

    const validRowsCount = db.prepare(
      "SELECT COUNT(*) as c FROM batch_rows WHERE batch_id = ? AND validation_status = 'valid'"
    ).get(batch_id).c;

    if (validRowsCount === 0) {
      return res.status(400).json({ error: { code: 'NO_VALID_ROWS', message: 'No valid rows found in this batch to issue' } });
    }

    const policy = {
      skip_invalid: !!skip_invalid,
      doc_type: doc_type || tpl.doc_type || 'academic_certificate'
    };

    db.prepare(`
      UPDATE batch_jobs
      SET status = 'pending', policy_json = ?, pending_rows = ?
      WHERE id = ?
    `).run(JSON.stringify(policy), validRowsCount, batch_id);

    // Kick off async background execution safely
    bulkSvc.processBatchAsync(batch_id, req.user).catch(err => {
      console.error(`[Bulk Error] Background batch processing failed for ${batch_id}:`, err);
    });

    res.json({
      ok: true,
      batch_id: batch_id,
      status: 'pending',
      total_rows: batch.total_rows,
      valid_rows: validRowsCount,
      message: 'Batch processing started successfully'
    });

  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/issue/bulk/jobs/:batchId
 * Query job status and progress
 */
router.get('/jobs/:batchId', (req, res) => {
  const batch = ownBatch(req, res, req.params.batchId);
  if (!batch) return;

  const rows = db.prepare(`
    SELECT id, row_number, validation_status, validation_errors_json,
           status, doc_id, error_message, mapped_data_json
    FROM batch_rows
    WHERE batch_id = ?
    ORDER BY row_number ASC
  `).all(batch.id);

  const formattedRows = rows.map(r => ({
    id: r.id,
    row_number: r.row_number,
    validation_status: r.validation_status,
    errors: r.validation_errors_json ? JSON.parse(r.validation_errors_json) : [],
    status: r.status,
    doc_id: r.doc_id,
    error_message: r.error_message,
    fields: r.mapped_data_json ? JSON.parse(r.mapped_data_json) : {},
    pdf_url: r.doc_id ? `/static/issued/${r.doc_id}.pdf` : null
  }));

  const progressPercent = batch.total_rows > 0
    ? Math.round(((batch.succeeded_rows + batch.failed_rows + batch.skipped_rows) / batch.total_rows) * 100)
    : 0;

  res.json({
    ok: true,
    batch: {
      id: batch.id,
      template_id: batch.template_id,
      status: batch.status,
      total_rows: batch.total_rows,
      pending_rows: batch.pending_rows,
      running_rows: batch.running_rows,
      succeeded_rows: batch.succeeded_rows,
      failed_rows: batch.failed_rows,
      skipped_rows: batch.skipped_rows,
      progress_percent: progressPercent,
      created_at: batch.created_at,
      started_at: batch.started_at,
      completed_at: batch.completed_at
    },
    rows: formattedRows
  });
});

/**
 * GET /api/issue/bulk/jobs/:batchId/download
 * Download ZIP archive containing all successfully issued PDFs
 */
router.get('/jobs/:batchId/download', (req, res) => {
  const batch = ownBatch(req, res, req.params.batchId);
  if (!batch) return;

  const rows = db.prepare(`
    SELECT r.row_number, r.doc_id, r.mapped_data_json, d.pdf_path
    FROM batch_rows r
    JOIN documents d ON r.doc_id = d.doc_id
    WHERE r.batch_id = ? AND r.status = 'succeeded'
    ORDER BY r.row_number ASC
  `).all(batch.id);

  if (rows.length === 0) {
    return res.status(404).json({ error: { code: 'NO_DOCUMENTS', message: 'No successfully issued documents in this batch' } });
  }

  const files = [];
  for (const r of rows) {
    if (r.pdf_path && fs.existsSync(r.pdf_path)) {
      let mapped = {};
      try { mapped = JSON.parse(r.mapped_data_json || '{}'); } catch {}
      const safeName = (mapped.name || 'certificate').replace(/[^a-zA-Z0-9_\-]/g, '_');
      const filename = `${String(r.row_number).padStart(3, '0')}_${safeName}_${r.doc_id.slice(0, 8)}.pdf`;
      const data = fs.readFileSync(r.pdf_path);
      files.push({ name: filename, data });
    }
  }

  if (files.length === 0) {
    return res.status(404).json({ error: { code: 'FILES_NOT_FOUND', message: 'Certificate files could not be located on disk' } });
  }

  const zipBuffer = bulkSvc.createZipArchive(files);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="evidentia_batch_${batch.id.slice(0, 8)}.zip"`);
  res.send(zipBuffer);
});

/**
 * GET /api/issue/bulk/jobs/:batchId/report
 * Download formula-injection safe CSV report
 */
router.get('/jobs/:batchId/report', (req, res) => {
  const batch = ownBatch(req, res, req.params.batchId);
  if (!batch) return;

  const rows = db.prepare('SELECT * FROM batch_rows WHERE batch_id = ? ORDER BY row_number ASC').all(batch.id);
  const csvData = bulkSvc.generateOutcomeReportCsv(batch, rows);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="evidentia_report_${batch.id.slice(0, 8)}.csv"`);
  res.send(csvData);
});

module.exports = router;
