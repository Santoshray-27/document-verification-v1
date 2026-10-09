from fastapi import APIRouter, Depends, HTTPException, Query
from db import query_one, query_all
from routers_auth import get_current_user, require_role

router = APIRouter(prefix="/reports", tags=["reports"])

def safe_json(val):
    if not val:
        return {}
    if isinstance(val, dict):
        return val
    try:
        import json
        return json.loads(val)
    except Exception:
        return {}

@router.get("")
@router.get("/")
def get_reports(user: dict = Depends(require_role("issuer"))):
    issuer_id = user["issuer_id"]
    
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

    verif_row = query_one(
        """
        SELECT COUNT(*) as n 
        FROM verifications 
        WHERE doc_id IN (SELECT doc_id FROM documents WHERE issuer_id = %s)
        """,
        (issuer_id,)
    )
    verifications = verif_row["n"] if verif_row else 0

    by_verdict = query_all(
        """
        SELECT verdict, COUNT(*) as n 
        FROM verifications
        WHERE doc_id IN (SELECT doc_id FROM documents WHERE issuer_id = %s)
        GROUP BY verdict ORDER BY n DESC
        """,
        (issuer_id,)
    ) or []

    by_doc_type = query_all(
        """
        SELECT doc_type, COUNT(*) as n 
        FROM documents WHERE issuer_id = %s 
        GROUP BY doc_type ORDER BY n DESC
        """,
        (issuer_id,)
    ) or []

    recent_verifs = query_all(
        """
        SELECT v.id, v.doc_id, v.verdict, v.evidence_score, v.created_at, d.fields_json
        FROM verifications v
        JOIN documents d ON v.doc_id = d.doc_id
        WHERE d.issuer_id = %s
        ORDER BY v.created_at DESC LIMIT 20
        """,
        (issuer_id,)
    ) or []

    return {
        "ok": True,
        "summary": {
            "total_issued": int(counts.get("total") or 0),
            "active": int(counts.get("active") or 0),
            "revoked": int(counts.get("revoked") or 0),
            "expired": int(counts.get("expired") or 0),
            "total_verifications": verifications,
        },
        "by_verdict": by_verdict,
        "by_doc_type": by_doc_type,
        "recent_verifications": [{**r, "fields": safe_json(r.get("fields_json"))} for r in recent_verifs],
    }
