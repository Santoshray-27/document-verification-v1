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
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

NAVY = HexColor("#0A1F44")
NAVY_SOFT = HexColor("#152A55")
GOLD = HexColor("#C9A227")
GOLD_LIGHT = HexColor("#E3C463")
INK = HexColor("#1B2437")
MUTED = HexColor("#5A6478")
PARCHMENT = HexColor("#FDFBF7")

# Page Dimensions (pt)
LANDSCAPE_A4 = (841.89, 595.27)
PORTRAIT_A4 = (595.27, 841.89)

DOC_TYPE_TITLES = {
    "academic_certificate": "CERTIFICATE OF DEGREE CONFERRAL",
    "tpl_academic": "CERTIFICATE OF DEGREE CONFERRAL",
    "tpl_acad_01": "CERTIFICATE OF DEGREE CONFERRAL",
    "marksheet": "OFFICIAL STATEMENT OF GRADES & CUMULATIVE TRANSCRIPT",
    "tpl_marksheet": "OFFICIAL STATEMENT OF GRADES & CUMULATIVE TRANSCRIPT",
    "tpl_mark_01": "OFFICIAL STATEMENT OF GRADES & CUMULATIVE TRANSCRIPT",
    "bonafide": "BONAFIDE CERTIFICATE",
    "tpl_bonafide": "BONAFIDE CERTIFICATE",
    "tpl_bona_01": "BONAFIDE CERTIFICATE",
    "hackathon_participation": "CERTIFICATE OF CONTENDER PARTICIPATION",
    "tpl_hack_part": "CERTIFICATE OF CONTENDER PARTICIPATION",
    "tpl_hack_part_01": "CERTIFICATE OF CONTENDER PARTICIPATION",
    "hackathon_winner": "HACKATHON WINNER & PRESTIGE AWARD",
    "tpl_hack_win": "HACKATHON WINNER & PRESTIGE AWARD",
    "tpl_hack_win_01": "HACKATHON WINNER & PRESTIGE AWARD",
    "workshop_completion": "PROFESSIONAL SKILL CERTIFICATION",
    "tpl_workshop": "PROFESSIONAL SKILL CERTIFICATION",
    "tpl_work_01": "PROFESSIONAL SKILL CERTIFICATION",
    "internship_certificate": "CORPORATE INTERNSHIP EXPERIENCE RECORD",
    "tpl_internship": "CORPORATE INTERNSHIP EXPERIENCE RECORD",
    "tpl_intern_01": "CORPORATE INTERNSHIP EXPERIENCE RECORD",
    "employment_offer": "OFFER OF EMPLOYMENT",
    "tpl_emp_01": "OFFER OF EMPLOYMENT",
    "medical_fitness": "MEDICAL FITNESS CERTIFICATE",
    "tpl_med_01": "MEDICAL FITNESS CERTIFICATE",
    "commercial_invoice": "COMMERCIAL INVOICE",
    "tpl_inv_01": "COMMERCIAL INVOICE",
}

MAX_LEN = {"name": 70, "course": 90, "grade": 50, "certificate_number": 40, "issue_date": 30, "issuer_name": 80}


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
    qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=4, border=1)
    qr.add_data(text)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0F172A", back_color="white").convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return ImageReader(buf)


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


def _draw_security_footer(c: canvas.Canvas, W: float, H: float, doc_id: str, issue_date: str, qr_text: str, dark: bool = False) -> None:
    foot_y = 48
    line_col = HexColor("#334155") if dark else HexColor("#E2E8F0")
    text_col = HexColor("#CBD5E1") if dark else HexColor("#475569")
    sub_col = HexColor("#94A3B8") if dark else HexColor("#64748B")

    c.setStrokeColor(line_col)
    c.setLineWidth(0.8)
    c.line(36, foot_y + 14, W - 36, foot_y + 14)

    c.setFillColor(text_col)
    c.setFont("Helvetica-Bold", 7.5)
    c.drawString(36, foot_y, "Secured by Evidentia · ECDSA P-256 + SHA-256")

    c.setFillColor(sub_col)
    c.setFont("Courier", 7)
    c.drawString(36, foot_y - 10, f"Doc ID: {doc_id} · Issued: {issue_date}")

    c.setFont("Helvetica", 6.5)
    c.drawString(36, foot_y - 19, "Cryptographically Signed & Registry-Backed Credential")

    qr_size = 34
    qr_x = W - 36 - qr_size
    qr_y = foot_y - 20

    c.setFillColor(white)
    c.setStrokeColor(line_col)
    c.rect(qr_x - 2, qr_y - 2, qr_size + 4, qr_size + 4, stroke=1, fill=1)
    c.drawImage(_qr_image(qr_text), qr_x, qr_y, width=qr_size, height=qr_size, mask=None)

    c.setFillColor(HexColor("#F8FAFC") if dark else HexColor("#0F172A"))
    c.setFont("Helvetica-Bold", 7)
    c.drawRightString(qr_x - 8, foot_y - 5, "SCAN TO VERIFY")
    c.setFillColor(sub_col)
    c.setFont("Helvetica", 6.5)
    c.drawRightString(qr_x - 8, foot_y - 15, "tamper-evident proof")


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
    """Render certificate PDF pixel-matched to the corresponding CertificateView component."""
    # Normalize fields from both forms
    recipient = sanitize(fields.get("recipient_name") or fields.get("name"), "name") or "Aarav Sharma"
    cert_no = sanitize(fields.get("certificate_number") or doc_id, "certificate_number") or "MIT-ENG-2026-084"
    course = sanitize(fields.get("course"), "course")
    department = sanitize(fields.get("department"), "course")
    grade = sanitize(fields.get("grade"), "grade")
    issue_date = sanitize(fields.get("issue_date"), "issue_date") or issued_at[:10]
    issuer = sanitize(issuer_name, "issuer_name") or "PIEMR"
    title = DOC_TYPE_TITLES.get(doc_type, "CERTIFICATE")

    # Determine orientation matching frontend TEMPLATE_REGISTRY
    is_landscape = doc_type in (
        "academic_certificate", "tpl_academic", "tpl_acad_01",
        "hackathon_participation", "tpl_hack_part", "tpl_hack_part_01",
        "hackathon_winner", "tpl_hack_win", "tpl_hack_win_01",
        "workshop_completion", "tpl_workshop", "tpl_work_01"
    )
    PAGE_W, PAGE_H = LANDSCAPE_A4 if is_landscape else PORTRAIT_A4

    # Extract monogram
    words = [w for w in re.split(r"\s+", issuer) if w]
    monogram = "".join(w[0] for w in words[:2]).upper() if words else "PI"

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(PAGE_W, PAGE_H), invariant=1)
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

    if bg_reader:
        try:
            c.drawImage(bg_reader, 0, 0, width=PAGE_W, height=PAGE_H, mask=None)
        except Exception:
            c.setFillColor(PARCHMENT if is_landscape else white)
            c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

    # =========================================================================
    # 1. ACADEMIC CERTIFICATE (Landscape Parchment - exact AcademicCertificateView)
    # =========================================================================
    if doc_type in ("academic_certificate", "tpl_academic", "tpl_acad_01") and not bg_reader:
        # Background
        c.setFillColor(PARCHMENT)
        c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

        # Outer navy border (border-[6px] border-[#0A1F44])
        c.setStrokeColor(NAVY)
        c.setLineWidth(5)
        c.rect(14, 14, PAGE_W - 28, PAGE_H - 28, stroke=1, fill=0)

        # Inner ornate gold double borders (border-[1.5px] and border-[0.5px])
        c.setStrokeColor(GOLD)
        c.setLineWidth(1.4)
        c.rect(22, 22, PAGE_W - 44, PAGE_H - 44, stroke=1, fill=0)

        c.setStrokeColor(HexColor("#E5D394"))
        c.setLineWidth(0.6)
        c.rect(26, 26, PAGE_W - 52, PAGE_H - 52, stroke=1, fill=0)

        # Corner gold brackets
        c.setStrokeColor(GOLD)
        c.setLineWidth(2)
        bracket_len = 28
        for cx, cy, dx, dy in (
            (30, PAGE_H - 30, 1, -1),
            (PAGE_W - 30, PAGE_H - 30, -1, -1),
            (30, 30, 1, 1),
            (PAGE_W - 30, 30, -1, 1)
        ):
            c.line(cx, cy, cx + dx * bracket_len, cy)
            c.line(cx, cy, cx, cy + dy * bracket_len)

        # Subtle watermark initial
        c.saveState()
        try:
            c.setFillColor(NAVY)
            c.setFillAlpha(0.035)
            c.setFont("Helvetica-Bold", 175)
            c.drawCentredString(PAGE_W / 2, PAGE_H / 2 - 45, monogram)
        except Exception:
            pass
        c.restoreState()

        # Monogram Circle Emblem
        mono_cx = PAGE_W / 2
        mono_cy = PAGE_H - 74
        c.setFillColor(HexColor("#FDF4D9"))
        c.setStrokeColor(HexColor("#E8CF82"))
        c.setLineWidth(1)
        c.circle(mono_cx, mono_cy, 21, stroke=1, fill=1)
        c.setFillColor(HexColor("#78350F"))
        c.setFont("Times-Bold", 14)
        c.drawCentredString(mono_cx, mono_cy - 5, monogram)

        # Org Name
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 19)
        c.drawCentredString(PAGE_W / 2, PAGE_H - 120, issuer)

        # City / Subtitle
        c.setFillColor(HexColor("#64748B"))
        c.setFont("Helvetica-Bold", 7.5)
        c.drawCentredString(PAGE_W / 2, PAGE_H - 134, "BENGALURU, INDIA")

        # Gold Divider
        c.setStrokeColor(GOLD)
        c.setLineWidth(1)
        c.line(PAGE_W / 2 - 96, PAGE_H - 144, PAGE_W / 2 + 96, PAGE_H - 144)

        # Title: CERTIFICATE OF DEGREE CONFERRAL
        c.setFillColor(GOLD)
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(PAGE_W / 2, PAGE_H - 160, "CERTIFICATE OF DEGREE CONFERRAL")

        # Narrative Body
        c.setFillColor(HexColor("#475569"))
        c.setFont("Helvetica-Oblique", 11)
        c.drawCentredString(PAGE_W / 2, PAGE_H - 194, "This is to certify that")

        # Recipient Name
        c.setFillColor(NAVY)
        c.setFont("Times-Bold", 28)
        c.drawCentredString(PAGE_W / 2, PAGE_H - 232, recipient)

        # Underline
        c.setStrokeColor(HexColor("#E5D394"))
        c.setLineWidth(1.4)
        c.line(PAGE_W / 2 - 80, PAGE_H - 242, PAGE_W / 2 + 80, PAGE_H - 242)

        # Narrative Lines
        c.setFillColor(HexColor("#334155"))
        c.setFont("Helvetica", 11)
        c.drawCentredString(PAGE_W / 2, PAGE_H - 268, "having successfully fulfilled all academic requirements and regulations has")
        c.drawCentredString(PAGE_W / 2, PAGE_H - 285, "been conferred the degree of")

        # Degree Title
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 16.5)
        c.drawCentredString(PAGE_W / 2, PAGE_H - 315, course or "Bachelor of Technology in Computer Science & AI")

        # Department
        if department:
            c.setFillColor(HexColor("#64748B"))
            c.setFont("Helvetica", 9.5)
            c.drawCentredString(PAGE_W / 2, PAGE_H - 333, department)

        # Division / Grade Pill
        if grade:
            pill_y = PAGE_H - 364
            c.setFillColor(HexColor("#F4F6F9"))
            c.setStrokeColor(HexColor("#E0CD91"))
            c.setLineWidth(0.8)
            grade_w = min(c.stringWidth(grade, "Helvetica-Bold", 9.5) + 32, 380)
            c.roundRect(PAGE_W / 2 - grade_w / 2, pill_y - 5, grade_w, 20, 10, stroke=1, fill=1)
            c.setFillColor(NAVY)
            c.setFont("Helvetica-Bold", 9.5)
            c.drawCentredString(PAGE_W / 2, pill_y + 1, grade)

        # Signatures & Official Seal
        sig_y = 115
        sig1 = fields.get("signatory_1") or "Dr. R. Menon (Registrar)"
        sig2 = fields.get("signatory_2") or "Prof. K. S. Ramanathan (Vice Chancellor)"

        # Left Signature
        c.setStrokeColor(HexColor("#94A3B8"))
        c.setLineWidth(0.8)
        c.line(110, sig_y, 250, sig_y)
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawCentredString(180, sig_y - 14, sig1)
        c.setFillColor(HexColor("#64748B"))
        c.setFont("Helvetica", 8)
        c.drawCentredString(180, sig_y - 26, "Authorized Signatory")

        # Center Official Seal
        seal_cx = PAGE_W / 2
        seal_cy = sig_y - 10
        c.setStrokeColor(GOLD)
        c.setLineWidth(1.5)
        c.circle(seal_cx, seal_cy, 24, stroke=1, fill=0)
        c.setLineWidth(0.6)
        c.circle(seal_cx, seal_cy, 21, stroke=1, fill=0)
        c.setFillColor(GOLD)
        c.setFont("Helvetica-Bold", 11)
        c.drawCentredString(seal_cx, seal_cy + 2, "★ ★ ★")
        c.setFont("Helvetica-Bold", 6.8)
        c.drawCentredString(seal_cx, seal_cy - 8, "OFFICIAL")

        # Right Signature
        c.setStrokeColor(HexColor("#94A3B8"))
        c.setLineWidth(0.8)
        c.line(PAGE_W - 250, sig_y, PAGE_W - 110, sig_y)
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawCentredString(PAGE_W - 180, sig_y - 14, sig2)
        c.setFillColor(HexColor("#64748B"))
        c.setFont("Helvetica", 8)
        c.drawCentredString(PAGE_W - 180, sig_y - 26, "Vice Chancellor")

        # Security Footer
        _draw_security_footer(c, PAGE_W, PAGE_H, cert_no, issue_date, qr_text, dark=False)

    # =========================================================================
    # 2. HACKATHON PARTICIPATION (Landscape Cyberpunk - HackathonParticipationView)
    # =========================================================================
    elif doc_type in ("hackathon_participation", "tpl_hack_part", "tpl_hack_part_01") and not bg_reader:
        CYAN = HexColor("#06B6D4")
        CYAN_LIGHT = HexColor("#67E8F9")
        DARK_BG = HexColor("#0B0F19")
        SLATE_400 = HexColor("#94A3B8")
        SLATE_300 = HexColor("#CBD5E1")
        PURPLE_ACCENT = HexColor("#8B5CF6")

        # Dark background
        c.setFillColor(DARK_BG)
        c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

        # Subtle Neon Corner Glow Accents
        c.saveState()
        # Top-right Purple Glow
        c.setFillColor(HexColor("#1E1B4B"))
        p = c.beginPath()
        p.moveTo(PAGE_W - 140, PAGE_H)
        p.curveTo(PAGE_W - 90, PAGE_H - 50, PAGE_W - 40, PAGE_H - 120, PAGE_W, PAGE_H - 140)
        p.lineTo(PAGE_W, PAGE_H)
        p.close()
        c.drawPath(p, fill=1, stroke=0)

        # Bottom-left Cyan Glow
        c.setFillColor(HexColor("#083344"))
        p2 = c.beginPath()
        p2.moveTo(0, 0)
        p2.lineTo(0, 130)
        p2.curveTo(40, 100, 90, 50, 140, 0)
        p2.close()
        c.drawPath(p2, fill=1, stroke=0)
        c.restoreState()

        # Border
        c.setStrokeColor(HexColor("#0891B2"))
        c.setLineWidth(2.5)
        c.rect(14, 14, PAGE_W - 28, PAGE_H - 28, stroke=1, fill=0)

        # Header - Brand Hero & Badge
        mono_x = 42
        mono_y = PAGE_H - 62
        c.setFillColor(HexColor("#162032"))
        c.setStrokeColor(HexColor("#334155"))
        c.setLineWidth(1)
        c.circle(mono_x + 18, mono_y + 8, 18, stroke=1, fill=1)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 12)
        c.drawCentredString(mono_x + 18, mono_y + 4, monogram)

        # Issuer Name
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(mono_x + 44, mono_y + 11, issuer)
        c.setFillColor(SLATE_400)
        c.setFont("Courier-Bold", 7.5)
        c.drawString(mono_x + 44, mono_y - 2, "ACCREDITED ISSUING AUTHORITY")

        # Participant Badge Box (top right)
        mode = fields.get("mode") or "36-Hour Onsite Sprint"
        c.setFillColor(HexColor("#0E2A38"))
        c.setStrokeColor(CYAN)
        c.setLineWidth(1)
        c.roundRect(PAGE_W - 190, PAGE_H - 58, 148, 24, 3, stroke=1, fill=1)
        c.setFillColor(CYAN)
        c.setFont("Courier-Bold", 8)
        c.drawCentredString(PAGE_W - 116, PAGE_H - 46, "PARTICIPANT BADGE")
        c.setFillColor(SLATE_400)
        c.setFont("Courier", 7)
        c.drawRightString(PAGE_W - 42, PAGE_H - 72, mode)

        # Header divider
        c.setStrokeColor(HexColor("#1E293B"))
        c.setLineWidth(1)
        c.line(42, PAGE_H - 85, PAGE_W - 42, PAGE_H - 85)

        # Subtitle
        c.setFillColor(CYAN)
        c.setFont("Courier-Bold", 8.5)
        c.drawString(42, PAGE_H - 112, "CERTIFICATE OF CONTENDER PARTICIPATION")

        # Recipient Name (cyan-tinted white)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 32)
        c.drawString(42, PAGE_H - 154, recipient)

        # Squad pill
        team = fields.get("team_name") or "ByteForge Syndicate"
        c.setFillColor(SLATE_400)
        c.setFont("Courier-Bold", 8)
        c.drawString(42, PAGE_H - 180, "SQUAD: ")
        c.setFillColor(HexColor("#1E293B"))
        c.setStrokeColor(HexColor("#334155"))
        team_w = c.stringWidth(team, "Courier-Bold", 8.5) + 16
        c.roundRect(86, PAGE_H - 188, team_w, 18, 3, stroke=1, fill=1)
        c.setFillColor(white)
        c.setFont("Courier-Bold", 8.5)
        c.drawString(94, PAGE_H - 180, team)

        # Narrative
        hack = fields.get("hackathon_name") or "ETHGlobal Nexus 2026"
        track = fields.get("theme_track") or "Autonomous Agentic Systems & Cryptographic Proofs"
        dates = fields.get("event_dates") or "October 8–10, 2026"

        c.setFillColor(SLATE_300)
        c.setFont("Helvetica", 11)
        c.drawString(42, PAGE_H - 216, f"successfully hacked, built, and shipped functional code at {hack}")
        c.drawString(42, PAGE_H - 234, f"under the track: {track}.")

        c.setFillColor(SLATE_400)
        c.setFont("Courier", 9)
        c.drawString(42, PAGE_H - 264, f"Dates: {dates}")

        # Organizer Sign
        organizer = fields.get("lead_organizer") or "Siddharth Sengupta (Lead Hackathon Director)"
        c.setStrokeColor(HexColor("#1E293B"))
        c.setLineWidth(1)
        c.line(42, 114, PAGE_W - 42, 114)

        c.setFillColor(SLATE_400)
        c.setFont("Courier-Bold", 7.5)
        c.drawString(42, 98, "AUTHORIZED ORGANIZER")
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawString(42, 84, organizer)

        c.setFillColor(PURPLE_ACCENT)
        c.setFont("Courier-Bold", 9)
        c.drawRightString(PAGE_W - 42, 92, "VERIFIED HACKATHON HASH")

        _draw_security_footer(c, PAGE_W, PAGE_H, cert_no, issue_date, qr_text, dark=True)

    # =========================================================================
    # 3. HACKATHON WINNER & PRESTIGE AWARD (Landscape Gold - HackathonWinnerView)
    # =========================================================================
    elif doc_type in ("hackathon_winner", "tpl_hack_win", "tpl_hack_win_01") and not bg_reader:
        GOLD_ACCENT = HexColor("#F59E0B")
        GOLD_LIGHT = HexColor("#FDE68A")
        DARK_BG = HexColor("#090D16")
        SLATE_400 = HexColor("#94A3B8")
        SLATE_300 = HexColor("#CBD5E1")

        c.setFillColor(DARK_BG)
        c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

        # Subtle gold ambient glow in top-right
        c.saveState()
        c.setFillColor(HexColor("#261A05"))
        p = c.beginPath()
        p.moveTo(PAGE_W - 160, PAGE_H)
        p.curveTo(PAGE_W - 100, PAGE_H - 40, PAGE_W - 40, PAGE_H - 120, PAGE_W, PAGE_H - 160)
        p.lineTo(PAGE_W, PAGE_H)
        p.close()
        c.drawPath(p, fill=1, stroke=0)
        c.restoreState()

        # Border
        c.setStrokeColor(GOLD_ACCENT)
        c.setLineWidth(3)
        c.rect(14, 14, PAGE_W - 28, PAGE_H - 28, stroke=1, fill=0)

        # Header - Brand Hero & Trophy Rank Badge
        mono_x = 42
        mono_y = PAGE_H - 62
        c.setFillColor(HexColor("#231805"))
        c.setStrokeColor(GOLD_ACCENT)
        c.setLineWidth(1)
        c.circle(mono_x + 18, mono_y + 8, 18, stroke=1, fill=1)
        c.setFillColor(GOLD_ACCENT)
        c.setFont("Helvetica-Bold", 12)
        c.drawCentredString(mono_x + 18, mono_y + 4, monogram)

        # Issuer Name
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(mono_x + 44, mono_y + 11, issuer)
        c.setFillColor(SLATE_400)
        c.setFont("Courier-Bold", 7.5)
        c.drawString(mono_x + 44, mono_y - 2, "ACCREDITED ISSUING AUTHORITY")

        # Rank Trophy Badge (top right)
        rank = fields.get("rank_position") or "1ST PLACE GRAND CHAMPION"
        c.setFillColor(HexColor("#332408"))
        c.setStrokeColor(GOLD_ACCENT)
        c.roundRect(PAGE_W - 240, PAGE_H - 58, 198, 26, 4, stroke=1, fill=1)
        c.setFillColor(GOLD_ACCENT)
        c.setFont("Courier-Bold", 8.5)
        c.drawCentredString(PAGE_W - 141, PAGE_H - 44, f"★  {rank}")

        # Header line
        c.setStrokeColor(HexColor("#332408"))
        c.setLineWidth(1)
        c.line(42, PAGE_H - 85, PAGE_W - 42, PAGE_H - 85)

        # Main commendation
        c.setFillColor(GOLD_ACCENT)
        c.setFont("Courier-Bold", 9)
        c.drawCentredString(PAGE_W / 2, PAGE_H - 110, "PRESTIGIOUS MERIT AWARD")

        c.setFillColor(white)
        c.setFont("Times-Bold", 32)
        c.drawCentredString(PAGE_W / 2, PAGE_H - 150, recipient)

        team = fields.get("team_name") or "Team Hyperion Alpha"
        c.setFillColor(GOLD_LIGHT)
        c.setFont("Courier-Bold", 9.5)
        c.drawCentredString(PAGE_W / 2, PAGE_H - 172, f"SQUAD: {team}")

        # Divider line
        c.setStrokeColor(HexColor("#B45309"))
        c.setLineWidth(1)
        c.line(PAGE_W / 2 - 80, PAGE_H - 184, PAGE_W / 2 + 80, PAGE_H - 184)

        hack = fields.get("hackathon_name") or "National Builders Conclave 2026"
        project = fields.get("project_title") or "Evidentia: Realtime Multi-Modal Verification Protocol"
        prize = fields.get("prize_amount")

        c.setFillColor(SLATE_300)
        c.setFont("Helvetica", 11)
        c.drawCentredString(PAGE_W / 2, PAGE_H - 210, f"Awarded for outstanding engineering mastery and winning submission at {hack} with the project:")

        c.setFillColor(HexColor("#FDE047"))
        c.setFont("Helvetica-Bold", 14)
        c.drawCentredString(PAGE_W / 2, PAGE_H - 234, f'"{project}"')

        if prize:
            c.setFillColor(HexColor("#1A1305"))
            c.setStrokeColor(HexColor("#D97706"))
            c.setLineWidth(1)
            pw = c.stringWidth(f"HONORARIUM: {prize}", "Courier-Bold", 9) + 24
            c.roundRect(PAGE_W / 2 - pw / 2, PAGE_H - 272, pw, 20, 3, stroke=1, fill=1)
            c.setFillColor(GOLD_ACCENT)
            c.setFont("Courier-Bold", 9)
            c.drawCentredString(PAGE_W / 2, PAGE_H - 261, f"HONORARIUM: {prize}")

        # Jury Remarks & Signature
        remark = fields.get("judges_remark") or "Awarded unconditionally for breakthrough real-time forensic integrity algorithms."
        chair = fields.get("jury_chair") or "Dr. A. V. Natarajan, Head of Jury"

        c.setStrokeColor(HexColor("#332408"))
        c.setLineWidth(1)
        c.line(42, 114, PAGE_W - 42, 114)

        c.setFillColor(GOLD_ACCENT)
        c.setFont("Courier-Bold", 7.5)
        c.drawString(42, 98, "JURY COMMENDATION:")
        c.setFillColor(SLATE_300)
        c.setFont("Helvetica-Oblique", 8.5)
        c.drawString(42, 84, f'"{remark}"'[:75])

        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawRightString(PAGE_W - 42, 98, chair)
        c.setFillColor(SLATE_400)
        c.setFont("Courier-Bold", 7.5)
        c.drawRightString(PAGE_W - 42, 84, "Head of Jury")

        _draw_security_footer(c, PAGE_W, PAGE_H, cert_no, issue_date, qr_text, dark=True)

    # =========================================================================
    # 4. WORKSHOP & BOOTCAMP (Landscape Teal - WorkshopBootcampView)
    # =========================================================================
    elif doc_type in ("workshop_completion", "tpl_workshop", "tpl_work_01") and not bg_reader:
        TEAL = HexColor("#0D9488")
        TEAL_DARK = HexColor("#134E4A")
        ROSE_ACCENT = HexColor("#F43F5E")
        ROSE_BG = HexColor("#FFF1F2")
        TEAL_PASTEL = HexColor("#CCFBF1")
        SLATE_900 = HexColor("#0F172A")
        SLATE_600 = HexColor("#475569")
        SLATE_500 = HexColor("#64748B")

        # Background Warm Ivory/Parchment (#FDFBF7)
        c.setFillColor(HexColor("#FDFBF7"))
        c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

        # Decorative Pastel Corner Blobs
        c.saveState()
        # Top-right Teal blob
        c.setFillColor(HexColor("#CCFBF1"))
        p = c.beginPath()
        p.moveTo(PAGE_W - 190, PAGE_H)
        p.curveTo(PAGE_W - 190, PAGE_H - 110, PAGE_W - 110, PAGE_H - 180, PAGE_W, PAGE_H - 180)
        p.lineTo(PAGE_W, PAGE_H)
        p.close()
        c.drawPath(p, fill=1, stroke=0)

        # Bottom-left Rose blob
        c.setFillColor(HexColor("#FFE4E6"))
        p2 = c.beginPath()
        p2.moveTo(0, 0)
        p2.lineTo(0, 160)
        p2.curveTo(80, 160, 160, 90, 160, 0)
        p2.close()
        c.drawPath(p2, fill=1, stroke=0)
        c.restoreState()

        # Outer Teal border (border-4 border-[#0D9488])
        c.setStrokeColor(TEAL)
        c.setLineWidth(4.5)
        c.rect(14, 14, PAGE_W - 28, PAGE_H - 28, stroke=1, fill=0)

        # Header - BrandHero & Intensive Badge
        # Brand Monogram Circle (bg-amber-500/10 border-amber-600/30 text-amber-900)
        mono_x = 42
        mono_y = PAGE_H - 62
        c.setFillColor(HexColor("#FEF3C7"))
        c.setStrokeColor(HexColor("#D97706"))
        c.setLineWidth(1)
        c.circle(mono_x + 18, mono_y + 8, 18, stroke=1, fill=1)
        c.setFillColor(HexColor("#78350F"))
        c.setFont("Helvetica-Bold", 12)
        c.drawCentredString(mono_x + 18, mono_y + 4, monogram)

        # Brand Org Name & City
        c.setFillColor(SLATE_900)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(mono_x + 44, mono_y + 11, issuer)
        c.setFillColor(SLATE_500)
        c.setFont("Courier-Bold", 7.5)
        c.drawString(mono_x + 44, mono_y - 2, "BENGALURU, INDIA")

        # Top-right Hours Badge (w-12 h-12 rounded-full border-2 border-[#0D9488] bg-white)
        hours = str(fields.get("duration_hours") or "48")
        badge_x = PAGE_W - 68
        badge_y = PAGE_H - 54
        c.setFillColor(white)
        c.setStrokeColor(TEAL)
        c.setLineWidth(2)
        c.circle(badge_x, badge_y, 22, stroke=1, fill=1)
        c.setFillColor(TEAL)
        c.setFont("Helvetica-Bold", 13)
        c.drawCentredString(badge_x, badge_y + 1, f"{hours}h")
        c.setFont("Courier-Bold", 6.5)
        c.drawCentredString(badge_x, badge_y - 9, "INTENSIVE")

        # Divider line
        c.setStrokeColor(HexColor("#CCFBF1"))
        c.setLineWidth(1.2)
        c.line(42, PAGE_H - 90, PAGE_W - 42, PAGE_H - 90)

        # Body - PROFESSIONAL SKILL CERTIFICATION pill
        pill_text = "PROFESSIONAL SKILL CERTIFICATION"
        c.setFont("Courier-Bold", 7.5)
        pw = c.stringWidth(pill_text, "Courier-Bold", 7.5) + 16
        c.setFillColor(ROSE_BG)
        c.setStrokeColor(HexColor("#FECDD3"))
        c.setLineWidth(0.8)
        c.roundRect(42, PAGE_H - 116, pw, 17, 8.5, stroke=1, fill=1)
        c.setFillColor(ROSE_ACCENT)
        c.drawString(50, PAGE_H - 108, pill_text)

        # Recipient Name
        c.setFillColor(SLATE_900)
        c.setFont("Helvetica-Bold", 32)
        c.drawString(42, PAGE_H - 156, recipient)

        # Narrative line
        c.setFillColor(SLATE_600)
        c.setFont("Helvetica", 11)
        c.drawString(42, PAGE_H - 182, "has successfully completed the intensive hands-on bootcamp:")

        # Workshop Title
        w_title = fields.get("workshop_title") or course or "Advanced Full-Stack Rust & High-Concurrency Systems"
        c.setFillColor(TEAL)
        c.setFont("Helvetica-Bold", 17)
        c.drawString(42, PAGE_H - 212, w_title)

        # Subtle underline under title
        tw = min(c.stringWidth(w_title, "Helvetica-Bold", 17), PAGE_W - 84)
        c.setStrokeColor(HexColor("#99F6E4"))
        c.setLineWidth(1.8)
        c.line(42, PAGE_H - 218, 42 + tw, PAGE_H - 218)

        # Verified Core Competencies Chips
        c.setFillColor(SLATE_500)
        c.setFont("Courier-Bold", 8)
        c.drawString(42, PAGE_H - 246, "VERIFIED CORE COMPETENCIES:")

        skills = fields.get("skills_covered")
        if not isinstance(skills, list) or len(skills) == 0:
            skills = [
                "Async Tokio Engine",
                "Memory Safety & Lifetimes",
                "WASM Compilation",
                "Zero-Copy Serialization",
                "Micro-benchmarking"
            ]

        # Draw Skill Pill Chips
        cx = 42
        cy = PAGE_H - 274
        for s in skills[:6]:
            chip_label = f"✓ {str(s).strip()}"
            c.setFont("Courier-Bold", 8)
            sw = c.stringWidth(chip_label, "Courier-Bold", 8) + 16
            if cx + sw > PAGE_W - 42:
                cx = 42
                cy -= 22
            c.setFillColor(white)
            c.setStrokeColor(HexColor("#5EEAD4"))
            c.setLineWidth(1)
            c.roundRect(cx, cy, sw, 18, 9, stroke=1, fill=1)
            c.setFillColor(TEAL)
            c.drawString(cx + 8, cy + 5, chip_label)
            cx += sw + 8

        # Evaluation & Instructor section
        c.setStrokeColor(HexColor("#CCFBF1"))
        c.setLineWidth(1.2)
        c.line(42, 114, PAGE_W - 42, 114)

        score = fields.get("score_achieved") or "98% Top Decile Capstone Score"
        instructor = fields.get("lead_instructor") or "Tanmay Agarwal, Principal Architect"

        c.setFillColor(SLATE_500)
        c.setFont("Courier-Bold", 8)
        c.drawString(42, 98, "ACADEMIC EVALUATION:")
        c.setFillColor(SLATE_900)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawString(42, 84, score)

        c.setFillColor(SLATE_900)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawRightString(PAGE_W - 42, 98, instructor)
        c.setFillColor(SLATE_500)
        c.setFont("Courier-Bold", 8)
        c.drawRightString(PAGE_W - 42, 84, "Lead Instructor")

        _draw_security_footer(c, PAGE_W, PAGE_H, cert_no, issue_date, qr_text, dark=False)

    # =========================================================================
    # 5. OFFICIAL MARKSHEET / TRANSCRIPT (Portrait - MarksheetView)
    # =========================================================================
    elif doc_type in ("marksheet", "tpl_marksheet", "tpl_mark_01") and not bg_reader:
        c.setFillColor(white)
        c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

        c.setStrokeColor(HexColor("#E2E8F0"))
        c.setLineWidth(1.5)
        c.rect(16, 16, PAGE_W - 32, PAGE_H - 32, stroke=1, fill=0)

        # Header Band with BrandHero Monogram
        mono_x = 36
        mono_y = PAGE_H - 62
        c.setFillColor(HexColor("#FEF3C7"))
        c.setStrokeColor(HexColor("#D97706"))
        c.setLineWidth(1)
        c.circle(mono_x + 18, mono_y + 8, 18, stroke=1, fill=1)
        c.setFillColor(HexColor("#78350F"))
        c.setFont("Helvetica-Bold", 12)
        c.drawCentredString(mono_x + 18, mono_y + 4, monogram)

        c.setFillColor(HexColor("#0F172A"))
        c.setFont("Helvetica-Bold", 16)
        c.drawString(mono_x + 44, mono_y + 11, issuer)
        c.setFillColor(HexColor("#64748B"))
        c.setFont("Courier-Bold", 7.5)
        c.drawString(mono_x + 44, mono_y - 2, "ACCREDITED ISSUING AUTHORITY")

        c.setStrokeColor(HexColor("#0F172A"))
        c.setLineWidth(2)
        c.line(36, PAGE_H - 74, PAGE_W - 36, PAGE_H - 74)

        # Statement bar
        session = fields.get("exam_session") or "May–June 2026"
        c.setFillColor(HexColor("#F1F5F9"))
        c.rect(36, PAGE_H - 96, PAGE_W - 72, 18, stroke=0, fill=1)
        c.setFillColor(HexColor("#1E293B"))
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(42, PAGE_H - 89, "OFFICIAL STATEMENT OF GRADES & CUMULATIVE TRANSCRIPT")
        c.setFont("Helvetica", 7)
        c.drawRightString(PAGE_W - 42, PAGE_H - 89, f"EXAM SESSION: {session}")

        # Details Grid
        gy = PAGE_H - 120
        c.setFillColor(HexColor("#F8FAFC"))
        c.setStrokeColor(HexColor("#E2E8F0"))
        c.rect(36, gy - 44, PAGE_W - 72, 44, stroke=1, fill=1)

        c.setFillColor(HexColor("#64748B"))
        c.setFont("Helvetica", 7.5)
        c.drawString(44, gy - 14, "CANDIDATE:")
        c.drawString(44, gy - 26, "ENROLLMENT ID:")
        c.drawString(44, gy - 38, "SEMESTER:")

        c.setFillColor(HexColor("#0F172A"))
        c.setFont("Helvetica-Bold", 8)
        c.drawString(110, gy - 14, recipient)
        c.drawString(110, gy - 26, fields.get("enrollment_no") or cert_no)
        c.drawString(110, gy - 38, fields.get("semester") or "Semester VIII")

        c.setFillColor(HexColor("#64748B"))
        c.setFont("Helvetica", 7.5)
        c.drawString(300, gy - 14, "ROLL NO:")
        c.drawString(300, gy - 26, "PROGRAM:")
        c.drawString(300, gy - 38, "STATUS:")

        c.setFillColor(HexColor("#0F172A"))
        c.setFont("Helvetica-Bold", 8)
        c.drawString(360, gy - 14, cert_no)
        c.drawString(360, gy - 26, course or "B.Tech Computer Science")
        c.setFillColor(HexColor("#059669"))
        c.drawString(360, gy - 38, fields.get("result_status") or "PASS - DISTINCTION")

        # Subjects Table
        tbl_y = gy - 62
        c.setFillColor(HexColor("#0F172A"))
        c.rect(36, tbl_y - 16, PAGE_W - 72, 16, stroke=0, fill=1)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 7)
        c.drawString(42, tbl_y - 11, "CODE")
        c.drawString(90, tbl_y - 11, "COURSE TITLE")
        c.drawCentredString(320, tbl_y - 11, "CR")
        c.drawCentredString(360, tbl_y - 11, "INT")
        c.drawCentredString(400, tbl_y - 11, "EXT")
        c.drawCentredString(440, tbl_y - 11, "TOT")
        c.drawCentredString(490, tbl_y - 11, "GRD")

        subjects = fields.get("subjects_table")
        if not isinstance(subjects, list) or len(subjects) == 0:
            subjects = [
                {"code": "CS801", "name": "Distributed Consensus Systems", "credits": 4, "internal": 28, "external": 67, "total": 95, "grade": "O"},
                {"code": "CS802", "name": "Applied Cryptography & Zero-Knowledge", "credits": 4, "internal": 29, "external": 64, "total": 93, "grade": "O"},
                {"code": "CS803", "name": "Machine Learning Infrastructure", "credits": 3, "internal": 27, "external": 61, "total": 88, "grade": "A+"},
                {"code": "CS804", "name": "Cloud Native Microservices", "credits": 3, "internal": 26, "external": 60, "total": 86, "grade": "A+"},
                {"code": "CS899", "name": "Major Capstone Project", "credits": 6, "internal": 48, "external": 98, "total": 146, "grade": "O"}
            ]

        curr_y = tbl_y - 16
        for i, s in enumerate(subjects[:10]):
            curr_y -= 18
            bg_c = HexColor("#F8FAFC") if i % 2 == 1 else white
            c.setFillColor(bg_c)
            c.rect(36, curr_y, PAGE_W - 72, 18, stroke=0, fill=1)
            c.setStrokeColor(HexColor("#E2E8F0"))
            c.line(36, curr_y, PAGE_W - 36, curr_y)

            c.setFillColor(HexColor("#0F172A"))
            c.setFont("Courier-Bold", 7.5)
            c.drawString(42, curr_y + 5, str(s.get("code") or "—"))
            c.setFont("Helvetica", 7.5)
            c.drawString(90, curr_y + 5, str(s.get("name") or "—")[:36])
            c.drawCentredString(320, curr_y + 5, str(s.get("credits") or "—"))
            c.drawCentredString(360, curr_y + 5, str(s.get("internal") or "—"))
            c.drawCentredString(400, curr_y + 5, str(s.get("external") or "—"))
            c.setFont("Helvetica-Bold", 7.5)
            c.drawCentredString(440, curr_y + 5, str(s.get("total") or "—"))
            c.setFillColor(HexColor("#1D4ED8"))
            c.drawCentredString(490, curr_y + 5, str(s.get("grade") or "—"))

        # Scorecard box
        sc_y = curr_y - 45
        c.setFillColor(HexColor("#F8FAFC"))
        c.setStrokeColor(HexColor("#E2E8F0"))
        c.rect(36, sc_y, PAGE_W - 72, 38, stroke=1, fill=1)

        sgpa = fields.get("sgpa") or "9.42"
        cgpa = fields.get("cgpa") or "9.18"
        c.setFillColor(HexColor("#64748B"))
        c.setFont("Helvetica-Bold", 8)
        c.drawString(48, sc_y + 14, f"SEMESTER SGPA:  {sgpa}")
        c.drawString(180, sc_y + 14, f"CUMULATIVE CGPA:  {cgpa}")

        # Stamp
        c.setStrokeColor(HexColor("#DC2626"))
        c.setLineWidth(1.5)
        c.circle(PAGE_W - 80, sc_y + 18, 14, stroke=1, fill=0)
        c.setFillColor(HexColor("#DC2626"))
        c.setFont("Helvetica-Bold", 5)
        c.drawCentredString(PAGE_W - 80, sc_y + 19, "VERIFIED")
        c.drawCentredString(PAGE_W - 80, sc_y + 13, "EXAM BR")

        _draw_security_footer(c, PAGE_W, PAGE_H, cert_no, issue_date, qr_text, dark=False)

    # =========================================================================
    # 6. BONAFIDE CERTIFICATE (Portrait Letterhead - BonafideCertificateView)
    # =========================================================================
    elif doc_type in ("bonafide", "tpl_bonafide", "tpl_bona_01") and not bg_reader:
        c.setFillColor(HexColor("#FAFAFA"))
        c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

        # Teal top banner
        c.setFillColor(HexColor("#0F766E"))
        c.rect(0, PAGE_H - 10, PAGE_W, 10, stroke=0, fill=1)

        # Letterhead Header with BrandHero Monogram
        mono_cx = PAGE_W / 2
        mono_cy = PAGE_H - 46
        c.setFillColor(HexColor("#FEF3C7"))
        c.setStrokeColor(HexColor("#D97706"))
        c.setLineWidth(1)
        c.circle(mono_cx, mono_cy + 12, 16, stroke=1, fill=1)
        c.setFillColor(HexColor("#78350F"))
        c.setFont("Helvetica-Bold", 11)
        c.drawCentredString(mono_cx, mono_cy + 8, monogram)

        c.setFillColor(HexColor("#134E4A"))
        c.setFont("Helvetica-Bold", 18)
        c.drawCentredString(PAGE_W / 2, PAGE_H - 56, issuer)
        c.setFillColor(HexColor("#64748B"))
        c.setFont("Courier-Bold", 7.5)
        c.drawCentredString(PAGE_W / 2, PAGE_H - 68, "ACCREDITED ISSUING AUTHORITY")

        c.setStrokeColor(HexColor("#CCFBF1"))
        c.setLineWidth(1)
        c.line(40, PAGE_H - 78, PAGE_W - 40, PAGE_H - 78)

        # Ref & Date
        c.setFillColor(HexColor("#64748B"))
        c.setFont("Courier", 8)
        c.drawString(40, PAGE_H - 96, f"REF NO: {cert_no}")
        c.drawRightString(PAGE_W - 40, PAGE_H - 96, f"DATE: {issue_date}")

        # Badge
        c.setFillColor(HexColor("#CCFBF1"))
        c.setStrokeColor(HexColor("#0F766E"))
        c.roundRect(PAGE_W / 2 - 80, PAGE_H - 134, 160, 22, 3, stroke=1, fill=1)
        c.setFillColor(HexColor("#0F766E"))
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(PAGE_W / 2, PAGE_H - 124, "BONAFIDE CERTIFICATE")

        # Narrative Letter
        ny = PAGE_H - 180
        c.setFillColor(HexColor("#475569"))
        c.setFont("Helvetica-Oblique", 11)
        c.drawString(40, ny, "To Whomsoever It May Concern,")

        guardian = fields.get("guardian_name") or "Mr. Anil Verma"
        year = fields.get("academic_year") or "Final Year (Semester IV)"
        session = fields.get("academic_session") or "2025–2026"
        purpose = fields.get("purpose") or "Passport Application"
        remark = fields.get("conduct_remark") or "Satisfactory and obedient with good moral conduct"

        c.setFillColor(HexColor("#1E293B"))
        c.setFont("Times-Roman", 12.5)
        ny -= 30
        c.drawString(60, ny, f"This is to certify that {recipient.upper()}, son/daughter of {guardian},")
        ny -= 20
        c.drawString(40, ny, f"bearing permanent roll number {cert_no}, is a bonafide student of this institution.")

        ny -= 30
        c.drawString(60, ny, f"He/She is currently pursuing {course or 'Data Analytics'}")
        ny -= 20
        c.drawString(40, ny, f"in the {year} during the academic session {session}.")

        ny -= 30
        c.drawString(60, ny, f"This certificate is formally issued upon the student's request for the specific purpose")
        ny -= 20
        c.drawString(40, ny, f"of {purpose}. To the best of our institutional knowledge, their conduct and character")
        ny -= 20
        c.drawString(40, ny, f"have been {remark}.")

        # Signature
        sign = fields.get("principal_sign") or "Dr. Sunita K. Rao (Dean of Student Welfare)"
        c.setStrokeColor(HexColor("#94A3B8"))
        c.line(PAGE_W - 200, 140, PAGE_W - 40, 140)
        c.setFillColor(HexColor("#0F172A"))
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(PAGE_W - 120, 126, sign)
        c.setFillColor(HexColor("#64748B"))
        c.setFont("Helvetica", 7.5)
        c.drawCentredString(PAGE_W - 120, 114, "Dean / Head of Institution")

        _draw_security_footer(c, PAGE_W, PAGE_H, cert_no, issue_date, qr_text, dark=False)

    # =========================================================================
    # 7. CORPORATE INTERNSHIP (Portrait Executive - InternshipCertificateView)
    # =========================================================================
    elif doc_type in ("internship_certificate", "tpl_internship", "tpl_intern_01") and not bg_reader:
        c.setFillColor(white)
        c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

        # Navy Left Accent Bar (border-l-[12px] border-[#1E40AF])
        c.setFillColor(HexColor("#1E40AF"))
        c.rect(0, 0, 14, PAGE_H, stroke=0, fill=1)

        # Header with BrandHero Monogram
        mono_x = 36
        mono_y = PAGE_H - 62
        c.setFillColor(HexColor("#FEF3C7"))
        c.setStrokeColor(HexColor("#D97706"))
        c.setLineWidth(1)
        c.circle(mono_x + 18, mono_y + 8, 18, stroke=1, fill=1)
        c.setFillColor(HexColor("#78350F"))
        c.setFont("Helvetica-Bold", 12)
        c.drawCentredString(mono_x + 18, mono_y + 4, monogram)

        c.setFillColor(HexColor("#0F172A"))
        c.setFont("Helvetica-Bold", 16)
        c.drawString(mono_x + 44, mono_y + 11, issuer)
        c.setFillColor(HexColor("#64748B"))
        c.setFont("Courier-Bold", 7.5)
        c.drawString(mono_x + 44, mono_y - 2, "ACCREDITED ISSUING AUTHORITY")

        c.setStrokeColor(HexColor("#E2E8F0"))
        c.setLineWidth(1)
        c.line(36, PAGE_H - 74, PAGE_W - 36, PAGE_H - 74)

        c.setFillColor(HexColor("#64748B"))
        c.setFont("Courier-Bold", 7.5)
        c.drawString(36, PAGE_H - 88, "CORPORATE INTERNSHIP EXPERIENCE RECORD")
        c.drawRightString(PAGE_W - 36, PAGE_H - 88, f"EMP REF: {cert_no}")

        # Intern Details
        c.setFillColor(HexColor("#1E40AF"))
        c.setFont("Courier-Bold", 8.5)
        c.drawString(36, PAGE_H - 114, "EXPERIENCE & PERFORMANCE ATTESTATION")

        c.setFillColor(HexColor("#0F172A"))
        c.setFont("Helvetica-Bold", 26)
        c.drawString(36, PAGE_H - 146, recipient)

        role = fields.get("role") or fields.get("role_title") or course or "Software Engineering Intern — Core Systems"
        dept = fields.get("department") or "Platform Security & Infrastructure"
        s_date = fields.get("start_date") or "2026-04-01"
        e_date = fields.get("end_date") or "2026-09-30"

        c.setFillColor(HexColor("#F8FAFC"))
        c.setStrokeColor(HexColor("#E2E8F0"))
        c.rect(36, PAGE_H - 212, PAGE_W - 72, 52, stroke=1, fill=1)

        c.setFillColor(HexColor("#64748B"))
        c.setFont("Courier-Bold", 7.5)
        c.drawString(46, PAGE_H - 176, "ROLE: ")
        c.setFillColor(HexColor("#0F172A"))
        c.setFont("Helvetica-Bold", 8)
        c.drawString(90, PAGE_H - 176, role[:70])

        c.setFillColor(HexColor("#64748B"))
        c.setFont("Courier-Bold", 7.5)
        c.drawString(46, PAGE_H - 190, "DEPARTMENT: ")
        c.setFillColor(HexColor("#0F172A"))
        c.setFont("Helvetica-Bold", 8)
        c.drawString(130, PAGE_H - 190, dept[:60])

        c.setFillColor(HexColor("#64748B"))
        c.setFont("Courier-Bold", 7.5)
        c.drawString(46, PAGE_H - 204, "TENURE: ")
        c.setFillColor(HexColor("#0F172A"))
        c.setFont("Helvetica-Bold", 8)
        c.drawString(100, PAGE_H - 204, f"{s_date}   →   {e_date}")

        # Deliverables
        c.setFillColor(HexColor("#0F172A"))
        c.setFont("Courier-Bold", 8)
        c.drawString(36, PAGE_H - 238, "KEY ENGINEERING DELIVERABLES & IMPACT:")

        projects = fields.get("projects_delivered")
        if not isinstance(projects, list):
            projects = [
                "Built deterministic ECDSA signing microservice in Node.js",
                "Implemented OpenCV SSIM diff checks with 40% memory reduction",
                "Authored SDK test kits with 100% automated test coverage"
            ]
        py = PAGE_H - 256
        for p in projects[:3]:
            c.setFillColor(HexColor("#334155"))
            c.setFont("Helvetica", 9)
            c.drawString(48, py, f"•   {p}")
            py -= 18

        # Rating Block
        rating = fields.get("rating") or "5 Stars - Outstanding Performance"
        c.setFillColor(HexColor("#EFF6FF"))
        c.setStrokeColor(HexColor("#BFDBFE"))
        c.roundRect(PAGE_W / 2 - 140, py - 18, 280, 24, 4, stroke=1, fill=1)
        c.setFillColor(HexColor("#64748B"))
        c.setFont("Courier-Bold", 8)
        c.drawCentredString(PAGE_W / 2 - 40, py - 7, "SUPERVISOR APPRAISAL:")
        c.setFillColor(HexColor("#1E40AF"))
        c.setFont("Helvetica-Bold", 9)
        c.drawString(PAGE_W / 2 + 25, py - 7, f"★  {rating}")

        # Remark
        remark = fields.get("conduct_remark") or "Demonstrated high technical autonomy and exceptional work ethics."
        c.setFillColor(HexColor("#475569"))
        c.setFont("Helvetica-Oblique", 9)
        c.drawCentredString(PAGE_W / 2, py - 38, f'"{remark}"')

        # Supervisor Sign Block
        c.setStrokeColor(HexColor("#E2E8F0"))
        c.setLineWidth(1)
        c.line(36, 126, PAGE_W - 36, 126)

        c.setFillColor(HexColor("#64748B"))
        c.setFont("Courier-Bold", 7.5)
        c.drawString(36, 110, "ISSUED BY HR DIVISION")
        c.setFillColor(HexColor("#1E293B"))
        c.setFont("Helvetica", 8)
        c.drawString(36, 98, "Corporate People Operations")

        sup = fields.get("supervisor_name") or "Arvind Swaminathan"
        sup_title = fields.get("supervisor_title") or "VP of Engineering"
        c.setFillColor(HexColor("#0F172A"))
        c.setFont("Helvetica-Bold", 9.5)
        c.drawRightString(PAGE_W - 36, 110, sup)
        c.setFillColor(HexColor("#64748B"))
        c.setFont("Courier-Bold", 7.5)
        c.drawRightString(PAGE_W - 36, 98, sup_title)

        _draw_security_footer(c, PAGE_W, PAGE_H, cert_no, issue_date, qr_text, dark=False)

    # =========================================================================
    # 8. DEFAULT FALLBACK
    # =========================================================================
    else:
        c.setFillColor(PARCHMENT if is_landscape else white)
        c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

        c.setStrokeColor(NAVY)
        c.setLineWidth(4)
        c.rect(14, 14, PAGE_W - 28, PAGE_H - 28, stroke=1, fill=0)

        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 20)
        c.drawCentredString(PAGE_W / 2, PAGE_H - 70, issuer)

        c.setFillColor(GOLD)
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(PAGE_W / 2, PAGE_H - 86, "OFFICIAL VERIFIABLE CREDENTIAL")

        c.setStrokeColor(GOLD)
        c.setLineWidth(1)
        c.line(PAGE_W / 2 - 100, PAGE_H - 96, PAGE_W / 2 + 100, PAGE_H - 96)

        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 16)
        c.drawCentredString(PAGE_W / 2, PAGE_H - 150, title)

        c.setFillColor(HexColor("#475569"))
        c.setFont("Helvetica-Oblique", 11)
        c.drawCentredString(PAGE_W / 2, PAGE_H - 180, "This is to certify that")

        c.setFillColor(NAVY)
        c.setFont("Times-Bold", 28)
        c.drawCentredString(PAGE_W / 2, PAGE_H - 220, recipient)

        c.setFillColor(HexColor("#334155"))
        c.setFont("Helvetica", 11)
        c.drawCentredString(PAGE_W / 2, PAGE_H - 255, f"has successfully fulfilled all requirements for {course or title}")

        if grade:
            c.setFont("Helvetica-Bold", 10.5)
            c.setFillColor(NAVY)
            c.drawCentredString(PAGE_W / 2, PAGE_H - 280, f"Grade / Honours: {grade}")

        _draw_security_footer(c, PAGE_W, PAGE_H, cert_no, issue_date, qr_text, dark=False)

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
