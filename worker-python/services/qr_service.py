"""QR detection/decoding with OpenCV. Works on PDF pages (rendered) and on images."""
from __future__ import annotations

import re

import cv2
import fitz
import numpy as np

DOC_ID_RE = re.compile(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")
URL_PATH_RE = re.compile(r"/(?:public/)?verify/([0-9a-fA-F-]{36})")


def doc_id_from_text(text: str) -> str | None:
    if not text:
        return None
    m = URL_PATH_RE.search(text)
    if m:
        return m.group(1)
    m = DOC_ID_RE.search(text)
    return m.group(0) if m else None


def _decode_image(img: np.ndarray) -> str | None:
    """Try the standard detector, then a few upscalings/preprocesses (QRs often fail small)."""
    detector = cv2.QRCodeDetector()
    ok, text, _, _ = detector.detectAndDecodeMulti(img)
    if ok:
        for t in text:
            if t:
                return t
    for scale in (2, 3):
        big = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        gray = cv2.cvtColor(big, cv2.COLOR_BGR2GRAY) if big.ndim == 3 else big
        ok, text, _, _ = detector.detectAndDecodeMulti(gray)
        if ok:
            for t in text:
                if t:
                    return t
    return None


def decode_from_bytes(data: bytes, is_pdf: bool) -> dict:
    """Returns {found, raw_text, doc_id}."""
    frames: list[np.ndarray] = []
    try:
        if is_pdf:
            with fitz.open(stream=data, filetype="pdf") as doc:
                for i in range(min(doc.page_count, 3)):
                    pix = doc.load_page(i).get_pixmap(dpi=200, alpha=False)
                    frames.append(np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n))
        else:
            arr = np.frombuffer(data, dtype=np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if img is not None:
                frames.append(img)
    except Exception:
        frames = []

    for f in frames:
        if f.ndim == 3 and f.shape[2] == 4:
            f = cv2.cvtColor(f, cv2.COLOR_RGBA2BGR)
        text = _decode_image(f)
        if text:
            return {"found": True, "raw_text": text[:500], "doc_id": doc_id_from_text(text)}
    return {"found": False, "raw_text": None, "doc_id": None}
