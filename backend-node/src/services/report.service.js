// Verification report (PDFKit). One page, printable, honest disclaimers.
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const config = require('../../config');
const { escapeHtml } = require('./sanitize');

const NAVY = '#0A1F44';
const GOLD = '#B8952C';
const MUTED = '#5A6478';

const VERDICT_COLOR = {
  GENUINE: '#10B981', 'GENUINE COPY': '#14B8A6', ALTERED: '#F59E0B', FORGED: '#EF4444',
  'NOT ISSUED': '#EF4444', UNVERIFIABLE: '#8B5CF6', REVOKED: '#F97316', EXPIRED: '#64748B',
  'UNABLE TO ASSESS': '#94A3B8',
};

const ICON = { passed: '[PASS]', failed: '[FAIL]', warning: '[WARN]', skipped: '[SKIP]', queued: '[--]', running: '[....]' };

const MARGIN = 44; // PDFKit does not expose doc.pageMargins, so keep our own constant

function shortHash(h) {
  const s = String(h ?? '');
  return s.length > 32 ? `${s.slice(0, 20)}…${s.slice(-12)}` : s || '—';
}

function generate({ verificationId, decision, record, issuer, ocr, metadata, diff, fileHash, durationMs }) {
  const dir = path.join(config.storageDir, 'reports');
  fs.mkdirSync(dir, { recursive: true });
  const filename = `agnitia-report-${verificationId}.pdf`;
  const full = path.join(dir, filename);

  const doc = new PDFDocument({ size: 'A4', margin: 44, info: { Title: `Agnitia verification report #${verificationId}`, Author: 'Agnitia' } });
  const stream = fs.createWriteStream(full);
  doc.pipe(stream);

  const W = doc.page.width - MARGIN * 2;
  let y = doc.y;

  // header
  doc.rect(0, 0, doc.page.width, 92).fill(NAVY);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(19).text('A G N I T I A', 44, 30);
  doc.fillColor(GOLD).font('Helvetica').fontSize(8).text('PROOF IN EVERY PIXEL', 44, 54, { characterSpacing: 1.6 });
  doc.fillColor('#C9D2E6').fontSize(8).text(`Verification report #${verificationId}`, 44, 68);
  doc.fillColor('#C9D2E6').fontSize(8).text(new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC', doc.page.width - 260, 68, { width: 216, align: 'right' });
  y = 112;

  // verdict block
  const color = VERDICT_COLOR[decision.verdict] || MUTED;
  doc.roundedRect(44, y, W, 66, 6).fillAndStroke('#F5F7FB', '#DDE3EF');
  doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(7.5).text('VERDICT', 60, y + 14);
  doc.fillColor(color).font('Helvetica-Bold').fontSize(22).text(decision.verdict, 60, y + 26);
  doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(7.5).text('CONFIDENCE', 330, y + 14);
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(14).text(decision.confidence_level, 330, y + 26);
  doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(7.5).text('HEURISTIC EVIDENCE SCORE (NOT A PROBABILITY)', 420, y + 14, { width: 140 });
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(14).text(`${decision.evidence_score}/100`, 420, y + 26, { width: 140 });
  y += 84;

  const label = (t) => { doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(7).text(t.toUpperCase()); };
  const value = (t, x, yy, w) => { doc.fillColor(NAVY).font('Helvetica').fontSize(9.5).text(t, x, yy, { width: w }); };

  // document summary
  label('DOCUMENT');
  y += 12;
  const left = 44, right = 44 + W / 2;
  value(`Issuer: ${issuer?.name || '—'}`, left, y, W / 2 - 10);
  value(`Document ID: ${record?.doc_id || '—'}`, right, y, W / 2 - 10); y += 14;
  value(`Type: ${record?.doc_type || '—'}`, left, y, W / 2 - 10);
  value(`Issued: ${record?.issued_at ? record.issued_at.slice(0, 19).replace('T', ' ') : '—'}`, right, y, W / 2 - 10); y += 22;

  // hashes
  label('CRYPTOGRAPHIC CHECKS'); y += 12;
  value(`Uploaded SHA-256: ${shortHash(fileHash)}`, left, y, W - 10); y += 13;
  value(`Registry SHA-256: ${shortHash(record?.file_hash)}`, left, y, W - 10); y += 13;
  value(`Hash match: ${record ? (decision.checks.find((c) => c.id === 'hash_compare')?.status === 'passed' ? 'YES — byte-for-byte identical' : 'NO — bytes differ') : 'no registry record'}`, left, y, W - 10); y += 13;
  value(`Signature (ECDSA P-256, ${record?.kid || 'no key'}): ${decision.checks.find((c) => c.id === 'signature_verify')?.status === 'passed' ? 'VALID' : decision.checks.find((c) => c.id === 'signature_verify')?.status === 'failed' ? 'INVALID' : 'not checked'}`, left, y, W - 10); y += 22;

  // evidence checklist
  label('EVIDENCE CHECKLIST'); y += 12;
  for (const c of decision.checks) {
    if (y > doc.page.height - 150) { doc.addPage(); y = 60; }
    doc.fillColor(c.status === 'passed' ? '#10B981' : c.status === 'failed' ? '#EF4444' : '#F59E0B')
      .font('Helvetica-Bold').fontSize(8).text(ICON[c.status] || '[--]', left, y);
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(8.6).text(c.label, left + 46, y);
    doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(String(c.message || '').slice(0, 150), left + 46, y + 10, { width: W - 56 });
    y += 24;
  }

  // fields table
  const fieldChecks = decision.checks.find((c) => c.id === 'ocr_fields')?.detail?.fields || [];
  if (fieldChecks.length) {
    if (y > doc.page.height - 160) { doc.addPage(); y = 60; }
    y += 6;
    label('EXPECTED vs DETECTED (OCR)'); y += 12;
    doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(7.5)
      .text('FIELD', left, y, { width: 100 }).text('EXPECTED (REGISTRY)', left + 100, y, { width: 160 })
      .text('DETECTED (OCR)', left + 260, y, { width: 160 }).text('MATCH', left + 420, y, { width: 60 });
    y += 12;
    for (const f of fieldChecks) {
      if (y > doc.page.height - 90) { doc.addPage(); y = 60; }
      doc.fillColor(NAVY).font('Helvetica').fontSize(8)
        .text(String(f.key), left, y, { width: 100 })
        .text(String(f.expected ?? '—').slice(0, 40), left + 100, y, { width: 160 })
        .text(String(f.detected ?? '—').slice(0, 40), left + 260, y, { width: 160 });
      doc.fillColor(f.status === 'passed' ? '#10B981' : f.status === 'failed' ? '#EF4444' : '#F59E0B')
        .font('Helvetica-Bold').text(f.status.toUpperCase(), left + 420, y, { width: 60 });
      y += 13;
    }
    y += 6;
  }

  // reasons
  if (y > doc.page.height - 140) { doc.addPage(); y = 60; }
  y += 8;
  label('WHY — IN PLAIN LANGUAGE'); y += 12;
  for (const r of decision.reasons) {
    if (y > doc.page.height - 110) { doc.addPage(); y = 60; }
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(9).text(r.title, left, y, { width: W });
    y += 12;
    doc.fillColor(MUTED).font('Helvetica').fontSize(8.4).text(r.detail, left, y, { width: W });
    y += doc.heightOfString(r.detail, { width: W }) + 8;
  }

  // metadata + visual
  if (metadata?.signals?.length || diff) {
    if (y > doc.page.height - 120) { doc.addPage(); y = 60; }
    y += 4;
    label('SUPPORTING SIGNALS'); y += 12;
    if (diff) {
      value(`Visual similarity (SSIM): ${diff.ssim_score} · changed regions: ${diff.region_count}`, left, y, W); y += 13;
    }
    if (metadata?.signals?.length) {
      doc.fillColor(MUTED).font('Helvetica').fontSize(8.4)
        .text(`Metadata: ${metadata.signals.join(', ')} — metadata is easily edited, so this is supporting evidence only.`, left, y, { width: W });
      y += 20;
    }
  }

  // footer disclaimer
  const footY = doc.page.height - 78;
  doc.moveTo(MARGIN, footY).lineTo(MARGIN + W, footY).strokeColor('#DDE3EF').lineWidth(0.8).stroke();
  doc.fillColor(MUTED).font('Helvetica-Oblique').fontSize(7.4)
    .text('Automated verification aid produced by Agnitia. It is not a legal certificate of authenticity. ' +
      'The verdict is produced by deterministic cryptographic checks and rules; no AI model decides it. ' +
      `Verification took ${durationMs} ms.`, 44, footY + 8, { width: W });

  doc.end();
  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve({ path: full, url: `/api/reports/${verificationId}` }));
    stream.on('error', reject);
  });
}

module.exports = { generate };
