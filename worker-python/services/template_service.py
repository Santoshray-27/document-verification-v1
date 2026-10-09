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
        DARK_BG = HexColor("#0B0F19")
        c.setFillColor(DARK_BG)
        c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

        # Border
        c.setStrokeColor(HexColor("#0891B2"))
        c.setLineWidth(2)
        c.rect(14, 14, PAGE_W - 28, PAGE_H - 28, stroke=1, fill=0)

        # Header
        c.setStrokeColor(HexColor("#1E293B"))
        c.line(36, PAGE_H - 65, PAGE_W - 36, PAGE_H - 65)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 18)
        c.drawString(36, PAGE_H - 52, issuer)

        # Participant Badge Box
        c.setFillColor(HexColor("#0E2A38"))
        c.setStrokeColor(CYAN)
        c.setLineWidth(1)
        c.rect(PAGE_W - 180, PAGE_H - 55, 144, 24, stroke=1, fill=1)
        c.setFillColor(CYAN)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawCentredString(PAGE_W - 108, PAGE_H - 43, "PARTICIPANT BADGE")

        # Subtitle
        c.setFillColor(CYAN)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(36, PAGE_H - 100, "CERTIFICATE OF CONTENDER PARTICIPATION")

        # Recipient
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 30)
        c.drawString(36, PAGE_H - 142, recipient)

        # Squad
        team = fields.get("team_name") or "ByteForge Syndicate"
        c.setFillColor(HexColor("#94A3B8"))
        c.setFont("Helvetica-Bold", 9.5)
        c.drawString(36, PAGE_H - 172, f"SQUAD: {team}")

        # Narrative
        hack = fields.get("hackathon_name") or "ETHGlobal Nexus 2026"
        track = fields.get("theme_track") or "Autonomous Agentic Systems & Cryptographic Proofs"
        dates = fields.get("event_dates") or "October 8–10, 2026"

        c.setFillColor(HexColor("#CBD5E1"))
        c.setFont("Helvetica", 11)
        c.drawString(36, PAGE_H - 210, f"successfully hacked, built, and shipped functional code at {hack}")
        c.drawString(36, PAGE_H - 228, f"under the track: {track}.")

        c.setFillColor(HexColor("#94A3B8"))
        c.setFont("Helvetica", 9.5)
        c.drawString(36, PAGE_H - 260, f"Dates: {dates}")

        # Organizer Sign
        organizer = fields.get("lead_organizer") or "Siddharth Sengupta (Lead Hackathon Director)"
        c.setStrokeColor(HexColor("#1E293B"))
        c.line(36, 120, PAGE_W - 36, 120)

        c.setFillColor(HexColor("#94A3B8"))
        c.setFont("Helvetica", 8)
        c.drawString(36, 102, "AUTHORIZED ORGANIZER")
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawString(36, 88, organizer)

        c.setFillColor(HexColor("#A855F7"))
        c.setFont("Helvetica-Bold", 9.5)
        c.drawRightString(PAGE_W - 36, 92, "VERIFIED HACKATHON HASH")

        _draw_security_footer(c, PAGE_W, PAGE_H, cert_no, issue_date, qr_text, dark=True)

    # =========================================================================
    # 3. HACKATHON WINNER & PRESTIGE AWARD (Landscape Gold - HackathonWinnerView)
    # =========================================================================
    elif doc_type in ("hackathon_winner", "tpl_hack_win", "tpl_hack_win_01") and not bg_reader:
        GOLD_ACCENT = HexColor("#F59E0B")
        DARK_BG = HexColor("#090D16")
        c.setFillColor(DARK_BG)
        c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

        # Border
        c.setStrokeColor(GOLD_ACCENT)
        c.setLineWidth(3)
        c.rect(14, 14, PAGE_W - 28, PAGE_H - 28, stroke=1, fill=0)

        # Header
        c.setStrokeColor(HexColor("#332408"))
        c.line(36, PAGE_H - 65, PAGE_W - 36, PAGE_H - 65)
        c.setFillColor(HexColor("#FDF6B2"))
        c.setFont("Helvetica-Bold", 18)
        c.drawString(36, PAGE_H - 52, issuer)

        # Rank badge
        rank = fields.get("rank_position") or "1ST PLACE GRAND CHAMPION"
        c.setFillColor(HexColor("#332408"))
        c.setStrokeColor(GOLD_ACCENT)
        c.roundRect(PAGE_W - 230, PAGE_H - 56, 194, 26, 4, stroke=1, fill=1)
        c.setFillColor(GOLD_ACCENT)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawCentredString(PAGE_W - 133, PAGE_H - 43, f"★ {rank}")

        # Main commendation
        c.setFillColor(GOLD_ACCENT)
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(PAGE_W / 2, PAGE_H - 110, "PRESTIGIOUS MERIT AWARD")

        c.setFillColor(white)
        c.setFont("Times-Bold", 30)
        c.drawCentredString(PAGE_W / 2, PAGE_H - 150, recipient)

        team = fields.get("team_name") or "Team Hyperion Alpha"
        c.setFillColor(HexColor("#FDE68A"))
        c.setFont("Helvetica-Bold", 9.5)
        c.drawCentredString(PAGE_W / 2, PAGE_H - 172, f"SQUAD: {team}")

        hack = fields.get("hackathon_name") or "National Builders Conclave 2026"
        project = fields.get("project_title") or "Evidentia: Realtime Multi-Modal Verification Protocol"
        prize = fields.get("prize_amount")

        c.setFillColor(HexColor("#E2E8F0"))
        c.setFont("Helvetica", 11)
        c.drawCentredString(PAGE_W / 2, PAGE_H - 210, f"Awarded for outstanding engineering mastery and winning submission at {hack} with the project:")

        c.setFillColor(HexColor("#FDE047"))
        c.setFont("Helvetica-Bold", 13.5)
        c.drawCentredString(PAGE_W / 2, PAGE_H - 235, f'"{project}"')

        if prize:
            c.setFillColor(GOLD_ACCENT)
            c.setFont("Helvetica-Bold", 9.5)
            c.drawCentredString(PAGE_W / 2, PAGE_H - 262, f"HONORARIUM: {prize}")

        # Jury Remarks & Signature
        chair = fields.get("jury_chair") or "Dr. A. V. Natarajan, Head of Jury"
        c.setStrokeColor(HexColor("#332408"))
        c.line(36, 120, PAGE_W - 36, 120)

        c.setFillColor(HexColor("#CBD5E1"))
        c.setFont("Helvetica-Bold", 9)
        c.drawRightString(PAGE_W - 36, 100, chair)
        c.setFillColor(HexColor("#94A3B8"))
        c.setFont("Helvetica", 7.5)
        c.drawRightString(PAGE_W - 36, 88, "Head of Jury")

        _draw_security_footer(c, PAGE_W, PAGE_H, cert_no, issue_date, qr_text, dark=True)

    # =========================================================================
    # 4. WORKSHOP & BOOTCAMP (Landscape Teal - WorkshopBootcampView)
    # =========================================================================
    elif doc_type in ("workshop_completion", "tpl_workshop", "tpl_work_01") and not bg_reader:
        TEAL = HexColor("#0D9488")
        c.setFillColor(PARCHMENT)
        c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

        c.setStrokeColor(TEAL)
        c.setLineWidth(3.5)
        c.rect(14, 14, PAGE_W - 28, PAGE_H - 28, stroke=1, fill=0)

        # Header
        c.setStrokeColor(HexColor("#CCFBF1"))
        c.line(36, PAGE_H - 65, PAGE_W - 36, PAGE_H - 65)
        c.setFillColor(HexColor("#134E4A"))
        c.setFont("Helvetica-Bold", 18)
        c.drawString(36, PAGE_H - 52, issuer)

        hours = fields.get("duration_hours") or "48"
        c.setFillColor(white)
        c.setStrokeColor(TEAL)
        c.circle(PAGE_W - 60, PAGE_H - 45, 18, stroke=1, fill=1)
        c.setFillColor(TEAL)
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(PAGE_W - 60, PAGE_H - 48, f"{hours}h")

        # Body
        c.setFillColor(HexColor("#E11D48"))
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(36, PAGE_H - 100, "PROFESSIONAL SKILL CERTIFICATION")

        c.setFillColor(HexColor("#0F172A"))
        c.setFont("Helvetica-Bold", 28)
        c.drawString(36, PAGE_H - 138, recipient)

        c.setFillColor(HexColor("#475569"))
        c.setFont("Helvetica", 10.5)
        c.drawString(36, PAGE_H - 165, "has successfully completed the intensive hands-on bootcamp:")

        w_title = fields.get("workshop_title") or course or "Advanced Full-Stack Rust & High-Concurrency Systems"
        c.setFillColor(TEAL)
        c.setFont("Helvetica-Bold", 15)
        c.drawString(36, PAGE_H - 192, w_title)

        # Evaluation & Instructor
        instructor = fields.get("lead_instructor") or "Tanmay Agarwal, Lead Instructor"
        score = fields.get("score_achieved") or "98% Top Decile Capstone Score"

        c.setStrokeColor(HexColor("#CCFBF1"))
        c.line(36, 120, PAGE_W - 36, 120)

        c.setFillColor(HexColor("#64748B"))
        c.setFont("Helvetica", 7.5)
        c.drawString(36, 102, "ACADEMIC EVALUATION:")
        c.setFillColor(HexColor("#0F172A"))
        c.setFont("Helvetica-Bold", 9)
        c.drawString(36, 88, score)

        c.drawRightString(PAGE_W - 36, 100, instructor)
        c.setFillColor(HexColor("#64748B"))
        c.setFont("Helvetica", 7.5)
        c.drawRightString(PAGE_W - 36, 88, "Lead Instructor")

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

        # Header Band
        c.setFillColor(HexColor("#0F172A"))
        c.setFont("Helvetica-Bold", 16)
        c.drawString(36, PAGE_H - 50, issuer)
        c.setFillColor(HexColor("#64748B"))
        c.setFont("Helvetica", 8)
        c.drawString(36, PAGE_H - 62, "ACCREDITED ISSUING AUTHORITY")

        c.setStrokeColor(HexColor("#0F172A"))
        c.setLineWidth(2)
        c.line(36, PAGE_H - 72, PAGE_W - 36, PAGE_H - 72)

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

        # Letterhead Header
        c.setFillColor(HexColor("#134E4A"))
        c.setFont("Helvetica-Bold", 19)
        c.drawCentredString(PAGE_W / 2, PAGE_H - 46, issuer)
        c.setFillColor(HexColor("#64748B"))
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(PAGE_W / 2, PAGE_H - 60, "ACCREDITED ISSUING AUTHORITY")

        c.setStrokeColor(HexColor("#CCFBF1"))
        c.setLineWidth(1)
        c.line(40, PAGE_H - 74, PAGE_W - 40, PAGE_H - 74)

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

        # Navy Left Accent Bar
        c.setFillColor(HexColor("#1E40AF"))
        c.rect(0, 0, 14, PAGE_H, stroke=0, fill=1)

        # Header
        c.setFillColor(HexColor("#0F172A"))
        c.setFont("Helvetica-Bold", 17)
        c.drawString(36, PAGE_H - 48, issuer)

        c.setStrokeColor(HexColor("#E2E8F0"))
        c.line(36, PAGE_H - 68, PAGE_W - 36, PAGE_H - 68)

        c.setFillColor(HexColor("#64748B"))
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(36, PAGE_H - 84, "CORPORATE INTERNSHIP EXPERIENCE RECORD")
        c.drawRightString(PAGE_W - 36, PAGE_H - 84, f"EMP REF: {cert_no}")

        # Intern Details
        c.setFillColor(HexColor("#1E40AF"))
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(36, PAGE_H - 114, "EXPERIENCE & PERFORMANCE ATTESTATION")

        c.setFillColor(HexColor("#0F172A"))
        c.setFont("Helvetica-Bold", 26)
        c.drawString(36, PAGE_H - 148, recipient)

        role = fields.get("role") or fields.get("role_title") or course or "Software Engineering Intern — Core Systems"
        dept = fields.get("department") or "Platform Security & Infrastructure"
        s_date = fields.get("start_date") or "2026-04-01"
        e_date = fields.get("end_date") or "2026-09-30"

        c.setFillColor(HexColor("#F8FAFC"))
        c.setStrokeColor(HexColor("#E2E8F0"))
        c.rect(36, PAGE_H - 212, PAGE_W - 72, 50, stroke=1, fill=1)

        c.setFillColor(HexColor("#64748B"))
        c.setFont("Helvetica", 7.5)
        c.drawString(46, PAGE_H - 176, f"ROLE:  {role}")
        c.drawString(46, PAGE_H - 190, f"DEPARTMENT:  {dept}")
        c.drawString(46, PAGE_H - 204, f"TENURE:  {s_date}  →  {e_date}")

        # Deliverables
        c.setFillColor(HexColor("#0F172A"))
        c.setFont("Helvetica-Bold", 8)
        c.drawString(36, PAGE_H - 238, "KEY ENGINEERING DELIVERABLES & IMPACT:")

        projects = fields.get("projects_delivered")
        if not isinstance(projects, list):
            projects = [
                "Built deterministic ECDSA signing microservice",
                "Implemented forensic visual diff engine",
                "Authored SDK verification test kits"
            ]
        py = PAGE_H - 256
        for p in projects[:4]:
            c.setFillColor(HexColor("#334155"))
            c.setFont("Helvetica", 9)
            c.drawString(48, py, f"•  {p}")
            py -= 18

        # Rating
        rating = fields.get("rating") or "5 Stars - Outstanding Performance"
        c.setFillColor(HexColor("#EFF6FF"))
        c.setStrokeColor(HexColor("#BFDBFE"))
        c.roundRect(PAGE_W / 2 - 120, py - 24, 240, 24, 4, stroke=1, fill=1)
        c.setFillColor(HexColor("#1E40AF"))
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(PAGE_W / 2, py - 13, f"SUPERVISOR APPRAISAL: ★ {rating}")

        # Supervisor Sign
        sup = fields.get("supervisor_name") or "Arvind Swaminathan (VP of Engineering)"
        c.setStrokeColor(HexColor("#CBD5E1"))
        c.line(PAGE_W - 220, 130, PAGE_W - 36, 130)
        c.setFillColor(HexColor("#0F172A"))
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(PAGE_W - 128, 116, sup)
        c.setFillColor(HexColor("#64748B"))
        c.setFont("Helvetica", 7.5)
        c.drawCentredString(PAGE_W - 128, 104, "VP of Engineering / Supervisor")

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
