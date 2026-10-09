const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../db');
const config = require('../../config');

const BRANDING_STORAGE_DIR = path.join(config.storageDir, 'branding');
fs.mkdirSync(BRANDING_STORAGE_DIR, { recursive: true });

const ALLOWED_TYPES = new Set(['primary_logo', 'event_logo', 'partner_logo', 'sponsor_logo', 'signatory', 'seal']);
const MAX_SPONSORS = 8;
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB cap

/**
 * Sniff file buffer magic bytes to ensure real image format (PNG/JPEG)
 */
function sniffImageMime(buffer) {
  if (!buffer || buffer.length < 8) return null;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A
  ) {
    return 'image/png';
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }
  return null;
}

/**
 * Extract image dimensions without heavy external dependencies.
 * Basic PNG and JPEG SOF dimension parser.
 */
function getImageDimensions(buffer, mime) {
  try {
    if (mime === 'image/png' && buffer.length >= 24) {
      // PNG IHDR chunk starts at byte 12 (4 bytes 'IHDR' at 12-15)
      // Width is at 16-19, Height is at 20-23 (big endian)
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }
    if (mime === 'image/jpeg') {
      let offset = 2;
      while (offset < buffer.length) {
        if (buffer[offset] !== 0xFF) break;
        const marker = buffer[offset + 1];
        if (marker === 0xD9 || marker === 0xDA) break; // EOI or SOS
        const len = buffer.readUInt16BE(offset + 2);
        // SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2)
        if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }
        offset += 2 + len;
      }
    }
  } catch {
    // Gracefully handle unparseable header
  }
  return null;
}

function getIssuerBranding(issuerId) {
  const branding = db.prepare('SELECT * FROM issuer_branding WHERE issuer_id = ?').get(issuerId);
  const assets = db.prepare(
    "SELECT id, asset_type, display_name, mime_type, file_size, sort_order, created_at FROM branding_assets WHERE issuer_id = ? AND status = 'active' ORDER BY sort_order ASC, created_at ASC"
  ).all(issuerId);

  let sponsorIds = [];
  if (branding?.sponsor_ids_json) {
    try { sponsorIds = JSON.parse(branding.sponsor_ids_json); } catch { sponsorIds = []; }
  }

  return {
    issuer_id: issuerId,
    primary_color: branding?.primary_color || '#0A1F44',
    accent_color: branding?.accent_color || '#C9A227',
    primary_logo_id: branding?.primary_logo_id || null,
    event_logo_id: branding?.event_logo_id || null,
    signatory_id: branding?.signatory_id || null,
    seal_id: branding?.seal_id || null,
    sponsor_ids: sponsorIds,
    assets
  };
}

function updateIssuerBranding(issuerId, payload) {
  const {
    primary_color,
    accent_color,
    primary_logo_id,
    event_logo_id,
    signatory_id,
    seal_id,
    sponsor_ids
  } = payload;

  const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  const prim = (primary_color && hexRegex.test(primary_color)) ? primary_color : '#0A1F44';
  const acc = (accent_color && hexRegex.test(accent_color)) ? accent_color : '#C9A227';

  // Validate that any referenced assets actually belong to this issuer
  const validateAssetBelongs = (assetId) => {
    if (!assetId) return null;
    const exists = db.prepare(
      "SELECT id FROM branding_assets WHERE id = ? AND issuer_id = ? AND status = 'active'"
    ).get(assetId, issuerId);
    return exists ? assetId : null;
  };

  const validPrimaryLogo = validateAssetBelongs(primary_logo_id);
  const validEventLogo = validateAssetBelongs(event_logo_id);
  const validSignatory = validateAssetBelongs(signatory_id);
  const validSeal = validateAssetBelongs(seal_id);

  let validSponsors = [];
  if (Array.isArray(sponsor_ids)) {
    const deduped = [...new Set(sponsor_ids.slice(0, MAX_SPONSORS))];
    for (const sid of deduped) {
      if (validateAssetBelongs(sid)) validSponsors.push(sid);
    }
  }

  const now = new Date().toISOString();
  const existing = db.prepare('SELECT issuer_id FROM issuer_branding WHERE issuer_id = ?').get(issuerId);

  if (existing) {
    db.prepare(`
      UPDATE issuer_branding SET
        primary_color = ?,
        accent_color = ?,
        primary_logo_id = ?,
        event_logo_id = ?,
        signatory_id = ?,
        seal_id = ?,
        sponsor_ids_json = ?,
        updated_at = ?
      WHERE issuer_id = ?
    `).run(
      prim, acc, validPrimaryLogo, validEventLogo, validSignatory, validSeal,
      JSON.stringify(validSponsors), now, issuerId
    );
  } else {
    db.prepare(`
      INSERT INTO issuer_branding (
        issuer_id, primary_color, accent_color, primary_logo_id, event_logo_id,
        signatory_id, seal_id, sponsor_ids_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      issuerId, prim, acc, validPrimaryLogo, validEventLogo, validSignatory, validSeal,
      JSON.stringify(validSponsors), now
    );
  }

  return getIssuerBranding(issuerId);
}

function saveAsset({ issuerId, buffer, originalname, assetType, displayName }) {
  if (!ALLOWED_TYPES.has(assetType)) {
    const err = new Error(`Invalid asset_type. Must be one of: ${[...ALLOWED_TYPES].join(', ')}`);
    err.status = 400;
    throw err;
  }

  if (!buffer || buffer.length === 0) {
    const err = new Error('Empty file upload');
    err.status = 400;
    throw err;
  }

  if (buffer.length > MAX_FILE_SIZE) {
    const err = new Error(`File size exceeds 3MB limit (got ${(buffer.length / (1024 * 1024)).toFixed(1)}MB)`);
    err.status = 400;
    throw err;
  }

  const mime = sniffImageMime(buffer);
  if (!mime) {
    const err = new Error('Unsupported or malformed image format. Only valid PNG and JPEG files are allowed.');
    err.status = 400;
    throw err;
  }

  const dims = getImageDimensions(buffer, mime);
  if (dims && (dims.width > 4096 || dims.height > 4096)) {
    const err = new Error(`Image dimensions exceed max 4096x4096px (got ${dims.width}x${dims.height})`);
    err.status = 400;
    throw err;
  }

  const assetId = `ast_${crypto.randomBytes(12).toString('hex')}`;
  const ext = mime === 'image/png' ? '.png' : '.jpg';
  const filename = `${assetId}${ext}`;
  const filePath = path.join(BRANDING_STORAGE_DIR, filename);

  fs.writeFileSync(filePath, buffer);

  const cleanName = (displayName || originalname || assetType).replace(/[<>:"/\\|?*]/g, '').trim().slice(0, 100);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO branding_assets (
      id, issuer_id, asset_type, filename, mime_type, file_size, display_name, sort_order, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'active', ?)
  `).run(assetId, issuerId, assetType, filename, mime, buffer.length, cleanName, now);

  return {
    id: assetId,
    issuer_id: issuerId,
    asset_type: assetType,
    display_name: cleanName,
    mime_type: mime,
    file_size: buffer.length,
    created_at: now
  };
}

function getAssetFile(assetId, issuerId) {
  const asset = db.prepare(
    "SELECT * FROM branding_assets WHERE id = ? AND issuer_id = ? AND status = 'active'"
  ).get(assetId, issuerId);
  if (!asset) return null;

  // Prevent path traversal
  const safeFilename = path.basename(asset.filename);
  const filePath = path.join(BRANDING_STORAGE_DIR, safeFilename);
  if (!fs.existsSync(filePath)) return null;

  return {
    asset,
    filePath,
    buffer: fs.readFileSync(filePath)
  };
}

function deleteAsset(assetId, issuerId) {
  const asset = db.prepare(
    "SELECT * FROM branding_assets WHERE id = ? AND issuer_id = ? AND status = 'active'"
  ).get(assetId, issuerId);
  if (!asset) return false;

  db.prepare("UPDATE branding_assets SET status = 'deleted' WHERE id = ?").run(assetId);

  // If this asset was in the branding profile, unlink it
  const branding = db.prepare('SELECT * FROM issuer_branding WHERE issuer_id = ?').get(issuerId);
  if (branding) {
    let sponsorIds = [];
    try { sponsorIds = JSON.parse(branding.sponsor_ids_json); } catch { sponsorIds = []; }
    const filteredSponsors = sponsorIds.filter(id => id !== assetId);

    db.prepare(`
      UPDATE issuer_branding SET
        primary_logo_id = CASE WHEN primary_logo_id = ? THEN NULL ELSE primary_logo_id END,
        event_logo_id = CASE WHEN event_logo_id = ? THEN NULL ELSE event_logo_id END,
        signatory_id = CASE WHEN signatory_id = ? THEN NULL ELSE signatory_id END,
        seal_id = CASE WHEN seal_id = ? THEN NULL ELSE seal_id END,
        sponsor_ids_json = ?
      WHERE issuer_id = ?
    `).run(assetId, assetId, assetId, assetId, JSON.stringify(filteredSponsors), issuerId);
  }

  // Safely remove the file
  const safeFilename = path.basename(asset.filename);
  const filePath = path.join(BRANDING_STORAGE_DIR, safeFilename);
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch {}
  }

  return true;
}

/**
 * Build the base64-encoded branding snapshot to pass to Python worker
 * and embed securely during deterministic PDF generation.
 */
function buildBrandingPayloadForIssuer(issuerId) {
  const branding = getIssuerBranding(issuerId);
  const payload = {
    primary_color: branding.primary_color,
    accent_color: branding.accent_color,
    primary_logo_base64: null,
    event_logo_base64: null,
    signatory_base64: null,
    seal_base64: null,
    sponsors_base64: []
  };

  if (branding.primary_logo_id) {
    const f = getAssetFile(branding.primary_logo_id, issuerId);
    if (f) payload.primary_logo_base64 = f.buffer.toString('base64');
  }

  if (branding.event_logo_id) {
    const f = getAssetFile(branding.event_logo_id, issuerId);
    if (f) payload.event_logo_base64 = f.buffer.toString('base64');
  }

  if (branding.signatory_id) {
    const f = getAssetFile(branding.signatory_id, issuerId);
    if (f) payload.signatory_base64 = f.buffer.toString('base64');
  }

  if (branding.seal_id) {
    const f = getAssetFile(branding.seal_id, issuerId);
    if (f) payload.seal_base64 = f.buffer.toString('base64');
  }

  if (branding.sponsor_ids && branding.sponsor_ids.length > 0) {
    for (const sid of branding.sponsor_ids.slice(0, MAX_SPONSORS)) {
      const f = getAssetFile(sid, issuerId);
      if (f) payload.sponsors_base64.push(f.buffer.toString('base64'));
    }
  }

  return payload;
}

module.exports = {
  getIssuerBranding,
  updateIssuerBranding,
  saveAsset,
  getAssetFile,
  deleteAsset,
  buildBrandingPayloadForIssuer,
  sniffImageMime,
  getImageDimensions,
  MAX_SPONSORS,
  ALLOWED_TYPES
};
