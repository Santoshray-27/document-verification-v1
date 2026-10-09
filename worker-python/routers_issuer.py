import os
import json
import base64
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from db import query_one, query_all, execute
from routers_auth import get_current_user, require_role
from crypto_service import generate_uuid, hash_fields, build_manifest, sign_manifest, verify_signature, sha256_hex, canonicalize
from audit_service import append_audit
from services.template_service import render_certificate_pdf

router = APIRouter(prefix="", tags=["issuer"])

STORAGE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend-node", "storage"))
PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "http://localhost:5173")

# In-memory jobs dict for asynchronous issuance tracking
jobs_store = {}

def safe_json(val):
    if not val:
        return {}
    if isinstance(val, dict):
        return val
    try:
        return json.loads(val)
    except Exception:
        return {}

@router.get("/issuer/settings")
def get_issuer_settings(user: dict = Depends(require_role("issuer"))):
    issuer_id = user["issuer_id"]
    key = query_one(
        """
        SELECT kid, algorithm, created_at, public_key_pem 
        FROM issuer_keys 
        WHERE issuer_id = %s AND status = 'active' 
        ORDER BY created_at DESC LIMIT 1
        """,
        (issuer_id,)
    )
    fingerprint = None
    if key and key.get("public_key_pem"):
        fingerprint = sha256_hex(key["public_key_pem"])
    return {"ok": True, "key": {**key, "fingerprint": fingerprint} if key else None}

@router.get("/issuer/dashboard")
def get_issuer_dashboard(user: dict = Depends(require_role("issuer"))):
    issuer_id = user["issuer_id"]
    
    # Counts
    counts = query_one(
        """
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active,
            SUM(CASE WHEN status='revoked' THEN 1 ELSE 0 END) AS revoked,
            SUM(CASE WHEN expires_at IS NOT NULL AND expires_at != '' AND expires_at::timestamptz < NOW() THEN 1 ELSE 0 END) AS expired
        FROM documents WHERE issuer_id = %s
        """,
        (issuer_id,)
    ) or {}
    
    verifications_count_row = query_one(
        """
        SELECT COUNT(*) as n 
        FROM verifications 
        WHERE doc_id IN (SELECT doc_id FROM documents WHERE issuer_id = %s)
        """,
        (issuer_id,)
    )
    verifications = verifications_count_row["n"] if verifications_count_row else 0
    
    by_verdict = query_all(
        """
        SELECT verdict, COUNT(*) as n 
        FROM verifications
        WHERE doc_id IN (SELECT doc_id FROM documents WHERE issuer_id = %s)
        GROUP BY verdict ORDER BY n DESC
        """,
        (issuer_id,)
    ) or []
    
    recent_rows = query_all(
        """
        SELECT doc_id, fields_json, status, issued_at 
        FROM documents 
        WHERE issuer_id = %s 
        ORDER BY created_at DESC LIMIT 6
        """,
        (issuer_id,)
    ) or []
    
    recent = [{**r, "fields": safe_json(r.get("fields_json"))} for r in recent_rows]
    issuer = query_one("SELECT issuer_id, name, org_type, status FROM issuers WHERE issuer_id = %s", (issuer_id,))
    
    return {
        "ok": True,
        "issuer": issuer,
        "stats": {
            "total": int(counts.get("total") or 0),
            "active": int(counts.get("active") or 0),
            "revoked": int(counts.get("revoked") or 0),
            "expired": int(counts.get("expired") or 0),
            "verifications": verifications
        },
        "by_verdict": by_verdict,
        "recent": recent
    }

@router.get("/issuer/documents")
def get_issuer_documents(
    limit: int = 25,
    offset: int = 0,
    status: str = None,
    search: str = None,
    user: dict = Depends(require_role("issuer"))
):
    limit = min(max(limit, 1), 100)
    offset = max(offset, 0)
    issuer_id = user["issuer_id"]
    
    conditions = ["issuer_id = %s"]
    params = [issuer_id]
    
    if status in ["active", "revoked", "expired"]:
        conditions.append("status = %s")
        params.append(status)
        
    if search:
        search_term = f"%{search.strip()[:60]}%"
        conditions.append("(fields_json LIKE %s OR doc_id LIKE %s)")
        params.extend([search_term, search_term])
        
    where_sql = " AND ".join(conditions)
    
    docs = query_all(
        f"""
        SELECT doc_id, doc_type, fields_json, fields_hash, file_hash, issued_at, expires_at, status,
               revoke_reason, revoked_at, kid
        FROM documents 
        WHERE {where_sql} 
        ORDER BY created_at DESC 
        LIMIT %s OFFSET %s
        """,
        (*params, limit, offset)
    ) or []
    
    total_row = query_one(f"SELECT COUNT(*) as n FROM documents WHERE {where_sql}", tuple(params))
    total = total_row["n"] if total_row else 0
    
    return {
        "ok": True,
        "total": total,
        "limit": limit,
        "offset": offset,
        "documents": [{**d, "fields": safe_json(d.get("fields_json"))} for d in docs]
    }

@router.get("/issuer/documents/{doc_id}")
def get_issuer_document_detail(doc_id: str, user: dict = Depends(require_role("issuer"))):
    doc = query_one("SELECT * FROM documents WHERE doc_id = %s AND issuer_id = %s", (doc_id, user["issuer_id"]))
    if not doc:
        raise HTTPException(status_code=404, detail={"code": "DOC_NOT_FOUND", "message": "Document not found under your organization"})
        
    issuer = query_one("SELECT issuer_id, name FROM issuers WHERE issuer_id = %s", (doc["issuer_id"],))
    verif_row = query_one("SELECT COUNT(*) as n FROM verifications WHERE doc_id = %s", (doc_id,))
    verif_count = verif_row["n"] if verif_row else 0
    
    return {
        "ok": True,
        "document": {
            "doc_id": doc["doc_id"],
            "issuer": issuer,
            "kid": doc["kid"],
            "doc_type": doc["doc_type"],
            "fields": safe_json(doc["fields_json"]),
            "fields_hash": doc["fields_hash"],
            "file_hash": doc["file_hash"],
            "manifest": safe_json(doc["manifest_json"]),
            "signature_preview": f"{doc['signature'][:24]}…",
            "issued_at": str(doc["issued_at"]),
            "expires_at": str(doc["expires_at"]) if doc["expires_at"] else None,
            "status": doc["status"],
            "revoke_reason": doc["revoke_reason"],
            "revoked_at": str(doc["revoked_at"]) if doc["revoked_at"] else None,
            "pdf_url": f"/static/issued/{doc['doc_id']}.pdf",
            "snapshot_url": f"/static/snapshots/{doc['doc_id']}.png",
            "verifications": verif_count,
        }
    }

@router.post("/issuer/documents/{doc_id}/revoke")
def revoke_document(doc_id: str, payload: dict, user: dict = Depends(require_role("issuer"))):
    doc = query_one("SELECT * FROM documents WHERE doc_id = %s AND issuer_id = %s", (doc_id, user["issuer_id"]))
    if not doc:
        raise HTTPException(status_code=404, detail={"code": "DOC_NOT_FOUND", "message": "Document not found under your organization"})
    if doc["status"] == "revoked":
        raise HTTPException(status_code=409, detail={"code": "ALREADY_REVOKED", "message": "This document is already revoked"})
        
    reason = str(payload.get("reason") or "").strip()[:200]
    if not reason:
        raise HTTPException(status_code=400, detail={"code": "VALIDATION_ERROR", "message": "A revocation reason is required"})
        
    now_str = datetime.now(timezone.utc).isoformat()
    execute(
        "UPDATE documents SET status='revoked', revoke_reason=%s, revoked_at=%s WHERE doc_id=%s",
        (reason, now_str, doc_id)
    )
    
    append_audit(
        actor_id=user["id"],
        actor_role=user["role"],
        action="REVOKE",
        doc_id=doc_id,
        detail={"reason": reason}
    )
    
    return {
        "ok": True,
        "doc_id": doc_id,
        "status": "revoked",
        "revoked_at": now_str,
        "revoke_reason": reason
    }

def run_in_process_issuance(user: dict, fields: dict, doc_type: str = "academic_certificate", expires_at: str = None, template_id: str = None):
    recipient_name = fields.get("name") or fields.get("recipient_name")
    if not recipient_name or not str(recipient_name).strip():
        raise HTTPException(status_code=400, detail={"code": "VALIDATION_ERROR", "message": "Recipient name is required"})
    if not fields.get("certificate_number") or not str(fields["certificate_number"]).strip():
        raise HTTPException(status_code=400, detail={"code": "VALIDATION_ERROR", "message": "certificate_number is required"})

    issuer = query_one("SELECT * FROM issuers WHERE issuer_id = %s", (user["issuer_id"],))
    if not issuer:
        raise HTTPException(status_code=400, detail={"code": "ISSUER_NOT_FOUND", "message": "Issuer not found"})
        
    key = query_one(
        "SELECT * FROM issuer_keys WHERE issuer_id = %s AND status = 'active' ORDER BY created_at DESC LIMIT 1",
        (issuer["issuer_id"],)
    )
    if not key:
        raise HTTPException(status_code=400, detail={"code": "KEY_NOT_FOUND", "message": "Issuer has no active signing key"})

    doc_id = generate_uuid()
    qr_url = f"{PUBLIC_BASE_URL}/public/verify/{doc_id}"
    issued_at = datetime.now(timezone.utc).isoformat()
    
    # Custom layout / template handling
    custom_layout = None
    if template_id:
        tpl = query_one("SELECT * FROM templates WHERE id = %s", (template_id,))
        if tpl and (tpl.get("is_system") == 1 or tpl.get("issuer_id") == issuer["issuer_id"]):
            bg_base64 = None
            if tpl.get("background_id"):
                bg_asset = query_one("SELECT * FROM template_assets WHERE id = %s", (tpl["background_id"],))
                if bg_asset:
                    bg_file_path = os.path.join(STORAGE_DIR, "backgrounds", f"{bg_asset['id']}.bin")
                    if os.path.exists(bg_file_path):
                        with open(bg_file_path, "rb") as f:
                            bg_base64 = base64.b64encode(f.read()).decode("ascii")
            fields_config = None
            if tpl.get("layout_config_json"):
                try:
                    fields_config = json.loads(tpl["layout_config_json"]).get("fields")
                except Exception:
                    pass
            if bg_base64 or fields_config:
                custom_layout = {"background_base64": bg_base64, "fields": fields_config}

    # Render certificate PDF directly (returns bytes)
    pdf_bytes = render_certificate_pdf(
        fields=fields,
        doc_id=doc_id,
        qr_text=qr_url,
        issuer_name=issuer["name"],
        issued_at=issued_at,
        doc_type=doc_type,
        custom_layout=custom_layout
    )

    from services.pdf_service import first_page_png
    snapshot_bytes = first_page_png(pdf_bytes)
    
    pdf_path = os.path.join(STORAGE_DIR, "issued", f"{doc_id}.pdf")
    snap_path = os.path.join(STORAGE_DIR, "snapshots", f"{doc_id}.png")
    os.makedirs(os.path.dirname(pdf_path), exist_ok=True)
    os.makedirs(os.path.dirname(snap_path), exist_ok=True)
    with open(pdf_path, "wb") as f:
        f.write(pdf_bytes)
    with open(snap_path, "wb") as f:
        f.write(snapshot_bytes)

    file_hash = sha256_hex(pdf_bytes)
    fields_hash = hash_fields(fields, doc_id, issuer["name"])

    manifest = build_manifest(
        doc_id=doc_id,
        issuer_id=issuer["issuer_id"],
        kid=key["kid"],
        fields_hash=fields_hash,
        file_hash=file_hash,
        issued_at=issued_at,
        expires_at=f"{expires_at}T23:59:59.000Z" if expires_at else None
    )

    signature = sign_manifest(manifest, key["kid"])
    if not verify_signature(manifest, signature, key["public_key_pem"]):
        raise HTTPException(status_code=500, detail={"code": "CRYPTO_ERROR", "message": "Self-verification of new signature failed"})

    execute(
        """
        INSERT INTO documents (doc_id, issuer_id, kid, doc_type, fields_json, fields_hash, file_hash,
                               manifest_json, signature, issued_at, expires_at, status, pdf_path, snapshot_path, created_by, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'active', %s, %s, %s, %s)
        """,
        (
            doc_id, issuer["issuer_id"], key["kid"], doc_type,
            canonicalize(fields), fields_hash, file_hash,
            manifest, signature, issued_at,
            f"{expires_at}T23:59:59.000Z" if expires_at else None,
            pdf_path, snap_path, user["id"], issued_at
        )
    )

    audit_entry = append_audit(
        actor_id=user["id"],
        actor_role=user["role"],
        action="ISSUE",
        doc_id=doc_id,
        detail={"issuer_id": issuer["issuer_id"], "kid": key["kid"], "file_hash": file_hash, "doc_type": doc_type}
    )

    return {
        "doc_id": doc_id,
        "issuer_name": issuer["name"],
        "fields": fields,
        "file_hash": file_hash,
        "fields_hash": fields_hash,
        "kid": key["kid"],
        "signature_preview": f"{signature[:24]}…",
        "issued_at": issued_at,
        "expires_at": f"{expires_at}T23:59:59.000Z" if expires_at else None,
        "pdf_url": f"/static/issued/{doc_id}.pdf",
        "snapshot_url": f"/static/snapshots/{doc_id}.png",
        "verify_url": qr_url,
        "qr_svg": None,
        "audit_entry_id": audit_entry.get("id") if audit_entry else None,
    }

STEPS = [
    {"id": "validate_fields", "label": "Validating fields"},
    {"id": "generate_id", "label": "Generating document UUID"},
    {"id": "create_qr", "label": "Creating verification QR"},
    {"id": "render_pdf", "label": "Rendering certificate PDF"},
    {"id": "compute_hash", "label": "Computing SHA-256 of final bytes"},
    {"id": "sign_manifest", "label": "Signing manifest (ECDSA P-256)"},
    {"id": "save_registry", "label": "Saving to signed registry"},
    {"id": "audit_log", "label": "Appending audit entry"},
    {"id": "ready", "label": "Document ready"},
]

@router.post("/issuer/start")
@router.post("/issue/start")
def start_issue(payload: dict, user: dict = Depends(require_role("issuer"))):
    fields = payload.get("fields") or {}
    doc_type = payload.get("doc_type") or "academic_certificate"
    expires_at = payload.get("expires_at")
    template_id = payload.get("template_id")
    
    job_id = f"job_{generate_uuid()}"
    
    # Run synchronously in-process for blazing fast completion
    result = run_in_process_issuance(user, fields, doc_type, expires_at, template_id)
    
    # Store in memory for SSE / polling matching Node contract
    steps_completed = [
        {**s, "state": "passed", "detail": "Completed"} for s in STEPS
    ]
    jobs_store[job_id] = {
        "id": job_id,
        "type": "issue",
        "status": "done",
        "progress": 100,
        "steps": steps_completed,
        "result": result,
    }
    
    return {"ok": True, "job_id": job_id}

@router.get("/issuer/jobs/{job_id}")
@router.get("/issue/jobs/{job_id}")
def get_issue_job(job_id: str, user: dict = Depends(require_role("issuer"))):
    job = jobs_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail={"code": "JOB_NOT_FOUND", "message": "Unknown or expired job"})
    return job
