// Verify routes: multipart upload -> job -> polled result. Login is optional (anonymous allowed).
const express = require('express');
const jobs = require('../jobs');
const verificationSvc = require('../services/verification.service');
const { upload } = require('../middleware/upload');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/start', optionalAuth, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return next(err);
    if (!req.file) return res.status(400).json({ error: { code: 'NO_FILE', message: 'Attach a PDF, PNG or JPEG file' } });
    try {
      const manualDocId = req.body?.doc_id ? String(req.body.doc_id).trim() : null;
      const jobId = verificationSvc.startVerifyJob({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        manualDocId,
        verifier: req.user || null,
      });
      res.json({ ok: true, job_id: jobId });
    } catch (e) {
      next(e);
    }
  });
});

router.get('/jobs/:jobId', optionalAuth, (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: { code: 'JOB_NOT_FOUND', message: 'Unknown or expired job' } });
  if (job.type !== 'verify') return res.status(404).json({ error: { code: 'JOB_NOT_FOUND', message: 'Not a verification job' } });
  res.json(job);
});

router.get('/jobs/:jobId/result', optionalAuth, (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: { code: 'JOB_NOT_FOUND', message: 'Unknown or expired job' } });
  if (job.status === 'running') return res.status(202).json({ ok: false, status: 'running', progress: job.progress });
  if (job.status === 'failed') return res.status(500).json({ error: { code: 'VERIFICATION_FAILED', message: job.error } });
  res.json({ ok: true, ...job.result });
});

module.exports = router;
