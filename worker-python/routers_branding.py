from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from db import query_one, query_all, execute
from routers_auth import get_current_user, require_role

router = APIRouter(prefix="/branding", tags=["branding"])

@router.get("")
@router.get("/")
def get_branding(user: dict = Depends(require_role("issuer"))):
    issuer_id = user["issuer_id"]
    profile = query_one("SELECT * FROM issuer_branding WHERE issuer_id = %s", (issuer_id,))
    if not profile:
        profile = {
            "issuer_id": issuer_id,
            "primary_color": "#0A1F44",
            "accent_color": "#C9A227",
            "primary_logo_id": None,
            "event_logo_id": None,
            "signatory_id": None,
            "seal_id": None,
            "sponsor_ids_json": "[]",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    return {"ok": True, "branding": profile}

@router.put("")
@router.put("/")
def update_branding(payload: dict, user: dict = Depends(require_role("issuer"))):
    issuer_id = user["issuer_id"]
    primary_color = payload.get("primary_color", "#0A1F44")
    accent_color = payload.get("accent_color", "#C9A227")
    now_str = datetime.now(timezone.utc).isoformat()
    
    execute(
        """
        INSERT INTO issuer_branding (issuer_id, primary_color, accent_color, updated_at)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (issuer_id) DO UPDATE SET
            primary_color = EXCLUDED.primary_color,
            accent_color = EXCLUDED.accent_color,
            updated_at = EXCLUDED.updated_at
        """,
        (issuer_id, primary_color, accent_color, now_str)
    )
    
    updated = query_one("SELECT * FROM issuer_branding WHERE issuer_id = %s", (issuer_id,))
    return {"ok": True, "branding": updated}
