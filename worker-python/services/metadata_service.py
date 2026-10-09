"""PDF/image metadata extraction + tamper signals.

SUPPORTING EVIDENCE ONLY. Metadata is trivially editable, so these signals never decide a
verdict on their own — Node only displays them as warnings.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone

import fitz
from PIL import Image
import io

PRODUCERS_OF_INTEREST = ("agnitia",)
EDITORS = (
    "acrobat", "adobe", "photoshop", "gimp", "libreoffice", "word", "pdf24",
    "ilovepdf", "smallpdf", "sejda", "pdfescape", "foxit", "preview", "quartz",
)


def _parse_pdf_date(raw: str) -> datetime | None:
    if not raw:
        return None
    m = re.search(r"D:(\d{14}|\d{12}|\d{8})", raw)
    if not m:
        return None
    d = m.group(1).ljust(14, "0")
    try:
        return datetime.strptime(d, "%Y%m%d%H%M%S").replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def pdf_metadata(data: bytes) -> dict:
    signals: list[str] = []
    out = {
        "producer": None, "creator": None, "created": None, "modified": None,
        "page_count": None, "encrypted": False, "pdf_version": None, "signals": signals,
    }
    try:
        with fitz.open(stream=data, filetype="pdf") as doc:
            md = doc.metadata or {}
            out["producer"] = (md.get("producer") or None)
            out["creator"] = (md.get("creator") or None)
            out["created"] = md.get("creationDate") or None
            out["modified"] = md.get("modDate") or None
            out["page_count"] = doc.page_count
            out["encrypted"] = bool(doc.is_encrypted)
            out["pdf_version"] = None

            created = _parse_pdf_date(out["created"] or "")
            modified = _parse_pdf_date(out["modified"] or "")
            producer = (out["producer"] or "").lower()
            creator = (out["creator"] or "").lower()

            if not producer and not creator:
                signals.append("metadata_missing")
            if producer and not any(p in producer for p in PRODUCERS_OF_INTEREST):
                signals.append("producer_not_agnitia")
            if any(e in producer + " " + creator for e in EDITORS):
                signals.append("edited_by_known_editor")
            if created and modified and modified > created:
                delta = int((modified - created).total_seconds())
                if delta > 2:
                    signals.append("modified_after_created")
                    out["modify_delta_seconds"] = delta
            if doc.page_count > 1:
                signals.append("multiple_pages")
    except Exception as e:  # unreadable pdf -> report, do not raise
        out["error"] = f"{type(e).__name__}"
        signals.append("metadata_unreadable")
    return out


def image_metadata(data: bytes) -> dict:
    signals = ["image_not_pdf"]
    out = {"producer": None, "creator": None, "created": None, "modified": None,
           "page_count": 1, "encrypted": False, "signals": signals}
    try:
        with Image.open(io.BytesIO(data)) as im:
            out["width"], out["height"] = im.size
            out["mode"] = im.mode
            exif = getattr(im, "getexif", lambda: None)()
            if exif and len(exif):
                signals.append("exif_present")
    except Exception as e:
        out["error"] = f"{type(e).__name__}"
        signals.append("metadata_unreadable")
    return out
