const db = require('../db');

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
  }
];

function seedTemplates() {
  const checkStmt = db.prepare('SELECT id FROM templates WHERE id = ?');
  const insertStmt = db.prepare(`
    INSERT INTO templates (
      id, name, doc_type, category, description, fields_json, required_json, 
      org_types_json, tags_json, is_system, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?
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

function getAllTemplates() {
  return db.prepare('SELECT * FROM templates WHERE is_system = 1 OR issuer_id IS NOT NULL').all();
}

function getTemplateById(id) {
  return db.prepare('SELECT * FROM templates WHERE id = ?').get(id);
}

function getRecommendationsByOrgType(orgType) {
  const type = (orgType || 'university').toLowerCase();
  const stmt = db.prepare('SELECT * FROM templates WHERE org_types_json LIKE ? AND is_system = 1');
  return stmt.all(`%${type}%`);
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
  seedTemplates
};
