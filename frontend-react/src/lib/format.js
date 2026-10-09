// Shared formatting helpers + the verdict visual language (colour, icon, copy).

export const VERDICT_META = {
  GENUINE: { color: '#10B981', tailwind: 'verdict-genuine', label: 'Genuine', icon: 'shield-check', blurb: 'This is the exact file the issuer signed.' },
  'GENUINE COPY': { color: '#14B8A6', tailwind: 'verdict-copy', label: 'Genuine Copy', icon: 'copy-check', blurb: 'Content is unchanged — only the file bytes differ (re-save, scan or screenshot).' },
  ALTERED: { color: '#F59E0B', tailwind: 'verdict-altered', label: 'Altered', icon: 'file-warning', blurb: 'The content differs from what the issuer signed.' },
  FORGED: { color: '#EF4444', tailwind: 'verdict-forged', label: 'Forged', icon: 'shield-x', blurb: 'This document did not come from the issuer it claims.' },
  'NOT ISSUED': { color: '#EF4444', tailwind: 'verdict-forged', label: 'Not Issued', icon: 'file-x', blurb: 'No registry record exists for this document ID.' },
  UNVERIFIABLE: { color: '#8B5CF6', tailwind: 'verdict-unverifiable', label: 'Unverifiable', icon: 'help-circle', blurb: 'We cannot vouch for this issuer right now. This is not proof it is fake.' },
  REVOKED: { color: '#F97316', tailwind: 'verdict-revoked', label: 'Revoked', icon: 'ban', blurb: 'The issuer withdrew this document. Do not accept it.' },
  EXPIRED: { color: '#64748B', tailwind: 'verdict-expired', label: 'Expired', icon: 'clock', blurb: 'Genuinely issued, but no longer valid.' },
  'UNABLE TO ASSESS': { color: '#94A3B8', tailwind: 'verdict-unable', label: 'Unable to Assess', icon: 'file-question', blurb: 'Not enough readable evidence to decide either way.' },
};

export function verdictMeta(v) {
  return VERDICT_META[v] || VERDICT_META['UNABLE TO ASSESS'];
}

export const CONFIDENCE_META = {
  High: { color: '#10B981', note: 'Decisive cryptographic evidence' },
  Medium: { color: '#F59E0B', note: 'Heuristic evidence — worth a human glance' },
  Low: { color: '#94A3B8', note: 'Weak or missing evidence' },
};

export const CHECK_STATUS = {
  passed: { color: '#10B981', label: 'Passed' },
  failed: { color: '#EF4444', label: 'Failed' },
  warning: { color: '#F59E0B', label: 'Warning' },
  skipped: { color: '#94A3B8', label: 'Unavailable' },
  running: { color: '#D4AF37', label: 'Running' },
  queued: { color: '#475569', label: 'Queued' },
};

export function shortHash(h, head = 12, tail = 8) {
  const s = String(h ?? '');
  if (!s) return '—';
  return s.length > head + tail + 1 ? `${s.slice(0, head)}…${s.slice(-tail)}` : s;
}

export function fmtDate(iso, withTime = false) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  if (!withTime) return date;
  return `${date} · ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
}

export function fmtBytes(n) {
  if (n === null || n === undefined) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(2)} MB`;
}

export function fmtMs(ms) {
  if (ms === null || ms === undefined) return '';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const DOC_TYPES = [
  { id: 'academic_certificate', label: 'Academic Certificate' },
  { id: 'marksheet', label: 'Marksheet / Transcript' },
  { id: 'bonafide', label: 'Bonafide Certificate' },
  { id: 'employment_offer', label: 'Employment Offer Letter' },
  { id: 'medical_fitness', label: 'Medical Fitness Certificate' },
  { id: 'commercial_invoice', label: 'Commercial Invoice' },
];
