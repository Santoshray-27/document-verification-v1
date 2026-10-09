const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const db = require('../backend-node/src/db');
const brandingService = require('../backend-node/src/services/branding.service');

db.migrate();

// Synthetic 1x1 PNG image buffer
const SAMPLE_PNG = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG magic
  0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR header
  0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10, // 16x16
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x91, 0x68,
  0x36, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
  0x44, 0xAE, 0x42, 0x60, 0x82
]);

// Synthetic JPEG buffer
const SAMPLE_JPEG = Buffer.from([
  0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
  0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60,
  0x00, 0x60, 0x00, 0x00, 0xFF, 0xC0, 0x00, 0x0B, // SOF0
  0x08, 0x00, 0x14, 0x00, 0x14, 0x01, 0x01, 0x11, // 20x20
  0x00, 0xFF, 0xD9
]);

const TEST_ISSUER_1 = 'iss_brand_test_1';
const TEST_ISSUER_2 = 'iss_brand_test_2';

test.before(() => {
  // Ensure test issuers exist
  const now = new Date().toISOString();
  db.prepare("INSERT OR IGNORE INTO issuers (issuer_id, name, org_type, status, created_at) VALUES (?, ?, 'university', 'active', ?)").run(TEST_ISSUER_1, 'Test Uni 1', now);
  db.prepare("INSERT OR IGNORE INTO issuers (issuer_id, name, org_type, status, created_at) VALUES (?, ?, 'company', 'active', ?)").run(TEST_ISSUER_2, 'Test Corp 2', now);
});

test('Image sniffing detects valid PNG and JPEG formats', () => {
  assert.strictEqual(brandingService.sniffImageMime(SAMPLE_PNG), 'image/png');
  assert.strictEqual(brandingService.sniffImageMime(SAMPLE_JPEG), 'image/jpeg');
  assert.strictEqual(brandingService.sniffImageMime(Buffer.from('not an image at all')), null);
  assert.strictEqual(brandingService.sniffImageMime(Buffer.from('<svg></svg>')), null);
});

test('Image dimension parsing extracts width and height safely', () => {
  const pngDims = brandingService.getImageDimensions(SAMPLE_PNG, 'image/png');
  assert.ok(pngDims);
  assert.strictEqual(pngDims.width, 16);
  assert.strictEqual(pngDims.height, 16);

  const jpgDims = brandingService.getImageDimensions(SAMPLE_JPEG, 'image/jpeg');
  assert.ok(jpgDims);
  assert.strictEqual(jpgDims.width, 20);
  assert.strictEqual(jpgDims.height, 20);
});

test('Asset upload validates file format and enforces security boundaries', () => {
  // Reject non-image
  assert.throws(() => {
    brandingService.saveAsset({
      issuerId: TEST_ISSUER_1,
      buffer: Buffer.from('console.log("hack")'),
      originalname: 'malicious.js',
      assetType: 'primary_logo',
      displayName: 'Exploit'
    });
  }, /Unsupported or malformed image format/);

  // Reject invalid asset type
  assert.throws(() => {
    brandingService.saveAsset({
      issuerId: TEST_ISSUER_1,
      buffer: SAMPLE_PNG,
      originalname: 'logo.png',
      assetType: 'arbitrary_type',
      displayName: 'Invalid'
    });
  }, /Invalid asset_type/);

  // Accept valid PNG
  const saved = brandingService.saveAsset({
    issuerId: TEST_ISSUER_1,
    buffer: SAMPLE_PNG,
    originalname: 'logo.png',
    assetType: 'primary_logo',
    displayName: 'Uni Logo'
  });

  assert.ok(saved.id.startsWith('ast_'));
  assert.strictEqual(saved.mime_type, 'image/png');
  assert.strictEqual(saved.display_name, 'Uni Logo');
});

test('Issuer authorization prevents cross-tenant asset access', () => {
  const asset1 = brandingService.saveAsset({
    issuerId: TEST_ISSUER_1,
    buffer: SAMPLE_PNG,
    originalname: 'uni.png',
    assetType: 'primary_logo',
    displayName: 'Uni 1 Logo'
  });

  // Issuer 1 can access
  const access1 = brandingService.getAssetFile(asset1.id, TEST_ISSUER_1);
  assert.ok(access1);
  assert.strictEqual(access1.asset.id, asset1.id);

  // Issuer 2 cannot access
  const access2 = brandingService.getAssetFile(asset1.id, TEST_ISSUER_2);
  assert.strictEqual(access2, null);
});

test('Branding profile update and sponsor logo management', () => {
  const sp1 = brandingService.saveAsset({
    issuerId: TEST_ISSUER_1,
    buffer: SAMPLE_PNG,
    originalname: 'sp1.png',
    assetType: 'sponsor_logo',
    displayName: 'Sponsor 1'
  });

  const sp2 = brandingService.saveAsset({
    issuerId: TEST_ISSUER_1,
    buffer: SAMPLE_JPEG,
    originalname: 'sp2.jpg',
    assetType: 'sponsor_logo',
    displayName: 'Sponsor 2'
  });

  const updated = brandingService.updateIssuerBranding(TEST_ISSUER_1, {
    primary_color: '#123456',
    accent_color: '#abcdef',
    primary_logo_id: null,
    sponsor_ids: [sp1.id, sp2.id]
  });

  assert.strictEqual(updated.primary_color, '#123456');
  assert.strictEqual(updated.accent_color, '#abcdef');
  assert.strictEqual(updated.sponsor_ids.length, 2);
  assert.ok(updated.sponsor_ids.includes(sp1.id));
  assert.ok(updated.sponsor_ids.includes(sp2.id));

  // Build branding worker payload
  const payload = brandingService.buildBrandingPayloadForIssuer(TEST_ISSUER_1);
  assert.strictEqual(payload.primary_color, '#123456');
  assert.strictEqual(payload.accent_color, '#abcdef');
  assert.strictEqual(payload.sponsors_base64.length, 2);
  assert.ok(typeof payload.sponsors_base64[0] === 'string');
});

test('Asset deletion unlinks from branding profile and cleans up storage', () => {
  const asset = brandingService.saveAsset({
    issuerId: TEST_ISSUER_1,
    buffer: SAMPLE_PNG,
    originalname: 'tobedeleted.png',
    assetType: 'event_logo',
    displayName: 'Event Logo'
  });

  brandingService.updateIssuerBranding(TEST_ISSUER_1, {
    event_logo_id: asset.id
  });

  let prof = brandingService.getIssuerBranding(TEST_ISSUER_1);
  assert.strictEqual(prof.event_logo_id, asset.id);

  const deleted = brandingService.deleteAsset(asset.id, TEST_ISSUER_1);
  assert.strictEqual(deleted, true);

  prof = brandingService.getIssuerBranding(TEST_ISSUER_1);
  assert.strictEqual(prof.event_logo_id, null);
});
