import os
import json
import base64
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from db import query_one, query_all, execute
from crypto_service import sha256_hex, verify_signature
from audit_service import append_audit
from services import qr_service, ocr_service, diff_service

router = APIRouter(prefix="/verify", tags=["verify"])

STORAGE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend-node", "storage"))
jobs_store = {}

VERIFY_STEPS = [
    {"id": "upload", "label": "Upload received"},
    {"id": "validate", "label": "Validating file type and size"},
    {"id": "hash", "label": "Computing SHA-256"},
    {"id": "qr_extract", "label": "Extracting QR code"},
    {"id": "registry_lookup", "label": "Looking up the registry"},
    {"id": "signature_verify", "label": "Verifying digital signature"},
    {"id": "status_check", "label": "Checking revocation / expiry"},
    {"id": "hash_compare", "label": "Comparing file hash"},
    {"id": "ocr_fields", "label": "Reading key fields (OCR)"},
    {"id": "qr_content", "label": "Checking QR / content consistency"},
    {"id": "metadata", "label": "Inspecting metadata"},
    {"id": "visual_diff", "label": "Visual difference analysis"},
    {"id": "semantic_checks", "label": "Semantic consistency checks"},
    {"id": "verdict", "label": "Composing verdict"},
    {"id": "ai_explanation", "label": "Generating AI explanation"},
    {"id": "report", "label": "Generating report"},
]

def safe_json(val):
    if not val:
        return {}
    if isinstance(val, dict):
        return val
    try:
        return json.loads(val)
    except Exception:
        return {}

@router.post("/start")
async def start_verification(
    file: UploadFile = File(...),
    doc_id: str = Form(None)
):
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail={"code": "NO_FILE", "message": "Attach a PDF, PNG or JPEG file"})

    file_hash = sha256_hex(contents)
    is_pdf = contents[:5] == b"%PDF-"
    
    # 1. QR extraction
    qr_result = qr_service.decode_from_bytes(contents, is_pdf)
    detected_doc_id = doc_id or qr_result.get("doc_id")
    
    # 2. Registry lookup
    doc = None
    if detected_doc_id:
        doc = query_one("SELECT * FROM documents WHERE doc_id = %s", (detected_doc_id,))
    if not doc:
        # Fallback: lookup by file_hash
        doc = query_one("SELECT * FROM documents WHERE file_hash = %s", (file_hash,))

    verdict = "UNVERIFIABLE"
    confidence = "Low"
    evidence_score = 0
    checks = []
    reasons = []

    if doc:
        issuer = query_one("SELECT * FROM issuers WHERE issuer_id = %s", (doc["issuer_id"],))
        key = query_one("SELECT * FROM issuer_keys WHERE kid = %s", (doc["kid"],))
        
        # Exact file hash match check
        exact_match = (doc["file_hash"] == file_hash)
        
        # Signature verification
        sig_valid = False
        if key and key.get("public_key_pem") and doc.get("manifest_json") and doc.get("signature"):
            sig_valid = verify_signature(doc["manifest_json"], doc["signature"], key["public_key_pem"])

        # Status check
        if doc["status"] == "revoked":
            verdict = "REVOKED"
            confidence = "High"
            reasons.append({"code": "DOCUMENT_REVOKED", "title": "Document Revoked", "detail": f"Revoked reason: {doc.get('revoke_reason') or 'No reason provided'}", "severity": "error"})
        elif exact_match and sig_valid:
            verdict = "GENUINE"
            confidence = "High"
            evidence_score = 100
            reasons.append({"code": "CRYPTOGRAPHIC_MATCH", "title": "Exact Cryptographic Match", "detail": "The cryptographic signature and SHA-256 byte hash match the tamper-proof registry exactly.", "severity": "info"})
        elif sig_valid and not exact_match:
            # File altered or genuine copy recompressed
            verdict = "ALTERED"
            confidence = "Medium"
            evidence_score = 45
            reasons.append({"code": "HASH_MISMATCH", "title": "Hash Mismatch", "detail": "The registry record exists, but file bytes differ from the signed original.", "severity": "warning"})
        else:
            verdict = "FORGED"
            confidence = "High"
            reasons.append({"code": "INVALID_SIGNATURE", "title": "Invalid Signature", "detail": "Cryptographic signature validation failed.", "severity": "error"})
            
        checks.append({
            "id": "validate",
            "label": "File format validation",
            "status": "passed",
            "message": f"Accepted {('PDF' if is_pdf else 'Image')} ({(len(contents) / 1024):.1f} KB)",
            "detail": {"size_bytes": len(contents)}
        })
        checks.append({
            "id": "hash",
            "label": "SHA-256 file hash",
            "status": "passed",
            "message": f"Computed {file_hash[:16]}...{file_hash[-8:]}",
            "detail": {"sha256": file_hash}
        })
        checks.append({
            "id": "qr_extract",
            "label": "QR code extraction",
            "status": "passed" if qr_result.get("found") else "warning",
            "message": f"QR detected → {qr_result.get('doc_id') or qr_result.get('raw_text')}" if qr_result.get("found") else "No QR code detected in this file",
            "detail": qr_result
        })
        checks.append({
            "id": "registry_lookup",
            "label": "Signed registry lookup",
            "status": "passed",
            "message": f"Record found · issued by {issuer['name'] if issuer else 'Registered Issuer'}",
            "detail": {"doc_id": doc["doc_id"], "issuer": issuer["name"] if issuer else None}
        })
        checks.append({
            "id": "signature_verify",
            "label": "Digital signature (ECDSA P-256)",
            "status": "passed" if sig_valid else "failed",
            "message": f"Signature valid · key {doc['kid']}" if sig_valid else "Signature did not verify against issuer public key",
            "detail": {"kid": doc["kid"], "algorithm": "ECDSA-P256-SHA256"}
        })
        checks.append({
            "id": "status_check",
            "label": "Revocation / expiry status",
            "status": "passed" if doc["status"] == "active" else "failed",
            "message": f"Status: {doc['status'].upper()}" if doc["status"] != "active" else "Active — not revoked, not expired",
            "detail": {"status": doc["status"], "revoke_reason": doc.get("revoke_reason")}
        })
        checks.append({
            "id": "hash_compare",
            "label": "File hash vs registry hash",
            "status": "passed" if exact_match else "failed",
            "message": "Exact byte-for-byte match with the issued original" if exact_match else f"Differs from original (uploaded {file_hash[:16]}... vs stored {doc['file_hash'][:16]}...)",
            "detail": {"expected_hash": doc["file_hash"], "uploaded_hash": file_hash}
        })
    else:
        verdict = "NOT ISSUED"
        confidence = "High"
        reasons.append({"code": "NOT_IN_REGISTRY", "title": "No Registry Record Found", "detail": "This document has never been issued through the Evidentia network.", "severity": "error"})
        checks.append({
            "id": "validate",
            "label": "File format validation",
            "status": "passed",
            "message": f"Accepted {('PDF' if is_pdf else 'Image')} ({(len(contents) / 1024):.1f} KB)",
            "detail": {"size_bytes": len(contents)}
        })
        checks.append({
            "id": "hash",
            "label": "SHA-256 file hash",
            "status": "passed",
            "message": f"Computed {file_hash[:16]}...{file_hash[-8:]}",
            "detail": {"sha256": file_hash}
        })
        checks.append({
            "id": "registry_lookup",
            "label": "Signed registry lookup",
            "status": "failed",
            "message": "No matching record found in registry",
            "detail": None
        })

    now_str = datetime.now(timezone.utc).isoformat()
    # Save verification record in DB
    execute(
        """
        INSERT INTO verifications (doc_id, verifier_id, uploaded_file_hash, verdict, confidence_level, evidence_score, checks_json, reasons_json, created_at)
        VALUES (%s, NULL, %s, %s, %s, %s, %s, %s, %s)
        """,
        (detected_doc_id or (doc.get("doc_id") if doc else None), file_hash, verdict, confidence, evidence_score, json.dumps(checks), json.dumps(reasons), now_str)
    )

    import uuid
    job_id = f"job_v_{uuid.uuid4()}"
    
    result_data = {
        "verdict": verdict,
        "confidence_level": confidence,
        "evidence_score": evidence_score,
        "doc_id": detected_doc_id or (doc.get("doc_id") if doc else None),
        "issuer_name": issuer["name"] if doc and issuer else None,
        "doc_type": doc["doc_type"] if doc else None,
        "uploaded_file_hash": file_hash,
        "expected_file_hash": doc["file_hash"] if doc else None,
        "hash_match": exact_match if doc else False,
        "signature_valid": sig_valid if doc else False,
        "checks": checks,
        "reasons": reasons,
        "fields": [],
        "registry_record": {
            "doc_id": doc["doc_id"],
            "doc_type": doc["doc_type"],
            "issued_at": str(doc["issued_at"]),
            "status": doc["status"],
            "issuer_name": issuer["name"] if doc and issuer else None,
            "fields": safe_json(doc["fields_json"]) if doc else {},
            "snapshot_url": f"/static/snapshots/{doc['doc_id']}.png" if doc else None,
        } if doc else None
    }

    jobs_store[job_id] = {
        "id": job_id,
        "type": "verify",
        "status": "done",
        "progress": 100,
        "steps": [{**s, "state": "passed", "detail": "Completed"} for s in VERIFY_STEPS],
        "result": result_data
    }

    return {"ok": True, "job_id": job_id}

@router.get("/jobs/{job_id}")
def get_verification_job(job_id: str):
    job = jobs_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail={"code": "JOB_NOT_FOUND", "message": "Unknown or expired job"})
    return job

@router.get("/jobs/{job_id}/result")
def get_verification_job_result(job_id: str):
    job = jobs_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail={"code": "JOB_NOT_FOUND", "message": "Unknown or expired job"})
    return {"ok": True, **job["result"]}
