import os
import json
import unicodedata
import re

V_GENUINE = "GENUINE"
V_GENUINE_COPY = "GENUINE COPY"
V_ALTERED = "ALTERED"
V_FORGED = "FORGED"
V_NOT_ISSUED = "NOT ISSUED"
V_UNVERIFIABLE = "UNVERIFIABLE"
V_REVOKED = "REVOKED"
V_EXPIRED = "EXPIRED"
V_UNABLE = "UNABLE TO ASSESS"

CRITICAL_FIELDS = ["certificate_number", "issuer_name", "name", "grade"]
SECONDARY_FIELDS = ["course", "issue_date"]

T_SSIM_COPY_HIGH = 0.95
T_SSIM_COPY_MEDIUM = 0.80
T_SSIM_SCAN_FLOOR = 0.72
T_FIELD_MATCH = 0.90
T_FIELD_MINOR = 0.75

def normalize(s):
    if not s:
        return ""
    s = unicodedata.normalize("NFKD", str(s))
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()

def similarity(a, b):
    x = normalize(a)
    y = normalize(b)
    if not x and not y:
        return 1.0
    if not x or not y:
        return 0.0
    if x == y:
        return 1.0
    m, n = len(x), len(y)
    prev = list(range(n + 1))
    cur = [0] * (n + 1)
    for i in range(1, m + 1):
        cur[0] = i
        for j in range(1, n + 1):
            cost = 0 if x[i - 1] == y[j - 1] else 1
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
        prev, cur = cur, [0] * (n + 1)
    return 1.0 - (prev[n] / max(m, n))

def reason(code, title, detail, severity="info"):
    return {"code": code, "title": title, "detail": detail, "severity": severity}

def short(h):
    s = str(h or "")
    return f"{s[:16]}...{s[-8:]}" if len(s) > 24 else s

def compute_evidence_score(field_results, ssim, regions, meta_bad):
    score = 30
    total = len([f for f in field_results if f.get("expected")]) or 1
    matched = len([f for f in field_results if f.get("status") == "passed"])
    score += round((matched / total) * 40)
    if ssim is not None:
        score += 20 if ssim >= 0.95 else (12 if ssim >= 0.8 else (5 if ssim >= 0.6 else 0))
    if len(regions) == 0:
        score += 10
    score -= min(15, len(meta_bad) * 5)
    return max(0, min(100, score))

def decide(
    file_valid: bool,
    file_kind: str,
    file_size_kb: float,
    file_hash: str,
    doc_id: str | None,
    record: dict | None,
    issuer: dict | None,
    key: dict | None,
    signature_valid: bool,
    hash_match: bool,
    revoked: bool,
    expired: bool,
    qr_result: dict | None,
    ocr_res: dict | None,
    diff_res: dict | None,
    metadata_res: dict | None,
    registry_fields: dict | None,
) -> dict:
    checks = []
    reasons = []

    def push(id_, label, status, message, detail=None):
        checks.append({"id": id_, "label": label, "status": status, "message": message, "detail": detail})

    push(
        "validate",
        "File format validation",
        "passed" if file_valid else "failed",
        f"Accepted {file_kind} ({file_size_kb:.1f} KB)" if file_valid else "Unsupported or corrupted file",
        {"size_bytes": int(file_size_kb * 1024)}
    )
    if not file_valid:
        return {
            "verdict": V_UNABLE,
            "confidence_level": "Low",
            "evidence_score": 0,
            "checks": checks,
            "reasons": [reason("BAD_FILE", "File could not be read", "The upload is not a valid PDF, PNG or JPEG.", "error")]
        }

    push("hash", "SHA-256 file hash", "passed", f"Computed {short(file_hash)}", {"sha256": file_hash})

    # QR Extraction
    qr_found = qr_result.get("found") if qr_result else False
    qr_detected_id = qr_result.get("doc_id") if qr_result else None
    if qr_found:
        push("qr_extract", "QR code extraction", "passed", f"QR detected → {short(qr_detected_id or qr_result.get('raw_text'))}", qr_result)
    else:
        push("qr_extract", "QR code extraction", "warning" if doc_id else "warning",
             "No QR detected; using the document ID supplied" if doc_id else "No QR code detected in this file", qr_result)

    # Registry lookup
    if not record:
        push("registry_lookup", "Signed registry lookup", "failed", "No matching record found in registry", None)
        return {
            "verdict": V_NOT_ISSUED,
            "confidence_level": "High",
            "evidence_score": 5,
            "checks": checks,
            "reasons": [reason("NOT_IN_REGISTRY", "No Registry Record Found", "This document has never been issued through the Evidentia network.", "error")]
        }

    push("registry_lookup", "Signed registry lookup", "passed", f"Record found · issued by {issuer['name'] if issuer else 'Registered Issuer'}", {"doc_id": record["doc_id"], "issuer": issuer["name"] if issuer else None})

    # Signature
    if not key:
        push("signature_verify", "Digital signature (ECDSA P-256)", "warning", "Signing key unavailable", None)
        return {
            "verdict": V_UNVERIFIABLE,
            "confidence_level": "Medium",
            "evidence_score": 25,
            "checks": checks,
            "reasons": [reason("KEY_MISSING", "Signing key unavailable", "The key for this record is unavailable.", "warning")]
        }

    if signature_valid:
        push("signature_verify", "Digital signature (ECDSA P-256)", "passed", f"Signature valid · key {key['kid']}", {"kid": key["kid"], "algorithm": "ECDSA-P256-SHA256"})
    else:
        push("signature_verify", "Digital signature (ECDSA P-256)", "failed", "Signature did not verify against issuer public key", {"kid": key["kid"]})
        return {
            "verdict": V_FORGED,
            "confidence_level": "High",
            "evidence_score": 5,
            "checks": checks,
            "reasons": [reason("INVALID_SIGNATURE", "Invalid Signature", "The record signature did not verify.", "error")]
        }

    # Revocation / Expiry status
    if revoked:
        push("status_check", "Revocation / expiry status", "failed", f"Revoked: {record.get('revoke_reason') or 'No reason'}", {"status": "revoked"})
        return {
            "verdict": V_REVOKED,
            "confidence_level": "High",
            "evidence_score": 15,
            "checks": checks,
            "reasons": [reason("DOCUMENT_REVOKED", "Document Revoked", f"Revoked reason: {record.get('revoke_reason') or 'No reason'}", "error")]
        }

    if expired:
        push("status_check", "Revocation / expiry status", "failed", f"Expired on {str(record.get('expires_at'))[:10]}", {"status": "expired"})
        return {
            "verdict": V_EXPIRED,
            "confidence_level": "High",
            "evidence_score": 20,
            "checks": checks,
            "reasons": [reason("DOCUMENT_EXPIRED", "Document Expired", "Validity period has elapsed.", "warning")]
        }

    push("status_check", "Revocation / expiry status", "passed", "Active — not revoked, not expired", {"status": "active"})

    # Hash comparison
    if hash_match:
        push("hash_compare", "File hash vs registry hash", "passed", "Exact byte-for-byte match with the issued original", {"expected_hash": record["file_hash"], "uploaded_hash": file_hash})
        return {
            "verdict": V_GENUINE,
            "confidence_level": "High",
            "evidence_score": 100,
            "checks": checks,
            "reasons": [
                reason("CRYPTOGRAPHIC_MATCH", "Exact Cryptographic Match", "The cryptographic signature and SHA-256 byte hash match the tamper-proof registry exactly.", "info"),
                reason("SIGNATURE_OK", "The registry record is authentically signed", f"Signature verified with issuer key {key['kid']}.", "info"),
            ]
        }

    push("hash_compare", "File hash vs registry hash", "failed", f"Differs from original (uploaded {short(file_hash)} vs stored {short(record['file_hash'])})", {"expected_hash": record["file_hash"], "uploaded_hash": file_hash})
    reasons.append(reason("HASH_MISMATCH", "Hash Mismatch", "The registry record exists, but file bytes differ from the signed original.", "warning"))

    # Forensic checks (QR content consistency, OCR, diff, metadata)
    if qr_detected_id and record.get("doc_id") and qr_detected_id != record["doc_id"]:
        push("qr_content", "QR / content consistency", "failed", f"QR points to {short(qr_detected_id)} but record is {short(record['doc_id'])}")
        return {
            "verdict": V_FORGED,
            "confidence_level": "High",
            "evidence_score": 5,
            "checks": checks,
            "reasons": [reason("QR_CONTENT_MISMATCH", "QR-Content Mismatch", "The QR code was copied from another document onto this file.", "error")]
        }
    elif qr_detected_id:
        push("qr_content", "QR / content consistency", "passed", "QR resolves to the same registry record")
    else:
        push("qr_content", "QR / content consistency", "warning", "No readable QR in this file")

    # OCR field comparison
    ocr_fields = (ocr_res or {}).get("fields") or {}
    reg_fields = registry_fields or {}
    ocr_conf = float((ocr_res or {}).get("avg_confidence") or 0.0)

    field_results = []
    critical_mismatch = []
    secondary_mismatch = []

    for k in CRITICAL_FIELDS + SECONDARY_FIELDS:
        exp = reg_fields.get(k)
        det = ocr_fields.get(k)
        status = "skipped"
        sim = None
        if exp is None or exp == "":
            status = "warning" if det else "skipped"
        elif not det:
            status = "failed" if ocr_conf >= 70 else ("warning" if ocr_conf > 0 else "skipped")
        else:
            sim = similarity(exp, det)
            if sim >= T_FIELD_MATCH:
                status = "passed"
            elif sim >= T_FIELD_MINOR:
                status = "warning"
            else:
                status = "failed"
        
        field_results.append({
            "key": k,
            "expected": exp,
            "detected": det,
            "similarity": round(sim, 3) if sim is not None else None,
            "status": status
        })
        if status == "failed":
            if k in CRITICAL_FIELDS:
                critical_mismatch.append(k)
            else:
                secondary_mismatch.append(k)

    ocr_failed_hard = (ocr_conf == 0 and len(ocr_fields) == 0)
    matched_f_count = len([f for f in field_results if f["status"] == "passed"])
    push(
        "ocr_fields",
        "Reading key fields (OCR)",
        "failed" if (ocr_failed_hard or critical_mismatch) else ("warning" if secondary_mismatch else "passed"),
        "OCR produced no usable text" if ocr_failed_hard else f"{matched_f_count}/{len(field_results)} fields match (OCR confidence {ocr_conf:.0f}%)",
        {"fields": field_results, "avg_confidence": ocr_conf}
    )

    # Visual Diff
    ssim = None
    regions = []
    if diff_res and diff_res.get("ok"):
        ssim = diff_res.get("ssim_score")
        regions = diff_res.get("changed_regions") or []
        push(
            "visual_diff",
            "Visual difference analysis",
            "passed" if (ssim and ssim >= T_SSIM_COPY_HIGH) else ("warning" if (ssim and ssim >= T_SSIM_COPY_MEDIUM) else "failed"),
            f"Structural similarity {ssim:.3f} · {len(regions)} changed region(s)" if ssim is not None else "Visual comparison unavailable",
            {"ssim_score": ssim, "region_count": len(regions), "regions": regions[:6]}
        )
    else:
        push("visual_diff", "Visual difference analysis", "warning", "Visual comparison unavailable", None)

    # Metadata
    meta_signals = (metadata_res or {}).get("signals") or []
    meta_bad = [s for s in meta_signals if s not in ("image_not_pdf", "multiple_pages")]
    push(
        "metadata",
        "Inspecting metadata",
        "warning" if meta_bad else "passed",
        ", ".join(meta_bad) if meta_bad else "No suspicious metadata signals",
        {"signals": meta_signals}
    )
    if meta_bad:
        reasons.append(reason("METADATA_SIGNALS", "Metadata looks edited", f"Signals: {', '.join(meta_bad)}", "warning"))

    # Verdict synthesis
    no_field_mismatch = (len(critical_mismatch) == 0 and len(secondary_mismatch) == 0)
    evidence_score_val = compute_evidence_score(field_results, ssim, regions, meta_bad)

    if not ocr_failed_hard and no_field_mismatch:
        if ssim is not None and ssim >= T_SSIM_COPY_HIGH:
            push("verdict", "Composing verdict", "passed", "Content matches and layout is visually identical")
            reasons.append(reason("GENUINE_COPY", "Content is identical — only file bytes changed", f"All key fields match the registry record and page looks the same (similarity {ssim:.3f}).", "info"))
            return {
                "verdict": V_GENUINE_COPY,
                "confidence_level": "High",
                "evidence_score": evidence_score_val,
                "checks": checks,
                "reasons": reasons,
                "fields": field_results,
            }
        if ssim is None or ssim >= T_SSIM_SCAN_FLOOR:
            push("verdict", "Composing verdict", "passed", f"Content matches; {len(regions)} region(s) of visual noise from re-encoding")
            reasons.append(reason("GENUINE_COPY", "Content matches the registry record", f"Every key field matches what the issuer signed. {len(regions)} region(s) differ visually (re-save/scan compression).", "info"))
            return {
                "verdict": V_GENUINE_COPY,
                "confidence_level": "Medium",
                "evidence_score": evidence_score_val,
                "checks": checks,
                "reasons": reasons,
                "fields": field_results,
            }

    if critical_mismatch:
        push("verdict", "Composing verdict", "failed", f"Critical field(s) differ: {', '.join(critical_mismatch)}")
        reasons.append(reason("FIELD_MISMATCH", "Key content does not match the issued record", f"These fields differ from what the issuer signed: {', '.join(critical_mismatch)}.", "error"))
        return {
            "verdict": V_ALTERED,
            "confidence_level": "High",
            "evidence_score": evidence_score_val,
            "checks": checks,
            "reasons": reasons,
            "fields": field_results,
        }

    push("verdict", "Composing verdict", "warning", "Minor field or layout differences detected")
    reasons.append(reason("MINOR_DIFF", "Small differences detected", f"{len(regions)} region(s) differ visually while OCR matches.", "warning"))
    return {
        "verdict": V_ALTERED,
        "confidence_level": "Medium",
        "evidence_score": evidence_score_val,
        "checks": checks,
        "reasons": reasons,
        "fields": field_results,
    }
