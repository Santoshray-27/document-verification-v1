"""OCR via pytesseract + rule-based key-field parsing.

The parser looks for the labelled facts block the Evidentia template prints
(CERTIFICATE ID / DOCUMENT ID / ISSUER / ISSUE DATE) and for name/course/grade lines.
Field extraction is advisory: Node decides the verdict, never this module.
"""
from __future__ import annotations

import re

import cv2
import fitz
import numpy as np
import pytesseract

LANG = "eng"
OCR_DPI = 300  # higher than render dpi: OCR needs the detail

LABELS = {
    "certificate_number": [r"CERTIFICATE\s*ID", r"CERTIFICATE\s*NO", r"CERT\s*(?:ID|NO)"],
    "course": [r"COURSE", r"PROGRAM(?:ME)?", r"DEGREE"],
    "grade": [r"GRADE", r"CGPA", r"MARKS"],
    "issue_date": [r"ISSUE\s*DATE", r"DATE\s*OF\s*ISSUE", r"DATED"],
    "issuer_name": [r"ISSUER", r"UNIVERSITY", r"INSTITUTE"],
}


def _to_gray_bgr(data: bytes, is_pdf: bool) -> np.ndarray | None:
    try:
        if is_pdf:
            with fitz.open(stream=data, filetype="pdf") as doc:
                if doc.page_count == 0:
                    return None
                pix = doc.load_page(0).get_pixmap(dpi=OCR_DPI, alpha=False)
                return np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
        arr = np.frombuffer(data, dtype=np.uint8)
        return cv2.imdecode(arr, cv2.IMREAD_COLOR)
    except Exception:
        return None


def ocr_text(data: bytes, is_pdf: bool) -> tuple[str, float]:
    """Returns (text, average word confidence 0..100). Empty text on failure."""
    img = _to_gray_bgr(data, is_pdf)
    if img is not None:
        if img.ndim == 3 and img.shape[2] == 4:
            img = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if img.ndim == 3 else img
        gray = cv2.resize(gray, None, fx=1.0, fy=1.0, interpolation=cv2.INTER_AREA)
        try:
            text = pytesseract.image_to_string(gray, lang=LANG)
            data_out = pytesseract.image_to_data(gray, lang=LANG, output_type=pytesseract.Output.DICT)
            confs = [float(x) for x in data_out.get("conf", []) if str(x) not in ("-1", "") and float(x) >= 0]
            avg = round(sum(confs) / len(confs), 1) if confs else 0.0
            if text.strip():
                return text, avg
        except Exception:
            pass

    # Fallback 1: for PDFs, extract vector text directly with PyMuPDF
    if is_pdf:
        try:
            with fitz.open(stream=data, filetype="pdf") as doc:
                text = "\n".join(page.get_text() for page in doc)
                if text.strip():
                    return text, 95.0
        except Exception:
            pass

    # Fallback 2: for images, extract using native Windows OCR (winocr) if available
    try:
        import concurrent.futures
        import io
        import winocr
        from PIL import Image
        img_pil = Image.open(io.BytesIO(data))
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            res = pool.submit(winocr.recognize_pil_sync, img_pil).result()
        if res:
            lines = [l["text"] for l in res.get("lines", [])]
            text = "\n".join(lines) if lines else res.get("text", "")
            if text.strip():
                return text, 92.0
    except Exception:
        pass

    return "", 0.0


def _after_label(line: str, patterns: list[str]) -> str | None:
    for p in patterns:
        m = re.search(p + r"\s*[:\-]?\s*(.+)$", line, flags=re.I)
        if m:
            val = m.group(1).strip(" :|\t")
            if val and val not in ("—", "-"):
                return val[:80]
    return None


ALL_LABEL_PATTERNS = [
    r"CERTIFICATE\s*(?:ID|NO)",
    r"DOCUMENT\s*(?:ID|NO)",
    r"ISSUER",
    r"UNIVERSITY",
    r"INSTITUTE",
    r"ISSUE\s*DATE",
    r"DATE\s*OF\s*ISSUE",
    r"DATED",
    r"COURSE",
    r"PROGRAM(?:ME)?",
    r"DEGREE",
    r"GRADE",
    r"CGPA",
    r"MARKS",
    r"AGNI\s*TIA",
    r"PROOF\s*IN\s*EVERY\s*PIXEL",
    r"SCAN\s*TO\s*VERIFY",
]


def _is_label(s: str) -> bool:
    clean = s.strip()
    return any(re.match(r"^" + p + r"\s*[:\-]?$", clean, re.I) for p in ALL_LABEL_PATTERNS)


def parse_fields(text: str) -> dict:
    """Best-effort field extraction from raw OCR text."""
    fields: dict[str, str] = {}
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]

    for key, patterns in LABELS.items():
        for i, ln in enumerate(lines):
            val = _after_label(ln, patterns)
            if not val and i + 1 < len(lines):
                for p in patterns:
                    if re.match(r"^" + p + r"\s*[:\-]?$", ln, flags=re.I):
                        cand = lines[i + 1].strip(" :|\t")
                        if cand and cand not in ("—", "-") and not _is_label(cand):
                            val = cand[:80]
                            break
            if val and not _is_label(val) and key not in fields:
                fields[key] = val
                break

    # ---- issuer_name needs special handling ----
    # The issuer is printed twice: once as a centred header line ("Meridian Institute of
    # Technology") and once inside the labelled facts block ("ISSUER Meridian Institute of
    # Technology"). OCR of the header often drops the first word, so prefer whichever
    # candidate is the longest, and never accept a value that starts with a dangling "of".
    candidates: list[str] = []
    for ln in lines[:20]:
        if re.search(
            r"(institute|university|college|academy|hospital|technologies|technology|ltd|inc|school|foundation|board)",
            ln,
            re.I,
        ):
            # strip a leading "ISSUER"/"UNIVERSITY" label if present
            cand = re.sub(r"^\s*(ISSUER|UNIVERSITY|INSTITUTE)\s*[:\-]?\s*", "", ln, flags=re.I).strip()
            if cand and not _is_label(cand):
                candidates.append(cand)
    if fields.get("issuer_name") and not _is_label(fields["issuer_name"]):
        candidates.append(fields["issuer_name"])
    candidates = [c for c in candidates if not re.match(r"^(of|the of|and)\b", c, re.I)]
    if candidates:
        fields["issuer_name"] = max(candidates, key=len)[:80]
    else:
        fields.pop("issuer_name", None)

    # doc id / uuid anywhere
    m = re.search(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}", text)
    if m:
        fields["doc_id"] = m.group(0)

    # certificate_number: prefer exact pattern AGN-... or cert code
    m = re.search(r"\b([A-Z]{3,4}-\d{4}-[A-Za-z0-9-]+)\b", text) or re.search(r"\b(AGN-[A-Za-z0-9-]+)\b", text)
    if m:
        fields["certificate_number"] = m.group(1)
    elif "certificate_number" in fields and _is_label(fields["certificate_number"]):
        fields.pop("certificate_number")

    # issue_date: prefer YYYY-MM-DD
    m = re.search(r"\b(20\d{2}-\d{2}-\d{2})\b", text)
    if m:
        fields["issue_date"] = m.group(1)
    elif "issue_date" in fields and _is_label(fields["issue_date"]):
        fields.pop("issue_date")

    # name: the largest-looking line under "This is to certify that", else longest alpha line
    name = None
    for i, ln in enumerate(lines):
        if re.search(r"certify\s+that", ln, flags=re.I):
            for cand in lines[i + 1 : i + 4]:
                clean = re.sub(r"[^A-Za-z .'-]", "", cand).strip()
                if 3 <= len(clean) <= 60 and sum(ch.isalpha() for ch in clean) >= 4:
                    name = clean
                    break
            break
    if not name:
        alpha = [re.sub(r"[^A-Za-z .'-]", "", ln).strip() for ln in lines]
        alpha = [a for a in alpha if 3 <= len(a) <= 60 and a.count(" ") >= 1]
        name = max(alpha, key=len) if alpha else None
    if name:
        fields["name"] = name

    # grade fallback: "Grade: A+"
    if "grade" not in fields:
        m = re.search(r"grade\s*[:\-]?\s*([A-F][+-]?|\d{1,3}(?:\.\d+)?)", text, flags=re.I)
        if m:
            fields["grade"] = m.group(1)

    # course fallback: "has successfully completed X"
    if "course" not in fields:
        m = re.search(r"completed\s+(.{3,80})", text, flags=re.I)
        if m:
            fields["course"] = m.group(1).strip()

    return fields
