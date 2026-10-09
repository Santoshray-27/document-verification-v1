"""Agnitia document worker (the "muscle").

FastAPI, INTERNAL ONLY. It has:
  * NO database access
  * NO private keys
  * NO verdict logic
It renders PDFs, extracts QR/OCR/metadata, and computes visual diffs. Node decides everything.
"""
from __future__ import annotations

import base64
import os
import sys

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import JSONResponse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services import diff_service, metadata_service, ocr_service, pdf_service, qr_service, template_service

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

app = FastAPI(title="Agnitia Worker", version="1.0.0", docs_url=None, redoc_url=None)


@app.get("/health")
def health():
    return {
        "ok": True,
        "service": "agnitia-worker",
        "version": "1.0.0",
        "tesseract": TESSERACT_OK,
        "opencv": OPENCV_OK,
        "pymupdf": PYMUPDF_OK,
        "reportlab": REPORTLAB_OK,
    }


@app.post("/render-certificate")
async def render_certificate(payload: dict):
    """{fields, doc_id, qr_text, issuer_name, issued_at, doc_type} -> {pdf_base64, snapshot_png_base64}"""
    try:
        fields = payload.get("fields") or {}
        doc_id = str(payload.get("doc_id") or "")
        qr_text = str(payload.get("qr_text") or "")
        issuer_name = str(payload.get("issuer_name") or "")
        issued_at = str(payload.get("issued_at") or "19700101T000000Z")
        doc_type = str(payload.get("doc_type") or "academic_certificate")

        pdf_bytes = template_service.render_certificate_pdf(
            fields=fields, doc_id=doc_id, qr_text=qr_text,
            issuer_name=issuer_name, issued_at=issued_at, doc_type=doc_type,
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
    """QR + OCR + metadata in one call. Degrades per-capability instead of failing whole."""
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

    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("WORKER_PORT", "8001")))
