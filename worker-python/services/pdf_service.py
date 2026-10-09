"""PDF helpers: render page 1 to PNG (for snapshots and visual diff) and pull raw text."""
from __future__ import annotations

import base64
import io

import fitz  # PyMuPDF

RENDER_DPI = 150  # fixed: snapshot and uploaded render must use the same scale


def first_page_png(pdf_bytes: bytes, dpi: int = RENDER_DPI) -> bytes:
    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        if doc.page_count == 0:
            raise ValueError("PDF has no pages")
        pix = doc.load_page(0).get_pixmap(dpi=dpi, alpha=False)
        return pix.tobytes("png")


def page_png_b64(pdf_bytes: bytes, dpi: int = RENDER_DPI) -> str:
    return base64.b64encode(first_page_png(pdf_bytes, dpi)).decode()


def extract_text(pdf_bytes: bytes) -> str:
    try:
        with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
            return "\n".join(page.get_text("text") for page in doc)
    except Exception:
        return ""


def is_pdf(data: bytes) -> bool:
    return bool(data) and data[:5] == b"%PDF-"
