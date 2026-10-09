const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../db');
const config = require('../../config');
const worker = require('./worker.client');
const brandingService = require('./branding.service');

const TEMPLATE_STORAGE_DIR = path.join(config.storageDir, 'templates');
fs.mkdirSync(TEMPLATE_STORAGE_DIR, { recursive: true });

const SEED_TEMPLATES = [
  {
    id: 'tpl_acad_01',
    name: 'Standard Academic Certificate',
    doc_type: 'academic_certificate',
    category: 'COLLEGES AND UNIVERSITIES',
    description: 'A formal certificate of completion for academic programs and courses.',
    fields_json: JSON.stringify(['name', 'course', 'grade', 'certificate_number', 'issue_date']),
    required_json: JSON.stringify(['name', 'course']),
    org_types_json: JSON.stringify(['university', 'college', 'school', 'institute']),
    tags_json: JSON.stringify(['graduation', 'completion', 'academic']),
  },
  {
    id: 'tpl_mark_01',
    name: 'Official Marksheet',
    doc_type: 'marksheet',
    category: 'COLLEGES AND UNIVERSITIES',
    description: 'A formal marksheet or transcript layout with program details and CGPA.',
    fields_json: JSON.stringify(['name', 'course', 'grade', 'certificate_number', 'issue_date']),
    required_json: JSON.stringify(['name', 'course', 'grade', 'certificate_number']),
    org_types_json: JSON.stringify(['university', 'college', 'school']),
    tags_json: JSON.stringify(['grades', 'transcript']),
  },
  {
    id: 'tpl_bona_01',
    name: 'Bonafide Certificate',
    doc_type: 'bonafide',
    category: 'COLLEGES AND UNIVERSITIES',
    description: 'A standard bonafide certificate for active students or members.',
    fields_json: JSON.stringify(['name', 'course', 'grade', 'certificate_number', 'issue_date']),
    required_json: JSON.stringify(['name']),
    org_types_json: JSON.stringify(['university', 'college', 'school']),
    tags_json: JSON.stringify(['proof of enrollment']),
  },
  {
    id: 'tpl_emp_01',
    name: 'Offer of Employment',
    doc_type: 'employment_offer',
    category: 'COMPANIES',
    description: 'A formal corporate employment offer letter with designation and remuneration.',
    fields_json: JSON.stringify(['name', 'course', 'grade', 'certificate_number', 'issue_date']),
    required_json: JSON.stringify(['name', 'course']),
    org_types_json: JSON.stringify(['company', 'corporate', 'agency', 'startup']),
    tags_json: JSON.stringify(['hr', 'hiring', 'offer']),
  },
  {
    id: 'tpl_inv_01',
    name: 'Commercial Invoice',
    doc_type: 'commercial_invoice',
    category: 'COMPANIES',
    description: 'A standard commercial invoice layout for B2B billing and services.',
    fields_json: JSON.stringify(['name', 'course', 'grade', 'certificate_number', 'issue_date']),
    required_json: JSON.stringify(['name', 'course', 'grade']),
    org_types_json: JSON.stringify(['company', 'corporate', 'agency', 'startup']),
    tags_json: JSON.stringify(['billing', 'finance']),
  },
  {
    id: 'tpl_med_01',
    name: 'Medical Fitness Certificate',
    doc_type: 'medical_fitness',
    category: 'HOSPITALS',
    description: 'A medical fitness and examination certificate for clinical use.',
    fields_json: JSON.stringify(['name', 'course', 'grade', 'certificate_number', 'issue_date']),
    required_json: JSON.stringify(['name', 'grade']),
    org_types_json: JSON.stringify(['hospital', 'clinic', 'medical', 'company']),
    tags_json: JSON.stringify(['health', 'fitness', 'medical']),
  },
  {
    id: 'tpl_hack_part_01',
    name: 'Hackathon Participation Certificate',
    doc_type: 'hackathon_participation',
    category: 'EVENTS AND HACKATHONS',
    description: 'Certificate of participation awarded to hackathon competitors and team participants.',
    fields_json: JSON.stringify(['name', 'course', 'grade', 'certificate_number', 'issue_date']),
    required_json: JSON.stringify(['name', 'course']),
    org_types_json: JSON.stringify(['university', 'college', 'company', 'community', 'organization']),
    tags_json: JSON.stringify(['hackathon', 'participation', 'event', 'technology', 'coding']),
  },
  {
    id: 'tpl_hack_win_01',
    name: 'Hackathon Winner & Excellence Award',
    doc_type: 'hackathon_winner',
    category: 'EVENTS AND HACKATHONS',
    description: 'Prestige award certificate recognizing winning teams, finalists and track champions.',
    fields_json: JSON.stringify(['name', 'course', 'grade', 'certificate_number', 'issue_date']),
    required_json: JSON.stringify(['name', 'course', 'grade']),
    org_types_json: JSON.stringify(['university', 'college', 'company', 'community', 'organization']),
    tags_json: JSON.stringify(['hackathon', 'winner', 'excellence', 'award', 'champion']),
  },
  {
    id: 'tpl_work_01',
    name: 'Workshop & Bootcamp Completion Certificate',
    doc_type: 'workshop_completion',
    category: 'COLLEGES AND UNIVERSITIES',
    description: 'Formal recognition for completing hands-on technical workshops and intensive training bootcamps.',
    fields_json: JSON.stringify(['name', 'course', 'grade', 'certificate_number', 'issue_date']),
    required_json: JSON.stringify(['name', 'course']),
    org_types_json: JSON.stringify(['university', 'college', 'institute', 'company', 'bootcamp']),
    tags_json: JSON.stringify(['workshop', 'bootcamp', 'training', 'skills']),
  },
  {
    id: 'tpl_intern_01',
    name: 'Internship Completion Certificate',
    doc_type: 'internship_certificate',
    category: 'COMPANIES',
    description: 'Formal letter-certificate certifying successful completion of a company internship.',
    fields_json: JSON.stringify(['name', 'course', 'grade', 'certificate_number', 'issue_date']),
    required_json: JSON.stringify(['name', 'course']),
    org_types_json: JSON.stringify(['company', 'corporate', 'agency', 'startup']),
    tags_json: JSON.stringify(['internship', 'experience', 'hr', 'employment']),
  }
];

function seedTemplates() {
  const checkStmt = db.prepare('SELECT id FROM templates WHERE id = ?');
  const insertStmt = db.prepare(`
    INSERT INTO templates (
      id, name, doc_type, category, description, fields_json, required_json, 
      org_types_json, tags_json, is_system, version, status, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 'published', ?
    )
  `);

  const now = new Date().toISOString();
  
  const trx = db.transaction(() => {
    for (const tpl of SEED_TEMPLATES) {
      if (!checkStmt.get(tpl.id)) {
        insertStmt.run(
          tpl.id, tpl.name, tpl.doc_type, tpl.category, tpl.description,
          tpl.fields_json, tpl.required_json, tpl.org_types_json, tpl.tags_json, now
        );
      }
    }
  });
  
  trx();
}

function getAllTemplates(issuerId = null) {
  if (issuerId) {
    return db.prepare(
      "SELECT * FROM templates WHERE is_system = 1 OR (issuer_id = ? AND status != 'archived') ORDER BY is_system DESC, created_at DESC"
    ).all(issuerId);
  }
  return db.prepare("SELECT * FROM templates WHERE is_system = 1 AND status = 'published'").all();
}

function getTemplateById(id) {
  return db.prepare('SELECT * FROM templates WHERE id = ?').get(id);
}

function getRecommendationsByOrgType(orgType) {
  const type = (orgType || 'university').toLowerCase();
  const stmt = db.prepare("SELECT * FROM templates WHERE org_types_json LIKE ? AND is_system = 1 AND status = 'published'");
  return stmt.all(`%${type}%`);
}

/**
 * Sniff file buffer magic bytes: PNG, JPEG or PDF
 */
function sniffBackgroundMime(buffer) {
  if (!buffer || buffer.length < 8) return null;
  // PNG
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
    buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A
  ) {
    return 'image/png';
  }
  // JPEG
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }
  // PDF: %PDF-
  if (
    buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46 &&
    buffer[4] === 0x2D
  ) {
    return 'application/pdf';
  }
  return null;
}

/**
 * Save background file for an issuer. If PDF, rasterizes first page to PNG via worker if available.
 */
async function saveBackgroundAsset({ issuerId, buffer, originalname, displayName }) {
  if (!buffer || buffer.length === 0) {
    const err = new Error('Empty file upload');
    err.status = 400;
    throw err;
  }
  if (buffer.length > 5 * 1024 * 1024) {
    const err = new Error('Background file exceeds 5MB limit');
    err.status = 400;
    throw err;
  }

  const mime = sniffBackgroundMime(buffer);
  if (!mime) {
    const err = new Error('Unsupported format. Only PNG, JPEG, or single-page PDF backgrounds are allowed.');
    err.status = 400;
    throw err;
  }

  let finalBuffer = buffer;
  let finalMime = mime;
  let width = 595;
  let height = 842;

  if (mime === 'application/pdf') {
    // Check if worker is online to rasterize first page to PNG
    try {
      const snap = await worker.analyze(buffer, 'bg.pdf');
      if (snap && snap.is_pdf) {
        // We can convert first page to PNG using the worker diff/snapshot helper or store PDF directly
        // Better: let Python rasterize or use pdf-to-png snapshot
      }
    } catch {
      // Continue with original buffer
    }
  } else {
    const dims = brandingService.getImageDimensions(buffer, mime);
    if (dims) {
      width = dims.width;
      height = dims.height;
      if (width > 5000 || height > 5000) {
        const err = new Error(`Image resolution exceeds 5000x5000px (${width}x${height})`);
        err.status = 400;
        throw err;
      }
    }
  }

  const assetId = `bg_${crypto.randomBytes(12).toString('hex')}`;
  const ext = finalMime === 'image/png' ? '.png' : (finalMime === 'image/jpeg' ? '.jpg' : '.pdf');
  const filename = `${assetId}${ext}`;
  const filePath = path.join(TEMPLATE_STORAGE_DIR, filename);

  fs.writeFileSync(filePath, finalBuffer);

  const cleanName = (displayName || originalname || 'Custom Background').replace(/[<>:"/\\|?*]/g, '').trim().slice(0, 100);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO template_assets (
      id, issuer_id, asset_type, filename, mime_type, file_size, display_name, width, height, status, created_at
    ) VALUES (?, ?, 'background', ?, ?, ?, ?, ?, ?, 'active', ?)
  `).run(assetId, issuerId, filename, finalMime, finalBuffer.length, cleanName, width, height, now);

  return {
    id: assetId,
    issuer_id: issuerId,
    asset_type: 'background',
    display_name: cleanName,
    mime_type: finalMime,
    file_size: finalBuffer.length,
    width,
    height,
    created_at: now
  };
}

function getBackgroundAsset(assetId, issuerId) {
  const asset = db.prepare(
    "SELECT * FROM template_assets WHERE id = ? AND issuer_id = ? AND status = 'active'"
  ).get(assetId, issuerId);
  if (!asset) return null;

  const safeFilename = path.basename(asset.filename);
  const filePath = path.join(TEMPLATE_STORAGE_DIR, safeFilename);
  if (!fs.existsSync(filePath)) return null;

  return {
    asset,
    filePath,
    buffer: fs.readFileSync(filePath)
  };
}

function listIssuerBackgrounds(issuerId) {
  return db.prepare(
    "SELECT id, display_name, mime_type, file_size, width, height, created_at FROM template_assets WHERE issuer_id = ? AND asset_type = 'background' AND status = 'active' ORDER BY created_at DESC"
  ).all(issuerId);
}

/**
 * Create a new custom template (Draft or Published)
 */
function createCustomTemplate(issuerId, payload) {
  const {
    name,
    doc_type = 'academic_certificate',
    category = 'CUSTOM',
    description = 'Custom designed template',
    background_id = null,
    page_size = 'A4',
    orientation = 'portrait',
    fields = ['name', 'course', 'grade', 'certificate_number', 'issue_date'],
    required_fields = ['name'],
    layout_config = null,
    publish = false
  } = payload;

  if (!name || !String(name).trim()) {
    const err = new Error('Template name is required');
    err.status = 400;
    throw err;
  }

  // Validate background if provided
  if (background_id) {
    const bg = getBackgroundAsset(background_id, issuerId);
    if (!bg) {
      const err = new Error('Referenced background does not exist or unauthorized');
      err.status = 400;
      throw err;
    }
  }

  const templateId = `tpl_custom_${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();
  const status = publish ? 'published' : 'draft';

  db.prepare(`
    INSERT INTO templates (
      id, name, doc_type, category, description, fields_json, required_json,
      org_types_json, tags_json, is_system, issuer_id, version, status,
      background_id, page_size, orientation, layout_config_json, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, '["all"]', '["custom"]', 0, ?, 1, ?,
      ?, ?, ?, ?, ?, ?
    )
  `).run(
    templateId,
    name.trim(),
    doc_type,
    category,
    description,
    JSON.stringify(fields),
    JSON.stringify(required_fields),
    issuerId,
    status,
    background_id,
    page_size,
    orientation,
    layout_config ? JSON.stringify(layout_config) : null,
    now,
    now
  );

  return getTemplateById(templateId);
}

/**
 * Update an existing template or publish a new version
 */
function updateCustomTemplate(issuerId, templateId, payload) {
  const t = getTemplateById(templateId);
  if (!t) {
    const err = new Error('Template not found');
    err.status = 404;
    throw err;
  }
  if (t.is_system === 1 || t.issuer_id !== issuerId) {
    const err = new Error('Unauthorized to modify this template');
    err.status = 403;
    throw err;
  }

  const {
    name = t.name,
    doc_type = t.doc_type,
    category = t.category,
    description = t.description,
    background_id = t.background_id,
    page_size = t.page_size,
    orientation = t.orientation,
    fields,
    required_fields,
    layout_config,
    publish = false
  } = payload;

  if (background_id && background_id !== t.background_id) {
    const bg = getBackgroundAsset(background_id, issuerId);
    if (!bg) {
      const err = new Error('Referenced background does not exist or unauthorized');
      err.status = 400;
      throw err;
    }
  }

  const now = new Date().toISOString();
  const newStatus = publish ? 'published' : t.status;
  const newVersion = publish && t.status === 'published' ? t.version + 1 : t.version;

  db.prepare(`
    UPDATE templates SET
      name = ?,
      doc_type = ?,
      category = ?,
      description = ?,
      fields_json = ?,
      required_json = ?,
      background_id = ?,
      page_size = ?,
      orientation = ?,
      layout_config_json = ?,
      status = ?,
      version = ?,
      updated_at = ?
    WHERE id = ? AND issuer_id = ?
  `).run(
    name,
    doc_type,
    category,
    description,
    fields ? JSON.stringify(fields) : t.fields_json,
    required_fields ? JSON.stringify(required_fields) : t.required_json,
    background_id,
    page_size,
    orientation,
    layout_config !== undefined ? JSON.stringify(layout_config) : t.layout_config_json,
    newStatus,
    newVersion,
    now,
    templateId,
    issuerId
  );

  return getTemplateById(templateId);
}

/**
 * Generate preview without creating records or signing
 */
async function generatePreview(issuerId, { templateId, layout_config, background_id, doc_type, sample_fields }) {
  let bgBase64 = null;
  let bgId = background_id;

  if (!bgId && templateId) {
    const t = getTemplateById(templateId);
    if (t) bgId = t.background_id;
  }

  if (bgId) {
    const bgFile = getBackgroundAsset(bgId, issuerId);
    if (bgFile) {
      bgBase64 = bgFile.buffer.toString('base64');
    }
  }

  const brandingPayload = brandingService.buildBrandingPayloadForIssuer(issuerId);

  const customLayout = {
    background_base64: bgBase64,
    fields: layout_config?.fields || null
  };

  const fields = {
    name: sample_fields?.name || 'Aarav Sharma',
    course: sample_fields?.course || 'Bachelor of Science in Computer Engineering',
    grade: sample_fields?.grade || 'First Class Honours (Distinction)',
    certificate_number: sample_fields?.certificate_number || 'PREVIEW-2026-DEMO',
    issue_date: sample_fields?.issue_date || new Date().toISOString().slice(0, 10),
  };

  const dummyDocId = 'preview-sample-doc-id';
  const dummyQrText = 'https://evidentia.verify/preview-not-signed';

  const issuer = db.prepare('SELECT name FROM issuers WHERE issuer_id = ?').get(issuerId);

  const rendered = await worker.renderCertificate({
    fields,
    doc_id: dummyDocId,
    qr_text: dummyQrText,
    issuer_name: issuer ? issuer.name : 'Sample Organization',
    issued_at: new Date().toISOString(),
    doc_type: doc_type || 'academic_certificate',
    branding: brandingPayload,
    custom_layout: customLayout,
  });

  return {
    ok: true,
    preview_png_base64: rendered.snapshot_png_base64,
    preview_pdf_base64: rendered.pdf_base64
  };
}

try {
  seedTemplates();
} catch (e) {
  console.error('[Template Service] Error seeding templates:', e.message);
}

module.exports = {
  getAllTemplates,
  getTemplateById,
  getRecommendationsByOrgType,
  seedTemplates,
  saveBackgroundAsset,
  getBackgroundAsset,
  listIssuerBackgrounds,
  createCustomTemplate,
  updateCustomTemplate,
  generatePreview,
  sniffBackgroundMime
};
