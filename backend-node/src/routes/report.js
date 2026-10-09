// Report download. Numeric id only + basename join => no path traversal.
const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/:verificationId', optionalAuth, (req, res) => {
  const id = Number(req.params.verificationId);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: { code: 'BAD_ID', message: 'Verification id must be a positive integer' } });
  }
  const row = db.prepare('SELECT id, report_path, created_at FROM verifications WHERE id = ?').get(id);
  if (!row || !row.report_path || !fs.existsSync(row.report_path)) {
    return res.status(404).json({ error: { code: 'REPORT_NOT_FOUND', message: 'No report is stored for that verification' } });
  }
  const safe = path.resolve(path.dirname(row.report_path), path.basename(row.report_path));
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="agnitia-report-${id}.pdf"`);
  fs.createReadStream(safe).pipe(res);
});

module.exports = router;
