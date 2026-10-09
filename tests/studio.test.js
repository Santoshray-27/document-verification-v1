const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const db = require('../backend-node/src/db');
const templateService = require('../backend-node/src/services/template.service');

db.migrate();

// Synthetic 1x1 PNG image buffer
const SAMPLE_PNG = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
  0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10,
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x91, 0x68,
  0x36, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
  0x44, 0xAE, 0x42, 0x60, 0x82
]);

// Synthetic PDF buffer
const SAMPLE_PDF = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n");

const TEST_ISSUER_1 = 'iss_studio_test_1';
const TEST_ISSUER_2 = 'iss_studio_test_2';

test.before(() => {
  const now = new Date().toISOString();
  db.prepare("INSERT OR IGNORE INTO issuers (issuer_id, name, org_type, status, created_at) VALUES (?, ?, 'university', 'active', ?)").run(TEST_ISSUER_1, 'Studio Uni 1', now);
  db.prepare("INSERT OR IGNORE INTO issuers (issuer_id, name, org_type, status, created_at) VALUES (?, ?, 'company', 'active', ?)").run(TEST_ISSUER_2, 'Studio Corp 2', now);
});

test('Sniff background mime validates PNG, JPEG, and PDF', () => {
  assert.strictEqual(templateService.sniffBackgroundMime(SAMPLE_PNG), 'image/png');
  assert.strictEqual(templateService.sniffBackgroundMime(SAMPLE_PDF), 'application/pdf');
  assert.strictEqual(templateService.sniffBackgroundMime(Buffer.from('not an image or pdf')), null);
});

test('Background upload stores asset and enforces limits', async () => {
  const asset = await templateService.saveBackgroundAsset({
    issuerId: TEST_ISSUER_1,
    buffer: SAMPLE_PNG,
    originalname: 'diploma-bg.png',
    displayName: 'Diploma Parchment'
  });

  assert.ok(asset.id.startsWith('bg_'));
  assert.strictEqual(asset.display_name, 'Diploma Parchment');
  assert.strictEqual(asset.mime_type, 'image/png');

  const loaded = templateService.getBackgroundAsset(asset.id, TEST_ISSUER_1);
  assert.ok(loaded);
  assert.strictEqual(loaded.asset.id, asset.id);

  // Cross-tenant access denied
  const crossTenant = templateService.getBackgroundAsset(asset.id, TEST_ISSUER_2);
  assert.strictEqual(crossTenant, null);
});

test('Create, version, and publish custom template', () => {
  const custom = templateService.createCustomTemplate(TEST_ISSUER_1, {
    name: 'Hackathon Winner 2026',
    doc_type: 'academic_certificate',
    category: 'EVENTS AND HACKATHONS',
    description: 'Custom certificate for grand prize winners',
    fields: ['name', 'course', 'grade'],
    required_fields: ['name'],
    layout_config: {
      fields: [
        { key: 'name', x: 297, y: 320, font: 'Times-Bold', font_size: 26, align: 'center', color: '#1B2437' },
        { key: 'course', x: 297, y: 380, font: 'Helvetica', font_size: 12, align: 'center', color: '#1B2437' }
      ]
    },
    publish: false // Draft
  });

  assert.ok(custom.id.startsWith('tpl_custom_'));
  assert.strictEqual(custom.status, 'draft');
  assert.strictEqual(custom.version, 1);
  assert.strictEqual(custom.name, 'Hackathon Winner 2026');

  // Publish version
  const published = templateService.updateCustomTemplate(TEST_ISSUER_1, custom.id, {
    publish: true
  });

  assert.strictEqual(published.status, 'published');
  assert.strictEqual(published.version, 1);

  // Updating a published template increments version
  const v2 = templateService.updateCustomTemplate(TEST_ISSUER_1, custom.id, {
    description: 'Updated description for v2',
    publish: true
  });

  assert.strictEqual(v2.version, 2);
  assert.strictEqual(v2.description, 'Updated description for v2');
});

test('Issuer cannot modify or delete another issuer custom template', () => {
  const tpl = templateService.createCustomTemplate(TEST_ISSUER_1, {
    name: 'Private Template Uni 1',
    publish: true
  });

  assert.throws(() => {
    templateService.updateCustomTemplate(TEST_ISSUER_2, tpl.id, {
      name: 'Hacked by Corp 2'
    });
  }, /Unauthorized to modify this template/);
});

test('Custom template is visible in issuer template catalog', () => {
  const all1 = templateService.getAllTemplates(TEST_ISSUER_1);
  assert.ok(all1.some(t => t.name === 'Hackathon Winner 2026'));

  // Another issuer should not see Issuer 1's custom template
  const all2 = templateService.getAllTemplates(TEST_ISSUER_2);
  assert.ok(!all2.some(t => t.name === 'Hackathon Winner 2026'));
});
