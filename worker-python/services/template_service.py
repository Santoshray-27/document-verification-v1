"""Deterministic certificate template (ReportLab).

DETERMINISM IS A HARD REQUIREMENT: identical input must produce byte-identical PDF bytes,
because the issuer hashes the final file. We therefore:
  * pin `invariant=1` on the canvas (stable /ID),
  * force fixed /CreationDate and /ModDate taken from issued_at,
  * use fixed producer/creator strings and only built-in fonts (no external font files),
  * never call time/random anywhere in this module.
"""
from __future__ import annotations

import io
import re

import qrcode
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

NAVY = HexColor("#0A1F44")
NAVY_SOFT = HexColor("#152A55")
GOLD = HexColor("#C9A227")
GOLD_LIGHT = HexColor("#E3C463")
INK = HexColor("#1B2437")
MUTED = HexColor("#5A6478")

PAGE_W, PAGE_H = A4  # 595.27 x 841.89 pt
MARGIN = 40

DOC_TYPE_TITLES = {
    "academic_certificate": "CERTIFICATE OF COMPLETION",
    "tpl_academic": "CERTIFICATE OF COMPLETION",
    "marksheet": "MARKSHEET & OFFICIAL TRANSCRIPT",
    "tpl_marksheet": "MARKSHEET & OFFICIAL TRANSCRIPT",
    "bonafide": "BONAFIDE CERTIFICATE",
    "tpl_bonafide": "BONAFIDE CERTIFICATE",
    "hackathon_participation": "HACKATHON PARTICIPATION",
    "tpl_hack_part": "HACKATHON PARTICIPATION",
    "hackathon_winner": "HACKATHON WINNER & EXCELLENCE AWARD",
    "tpl_hack_win": "HACKATHON WINNER & EXCELLENCE AWARD",
    "workshop_completion": "WORKSHOP & BOOTCAMP COMPLETION",
    "tpl_workshop": "WORKSHOP & BOOTCAMP COMPLETION",
    "internship_certificate": "INTERNSHIP COMPLETION CERTIFICATE",
    "tpl_internship": "INTERNSHIP COMPLETION CERTIFICATE",
    "employment_offer": "OFFER OF EMPLOYMENT",
    "medical_fitness": "MEDICAL FITNESS CERTIFICATE",
    "commercial_invoice": "COMMERCIAL INVOICE",
}

MAX_LEN = {"name": 60, "course": 80, "grade": 30, "certificate_number": 40, "issue_date": 30, "issuer_name": 70}


def sanitize(value: str, key: str = "") -> str:
    """Strip markup/control chars and cap length. OCR/user text must never reach a renderer raw."""
    if value is None:
        return ""
    s = str(value)
    s = re.sub(r"<[^>]*>", "", s)              # strip tags
    s = re.sub(r"[<>]", "", s)                 # then any stray angle brackets
    s = "".join(ch for ch in s if ch == "\n" or ord(ch) >= 32)  # drop control chars
    s = re.sub(r"\s+", " ", s).strip()
    return s[: MAX_LEN.get(key, 120)]


def _qr_image(text: str) -> ImageReader:
    qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=8, border=2)
    qr.add_data(text)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0A1F44", back_color="white").convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return ImageReader(buf)


def _corner_ornaments(c: canvas.Canvas, x0: float, y0: float, x1: float, y1: float, size: float = 16) -> None:
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.4)
    for cx, cy, dx, dy in ((x0, y0, 1, 1), (x1, y0, -1, 1), (x0, y1, 1, -1), (x1, y1, -1, -1)):
        c.line(cx, cy + dy * size, cx + dx * size, cy)
        c.line(cx + dx * size * 0.35, cy + dy * size, cx + dx * size, cy + dy * size * 0.65)


def _seal(c: canvas.Canvas, cx: float, cy: float, r: float, short_id: str) -> None:
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.6)
    c.circle(cx, cy, r, stroke=1, fill=0)
    c.setLineWidth(0.6)
    c.circle(cx, cy, r - 5, stroke=1, fill=0)
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(cx, cy + 6, "EVIDENTIA")
    c.setFont("Helvetica", 5.6)
    c.setFillColor(MUTED)
    c.drawCentredString(cx, cy - 4, "PROOF IN EVERY PIXEL")
    c.setFont("Courier", 5.2)
    c.drawCentredString(cx, cy - 13, short_id[:16])


def _safe_image_reader(b64_str: str) -> ImageReader | None:
    if not b64_str:
        return None
    try:
        import base64
        raw = base64.b64decode(b64_str)
        buf = io.BytesIO(raw)
        buf.seek(0)
        return ImageReader(buf)
    except Exception:
        return None


def render_certificate_pdf(
    fields: dict,
    doc_id: str,
    qr_text: str,
    issuer_name: str,
    issued_at: str,
    doc_type: str = "academic_certificate",
    branding: dict | None = None,
    custom_layout: dict | None = None,
) -> bytes:
    """Render the certificate and return the final PDF bytes."""
    name = sanitize(fields.get("name"), "name") or "Unnamed Recipient"
    course = sanitize(fields.get("course"), "course")
    grade = sanitize(fields.get("grade"), "grade")
    cert_no = sanitize(fields.get("certificate_number"), "certificate_number")
    issue_date = sanitize(fields.get("issue_date"), "issue_date")
    issuer = sanitize(issuer_name, "issuer_name") or "Registered Issuer"
    title = DOC_TYPE_TITLES.get(doc_type, "CERTIFICATE")

    # Custom colors from branding if provided
    primary_color = NAVY
    accent_color = GOLD
    if branding and isinstance(branding, dict):
        p_hex = branding.get("primary_color")
        if p_hex and re.match(r"^#[0-9a-fA-F]{3,6}$", str(p_hex)):
            primary_color = HexColor(str(p_hex))
        a_hex = branding.get("accent_color")
        if a_hex and re.match(r"^#[0-9a-fA-F]{3,6}$", str(a_hex)):
            accent_color = HexColor(str(a_hex))

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4, invariant=1)
    c.setProducer("Evidentia Verifier 1.0")
    c.setCreator("Evidentia")
    c.setTitle(f"Evidentia {title} {cert_no or doc_id}")
    c.setAuthor(issuer)
    c.setSubject(f"doc_id={doc_id}")

    # Check for custom background image
    bg_reader = None
    if custom_layout and isinstance(custom_layout, dict):
        bg_b64 = custom_layout.get("background_base64")
        if bg_b64:
            bg_reader = _safe_image_reader(bg_b64)

    # ---- background ----
    if bg_reader:
        try:
            c.drawImage(bg_reader, 0, 0, width=PAGE_W, height=PAGE_H, mask=None)
        except Exception:
            c.setFillColor(white)
            c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    else:
        c.setFillColor(white)
        c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
        c.setFillColor(HexColor("#F7F8FC"))
        c.rect(0, PAGE_H - 150, PAGE_W, 150, stroke=0, fill=1)

        # ---- double border + ornaments only when standard template background ----
        c.setStrokeColor(primary_color)
        c.setLineWidth(2.2)
        c.rect(MARGIN - 14, MARGIN - 14, PAGE_W - 2 * (MARGIN - 14), PAGE_H - 2 * (MARGIN - 14), stroke=1, fill=0)
        c.setStrokeColor(accent_color)
        c.setLineWidth(0.7)
        c.rect(MARGIN - 6, MARGIN - 6, PAGE_W - 2 * (MARGIN - 6), PAGE_H - 2 * (MARGIN - 6), stroke=1, fill=0)
        _corner_ornaments(c, MARGIN - 6, MARGIN - 6, PAGE_W - MARGIN + 6, PAGE_H - MARGIN + 6)

    # ---- header logos if present ----
    if branding and isinstance(branding, dict):
        primary_logo = _safe_image_reader(branding.get("primary_logo_base64"))
        if primary_logo:
            try:
                # Top left header logo (max 52x52)
                c.drawImage(primary_logo, MARGIN + 12, PAGE_H - 105, width=52, height=52, mask="auto", preserveAspectRatio=True)
            except Exception:
                pass

        event_logo = _safe_image_reader(branding.get("event_logo_base64"))
        if event_logo:
            try:
                # Top right header logo (max 52x52)
                c.drawImage(event_logo, PAGE_W - MARGIN - 64, PAGE_H - 105, width=52, height=52, mask="auto", preserveAspectRatio=True)
            except Exception:
                pass

    # ---- header (Primary brand is Issuer Organization Name) ----
    y = PAGE_H - 88
    c.setFillColor(NAVY)
    # Dynamically scale font size for long org names (max 2 lines if very long)
    org_len = len(issuer)
    org_font_size = 19 if org_len < 32 else (16 if org_len < 46 else 13)
    c.setFont("Helvetica-Bold", org_font_size)
    c.drawCentredString(PAGE_W / 2, y, issuer[:68])

    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(PAGE_W / 2, y - 14, "OFFICIAL VERIFIABLE CREDENTIAL")

    c.setStrokeColor(GOLD)
    c.setLineWidth(0.8)
    c.line(PAGE_W / 2 - 110, y - 22, PAGE_W / 2 + 110, y - 22)

    c.setFillColor(MUTED)
    c.setFont("Helvetica-Oblique", 8.5)
    c.drawCentredString(PAGE_W / 2, y - 36, "Digitally signed and cryptographically registered credential")

    # ---- title ----
    y = PAGE_H - 240
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(PAGE_W / 2, y, title)

    # ---- body layouts for each template type ----
    if doc_type in ("marksheet", "tpl_marksheet"):
        c.setFillColor(INK)
        c.setFont("Times-Bold", 24)
        c.drawCentredString(PAGE_W / 2, y - 45, name[:44])
        c.setStrokeColor(GOLD)
        c.setLineWidth(0.9)
        name_w = min(c.stringWidth(name[:44], "Times-Bold", 24) + 30, PAGE_W - 160)
        c.line(PAGE_W / 2 - name_w / 2, y - 53, PAGE_W / 2 + name_w / 2, y - 53)

        # Transcript Data Table Box
        ty = y - 75
        c.setFillColor(HexColor("#FAFAFC"))
        c.setStrokeColor(HexColor("#D1D5DB"))
        c.roundRect(MARGIN + 20, ty - 85, PAGE_W - 2 * (MARGIN + 20), 80, 4, stroke=1, fill=1)
        
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(MARGIN + 35, ty - 20, "PROGRAM / BRANCH:")
        c.setFillColor(INK)
        c.setFont("Helvetica", 9)
        c.drawString(MARGIN + 160, ty - 20, course or "Academic Program")

        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(MARGIN + 35, ty - 42, "CANDIDATE ID / ROLL:")
        c.setFillColor(INK)
        c.setFont("Courier-Bold", 9)
        c.drawString(MARGIN + 160, ty - 42, cert_no or "—")

        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(MARGIN + 35, ty - 64, "OVERALL GRADE / CGPA:")
        c.setFillColor(HexColor("#10B981"))
        c.setFont("Helvetica-Bold", 11)
        c.drawString(MARGIN + 160, ty - 64, grade or "—")

    elif doc_type in ("bonafide", "tpl_bonafide"):
        c.setFillColor(MUTED)
        c.setFont("Helvetica-Oblique", 10)
        c.drawCentredString(PAGE_W / 2, y - 24, "TO WHOMSOEVER IT MAY CONCERN")
        
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 10)
        c.drawCentredString(PAGE_W / 2, y - 44, "This is to certify that")

        c.setFillColor(INK)
        c.setFont("Times-Bold", 24)
        c.drawCentredString(PAGE_W / 2, y - 74, name[:44])
        c.setStrokeColor(GOLD)
        c.setLineWidth(0.9)
        name_w = min(c.stringWidth(name[:44], "Times-Bold", 24) + 30, PAGE_W - 160)
        c.line(PAGE_W / 2 - name_w / 2, y - 82, PAGE_W / 2 + name_w / 2, y - 82)

        c.setFillColor(INK)
        c.setFont("Helvetica", 10.5)
        c.drawCentredString(PAGE_W / 2, y - 105, "is a bonafide student / member of this institution.")
        if course:
            c.setFont("Helvetica-Bold", 10.5)
            c.setFillColor(NAVY)
            c.drawCentredString(PAGE_W / 2, y - 124, f"Department / Purpose: {course}")
        if grade:
            c.setFont("Helvetica", 9.5)
            c.setFillColor(MUTED)
            c.drawCentredString(PAGE_W / 2, y - 142, f"Session / Status: {grade}")

    elif doc_type == "employment_offer":
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 10)
        c.drawCentredString(PAGE_W / 2, y - 25, "We are pleased to issue this offer of employment to")

        c.setFillColor(INK)
        c.setFont("Times-Bold", 24)
        c.drawCentredString(PAGE_W / 2, y - 55, name[:44])
        c.setStrokeColor(GOLD)
        c.setLineWidth(0.9)
        name_w = min(c.stringWidth(name[:44], "Times-Bold", 24) + 30, PAGE_W - 160)
        c.line(PAGE_W / 2 - name_w / 2, y - 63, PAGE_W / 2 + name_w / 2, y - 63)

        ty = y - 85
        c.setFillColor(HexColor("#F8FAFC"))
        c.setStrokeColor(HexColor("#CBD5E1"))
        c.roundRect(MARGIN + 30, ty - 65, PAGE_W - 2 * (MARGIN + 30), 60, 4, stroke=1, fill=1)

        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawString(MARGIN + 45, ty - 22, "DESIGNATION / POSITION:")
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(MARGIN + 200, ty - 22, course or "Assigned Role")

        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawString(MARGIN + 45, ty - 45, "REMUNERATION / DEPT:")
        c.setFillColor(HexColor("#D97706"))
        c.setFont("Helvetica-Bold", 10)
        c.drawString(MARGIN + 200, ty - 45, grade or "Standard Grade")

    elif doc_type == "medical_fitness":
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 10)
        c.drawCentredString(PAGE_W / 2, y - 25, "This is to certify that candidate")

        c.setFillColor(INK)
        c.setFont("Times-Bold", 24)
        c.drawCentredString(PAGE_W / 2, y - 55, name[:44])
        c.setStrokeColor(HexColor("#EF4444"))
        c.setLineWidth(0.9)
        name_w = min(c.stringWidth(name[:44], "Times-Bold", 24) + 30, PAGE_W - 160)
        c.line(PAGE_W / 2 - name_w / 2, y - 63, PAGE_W / 2 + name_w / 2, y - 63)

        c.setFillColor(INK)
        c.setFont("Helvetica", 10)
        c.drawCentredString(PAGE_W / 2, y - 88, "has undergone medical examination and is declared:")

        c.setFillColor(HexColor("#059669"))
        c.setFont("Helvetica-Bold", 12.5)
        c.drawCentredString(PAGE_W / 2, y - 110, grade or "FIT FOR DUTY / ADMISSION")

        if course:
            c.setFillColor(MUTED)
            c.setFont("Helvetica", 9.5)
            c.drawCentredString(PAGE_W / 2, y - 128, f"Examining Officer / Purpose: {course}")

    elif doc_type == "commercial_invoice":
        c.setFillColor(MUTED)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawCentredString(PAGE_W / 2, y - 24, f"BILL TO: {name[:44]}")

        ty = y - 45
        c.setFillColor(HexColor("#F8FAFC"))
        c.setStrokeColor(NAVY)
        c.setLineWidth(1)
        c.roundRect(MARGIN + 20, ty - 90, PAGE_W - 2 * (MARGIN + 20), 85, 4, stroke=1, fill=1)

        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(MARGIN + 35, ty - 20, "DESCRIPTION OF SERVICES / ITEMS:")
        c.setFillColor(INK)
        c.setFont("Helvetica", 9.5)
        c.drawString(MARGIN + 35, ty - 38, course or "Professional Verification Services")

        c.setStrokeColor(HexColor("#E2E8F0"))
        c.line(MARGIN + 35, ty - 50, PAGE_W - MARGIN - 35, ty - 50)

        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(MARGIN + 35, ty - 70, "TOTAL PAYABLE AMOUNT:")
        c.setFillColor(HexColor("#2563EB"))
        c.setFont("Helvetica-Bold", 12.5)
        c.drawString(MARGIN + 220, ty - 70, grade or "₹ 0.00")

    elif doc_type in ("hackathon_participation", "tpl_hack_part"):
        c.setFillColor(HexColor("#06B6D4"))
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(PAGE_W / 2, y - 24, "IN RECOGNITION OF INNOVATION & PARTICIPATION")

        c.setFillColor(MUTED)
        c.setFont("Helvetica", 10)
        c.drawCentredString(PAGE_W / 2, y - 44, "This is proudly presented to")

        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 26)
        c.drawCentredString(PAGE_W / 2, y - 76, name[:44])
        c.setStrokeColor(HexColor("#06B6D4"))
        c.setLineWidth(1.2)
        name_w = min(c.stringWidth(name[:44], "Helvetica-Bold", 26) + 30, PAGE_W - 160)
        c.line(PAGE_W / 2 - name_w / 2, y - 84, PAGE_W / 2 + name_w / 2, y - 84)

        c.setFillColor(INK)
        c.setFont("Helvetica", 11)
        hack_name = fields.get("hackathon_name") or course or "National Hackathon"
        c.drawCentredString(PAGE_W / 2, y - 110, f"for active participation and code contribution in {hack_name}")

        team_name = fields.get("team_name")
        project_title = fields.get("project_title")
        if team_name or project_title:
            c.setFont("Helvetica-Bold", 10)
            c.setFillColor(NAVY)
            sub = f"Team: {team_name}" if team_name else ""
            if project_title:
                sub += f" · Project: {project_title}" if sub else f"Project: {project_title}"
            c.drawCentredString(PAGE_W / 2, y - 130, sub[:65])

    elif doc_type in ("hackathon_winner", "tpl_hack_win"):
        c.setFillColor(HexColor("#D97706"))
        c.setFont("Helvetica-Bold", 11)
        rank = fields.get("standing_rank") or "FIRST PLACE CHAMPION"
        c.drawCentredString(PAGE_W / 2, y - 24, f"★ {rank.upper()} ★")

        c.setFillColor(MUTED)
        c.setFont("Helvetica", 10)
        c.drawCentredString(PAGE_W / 2, y - 44, "This excellence award is conferred upon")

        c.setFillColor(INK)
        c.setFont("Times-Bold", 27)
        c.drawCentredString(PAGE_W / 2, y - 76, name[:44])
        c.setStrokeColor(GOLD)
        c.setLineWidth(1.5)
        name_w = min(c.stringWidth(name[:44], "Times-Bold", 27) + 30, PAGE_W - 160)
        c.line(PAGE_W / 2 - name_w / 2, y - 84, PAGE_W / 2 + name_w / 2, y - 84)

        c.setFillColor(INK)
        c.setFont("Helvetica", 11)
        hack_name = fields.get("hackathon_name") or course or "Global Hackathon"
        c.drawCentredString(PAGE_W / 2, y - 110, f"for winning and exemplary technical mastery at {hack_name}")

        prize = fields.get("prize_amount")
        if prize:
            c.setFont("Helvetica-Bold", 10.5)
            c.setFillColor(HexColor("#D97706"))
            c.drawCentredString(PAGE_W / 2, y - 130, f"Prize Awarded: {prize}")

    elif doc_type in ("workshop_completion", "tpl_workshop"):
        c.setFillColor(HexColor("#0D9488"))
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(PAGE_W / 2, y - 24, "CERTIFICATE OF TECHNICAL MASTERY")

        c.setFillColor(MUTED)
        c.setFont("Helvetica", 10)
        c.drawCentredString(PAGE_W / 2, y - 44, "This certifies that")

        c.setFillColor(INK)
        c.setFont("Times-Bold", 26)
        c.drawCentredString(PAGE_W / 2, y - 74, name[:44])
        c.setStrokeColor(HexColor("#0D9488"))
        c.setLineWidth(1)
        name_w = min(c.stringWidth(name[:44], "Times-Bold", 26) + 30, PAGE_W - 160)
        c.line(PAGE_W / 2 - name_w / 2, y - 82, PAGE_W / 2 + name_w / 2, y - 82)

        workshop_title = fields.get("workshop_title") or course or "Hands-on Technical Bootcamp"
        c.setFillColor(INK)
        c.setFont("Helvetica", 11)
        c.drawCentredString(PAGE_W / 2, y - 108, f"has successfully completed the intensive bootcamp on {workshop_title}")

        hours = fields.get("duration_hours")
        if hours:
            c.setFont("Helvetica-Bold", 10)
            c.setFillColor(HexColor("#0D9488"))
            c.drawCentredString(PAGE_W / 2, y - 128, f"Total Immersion: {hours} Hours of Practical Training")

    elif doc_type in ("internship_certificate", "tpl_internship"):
        c.setFillColor(HexColor("#1E40AF"))
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(PAGE_W / 2, y - 24, "CERTIFICATE OF INTERNSHIP COMPLETION")

        c.setFillColor(MUTED)
        c.setFont("Helvetica", 10)
        c.drawCentredString(PAGE_W / 2, y - 44, "This is to certify that")

        c.setFillColor(INK)
        c.setFont("Times-Bold", 26)
        c.drawCentredString(PAGE_W / 2, y - 74, name[:44])
        c.setStrokeColor(HexColor("#1E40AF"))
        c.setLineWidth(1.2)
        name_w = min(c.stringWidth(name[:44], "Times-Bold", 26) + 30, PAGE_W - 160)
        c.line(PAGE_W / 2 - name_w / 2, y - 82, PAGE_W / 2 + name_w / 2, y - 82)

        role = fields.get("role_title") or course or "Software Engineering Intern"
        dept = fields.get("department") or "Engineering Team"
        c.setFillColor(INK)
        c.setFont("Helvetica", 11)
        c.drawCentredString(PAGE_W / 2, y - 108, f"has served with distinction as {role} in the {dept}")

        perf = fields.get("performance_rating") or grade
        if perf:
            c.setFont("Helvetica-Bold", 10)
            c.setFillColor(HexColor("#1E40AF"))
            c.drawCentredString(PAGE_W / 2, y - 128, f"Performance Evaluation: {perf}")

    else:
        # Standard built-in body rendering
        # ---- title ----
        y = PAGE_H - 250
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 17)
        c.drawCentredString(PAGE_W / 2, y, title)

        # ---- body ----
        if doc_type == "marksheet":
            c.setFillColor(MUTED)
            c.setFont("Helvetica", 11.5)
            c.drawCentredString(PAGE_W / 2, y - 34, "Official Transcript of Records")

            c.setFillColor(INK)
            c.setFont("Times-Bold", 27)
            c.drawCentredString(PAGE_W / 2, y - 74, name[:44])
            c.setStrokeColor(GOLD)
            c.setLineWidth(0.9)
            name_w = min(c.stringWidth(name[:44], "Times-Bold", 27) + 30, PAGE_W - 160)
            c.line(PAGE_W / 2 - name_w / 2, y - 84, PAGE_W / 2 + name_w / 2, y - 84)

        c.setFillColor(INK)
        c.setFont("Helvetica", 11.5)
        line_y = y - 112
        if course:
            c.drawCentredString(PAGE_W / 2, line_y, f"has successfully completed {course}")
            line_y -= 20
        if grade:
            c.setFont("Helvetica-Bold", 11.5)
            c.setFillColor(NAVY)
            c.drawCentredString(PAGE_W / 2, line_y, f"Grade: {grade}")
            c.setFillColor(INK)
            c.setFont("Helvetica", 11.5)
            line_y = y - 112
            if course:
                c.drawCentredString(PAGE_W / 2, line_y, f"Program: {course}")
                line_y -= 20
            if grade:
                c.setFont("Helvetica-Bold", 14)
                c.setFillColor(NAVY)
                c.drawCentredString(PAGE_W / 2, line_y, f"Overall Grade/Marks: {grade}")
                c.setFillColor(INK)
                c.setFont("Helvetica", 11.5)
                line_y -= 20
            if issue_date:
                c.drawCentredString(PAGE_W / 2, line_y, f"Date of Issue: {issue_date}")

        elif doc_type == "bonafide":
            c.setFillColor(MUTED)
            c.setFont("Helvetica", 11.5)
            c.drawCentredString(PAGE_W / 2, y - 34, "This is to certify that")
            
            c.setFillColor(INK)
            c.setFont("Times-Bold", 27)
            c.drawCentredString(PAGE_W / 2, y - 74, name[:44])
            c.setStrokeColor(GOLD)
            c.setLineWidth(0.9)
            name_w = min(c.stringWidth(name[:44], "Times-Bold", 27) + 30, PAGE_W - 160)
            c.line(PAGE_W / 2 - name_w / 2, y - 84, PAGE_W / 2 + name_w / 2, y - 84)

            c.setFillColor(INK)
            c.setFont("Helvetica", 11.5)
            line_y = y - 112
            c.drawCentredString(PAGE_W / 2, line_y, "is/was a bonafide student of this institution")
            line_y -= 20
            if course:
                c.drawCentredString(PAGE_W / 2, line_y, f"enrolled in the {course} program.")
                line_y -= 20
            if issue_date:
                c.drawCentredString(PAGE_W / 2, line_y, f"Issued on {issue_date}")

        elif doc_type in ("hackathon_participation", "hackathon_winner"):
            c.setFillColor(MUTED)
            c.setFont("Helvetica", 11.5)
            action_text = "This certificate is proudly awarded to"
            c.drawCentredString(PAGE_W / 2, y - 34, action_text)

            c.setFillColor(INK)
            c.setFont("Times-Bold", 27)
            c.drawCentredString(PAGE_W / 2, y - 74, name[:44])
            c.setStrokeColor(accent_color or GOLD)
            c.setLineWidth(1.2)
            name_w = min(c.stringWidth(name[:44], "Times-Bold", 27) + 30, PAGE_W - 160)
            c.line(PAGE_W / 2 - name_w / 2, y - 84, PAGE_W / 2 + name_w / 2, y - 84)

            c.setFillColor(INK)
            c.setFont("Helvetica", 11.5)
            line_y = y - 112
            if doc_type == "hackathon_winner":
                c.drawCentredString(PAGE_W / 2, line_y, f"for demonstrating exceptional engineering excellence in")
                line_y -= 20
                event_name = course or "EVIDENTIA National Hackathon"
                c.setFont("Helvetica-Bold", 13.5)
                c.setFillColor(primary_color or NAVY)
                c.drawCentredString(PAGE_W / 2, line_y, event_name)
                c.setFillColor(INK)
                c.setFont("Helvetica", 11.5)
                line_y -= 20
                if grade:
                    c.setFont("Helvetica-Bold", 13.0)
                    c.setFillColor(GOLD)
                    c.drawCentredString(PAGE_W / 2, line_y, f"Standing / Award: {grade}")
                    c.setFillColor(INK)
                    c.setFont("Helvetica", 11.5)
                    line_y -= 20
            else:
                c.drawCentredString(PAGE_W / 2, line_y, f"for active and successful participation in")
                line_y -= 20
                event_name = course or "EVIDENTIA Hackathon 2026"
                c.setFont("Helvetica-Bold", 13.0)
                c.setFillColor(primary_color or NAVY)
                c.drawCentredString(PAGE_W / 2, line_y, event_name)
                c.setFillColor(INK)
                c.setFont("Helvetica", 11.5)
                line_y -= 20
                if grade:
                    c.drawCentredString(PAGE_W / 2, line_y, f"Track / Team Recognition: {grade}")
                    line_y -= 20

            if issue_date:
                c.drawCentredString(PAGE_W / 2, line_y, f"Presented on {issue_date}")

        elif doc_type == "workshop_completion":
            c.setFillColor(MUTED)
            c.setFont("Helvetica", 11.5)
            c.drawCentredString(PAGE_W / 2, y - 34, "This is to certify that")

            c.setFillColor(INK)
            c.setFont("Times-Bold", 27)
            c.drawCentredString(PAGE_W / 2, y - 74, name[:44])
            c.setStrokeColor(GOLD)
            c.setLineWidth(0.9)
            name_w = min(c.stringWidth(name[:44], "Times-Bold", 27) + 30, PAGE_W - 160)
            c.line(PAGE_W / 2 - name_w / 2, y - 84, PAGE_W / 2 + name_w / 2, y - 84)

            c.setFillColor(INK)
            c.setFont("Helvetica", 11.5)
            line_y = y - 112
            c.drawCentredString(PAGE_W / 2, line_y, "has successfully attended and completed the intensive workshop on")
            line_y -= 20
            if course:
                c.setFont("Helvetica-Bold", 13)
                c.setFillColor(primary_color or NAVY)
                c.drawCentredString(PAGE_W / 2, line_y, course)
                c.setFillColor(INK)
                c.setFont("Helvetica", 11.5)
                line_y -= 20
            if grade:
                c.drawCentredString(PAGE_W / 2, line_y, f"Proficiency Level: {grade}")
                line_y -= 20
            if issue_date:
                c.drawCentredString(PAGE_W / 2, line_y, f"Awarded on {issue_date}")

        elif doc_type == "internship_certificate":
            c.setFillColor(MUTED)
            c.setFont("Helvetica", 11.5)
            c.drawCentredString(PAGE_W / 2, y - 34, "This is to certify that")

            c.setFillColor(INK)
            c.setFont("Times-Bold", 27)
            c.drawCentredString(PAGE_W / 2, y - 74, name[:44])
            c.setStrokeColor(GOLD)
            c.setLineWidth(0.9)
            name_w = min(c.stringWidth(name[:44], "Times-Bold", 27) + 30, PAGE_W - 160)
            c.line(PAGE_W / 2 - name_w / 2, y - 84, PAGE_W / 2 + name_w / 2, y - 84)

            c.setFillColor(INK)
            c.setFont("Helvetica", 11.5)
            line_y = y - 112
            c.drawCentredString(PAGE_W / 2, line_y, "has successfully completed a practical internship program as")
            line_y -= 20
            if course:
                c.setFont("Helvetica-Bold", 13)
                c.setFillColor(primary_color or NAVY)
                c.drawCentredString(PAGE_W / 2, line_y, course)
                c.setFillColor(INK)
                c.setFont("Helvetica", 11.5)
                line_y -= 20
            if grade:
                c.drawCentredString(PAGE_W / 2, line_y, f"Performance Evaluation: {grade}")
                line_y -= 20
            if issue_date:
                c.drawCentredString(PAGE_W / 2, line_y, f"Dated: {issue_date}")

        else:
            c.setFillColor(MUTED)
            c.setFont("Helvetica", 10.5)
            c.drawCentredString(PAGE_W / 2, y - 34, "This is to certify that")

            c.setFillColor(INK)
            c.setFont("Times-Bold", 27)
            c.drawCentredString(PAGE_W / 2, y - 74, name[:44])
            c.setStrokeColor(GOLD)
            c.setLineWidth(0.9)
            name_w = min(c.stringWidth(name[:44], "Times-Bold", 27) + 30, PAGE_W - 160)
            c.line(PAGE_W / 2 - name_w / 2, y - 84, PAGE_W / 2 + name_w / 2, y - 84)

            c.setFillColor(INK)
            c.setFont("Helvetica", 11.5)
            line_y = y - 112
            if course:
                c.drawCentredString(PAGE_W / 2, line_y, f"has successfully completed  {course}")
                line_y -= 20
            if grade:
                c.setFont("Helvetica-Bold", 11.5)
                c.setFillColor(NAVY)
                c.drawCentredString(PAGE_W / 2, line_y, f"Grade: {grade}")
                c.setFillColor(INK)
                c.setFont("Helvetica", 11.5)
                line_y -= 20
            if issue_date:
                c.drawCentredString(PAGE_W / 2, line_y, f"Issued on {issue_date}")

    # ---- seal / signatory ----
    custom_seal = None
    custom_signatory = None
    if branding and isinstance(branding, dict):
        custom_seal = _safe_image_reader(branding.get("seal_base64"))
        custom_signatory = _safe_image_reader(branding.get("signatory_base64"))

    if custom_seal:
        try:
            c.drawImage(custom_seal, PAGE_W - 130 - 36, PAGE_H - 470 - 36, width=72, height=72, mask="auto", preserveAspectRatio=True)
        except Exception:
            _seal(c, PAGE_W - 130, PAGE_H - 470, 44, doc_id)
    else:
        _seal(c, PAGE_W - 130, PAGE_H - 470, 44, doc_id)

    if custom_signatory:
        try:
            # Authorized signatory signature image positioned above signatory label
            c.drawImage(custom_signatory, MARGIN + 40, PAGE_H - 475, width=90, height=36, mask="auto", preserveAspectRatio=True)
            c.setFillColor(MUTED)
            c.setFont("Helvetica-Bold", 7.5)
            c.drawString(MARGIN + 40, PAGE_H - 485, "AUTHORIZED SIGNATORY")
        except Exception:
            pass

    # ---- facts block (OCR-friendly, fixed layout) ----
    fy = PAGE_H - 560
    c.setFillColor(HexColor("#EEF1F8"))
    c.roundRect(MARGIN + 10, fy - 78, PAGE_W - 2 * (MARGIN + 10), 92, 6, stroke=0, fill=1)
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 7.5)
    rows = [
        ("CERTIFICATE ID", cert_no or "—"),
        ("DOCUMENT ID", doc_id),
        ("ISSUER", issuer),
        ("ISSUE DATE", issue_date or "—"),
    ]
    for i, (k, v) in enumerate(rows):
        ry = fy + 4 - i * 20
        c.setFillColor(MUTED)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(MARGIN + 26, ry, k)
        c.setFillColor(INK)
        c.setFont("Courier" if k in ("DOCUMENT ID", "CERTIFICATE ID") else "Helvetica", 9)
        c.drawString(MARGIN + 150, ry, sanitize(v, k.lower())[:58])

    # ---- sponsor logos (bottom left, strictly non-overlapping with QR code) ----
    if branding and isinstance(branding, dict):
        sponsors_b64 = branding.get("sponsors_base64") or []
        if isinstance(sponsors_b64, list) and len(sponsors_b64) > 0:
            c.setFillColor(MUTED)
            c.setFont("Helvetica-Bold", 7.0)
            c.drawString(MARGIN + 14, MARGIN + 86, "PARTNERS & SPONSORS")
            sp_x = MARGIN + 14
            max_sp_x = PAGE_W - MARGIN - 26 - 88 - 20 # Leave safe gap before QR box
            for sp_b64 in sponsors_b64[:6]:
                if sp_x + 44 > max_sp_x:
                    break
                sp_img = _safe_image_reader(sp_b64)
                if sp_img:
                    try:
                        c.drawImage(sp_img, sp_x, MARGIN + 32, width=42, height=42, mask="auto", preserveAspectRatio=True)
                        sp_x += 50
                    except Exception:
                        pass

    # ---- QR (bottom right) ----
    qr_size = 88
    qx = PAGE_W - MARGIN - 26 - qr_size
    qy = MARGIN + 22
    c.setFillColor(white)
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.8)
    c.roundRect(qx - 6, qy - 6, qr_size + 12, qr_size + 26, 5, stroke=1, fill=1)
    c.drawImage(_qr_image(qr_text), qx, qy + 14, width=qr_size, height=qr_size, mask=None)
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 6.6)
    c.drawCentredString(qx + qr_size / 2, qy + 4, "SCAN TO VERIFY")

    # ---- footer ----
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 7.4)
    short_url = qr_text.replace("https://", "").replace("http://", "")
    c.drawString(MARGIN + 10, MARGIN + 6, f"Verified by Evidentia · verify: {short_url[:64]}")
    c.setFont("Courier", 6.6)
    c.drawString(MARGIN + 10, MARGIN - 6, f"doc {doc_id}  ·  signed ECDSA-P256 + SHA-256  ·  registry-backed")

    c.showPage()
    c.save()

    pdf_bytes = buf.getvalue()
    return _force_fixed_dates(pdf_bytes, issued_at)


def _force_fixed_dates(pdf_bytes: bytes, issued_at: str) -> bytes:
    """ReportLab stamps /CreationDate at save time. Replace it with a value derived from
    issued_at so re-rendering the same input yields identical bytes."""
    stamp = _pdf_date(issued_at)
    out = re.sub(
        rb"/CreationDate \(D:[^)]*\)",
        b"/CreationDate (" + stamp + b")",
        pdf_bytes,
    )
    out = re.sub(rb"/ModDate \(D:[^)]*\)", b"/ModDate (" + stamp + b")", out)
    return out


def _pdf_date(iso: str) -> bytes:
    digits = re.sub(r"[^0-9]", "", str(iso or ""))[:14]
    digits = digits.ljust(14, "0")
    return digits.encode() + b"+00'00'"
