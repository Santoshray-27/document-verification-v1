const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const brandingService = require('../services/branding.service');

const router = express.Router();
router.use(requireAuth, requireRole('issuer'));

// GET /api/branding - Get authenticated issuer's branding profile and assets
router.get('/', (req, res) => {
  const profile = brandingService.getIssuerBranding(req.user.issuer_id);
  res.json({ ok: true, branding: profile });
});

// PUT /api/branding - Update branding colors and selected asset slots
router.put('/', (req, res) => {
  try {
    const updated = brandingService.updateIssuerBranding(req.user.issuer_id, req.body || {});
    res.json({ ok: true, branding: updated });
  } catch (err) {
    res.status(err.status || 500).json({ error: { code: 'UPDATE_FAILED', message: err.message } });
  }
});

// POST /api/branding/assets - Upload a new branding asset
router.post('/assets', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { code: 'FILE_REQUIRED', message: 'An image file is required' } });
    }

    const { asset_type: assetType, display_name: displayName } = req.body;
    const asset = brandingService.saveAsset({
      issuerId: req.user.issuer_id,
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      assetType,
      displayName
    });

    res.status(201).json({ ok: true, asset });
  } catch (err) {
    res.status(err.status || 400).json({
      error: { code: err.code || 'UPLOAD_FAILED', message: err.message }
    });
  }
});

// GET /api/branding/assets/:assetId - Securely retrieve/preview an asset
router.get('/assets/:assetId', (req, res) => {
  const fileData = brandingService.getAssetFile(req.params.assetId, req.user.issuer_id);
  if (!fileData) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Asset not found or unauthorized' } });
  }

  res.setHeader('Content-Type', fileData.asset.mime_type);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(fileData.buffer);
});

// DELETE /api/branding/assets/:assetId - Soft delete asset and unlink from profile
router.delete('/assets/:assetId', (req, res) => {
  const deleted = brandingService.deleteAsset(req.params.assetId, req.user.issuer_id);
  if (!deleted) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Asset not found or unauthorized' } });
  }
  res.json({ ok: true, deleted: true });
});

module.exports = router;
