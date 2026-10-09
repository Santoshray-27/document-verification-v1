"""Evidentia Unified High-Performance FastAPI Backend.

Replaces Node.js backend entirely while preserving 100% API contract parity,
Supabase PostgreSQL persistence, cryptographic integrity (ECDSA P-256 + SHA-256),
and in-process sub-millisecond certificate rendering and verification.
"""
from __future__ import annotations

import base64
import os
import sys
from datetime import datetime, timezone
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services import diff_service, metadata_service, ocr_service, pdf_service, qr_service, template_service
import routers_auth
import routers_issuer
import routers_templates
import routers_public
import routers_verify
import routers_reports
import routers_branding
import routers_bulk

try:
    import pytesseract

    _tess_cmd = os.environ.get("TESSERACT_CMD") or ""
    if _tess_cmd:
        pytesseract.pytesseract.tesseract_cmd = _tess_cmd
    pytesseract.get_tesseract_version()
    TESSERACT_OK = True
except Exception:
    TESSERACT_OK = False

try:
    import cv2  # noqa: F401
    OPENCV_OK = True
except Exception:
    OPENCV_OK = False

try:
    import fitz  # noqa: F401
    PYMUPDF_OK = True
except Exception:
    PYMUPDF_OK = False

try:
    import reportlab  # noqa: F401
    REPORTLAB_OK = True
except Exception:
    REPORTLAB_OK = False

app = FastAPI(title="Evidentia Unified API", version="2.0.0")

# CORS setup matching Node.js config
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://localhost:4000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files mount
STORAGE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend-node", "storage"))
for sub in ["issued", "uploaded", "snapshots", "heatmaps", "reports", "backgrounds"]:
    os.makedirs(os.path.join(STORAGE_DIR, sub), exist_ok=True)

app.mount("/static", StaticFiles(directory=STORAGE_DIR), name="static")

# Health Check (contract parity with Node /api/health)
@app.get("/api/health")
@app.get("/health")
def api_health():
    return {
        "ok": True,
        "unified_fastapi": True,
        "node_parity": True,
        "worker": True,
        "worker_services": {
            "tesseract": TESSERACT_OK,
            "opencv": OPENCV_OK,
            "pymupdf": PYMUPDF_OK,
            "reportlab": REPORTLAB_OK,
        },
        "version": "2.0.0",
        "time": datetime.now(timezone.utc).isoformat(),
    }

# Mount modular routers under /api/*
app.include_router(routers_auth.router, prefix="/api")
app.include_router(routers_issuer.router, prefix="/api")
app.include_router(routers_templates.router, prefix="/api")
app.include_router(routers_public.router, prefix="/api")
app.include_router(routers_verify.router, prefix="/api")
app.include_router(routers_reports.router, prefix="/api")
app.include_router(routers_branding.router, prefix="/api")
app.include_router(routers_bulk.router, prefix="/api")

# Also mount under root for dual compatibility
app.include_router(routers_auth.router)
app.include_router(routers_issuer.router)
app.include_router(routers_templates.router)
app.include_router(routers_public.router)
app.include_router(routers_verify.router)
app.include_router(routers_reports.router)
app.include_router(routers_branding.router)
app.include_router(routers_bulk.router)

# Forensic Worker direct endpoints (backwards-compatibility for internal scripts)
@app.post("/render-certificate")
async def render_certificate(payload: dict):
    try:
        fields = payload.get("fields") or {}
        doc_id = str(payload.get("doc_id") or "")
        qr_text = str(payload.get("qr_text") or "")
        issuer_name = str(payload.get("issuer_name") or "")
        issued_at = str(payload.get("issued_at") or "19700101T000000Z")
        doc_type = str(payload.get("doc_type") or "academic_certificate")
        branding = payload.get("branding") or None
        custom_layout = payload.get("custom_layout") or None

        pdf_bytes = template_service.render_certificate_pdf(
            fields=fields, doc_id=doc_id, qr_text=qr_text,
            issuer_name=issuer_name, issued_at=issued_at, doc_type=doc_type,
            branding=branding,
            custom_layout=custom_layout,
        )
        snapshot = pdf_service.first_page_png(pdf_bytes)
        return {
            "ok": True,
            "pdf_base64": base64.b64encode(pdf_bytes).decode(),
            "snapshot_png_base64": base64.b64encode(snapshot).decode(),
            "pdf_bytes": len(pdf_bytes),
        }
    except Exception as e:
        return JSONResponse(status_code=200, content={"ok": False, "error": f"{type(e).__name__}: {e}"})

@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    data = await file.read()
    if not data:
        return {"ok": False, "error": "empty upload"}
    is_pdf = data[:5] == b"%PDF-"
    out: dict = {"ok": True, "is_pdf": is_pdf, "size": len(data)}

    try:
        out["qr"] = qr_service.decode_from_bytes(data, is_pdf)
    except Exception as e:
        out["qr"] = {"found": False, "raw_text": None, "doc_id": None, "error": str(e)}

    try:
        text, conf = ocr_service.ocr_text(data, is_pdf)
        out["ocr"] = {"text": text[:4000], "fields": ocr_service.parse_fields(text), "avg_confidence": conf}
    except Exception as e:
        out["ocr"] = {"text": "", "fields": {}, "avg_confidence": 0.0, "error": str(e)}

    try:
        out["metadata"] = metadata_service.pdf_metadata(data) if is_pdf else metadata_service.image_metadata(data)
    except Exception as e:
        out["metadata"] = {"signals": ["metadata_unreadable"], "error": str(e)}

    if is_pdf:
        try:
            out["embedded_text"] = pdf_service.extract_text(data)[:4000]
        except Exception:
            out["embedded_text"] = ""
    return out

@app.post("/diff-check")
async def diff_check(file: UploadFile = File(...), snapshot_png_base64: str = Form(...)):
    data = await file.read()
    try:
        return diff_service.diff(snapshot_png_base64, data)
    except Exception as e:
        return {"ok": False, "error": f"{type(e).__name__}: {e}"}

@app.post("/extract-qr")
async def extract_qr(file: UploadFile = File(...)):
    data = await file.read()
    is_pdf = data[:5] == b"%PDF-"
    try:
        return {"ok": True, **qr_service.decode_from_bytes(data, is_pdf)}
    except Exception as e:
        return {"ok": False, "found": False, "raw_text": None, "doc_id": None, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "4000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
