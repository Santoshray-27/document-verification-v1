// Multer upload: memory storage, hard size cap, random filename, extension whitelist.
// Magic-byte validation happens in verification.service (single source of truth).
const multer = require('multer');
const crypto = require('crypto');
const config = require('../../config');

const ALLOWED_EXT = new Set(['.pdf', '.png', '.jpg', '.jpeg']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    const ext = (file.originalname || '').toLowerCase().slice(-4);
    const ext5 = (file.originalname || '').toLowerCase().slice(-5);
    if (ALLOWED_EXT.has(ext) || ALLOWED_EXT.has(ext5)) return cb(null, true);
    const err = new Error('Only PDF, PNG and JPEG files are accepted');
    err.code = 'UNSUPPORTED_FILE_TYPE';
    err.status = 415;
    cb(err);
  },
});

const SPREADSHEET_EXT = new Set(['.csv', '.xlsx']);

const uploadSpreadsheet = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    const ext = (file.originalname || '').toLowerCase().slice(-4);
    const ext5 = (file.originalname || '').toLowerCase().slice(-5);
    if (SPREADSHEET_EXT.has(ext) || SPREADSHEET_EXT.has(ext5)) return cb(null, true);
    const err = new Error('Only CSV and XLSX spreadsheets are accepted');
    err.code = 'UNSUPPORTED_FILE_TYPE';
    err.status = 415;
    cb(err);
  },
});

/**
 * IMPORTANT: export the bare multer instance. Routes must call `upload.single('file')`
 * themselves — exporting a pre-applied `.single()` would make a second call return the
 * middleware instead of executing it (silently skipping the parse).
 */
function randomName(original = '') {
  const ext = (original.match(/\.[a-z0-9]+$/i) || ['.bin'])[0].toLowerCase();
  return `${crypto.randomBytes(12).toString('hex')}${ALLOWED_EXT.has(ext) ? ext : '.bin'}`;
}

module.exports = { upload, uploadSpreadsheet, randomName };
