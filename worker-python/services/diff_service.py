"""Visual diff: align two page renders, compute SSIM + absolute difference, and produce a
red-box heatmap of the changed regions.

Node decides the verdict; this module only reports numbers and pixels.
"""
from __future__ import annotations

import base64
import io

import cv2
import numpy as np
from PIL import Image
from skimage.metrics import structural_similarity as ssim

WORK_W = 900  # fixed working width so scores are comparable across files
MIN_REGION_PX = 400
BOX_PAD = 8


def _b64_png(img_bgr: np.ndarray) -> str:
    ok, buf = cv2.imencode(".png", img_bgr)
    return base64.b64encode(buf.tobytes()).decode() if ok else ""


def _load_png(b64: str) -> np.ndarray | None:
    try:
        raw = base64.b64decode(b64)
        arr = np.frombuffer(raw, dtype=np.uint8)
        return cv2.imdecode(arr, cv2.IMREAD_COLOR)
    except Exception:
        return None


def _load_any(data: bytes) -> np.ndarray | None:
    """Load an image, or the first page of a PDF, as BGR."""
    if data[:5] == b"%PDF-":
        import fitz
        try:
            with fitz.open(stream=data, filetype="pdf") as doc:
                pix = doc.load_page(0).get_pixmap(dpi=150, alpha=False)
                img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
                return cv2.cvtColor(img, cv2.COLOR_RGB2BGR) if pix.n == 3 else img
        except Exception:
            return None
    arr = np.frombuffer(data, dtype=np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


def _to_work(img: np.ndarray) -> np.ndarray:
    h, w = img.shape[:2]
    scale = WORK_W / float(w)
    return cv2.resize(img, (WORK_W, int(h * scale)), interpolation=cv2.INTER_AREA)


def _align(uploaded: np.ndarray, original: np.ndarray) -> np.ndarray:
    """Cheap global alignment: match width, then match height by center-crop/pad.
    Good enough for re-saves/scans; heavy registration is out of scope for a hackathon."""
    u = _to_work(uploaded)
    o = _to_work(original)
    oh, ow = o.shape[:2]
    uh, uw = u.shape[:2]
    if uw != ow:
        u = cv2.resize(u, (ow, max(1, int(uh * ow / uw))))
        uh = u.shape[0]
    if uh > oh:
        top = (uh - oh) // 2
        u = u[top : top + oh]
    elif uh < oh:
        pad = np.full((oh, ow, 3), 255, dtype=np.uint8)
        top = (oh - uh) // 2
        pad[top : top + uh] = u
        u = pad
    return u


def diff(snapshot_png_b64: str, uploaded_bytes: bytes) -> dict:
    original = _load_png(snapshot_png_b64)
    uploaded = _load_any(uploaded_bytes)
    if original is None or uploaded is None:
        return {"ok": False, "error": "could not decode original snapshot or uploaded file"}

    u = _align(uploaded, original)
    o = _to_work(original)

    g_o = cv2.cvtColor(o, cv2.COLOR_BGR2GRAY)
    g_u = cv2.cvtColor(u, cv2.COLOR_BGR2GRAY)
    g_o = cv2.GaussianBlur(g_o, (3, 3), 0)
    g_u = cv2.GaussianBlur(g_u, (3, 3), 0)

    score, ssim_map = ssim(g_o, g_u, full=True)
    score = float(score)

    absdiff = cv2.absdiff(g_o, g_u)
    _, thresh = cv2.threshold(absdiff, 28, 255, cv2.THRESH_BINARY)
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))

    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    h, w = g_o.shape
    regions = []
    heat = cv2.cvtColor(g_u, cv2.COLOR_GRAY2BGR)
    overlay = heat.copy()
    for cnt in contours:
        x, y, bw, bh = cv2.boundingRect(cnt)
        if bw * bh < MIN_REGION_PX:
            continue
        roi = absdiff[y : y + bh, x : x + bw]
        intensity = float(roi.mean()) / 255.0
        x0, y0 = max(0, x - BOX_PAD), max(0, y - BOX_PAD)
        x1, y1 = min(w, x + bw + BOX_PAD), min(h, y + bh + BOX_PAD)
        cv2.rectangle(overlay, (x0, y0), (x1, y1), (0, 0, 235), 2)
        cv2.rectangle(overlay, (x0, y0), (x0 + 3, y0 + 14), (0, 0, 235), -1)
        regions.append(
            {
                "x": int(x0), "y": int(y0), "w": int(x1 - x0), "h": int(y1 - y0),
                "label": f"region {len(regions) + 1}",
                "score": round(min(1.0, intensity * 2), 3),
                "area_ratio": round((bw * bh) / float(w * h), 5),
            }
        )
    regions.sort(key=lambda r: r["area_ratio"], reverse=True)
    heat = cv2.addWeighted(overlay, 0.85, heat, 0.15, 0)

    # side-by-side composite for the UI (original | uploaded | difference)
    sep = np.full((h, 6, 3), 30, dtype=np.uint8)
    combined = np.hstack([o, sep, u, sep, heat])
    ok, cbuf = cv2.imencode(".png", combined)

    return {
        "ok": True,
        "ssim_score": round(score, 4),
        "mean_abs_diff": round(float(absdiff.mean()), 3),
        "max_abs_diff": int(absdiff.max()),
        "changed_regions": regions[:12],
        "region_count": len(regions),
        "heatmap_png_base64": _b64_png(heat),
        "combined_png_base64": base64.b64encode(cbuf.tobytes()).decode() if ok else "",
        "aligned_uploaded_png_base64": _b64_png(u),
        "work_size": {"w": w, "h": h},
    }
