const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const templateService = require('../services/template.service');
const db = require('../db');

const router = express.Router();
router.use(requireAuth, requireRole('issuer'));

router.get('/', (req, res) => {
  const templates = templateService.getAllTemplates(req.user.issuer_id);
  const formatted = templates.map(t => formatTemplate(t));
  res.json({ ok: true, templates: formatted });
});

router.get('/recommendations', (req, res) => {
  const issuerId = req.user.issuer_id;
  const issuer = db.prepare('SELECT org_type FROM issuers WHERE issuer_id = ?').get(issuerId);
  const orgType = issuer ? issuer.org_type : 'university';
  
  const recommendations = templateService.getRecommendationsByOrgType(orgType);
  const formatted = recommendations.map(t => formatTemplate(t));
  res.json({ ok: true, org_type: orgType, recommendations: formatted });
});

router.get('/backgrounds', (req, res) => {
  const backgrounds = templateService.listIssuerBackgrounds(req.user.issuer_id);
  res.json({ ok: true, backgrounds });
});

router.post('/backgrounds', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { code: 'FILE_REQUIRED', message: 'A background file is required' } });
    }
    const asset = await templateService.saveBackgroundAsset({
      issuerId: req.user.issuer_id,
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      displayName: req.body.display_name
    });
    res.status(201).json({ ok: true, asset });
  } catch (err) {
    res.status(err.status || 400).json({
      error: { code: err.code || 'UPLOAD_FAILED', message: err.message }
    });
  }
});

router.get('/backgrounds/:assetId', (req, res) => {
  const fileData = templateService.getBackgroundAsset(req.params.assetId, req.user.issuer_id);
  if (!fileData) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Background not found or unauthorized' } });
  }

  res.setHeader('Content-Type', fileData.asset.mime_type);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(fileData.buffer);
});

router.post('/custom', (req, res) => {
  try {
    const created = templateService.createCustomTemplate(req.user.issuer_id, req.body || {});
    res.status(201).json({ ok: true, template: formatTemplate(created) });
  } catch (err) {
    res.status(err.status || 400).json({
      error: { code: 'CREATE_FAILED', message: err.message }
    });
  }
});

router.put('/custom/:templateId', (req, res) => {
  try {
    const updated = templateService.updateCustomTemplate(req.user.issuer_id, req.params.templateId, req.body || {});
    res.json({ ok: true, template: formatTemplate(updated) });
  } catch (err) {
    res.status(err.status || 400).json({
      error: { code: 'UPDATE_FAILED', message: err.message }
    });
  }
});

router.post('/preview', async (req, res) => {
  try {
    const result = await templateService.generatePreview(req.user.issuer_id, req.body || {});
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({
      error: { code: 'PREVIEW_FAILED', message: err.message }
    });
  }
});

router.get('/:templateId', (req, res) => {
  const t = templateService.getTemplateById(req.params.templateId);
  if (!t) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Template not found' } });
  }
  
  if (t.is_system !== 1 && t.issuer_id !== req.user.issuer_id) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not allowed to access this template' } });
  }
  
  res.json({
    ok: true,
    template: formatTemplate(t)
  });
});

function formatTemplate(t) {
  return {
    ...t,
    fields: safeJsonArray(t.fields_json),
    required_fields: safeJsonArray(t.required_json),
    org_types: safeJsonArray(t.org_types_json),
    tags: safeJsonArray(t.tags_json),
    layout_config: safeJsonObject(t.layout_config_json)
  };
}

function safeJsonArray(str) {
  try {
    const val = JSON.parse(str);
    return Array.isArray(val) ? val : [];
  } catch (e) {
    return [];
  }
}

function safeJsonObject(str) {
  try {
    const val = JSON.parse(str);
    return (val && typeof val === 'object') ? val : null;
  } catch (e) {
    return null;
  }
}

module.exports = router;
