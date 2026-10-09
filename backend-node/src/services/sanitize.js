// Text sanitation for anything that came from a user or from OCR before it is stored,
// rendered into a PDF, or shown in the UI (XSS + control-char defence).
const MAX = {
  name: 80, certificate_number: 48, course: 120, grade: 24, issue_date: 32,
  issuer_name: 100, doc_id: 64, reason: 200,
};

function sanitizeText(value, key = '') {
  if (value === null || value === undefined) return '';
  let s = String(value);
  s = s.replace(/<[^>]*>/g, '');               // strip tags
  s = s.replace(/[<>]/g, '');                  // then stray angle brackets
  // eslint-disable-next-line no-control-regex
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  const limit = MAX[key] || 200;
  return s.slice(0, limit);
}

/** Escape for safe interpolation into HTML-ish report text. */
function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

module.exports = { sanitizeText, escapeHtml };
