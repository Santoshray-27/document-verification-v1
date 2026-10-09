const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const templateService = require('../services/template.service');
const db = require('../db');

const router = express.Router();
router.use(requireAuth, requireRole('issuer'));

router.get('/', (req, res) => {
  const templates = templateService.getAllTemplates();
  // Safe JSON parsing for arrays
  const formatted = templates.map(t => ({
    ...t,
    fields: safeJsonArray(t.fields_json),
    required_fields: safeJsonArray(t.required_json),
    org_types: safeJsonArray(t.org_types_json),
    tags: safeJsonArray(t.tags_json)
  }));
  res.json({ ok: true, templates: formatted });
});

router.get('/recommendations', (req, res) => {
  // Get authenticated issuer's org_type
  const issuerId = req.user.issuer_id;
  const issuer = db.prepare('SELECT org_type FROM issuers WHERE issuer_id = ?').get(issuerId);
  const orgType = issuer ? issuer.org_type : 'university';
  
  const recommendations = templateService.getRecommendationsByOrgType(orgType);
  const formatted = recommendations.map(t => ({
    ...t,
    fields: safeJsonArray(t.fields_json),
    required_fields: safeJsonArray(t.required_json),
    org_types: safeJsonArray(t.org_types_json),
    tags: safeJsonArray(t.tags_json)
  }));
  res.json({ ok: true, org_type: orgType, recommendations: formatted });
});

router.get('/:templateId', (req, res) => {
  const t = templateService.getTemplateById(req.params.templateId);
  if (!t) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Template not found' } });
  }
  
  // Ensure it's either a system template or belongs to this issuer
  if (t.is_system !== 1 && t.issuer_id !== req.user.issuer_id) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not allowed to access this template' } });
  }
  
  res.json({
    ok: true,
    template: {
      ...t,
      fields: safeJsonArray(t.fields_json),
      required_fields: safeJsonArray(t.required_json),
      org_types: safeJsonArray(t.org_types_json),
      tags: safeJsonArray(t.tags_json)
    }
  });
});

function safeJsonArray(str) {
  try {
    const val = JSON.parse(str);
    return Array.isArray(val) ? val : [];
  } catch (e) {
    return [];
  }
}

module.exports = router;
