# Evidentia (formerly Agnitia): Master Product Requirements Document (PRD v4.0 — Final Production Release)

**Product:** Evidentia — Forensic Digital Document Issuance & Multi-Layer Cryptographic Verification Platform  
**Live Web App:** `https://evidentia-web.vercel.app`  
**Live API Service:** `https://evidentia-api-ig4f.onrender.com`  
**Repository:** `https://github.com/Santoshray-27/document-verification-v1.git`  
**Hackathon PS:** CIPHER03 | **Status:** 100% Production Deployed & Evaluated  
**Unified Tech Stack:** React 18 + Vite (SPA on Vercel) + Unified Python 3.11 FastAPI (Render) + Supabase PostgreSQL 15 + OpenCV/Tesseract/ReportLab  
**Tagline:** *Proof in Every Pixel — Cryptographic Trust Anchors & Multi-Layer Forensic Verification.*

---

## 1. Executive Summary & Principles

**Evidentia** empowers institutions (universities, testing boards, corporations, government agencies) to issue cryptographically signed, tamper-evident digital certificates and allows anyone (employers, verifiers, embassies) to verify documents instantly.

Unlike naive verification tools that only check a QR link or hash, Evidentia implements a **Four-Layer Forensic Inspection Pipeline** that pinpoints exact altered pixels, font deviations, metadata traces of image editors (Photoshop/Canva), and fraudulent claims.

### Core Architecture & Engineering Principles:
1. **Zero-Trust Cryptographic Determinism:** Cryptography and mathematical computer vision determine the verdict. AI/LLMs never decide legal authenticity; they provide advisory semantic summaries only.
2. **Never Overclaim:** If an issuer is not registered in our cryptographic directory, the document is categorized as **`UNVERIFIABLE`** with forensic suspicion signals, never falsely flagged as "fake".
3. **Fail-Safe Offline/Worker Degradation:** If OCR or auxiliary vision modules are degraded, cryptographic ECDSA P-256 integrity checks continue to function without interruption.
4. **Deterministic Vector Synthesis:** All certificates are generated as scalable vector PDFs via ReportLab with embedded high-entropy QR codes, micro-guilloche borders, watermarks, and cryptographic signatures.
5. **Real-time Forensic Pipeline UI:** Every stage of verification streams progress with millisecond telemetry in the user interface.

---

## 2. Problem Statement & Market Failure

1. **Digital Document Forgery:** PDFs and scanned certificates are trivial to tamper with using off-the-shelf tools (Photoshop, Acrobat, Canva).
2. **Superficial "QR Verification":** Traditional QR codes merely point to a URL that can easily be spoofed by copying the QR code onto a forged document or hosting a clone website.
3. **False Positives on Screenshots:** Naive file-hash systems classify legitimate compressed screenshots or print-scans of real documents as "forged".
4. **Zero Structural Localization:** Legacy tools output binary "Valid/Invalid" verdicts without explaining *what* was changed or *where* the altered pixel tamper occurred.

---

## 3. Scope: What Evidentia Verifies

| Document State | Evidentia Verdict | Forensic Output & UI State |
| :--- | :--- | :--- |
| **Issued by Evidentia, Untouched** | **GENUINE** | 100% Hash & ECDSA P-256 match, 0.00 pixel diff, green security shield. |
| **Issued by Evidentia, Content Edited** | **ALTERED** | Red diff heatmap overlay, bounding box around tampered name/grade, OCR text mismatch score. |
| **Issued by Evidentia, Compressed/Screenshot** | **GENUINE COPY** | File hash mismatch, but 100% field match & high perceptual/SSIM structural match. |
| **Registered Issuer, No Record or Stolen QR** | **FORGED (NOT ISSUED)** | Signature failure or doc_id not in registry. Explicit "Stolen/Forged QR" warning. |
| **Revoked or Past Expiry Date** | **REVOKED / EXPIRED** | High-visibility warning banner with timestamp and cryptographic revocation reason. |
| **Issuer Not in Cryptographic Directory** | **UNVERIFIABLE** | Suspicion hints provided (e.g. Photoshop metadata detected, font anomaly), clear disclaimer. |

---

## 4. User Personas & Role-Based Access Control (RBAC)

1. **Platform Administrator (`admin`):**
   - Manages issuer accreditation, approves self-registrations, monitors system health, inspects tamper-evident audit logs.
2. **Accredited Issuer (`issuer`):**
   - Self-registers organization, receives unique ECDSA P-256 key pair (`kid`), issues single or bulk certificates, accesses Template Studio, manages branding (seals, logos, signatures), revokes certificates with audit reason.
3. **Verifier (`verifier` / Third-Party Public):**
   - Uploads files (PDF/PNG/JPG), scans QR codes with web camera, inspects interactive diff heatmaps, downloads audit reports.
4. **Document Holder / Recipient:**
   - Receives signed vector PDF, verifies file provenance without creating an account.

---

## 5. Complete Functional Requirements Matrix

### 5.1 Issuer Onboarding & Identity (FR1 – FR4)
- **FR1 (Admin Accreditation):** Generates ECDSA P-256 key pair, key ID (`kid`), registers public key in Directory.
- **FR2 (Self-Registration):** Organizations can self-register with organization type (`university`, `school`, `government`, `corporate`, `other`), auto-generating credentials and cryptographic keys.
- **FR3 (Key Rotation & Suspension):** Support for suspending issuers and rotating keys via a new `kid` without invalidating historical signatures.
- **FR4 (Branding Studio):** Custom issuer profiles with uploaded crest/logos, primary colors, official seal text, and authorized signatory signatures.

### 5.2 Single & Bulk Issuance Engine (FR5 – FR11)
- **FR5 (Expanded 10-Template Library):**
  - `tpl_academic_01`: University Degree / Graduation Diploma (Portrait)
  - `tpl_academic_landscape`: Academic Honours & Transcripts (Landscape)
  - `tpl_marksheet_01`: Detailed Academic Marksheet / Scorecard
  - `tpl_experience_01`: Corporate Experience & Relieving Certificate
  - `tpl_appreciation_01`: Distinguished Achievement & Excellence
  - `tpl_training_01`: Professional Training & Workshop Completion
  - `tpl_hack_part_01`: Hackathon Certificate of Participation
  - `tpl_hack_win_01`: Hackathon Winner & Excellence Award
  - `tpl_work_01`: Technical Bootcamp & Seminar Certificate
  - `tpl_intern_01`: Internship Completion & Performance Certificate
- **FR6 (Deterministic Issuance Pipeline):** Steps stream live: `validate` &rarr; `doc_id` &rarr; `fields_hash` &rarr; `render_pdf` &rarr; `qr` &rarr; `file_hash` &rarr; `sign` &rarr; `register` &rarr; `ready`.
- **FR7 (Dual Cryptographic Signatures):**
  - **`sig_content`**: ECDSA P-256 over canonical fields JSON embedded inside the QR payload.
  - **`sig_record`**: ECDSA P-256 over canonical fields + rendered PDF bytes file hash stored in Supabase registry.
- **FR8 (High-Res Snapshotting):** Stores a 300 DPI vector rasterization of Page 1 for computer vision diffing.
- **FR9 (Bulk Issuance via Excel/CSV):** Batch process hundreds of recipients via `.xlsx`/`.csv` drag-and-drop, real-time table validation, batch signing, and one-click ZIP download of generated PDFs.
- **FR10 (Lifecycle Management):** Certificate expiration dates and single-click revocation with audit notes.

### 5.3 Multi-Layer Forensic Verification Pipeline (FR12 – FR18)
- **FR12 (Tri-Modal Input):** Upload (PDF/PNG/JPG), live camera QR scanner, or direct Document ID (`DOC-XXXXXX`).
- **FR13 (Live 8-Stage Forensic Stream):** `receive` &rarr; `qr` &rarr; `registry` &rarr; `signature` &rarr; `hash` &rarr; `diff_ssim` &rarr; `ocr` &rarr; `metadata` &rarr; `verdict`.
- **FR14 (Layer 1 — Cryptographic Verification):** Validates ECDSA P-256 ASN.1 DER signature against registered public key PEM.
- **FR15 (Layer 2 — Structural Diff & Heatmap):** Native OpenCV SSIM calculation comparing uploaded document against original snapshot. Highlights tampered bounding boxes in bright red.
- **FR16 (Layer 3 — OCR & Semantic Verification):** Tesseract OCR extraction with Levenshtein fuzzy distance matching on key certificate fields.
- **FR17 (Layer 4 — Digital Forensic Metadata):** Inspects PDF object streams, software signatures (Adobe Photoshop, Canva, GIMP), font embeddings, and timestamp anomalies.
- **FR18 (Forensic Verification PDF Report):** Export downloadable verification proof report complete with tamper coordinates, hash audit, and cryptographic signatures.

### 5.4 Public Trust Directory & Transparency (FR19 – FR21)
- **FR19 (Public Issuer Directory):** Searchable public directory (`/public/issuers`) listing all accredited institutions, institution types, status, and public cryptographic keys.
- **FR20 (Public Verification Portal):** Lightweight public page (`/v/:doc_id` or `/verify/:doc_id`) displaying status, issuer name, issuance date, and instant file upload comparison.
- **FR21 (Hash-Chained Audit Ledger):** Cryptographically linked audit logs for every issuance, verification, and revocation action.

---

## 6. Detailed Technical Architecture & Deployment Stack

### Frontend Architecture
- **Framework:** React 18, Vite 5, React Router v6.
- **Design System:** Brutalist Security Aesthetic (TailwindCSS, high-contrast borders, monospaced metadata labels, animated scan frames).
- **Hosting:** **Vercel** (`https://evidentia-web.vercel.app`).
- **Vercel Reverse Proxy (`vercel.json`):**
  - `/api/(.*)` &rarr; `https://evidentia-api-ig4f.onrender.com/api/$1`
  - `/static/(.*)` &rarr; `https://evidentia-api-ig4f.onrender.com/static/$1`
  - Eliminates all CORS issues and enables same-origin header delivery.

### Backend Architecture
- **Framework:** FastAPI on Python 3.11.9, Uvicorn ASGI server.
- **Hosting:** **Render** (`https://evidentia-api-ig4f.onrender.com`).
- **Database:** **Supabase PostgreSQL 15** with threaded connection pooling (`psycopg2-binary`).
- **Cryptographic Engine:** `cryptography` library (ECDSA `SECP256R1` + SHA-256), `PyJWT`, `bcrypt`.
- **Vision & Document Generation:**
  - `reportlab` 4.x: Deterministic vector PDF generation.
  - `fitz` (PyMuPDF): High-fidelity PDF rendering and metadata extraction.
  - `cv2` (`opencv-python-headless`): Native SSIM, image alignment, and heatmap synthesis.
  - `pytesseract`: Optical character recognition.

---

## 7. Cryptographic Protocol Specification

### 1. Canonical Fields Serialization (RFC 8785)
```python
canonical_fields = {
    "certificate_number": "CERT-2026-901",
    "course": "Bachelor of Technology in Computer Science",
    "doc_id": "DOC-2026-4B11F2",
    "grade": "First Class with Distinction",
    "issue_date": "2026-06-15",
    "issuer_name": "Oriental University",
    "name": "Alex Mercer"
}
fields_hash = SHA256(canonicalize(canonical_fields))
```

### 2. Manifest Schema & Signing
```json
{
  "schema_version": 1,
  "doc_id": "DOC-2026-4B11F2",
  "issuer_id": "iss_c4dbd09e",
  "kid": "key_8f1a23c4",
  "fields_hash": "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
  "file_hash": "9f83c605d4c82b3e9258a1e3b2e541b65e77b63f704bdfa5a044de8b14a90967",
  "issued_at": "2026-10-10T02:00:00Z",
  "expires_at": null
}
```
$$\text{Signature} = \operatorname{ECDSA-Sign}_{K_{priv}}(\operatorname{SHA-256}(\text{Canonical Manifest}))$$

---

## 8. Synthetic Evaluation Dataset & Benchmarks

Evidentia has been verified across a 40-document test suite:
- **Total Test Cases:** 40
  - Genuine (Untouched): 10 / 10 Correct (100%)
  - Genuine Copies (Compressed / Resaved): 5 / 5 Correct (100%)
  - Altered (Modified Grade, Misspelled Name, Tampered Seal): 12 / 12 Correct (100%)
  - Forged (Stolen QR, Fake Issuer): 6 / 6 Correct (100%)
  - Revoked / Expired: 4 / 4 Correct (100%)
  - Unverifiable (Unregistered Issuer): 3 / 3 Correct (100%)
- **Accuracy:** **100% Classification Accuracy** (0 False Alarms).
- **Latency Benchmark:** Mean verification latency **< 1.8 seconds** per multi-page document.

---

## 9. Deliverables & Repository Map

| Deliverable | Location in Repository | Status |
| :--- | :--- | :--- |
| **Live Web App** | `https://evidentia-web.vercel.app` | **LIVE (Vercel)** |
| **Live API Service** | `https://evidentia-api-ig4f.onrender.com` | **LIVE (Render)** |
| **Master PRD** | `docs/Agnitia_01_PRD.md` | **UPDATED (v4.0)** |
| **Master Architecture Docs**| `docs/MASTER_SYSTEM_DOCUMENTATION.md` | **COMPLETE** |
| **Security Audit** | `docs/EVIDENTIA_SECURITY_AUDIT.md` | **COMPLETE** |
| **Test Evaluation** | `docs/FINAL_BULK_TEMPLATE_TEST_REPORT.md` | **COMPLETE** |
| **Frontend Source** | `frontend-react/` | **COMPLETE** |
| **FastAPI Backend** | `worker-python/` | **COMPLETE** |
