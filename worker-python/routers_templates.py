import json
import base64
from fastapi import APIRouter, Depends, HTTPException, Query
from db import query_one, query_all, execute
from routers_auth import get_current_user, require_role
from services.template_service import render_certificate_pdf

router = APIRouter(prefix="/templates", tags=["templates"])

def format_template(t):
    def safe_json_list(val):
        if not val:
            return []
        if isinstance(val, list):
            return val
        try:
            res = json.loads(val)
            return res if isinstance(res, list) else []
        except Exception:
            return []

    def safe_json_dict(val):
        if not val:
            return None
        if isinstance(val, dict):
            return val
        try:
            res = json.loads(val)
            return res if isinstance(res, dict) else None
        except Exception:
            return None

    return {
        **t,
        "fields": safe_json_list(t.get("fields_json")),
        "required_fields": safe_json_list(t.get("required_json")),
        "org_types": safe_json_list(t.get("org_types_json")),
        "tags": safe_json_list(t.get("tags_json")),
        "layout_config": safe_json_dict(t.get("layout_config_json"))
    }

@router.get("")
@router.get("/")
def get_all_templates(user: dict = Depends(require_role("issuer"))):
    issuer_id = user["issuer_id"]
    rows = query_all(
        """
        SELECT * FROM templates 
        WHERE is_system = 1 OR issuer_id = %s 
        ORDER BY is_system DESC, name ASC
        """,
        (issuer_id,)
    ) or []
    return {"ok": True, "templates": [format_template(r) for r in rows]}

@router.get("/recommendations")
def get_recommendations(user: dict = Depends(require_role("issuer"))):
    issuer_id = user["issuer_id"]
    issuer = query_one("SELECT org_type FROM issuers WHERE issuer_id = %s", (issuer_id,))
    org_type = issuer["org_type"] if issuer and issuer.get("org_type") else "university"
    
    rows = query_all(
        """
        SELECT * FROM templates 
        WHERE (is_system = 1 OR issuer_id = %s) AND org_types_json LIKE %s
        ORDER BY name ASC
        """,
        (issuer_id, f'%"{org_type}"%')
    ) or []
    
    return {"ok": True, "org_type": org_type, "recommendations": [format_template(r) for r in rows]}

@router.get("/backgrounds")
def list_backgrounds(user: dict = Depends(require_role("issuer"))):
    issuer_id = user["issuer_id"]
    rows = query_all("SELECT * FROM template_assets WHERE issuer_id = %s AND status = 'active'", (issuer_id,)) or []
    return {"ok": True, "backgrounds": rows}

@router.get("/{template_id}")
def get_template_by_id(template_id: str, user: dict = Depends(require_role("issuer"))):
    t = query_one("SELECT * FROM templates WHERE id = %s", (template_id,))
    if not t:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Template not found"})
    if t.get("is_system") != 1 and t.get("issuer_id") != user["issuer_id"]:
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Not allowed to access this template"})
    return {"ok": True, "template": format_template(t)}

@router.post("/preview")
def preview_template(payload: dict, user: dict = Depends(require_role("issuer"))):
    tpl_id = payload.get("templateId") or payload.get("template_id") or payload.get("doc_type") or "tpl_academic"
    doc_type = payload.get("doc_type") or tpl_id or "academic_certificate"
    fields = payload.get("sample_fields") or payload.get("fields") or {
        "recipient_name": "Aarav Sharma",
        "name": "Aarav Sharma",
        "certificate_number": "PREVIEW-2026-001",
        "course": "Bachelor of Technology in Computer Science & AI",
        "grade": "First Class with Distinction (9.4 CGPA)",
        "issue_date": "2026-10-10",
    }
    
    issuer = query_one("SELECT name FROM issuers WHERE issuer_id = %s", (user["issuer_id"],))
    issuer_name = issuer["name"] if issuer and issuer.get("name") else "PIEMR"

    pdf_bytes = render_certificate_pdf(
        fields=fields,
        doc_id="preview-demo-id",
        qr_text="https://evidentia.network/preview",
        issuer_name=issuer_name,
        issued_at="2026-10-10T00:00:00Z",
        doc_type=doc_type
    )
    from services.pdf_service import first_page_png
    snapshot_bytes = first_page_png(pdf_bytes)
    snapshot_b64 = base64.b64encode(snapshot_bytes).decode("ascii")
    
    return {
        "ok": True,
        "preview_png_base64": snapshot_b64,
        "preview_base64": f"data:image/png;base64,{snapshot_b64}",
        "snapshot_base64": snapshot_b64
    }
