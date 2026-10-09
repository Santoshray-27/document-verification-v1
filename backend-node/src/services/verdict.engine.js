// Agnitia verdict engine — pure, deterministic rules. No I/O, no AI, no randomness.
// Input: a bundle of check results. Output: { verdict, confidence, reasons, evidence_score }.
//
// Verdicts: GENUINE | GENUINE COPY | ALTERED | FORGED | NOT ISSUED | UNVERIFIABLE |
//           REVOKED | EXPIRED | UNABLE TO ASSESS

const V = {
  GENUINE: 'GENUINE',
  GENUINE_COPY: 'GENUINE COPY',
  ALTERED: 'ALTERED',
  FORGED: 'FORGED',
  NOT_ISSUED: 'NOT ISSUED',
  UNVERIFIABLE: 'UNVERIFIABLE',
  REVOKED: 'REVOKED',
  EXPIRED: 'EXPIRED',
  UNABLE: 'UNABLE TO ASSESS',
};

const CRITICAL_FIELDS = ['certificate_number', 'issuer_name', 'name', 'grade'];
const SECONDARY_FIELDS = ['course', 'issue_date'];

// ---- thresholds (documented, tunable, honest: these are heuristics, not probabilities) ----
const T = {
  SSIM_COPY_HIGH: 0.95,   // visually identical -> GENUINE COPY (High)
  SSIM_COPY_MEDIUM: 0.8,  // clean re-encode     -> GENUINE COPY (Medium)
  SSIM_SCAN_FLOOR: 0.72,  // below this a "scan" is too degraded to trust as a copy
  SSIM_UNREADABLE: 0.6,
  FIELD_MATCH: 0.9,
  FIELD_MINOR: 0.75,
};

function normalize(s) {
  return String(s ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Levenshtein-based similarity in [0,1]. */
function similarity(a, b) {
  const x = normalize(a);
  const y = normalize(b);
  if (!x && !y) return 1;
  if (!x || !y) return 0;
  if (x === y) return 1;
  const m = x.length;
  const n = y.length;
  if (Math.abs(m - n) > Math.max(m, n) * 0.6) {
    // still compute properly, but this is a fast-path guard for wildly different strings
  }
  let prev = new Array(n + 1);
  let cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = x[i - 1] === y[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return 1 - prev[n] / Math.max(m, n);
}

function reason(code, title, detail, severity = 'info') {
  return { code, title, detail, severity };
}

/**
 * @param {object} i
 *  i.fileValid, i.fileHash, i.docId (resolved), i.docIdSource ('qr'|'manual'|null)
 *  i.record (registry row | null), i.issuer (row|null), i.key (row|null)
 *  i.signatureValid (bool|null), i.hashMatch (bool|null)
 *  i.revoked, i.expired
 *  i.workerAvailable (bool)
 *  i.ocr { fields, avg_confidence } | null
 *  i.qr { found, doc_id } | null
 *  i.diff { ssim_score, changed_regions, region_count } | null
 *  i.metadata { signals } | null
 *  i.registryFields (object)
 */
function decide(i) {
  const checks = [];
  const reasons = [];
  const push = (id, label, status, message, detail = null) =>
    checks.push({ id, label, status, message, detail });

  // ---- 1. file validation ----
  push('validate', 'File format validation', i.fileValid ? 'passed' : 'failed',
    i.fileValid ? `Accepted ${i.fileKind} (${i.fileSizeKb} KB)` : 'Unsupported or corrupted file');
  if (!i.fileValid) {
    return out(V.UNABLE, 'Low', checks,
      [reason('BAD_FILE', 'File could not be read', 'The upload is not a valid PDF, PNG or JPEG, so nothing could be analysed.', 'error')], 0);
  }

  push('hash', 'SHA-256 file hash', 'passed', `Computed ${short(i.fileHash)}`, { sha256: i.fileHash });

  // ---- 2. QR / doc_id resolution ----
  if (i.qr && i.qr.found) {
    push('qr_extract', 'QR code extraction', 'passed', `QR found → ${short(i.qr.doc_id || i.qr.raw_text)}`, i.qr);
  } else if (i.workerAvailable === false) {
    push('qr_extract', 'QR code extraction', 'skipped', 'Forensic worker offline — QR scan unavailable');
  } else {
    push('qr_extract', 'QR code extraction', i.docId ? 'warning' : 'warning',
      i.docId ? 'No QR detected; using the document ID you supplied' : 'No QR code detected in this file');
  }

  if (!i.docId) {
    push('registry_lookup', 'Registry lookup', 'failed', 'Nothing to look up — no document ID');
    return out(V.UNABLE, 'Low', checks, [
      reason('NO_ID', 'No document ID found',
        'We could not read a QR code and no document ID was supplied, so this file cannot be linked to any registry record. We can neither confirm nor deny it.', 'warning'),
    ], 10);
  }

  // ---- 3. registry lookup ----
  if (!i.record) {
    push('registry_lookup', 'Registry lookup', 'failed', `No registry record for ${short(i.docId)}`);
    return out(V.NOT_ISSUED, 'High', checks, [
      reason('NOT_IN_REGISTRY', 'This document ID was never issued',
        `No record with ID ${i.docId} exists in the Agnitia registry. Either it was never issued by a registered issuer, or the ID/QR has been fabricated.`, 'error'),
    ], 5);
  }
  push('registry_lookup', 'Registry lookup', 'passed',
    `Record found · issued by ${i.issuer?.name || 'unknown issuer'}`, { doc_id: i.record.doc_id });

  if (i.issuer && i.issuer.status !== 'active') {
    push('issuer_trust', 'Issuer trust status', 'failed', `Issuer status: ${i.issuer.status}`);
    return out(V.UNVERIFIABLE, 'Medium', checks, [
      reason('ISSUER_SUSPENDED', 'Issuer is not active',
        `The issuing organisation "${i.issuer.name}" is currently ${i.issuer.status}, so its records cannot be vouched for right now. This is not proof the document is fake.`, 'warning'),
    ], 20);
  }
  push('issuer_trust', 'Issuer trust status', 'passed', `${i.issuer?.name || 'Issuer'} is a registered active issuer`);

  // ---- 4. signature ----
  if (!i.key) {
    push('signature_verify', 'Digital signature (ECDSA P-256)', 'warning', 'Signing key not available for this record');
    return out(V.UNVERIFIABLE, 'Medium', checks, [
      reason('KEY_MISSING', 'Signing key unavailable',
        'The public key that signed this record is not available (it may have been rotated or removed), so the signature cannot be checked.', 'warning'),
    ], 25);
  }
  if (i.signatureValid === true) {
    push('signature_verify', 'Digital signature (ECDSA P-256)', 'passed',
      `Signature valid · key ${i.key.kid}`, { kid: i.key.kid, algorithm: i.key.algorithm });
  } else {
    push('signature_verify', 'Digital signature (ECDSA P-256)', 'failed',
      'Signature did not verify against the issuer public key', { kid: i.key.kid });
    return out(V.FORGED, 'High', checks, [
      reason('SIGNATURE_INVALID', 'The registry record failed signature verification',
        'The signed manifest stored for this document does not verify with the issuer\'s public key. The record itself has been tampered with or was never signed by this issuer.', 'error'),
    ], 5);
  }

  // ---- 5. status ----
  if (i.revoked) {
    push('status_check', 'Revocation / expiry status', 'failed', `Revoked${i.record.revoke_reason ? `: ${i.record.revoke_reason}` : ''}`);
    return out(V.REVOKED, 'High', checks, [
      reason('REVOKED', 'This document has been revoked by its issuer',
        `The issuer withdrew this document${i.record.revoked_at ? ` on ${i.record.revoked_at.slice(0, 10)}` : ''}` +
        `${i.record.revoke_reason ? ` — reason: "${i.record.revoke_reason}"` : ''}. It must not be accepted, even though the file bytes match the original.`, 'error'),
    ], 15);
  }
  if (i.expired) {
    push('status_check', 'Revocation / expiry status', 'failed', `Expired on ${String(i.record.expires_at).slice(0, 10)}`);
    return out(V.EXPIRED, 'High', checks, [
      reason('EXPIRED', 'This document has expired',
        `Validity ended on ${String(i.record.expires_at).slice(0, 10)}. The document was genuinely issued, but it is no longer valid.`, 'warning'),
    ], 20);
  }
  push('status_check', 'Revocation / expiry status', 'passed', 'Active — not revoked, not expired');

  // ---- 6. hash compare ----
  if (i.hashMatch === true) {
    push('hash_compare', 'File hash vs registry hash', 'passed', 'Exact byte-for-byte match with the issued original');
    return out(V.GENUINE, 'High', checks, [
      reason('HASH_MATCH', 'This is the exact file the issuer signed',
        `The SHA-256 of your upload (${short(i.fileHash)}) equals the hash stored in the registry (${short(i.record.file_hash)}). Not one byte has changed since issue.`, 'success'),
      reason('SIGNATURE_OK', 'The registry record is authentically signed',
        `Signature verified with issuer key ${i.key.kid}. Note these are two different checks: the hash proves this file is the recorded file; the signature proves the record came from the issuer.`, 'success'),
    ], 100);
  }

  push('hash_compare', 'File hash vs registry hash', 'failed',
    `Differs from the issued original (uploaded ${short(i.fileHash)} vs stored ${short(i.record.file_hash)})`);
  reasons.push(reason('HASH_MISMATCH', 'The file bytes differ from the registered original',
    'This alone does NOT mean the document is fake — a re-save, a print-and-scan, or a screenshot all change the bytes. The checks below decide which case this is.', 'warning'));

  // ---- 7. forensic layer ----
  if (i.workerAvailable === false) {
    push('ocr_fields', 'OCR key-field extraction', 'skipped', 'Forensic worker offline');
    push('qr_content', 'QR / content consistency', 'skipped', 'Forensic worker offline');
    push('metadata', 'Metadata signals', 'skipped', 'Forensic worker offline');
    push('visual_diff', 'Visual difference analysis', 'skipped', 'Forensic worker offline');
    return out(V.ALTERED, 'Low', checks, [
      ...reasons,
      reason('FORENSICS_UNAVAILABLE', 'We could not analyse the content',
        'The forensic worker (OCR / visual diff) is offline, so we cannot tell a harmless re-save from a real edit. The file is definitely not the exact original. Re-run when the worker is back.', 'warning'),
    ], 30);
  }

  // 7a. QR-content consistency: a QR that points at THIS record but content that is not this record
  const qrDocId = i.qr?.doc_id || null;
  const qrMismatch = qrDocId && i.record.doc_id && qrDocId !== i.record.doc_id;
  if (qrMismatch) {
    push('qr_content', 'QR / content consistency', 'failed',
      `QR points to ${short(qrDocId)} but the record being verified is ${short(i.record.doc_id)}`);
    return out(V.FORGED, 'High', checks, [
      reason('QR_CONTENT_MISMATCH', 'QR-CONTENT MISMATCH — the QR code was copied onto different content',
        `The QR code in this file links to document ${qrDocId}, which is not the document you are verifying (${i.record.doc_id}). This is the classic "genuine QR pasted onto a fake certificate" attack.`, 'error'),
    ], 5);
  }
  if (qrDocId) {
    push('qr_content', 'QR / content consistency', 'passed', 'QR resolves to the same registry record');
  } else {
    push('qr_content', 'QR / content consistency', 'warning',
      'No readable QR in this file, although the issued original carries one');
    reasons.push(reason('QR_MISSING', 'The QR code is missing or unreadable',
      'The original document carries a verification QR. It is absent here, which is consistent with a scan, a crop, or a rebuild of the page.', 'warning'));
  }

  // 7b. OCR field comparison
  const ocrFields = i.ocr?.fields || {};
  const regFields = i.registryFields || {};
  const fieldResults = [];
  let criticalMismatch = [];
  let secondaryMismatch = [];
  const ocrConf = Number(i.ocr?.avg_confidence || 0);

  for (const key of [...CRITICAL_FIELDS, ...SECONDARY_FIELDS]) {
    const expected = regFields[key];
    const detected = ocrFields[key];
    let status;
    let sim = null;
    if (expected === undefined || expected === null || expected === '') {
      status = detected ? 'warning' : 'skipped';
    } else if (!detected) {
      // The registry has this field, but OCR found nothing for it. If OCR was reliable
      // overall, a field that is simply GONE is evidence in its own right — a redaction or
      // a white-box over the text reads exactly like this. Only excuse it when OCR as a
      // whole was too poor to trust.
      status = ocrConf >= 70 ? 'failed' : ocrConf > 0 ? 'warning' : 'skipped';
    } else {
      sim = similarity(expected, detected);
      if (sim >= T.FIELD_MATCH) status = 'passed';
      else if (sim >= T.FIELD_MINOR) status = 'warning';
      else status = 'failed';
    }
    fieldResults.push({ key, expected: expected ?? null, detected: detected ?? null, similarity: sim === null ? null : Number(sim.toFixed(3)), status });
    if (status === 'failed') {
      if (CRITICAL_FIELDS.includes(key)) criticalMismatch.push(key);
      else secondaryMismatch.push(key);
    }
  }

  const ocrFailedHard = ocrConf === 0 && Object.keys(ocrFields).length === 0;
  push('ocr_fields', 'OCR key-field extraction',
    ocrFailedHard ? 'failed' : criticalMismatch.length ? 'failed' : secondaryMismatch.length ? 'warning' : 'passed',
    ocrFailedHard
      ? 'OCR produced no usable text'
      : `${fieldResults.filter((f) => f.status === 'passed').length}/${fieldResults.length} fields match (OCR confidence ${ocrConf}%)`,
    { fields: fieldResults, avg_confidence: ocrConf });

  // 7c. visual diff
  const ssim = i.diff && typeof i.diff.ssim_score === 'number' ? i.diff.ssim_score : null;
  const regions = i.diff?.changed_regions || [];
  push('visual_diff', 'Visual difference analysis',
    ssim === null ? 'warning' : ssim >= T.SSIM_COPY_HIGH ? 'passed' : ssim >= T.SSIM_COPY_MEDIUM ? 'warning' : 'failed',
    ssim === null
      ? 'Visual comparison unavailable'
      : `Structural similarity ${ssim.toFixed(3)} · ${regions.length} changed region(s)`,
    { ssim_score: ssim, region_count: regions.length, regions: regions.slice(0, 6) });

  // 7d. metadata (supporting evidence only)
  const signals = i.metadata?.signals || [];
  const metaBad = signals.filter((s) => s !== 'image_not_pdf' && s !== 'multiple_pages');
  push('metadata', 'Metadata signals', metaBad.length ? 'warning' : 'passed',
    metaBad.length ? metaBad.join(', ') : 'No suspicious metadata signals',
    { signals, note: 'Metadata is easily edited — supporting evidence only, never decisive.' });
  if (metaBad.length) {
    reasons.push(reason('METADATA_SIGNALS', 'Metadata looks edited',
      `Signals: ${metaBad.join(', ')}. Metadata is trivial to change, so this supports the other evidence rather than proving anything on its own.`, 'warning'));
  }

  // ---- 8. composition ----
  const noFieldMismatch = criticalMismatch.length === 0 && secondaryMismatch.length === 0;
  if (!ocrFailedHard && noFieldMismatch) {
    if (ssim !== null && ssim >= T.SSIM_COPY_HIGH) {
      push('verdict', 'Verdict composition', 'passed', 'Content matches and layout is visually identical');
      return out(V.GENUINE_COPY, 'High', checks, [
        ...reasons,
        reason('GENUINE_COPY', 'Content is identical — only the file bytes changed',
          `All key fields match the registry record and the page looks the same (similarity ${ssim.toFixed(3)}). This is almost certainly a re-save, a print-and-scan or a screenshot of a genuine document, not a forgery.`, 'success'),
        ], evidenceScore(fieldResults, ssim, regions, metaBad));
    }
    // Content fully matches but the page has visible noise (a scan, a rotation, JPEG artefacts).
    // We do NOT block on region count here: a scan legitimately lights up many small regions.
    // Confidence drops to Medium and the heatmap is shown so a human can eyeball it.
    if (ssim === null || ssim >= T.SSIM_SCAN_FLOOR) {
      push('verdict', 'Verdict composition', 'passed',
        `Content matches; ${regions.length} region(s) of visual noise from re-encoding`);
      return out(V.GENUINE_COPY, 'Medium', checks, [
        ...reasons,
        reason('GENUINE_COPY', 'Content matches the registry record',
          `Every key field matches what the issuer signed${ssim !== null ? ` and overall visual similarity is ${ssim.toFixed(3)}` : ''}. ` +
          `${regions.length} region(s) differ visually, which is what a scan, a rotation or JPEG compression does to a page. ` +
          'Check the difference panel if you want to confirm nothing was retouched.', 'info'),
        ], evidenceScore(fieldResults, ssim, regions, metaBad));
    }
  }

  if (ocrFailedHard) {
    push('verdict', 'Verdict composition', 'warning', 'Not enough evidence to separate copy from edit');
    return out(V.UNABLE, 'Low', checks, [
      ...reasons,
      reason('LOW_QUALITY', 'The document could not be read',
        'OCR returned no usable text and the visual comparison is too weak, so we cannot tell whether the content was changed. Try a higher-resolution scan of the full page.', 'warning'),
      ], 20);
  }

  if (criticalMismatch.length > 0) {
    // Wholesale rebuild vs targeted edit.
    //
    // A copied-QR forgery re-renders the whole certificate: the certificate number changes
    // (the forger invents one) AND several other key fields change with it. A targeted edit
    // keeps the certificate number and changes one or two fields only. Layout similarity is
    // NOT a usable signal here, because a rebuild from the same template looks identical.
    const certNoFailed = criticalMismatch.includes('certificate_number');
    if (certNoFailed && criticalMismatch.length >= 2) {
      push('verdict', 'Verdict composition', 'failed',
        `Document identity itself differs (${criticalMismatch.join(', ')})`);
      return out(V.FORGED, 'High', checks, [
        ...reasons,
        reason('QR_CONTENT_MISMATCH', 'QR-CONTENT MISMATCH — this is a rebuilt document carrying a real QR code',
          `The QR code links to a genuine registry record, but the printed content is not that record: ` +
          `${criticalMismatch.join(', ')} all differ, including the certificate number itself (${
            (fieldResults.find((f) => f.key === 'certificate_number') || {}).detected || 'unreadable'
          } instead of ${(fieldResults.find((f) => f.key === 'certificate_number') || {}).expected}). ` +
          'A targeted edit would keep the certificate number. This is a fresh document with a genuine QR pasted onto it.', 'error'),
        ], evidenceScore(fieldResults, ssim, regions, metaBad));
    }

    push('verdict', 'Verdict composition', 'failed', `Critical field(s) differ: ${criticalMismatch.join(', ')}`);
    return out(V.ALTERED, 'High', checks, [
      ...reasons,
      reason('FIELD_MISMATCH', 'Key content does not match the issued record',
        `These fields differ from what the issuer signed: ${criticalMismatch.join(', ')}. Combined with the changed file hash, this is a content edit, not a harmless re-save.`, 'error'),
      ], evidenceScore(fieldResults, ssim, regions, metaBad));
  }

  push('verdict', 'Verdict composition', 'warning', 'Minor field or layout differences detected');
  return out(V.ALTERED, 'Medium', checks, [
    ...reasons,
    reason('MINOR_DIFF', 'Small differences detected',
      secondaryMismatch.length
        ? `Non-critical field(s) differ: ${secondaryMismatch.join(', ')}.`
        : `${regions.length} region(s) differ visually while OCR still matches, which can mean a small edit or heavy re-encoding.` +
          ' Review the heatmap before deciding.',
      'warning'),
    ], evidenceScore(fieldResults, ssim, regions, metaBad));
}

function evidenceScore(fieldResults, ssim, regions, metaBad) {
  // Weighted checklist of passed checks. Heuristic — NOT a probability.
  let score = 30; // crypto layers already passed to get here
  const total = fieldResults.filter((f) => f.expected).length || 1;
  const matched = fieldResults.filter((f) => f.status === 'passed').length;
  score += Math.round((matched / total) * 40);
  if (ssim !== null) score += ssim >= 0.95 ? 20 : ssim >= 0.8 ? 12 : ssim >= 0.6 ? 5 : 0;
  if (regions.length === 0) score += 10;
  score -= Math.min(15, metaBad.length * 5);
  return Math.max(0, Math.min(100, score));
}

function out(verdict, confidence, checks, reasons, evidenceScoreValue) {
  return { verdict, confidence_level: confidence, checks, reasons, evidence_score: evidenceScoreValue };
}

function short(h) {
  const s = String(h ?? '');
  return s.length > 20 ? `${s.slice(0, 10)}…${s.slice(-6)}` : s;
}

module.exports = { decide, V, T, CRITICAL_FIELDS, SECONDARY_FIELDS, similarity, normalize };
