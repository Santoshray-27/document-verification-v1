import re
from fastapi import APIRouter, HTTPException, Query
from db import query_one, query_all
from datetime import datetime, timezone

router = APIRouter(prefix="/public", tags=["public"])

UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)

@router.get("/verify/{doc_id}")
def public_verify_lookup(doc_id: str):
    doc_id = doc_id.strip()
    if not UUID_RE.match(doc_id):
        raise HTTPException(status_code=400, detail={"code": "BAD_DOC_ID", "message": "That is not a valid document ID format"})
        
    doc = query_one(
        "SELECT doc_id, doc_type, issued_at, expires_at, status, issuer_id FROM documents WHERE doc_id = %s",
        (doc_id,)
    )
    if not doc:
        return {
            "ok": True,
            "found": False,
            "doc_id": doc_id,
            "message": "No registry record exists for this document ID. It was never issued by a registered issuer, or the ID has been fabricated.",
            "warning": "A QR record could not be found. Upload the file to run a full verification.",
        }
        
    issuer = query_one("SELECT name, org_type, status FROM issuers WHERE issuer_id = %s", (doc["issuer_id"],))
    
    expired = False
    if doc.get("expires_at"):
        try:
            exp_date = doc["expires_at"]
            if isinstance(exp_date, str):
                exp_date = datetime.fromisoformat(exp_date.replace("Z", "+00:00"))
            if exp_date < datetime.now(timezone.utc):
                expired = True
        except Exception:
            pass

    verif_row = query_one("SELECT COUNT(*) as n FROM verifications WHERE doc_id = %s", (doc_id,))
    verif_count = verif_row["n"] if verif_row else 0

    doc_status = "revoked" if doc["status"] == "revoked" else ("expired" if expired else "active")
    
    if doc_status == "revoked":
        msg = "This document has been REVOKED by its issuer. Do not accept it."
    elif doc_status == "expired":
        msg = "This document has EXPIRED. It was genuinely issued but is no longer valid."
    else:
        msg = "A registry record was found for this document ID."

    return {
        "ok": True,
        "found": True,
        "doc_id": doc["doc_id"],
        "doc_type": doc["doc_type"],
        "issuer_name": issuer["name"] if issuer else "Registered issuer",
        "issuer_status": issuer["status"] if issuer else "unknown",
        "issued_at": str(doc["issued_at"]),
        "expires_at": str(doc["expires_at"]) if doc["expires_at"] else None,
        "status": doc_status,
        "message": msg,
        "warning": "A QR record was found. This does NOT prove the file or paper you hold is unchanged — it only proves a record exists. Upload the file for exact verification.",
        "verification_count": verif_count,
    }

@router.get("/issuers")
def public_issuers_directory():
    issuers = query_all(
        """
        SELECT issuer_id, name, org_type, status, created_at,
               (SELECT COUNT(*) FROM documents d WHERE d.issuer_id = issuers.issuer_id) as doc_count
        FROM issuers
        WHERE status != 'suspended'
        ORDER BY name ASC
        """
    ) or []
    return {"ok": True, "issuers": issuers}

@router.get("/stats")
def public_stats():
    doc_count = query_one("SELECT COUNT(*) as n FROM documents")
    verif_count = query_one("SELECT COUNT(*) as n FROM verifications")
    return {
        "ok": True,
        "documents": doc_count["n"] if doc_count else 0,
        "verifications": verif_count["n"] if verif_count else 0
    }
