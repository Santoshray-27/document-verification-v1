const test = require('node:test');
const assert = require('node:assert');
const db = require('../backend-node/src/db');
const templateService = require('../backend-node/src/services/template.service');

// Initialize DB schema to ensure it's up to date
db.migrate();

test('Templates are seeded correctly on boot', () => {
  const all = templateService.getAllTemplates();
  assert.ok(all.length >= 6, 'Should seed at least 6 default templates');
  
  const acad = all.find(t => t.id === 'tpl_acad_01');
  assert.ok(acad, 'Academic certificate should exist');
  assert.strictEqual(acad.category, 'COLLEGES AND UNIVERSITIES');
  assert.strictEqual(acad.doc_type, 'academic_certificate');
});

test('Recommendations by organization type', () => {
  const uni = templateService.getRecommendationsByOrgType('university');
  assert.ok(uni.some(t => t.id === 'tpl_acad_01'));
  assert.ok(!uni.some(t => t.id === 'tpl_emp_01'), 'Should not recommend company offer to university');

  const comp = templateService.getRecommendationsByOrgType('company');
  assert.ok(comp.some(t => t.id === 'tpl_emp_01'));
  assert.ok(!comp.some(t => t.id === 'tpl_acad_01'), 'Should not recommend acad cert to company');
});

test('Unknown template ID returns undefined/null', () => {
  const t = templateService.getTemplateById('unknown_xyz_123');
  assert.strictEqual(t, undefined);
});

test('Schema correctly serializes fields as JSON strings', () => {
  const acad = templateService.getTemplateById('tpl_acad_01');
  const fields = JSON.parse(acad.fields_json);
  assert.ok(Array.isArray(fields));
  assert.ok(fields.includes('name'));
  assert.ok(fields.includes('course'));
  assert.ok(fields.includes('grade'));
  assert.ok(fields.includes('certificate_number'));
});

test('Database persistence handles duplicates gracefully via seed method', () => {
  const oldCount = db.prepare('SELECT COUNT(*) as c FROM templates').get().c;
  
  templateService.seedTemplates();
  
  const newCount = db.prepare('SELECT COUNT(*) as c FROM templates').get().c;
  assert.strictEqual(oldCount, newCount, 'Seeding twice should not duplicate templates');
});
