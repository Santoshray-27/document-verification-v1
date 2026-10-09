# EVIDENTIA — Built-in Certificate Template Catalog

## Overview

The EVIDENTIA Secure Digital Document Verification Platform provides a curated library of **10 production-ready, functional certificate templates**. Each template maps directly to deterministic ReportLab layout rendering in the Python worker, enforces a structured JSON schema, and is protected as an immutable system template. Issuers can preview, use, or clone these templates into issuer-owned customized designs using the **Template Studio**.

---

## Template Matrix Summary

| # | Template ID | Display Name | Category | Document Type | Customizable via Studio | Primary Fields |
|---|---|---|---|---|---|---|
| 1 | `tpl_acad_01` | Academic Degree & Diploma | COLLEGES AND UNIVERSITIES | `academic_certificate` | Yes (Clone/Customize) | `name`, `course`, `grade`, `issue_date`, `certificate_number` |
| 2 | `tpl_mark_01` | Official Marksheet / Transcript | COLLEGES AND UNIVERSITIES | `marksheet` | Yes (Clone/Customize) | `name`, `course`, `grade`, `issue_date`, `certificate_number` |
| 3 | `tpl_bona_01` | Bonafide Institutional Certificate | COLLEGES AND UNIVERSITIES | `bonafide` | Yes (Clone/Customize) | `name`, `course`, `issue_date`, `certificate_number` |
| 4 | `tpl_hack_part_01` | Hackathon Certificate of Participation | COLLEGES AND UNIVERSITIES | `hackathon_participation` | **Yes (Full Showcase)** | `name`, `course`, `grade`, `issue_date`, `certificate_number` |
| 5 | `tpl_hack_win_01` | Hackathon Winner & Excellence Award | COLLEGES AND UNIVERSITIES | `hackathon_winner` | **Yes (Full Showcase)** | `name`, `course`, `grade`, `issue_date`, `certificate_number` |
| 6 | `tpl_work_01` | Workshop & Bootcamp Completion | COLLEGES AND UNIVERSITIES | `workshop_completion` | Yes (Clone/Customize) | `name`, `course`, `grade`, `issue_date`, `certificate_number` |
| 7 | `tpl_emp_01` | Corporate Offer of Employment | ENTERPRISE AND HR | `employment_offer` | Yes (Clone/Customize) | `name`, `course`, `grade`, `issue_date`, `certificate_number` |
| 8 | `tpl_intern_01` | Certificate of Internship Completion | ENTERPRISE AND HR | `internship_certificate` | Yes (Clone/Customize) | `name`, `course`, `grade`, `issue_date`, `certificate_number` |
| 9 | `tpl_inv_01` | Commercial Tax Invoice | FINANCE AND OPERATIONS | `commercial_invoice` | Yes (Clone/Customize) | `name`, `course`, `grade`, `issue_date`, `certificate_number` |
| 10 | `tpl_med_01` | Medical Fitness Assessment | HEALTHCARE AND GOVERNMENT | `medical_fitness` | Yes (Clone/Customize) | `name`, `course`, `grade`, `issue_date`, `certificate_number` |

---

## Detailed Catalog Entries

### 1. Academic Degree & Diploma (`tpl_acad_01`)
- **Category**: `COLLEGES AND UNIVERSITIES`
- **Document Type**: `academic_certificate`
- **Recommended For**: `university`, `college`, `academic_institution`
- **Layout & Typography**: Formal traditional parchment framing, double-line gold accent borders, serif title typography (`Times-Bold`), institutional centered hierarchy.
- **Branding Support**: Supports institution crest / primary logo, official seal, primary header color, and security QR anchor.
- **Supported Fields**:
  - `name`: Recipient Full Legal Name (Required, max 60 chars)
  - `course`: Degree / Degree Program e.g., "Bachelor of Technology in Computer Science" (Required, max 80 chars)
  - `grade`: Honors / Division e.g., "First Class with Distinction" (Optional)
  - `issue_date`: Date of Conferral (Required, YYYY-MM-DD or standard formatted date)
  - `certificate_number`: Unique Certificate Serial Number (Required, indexed in registry)
- **Status**: Production-ready, deterministic PDF rendering verified.

---

### 2. Official Marksheet / Transcript (`tpl_mark_01`)
- **Category**: `COLLEGES AND UNIVERSITIES`
- **Document Type**: `marksheet`
- **Recommended For**: `university`, `college`, `examination_board`
- **Layout & Typography**: Structured tabular format, clean academic headers, credit/marks summary layout with cryptographic security footer.
- **Branding Support**: Institutional logo, watermark grid, registrar signature block.
- **Supported Fields**:
  - `name`: Student Candidate Name (Required)
  - `course`: Program / Examination Session (Required)
  - `grade`: Cumulative GPA / Final Score / Division (Required)
  - `issue_date`: Date of Result Publication (Required)
  - `certificate_number`: Examination Roll / Registration Number (Required)
- **Status**: Production-ready, deterministic PDF rendering verified.

---

### 3. Bonafide Institutional Certificate (`tpl_bona_01`)
- **Category**: `COLLEGES AND UNIVERSITIES`
- **Document Type**: `bonafide`
- **Recommended For**: `university`, `college`, `school`
- **Layout & Typography**: Formal letter-style administrative layout, official declaration preamble, registrar signature zone.
- **Branding Support**: University letterhead banner, seal watermark, verification QR.
- **Supported Fields**:
  - `name`: Student Full Name (Required)
  - `course`: Academic Department & Year of Study (Required)
  - `issue_date`: Date of Issuance (Required)
  - `certificate_number`: Institutional Reference Serial (Required)
- **Status**: Production-ready, deterministic PDF rendering verified.

---

### 4. Hackathon Certificate of Participation (`tpl_hack_part_01`)
- **Category**: `COLLEGES AND UNIVERSITIES`
- **Document Type**: `hackathon_participation`
- **Recommended For**: `university`, `college`, `hackathon_organizer`, `student_chapter`
- **Layout & Typography**: Modern tech-event horizontal styling, dynamic gradient header bands, highlighted event title, and dedicated sponsor logo ribbon.
- **Branding Support**:
  - **University / Organizer Logo**: Primary header position.
  - **Hackathon Logo**: Secondary header / badge position.
  - **Multi-Sponsor / Partner Logos**: Dedicated footer partner strip (supports up to 4 distinct sponsor logos).
  - **Primary & Accent Colors**: Dynamic theme styling from organization branding settings.
- **Supported Fields**:
  - `name`: Participant Name (Required)
  - `course`: Hackathon Event Name e.g., "EVIDENTIA Global Hackathon 2026" (Required)
  - `grade`: Track / Team Category e.g., "AI & Security Track" (Optional)
  - `issue_date`: Hackathon Conclusion Date (Required)
  - `certificate_number`: Unique Verification ID (Required)
- **Showcase Status**: Fully customizable via **Template Studio** & **Organization Branding**. Eligible for clone, draft versioning, and bulk issuance.

---

### 5. Hackathon Winner & Excellence Award (`tpl_hack_win_01`)
- **Category**: `COLLEGES AND UNIVERSITIES`
- **Document Type**: `hackathon_winner`
- **Recommended For**: `university`, `college`, `hackathon_organizer`, `tech_community`
- **Layout & Typography**: Premium gold and deep navy award aesthetic, bold winner recognition banner, decorative divider rules, prominent award placement.
- **Branding Support**:
  - Full multi-logo support: Organizer crest, hackathon brand emblem, and multi-partner sponsor grid.
  - Theme colors: Gold accents (`#c59b27`), Navy primary headers (`#0f172a`).
- **Supported Fields**:
  - `name`: Winning Participant or Team Lead (Required)
  - `course`: Hackathon Name & Winning Project (Required)
  - `grade`: Standing / Award e.g., "1st Place Winner", "Best Cryptographic Architecture" (Required)
  - `issue_date`: Award Date (Required)
  - `certificate_number`: Award Certificate ID (Required)
- **Showcase Status**: Fully customizable via **Template Studio** & **Organization Branding**.

---

### 6. Workshop & Bootcamp Completion (`tpl_work_01`)
- **Category**: `COLLEGES AND UNIVERSITIES`
- **Document Type**: `workshop_completion`
- **Recommended For**: `university`, `college`, `training_institute`, `tech_community`
- **Layout & Typography**: Modern professional layout, prominent proficiency statement, clean certificate borders, verification QR lower corner.
- **Branding Support**: Training organization logo, instructor signature, custom primary palette.
- **Supported Fields**:
  - `name`: Attendee Full Name (Required)
  - `course`: Workshop Subject e.g., "Advanced Zero-Knowledge Proofs & Digital Signatures" (Required)
  - `grade`: Proficiency Level / CEU Credits e.g., "Completed with Distinction (40 Hours)" (Optional)
  - `issue_date`: Workshop Completion Date (Required)
  - `certificate_number`: Credential Serial Number (Required)
- **Status**: Production-ready, deterministic PDF rendering verified.

---

### 7. Corporate Offer of Employment (`tpl_emp_01`)
- **Category**: `ENTERPRISE AND HR`
- **Document Type**: `employment_offer`
- **Recommended For**: `company`, `enterprise`, `startup`
- **Layout & Typography**: Formal corporate letterhead formatting, executive typography, compensation/role terms summary, HR authorized signatory.
- **Branding Support**: Company corporate logo, corporate brand colors, authorized executive signature.
- **Supported Fields**:
  - `name`: Candidate Full Name (Required)
  - `course`: Offered Job Title / Designation e.g., "Staff Cryptographic Engineer" (Required)
  - `grade`: Grade / Level / Department e.g., "Security Engineering - L6" (Optional)
  - `issue_date`: Offer Issuance Date (Required)
  - `certificate_number`: Corporate Requisition / Offer ID (Required)
- **Status**: Production-ready, deterministic PDF rendering verified.

---

### 8. Certificate of Internship Completion (`tpl_intern_01`)
- **Category**: `ENTERPRISE AND HR`
- **Document Type**: `internship_certificate`
- **Recommended For**: `company`, `enterprise`, `startup`
- **Layout & Typography**: Professional corporate certificate layout, performance recognition clause, mentor signature block.
- **Branding Support**: Company corporate logo, mentor signature, official company seal.
- **Supported Fields**:
  - `name`: Intern Full Name (Required)
  - `course`: Internship Role & Track e.g., "Software Engineering Intern - Cloud Backend" (Required)
  - `grade`: Performance Rating e.g., "Outstanding Performance" (Optional)
  - `issue_date`: Completion Date (Required)
  - `certificate_number`: Internship Serial ID (Required)
- **Status**: Production-ready, deterministic PDF rendering verified.

---

### 9. Commercial Tax Invoice (`tpl_inv_01`)
- **Category**: `FINANCE AND OPERATIONS`
- **Document Type**: `commercial_invoice`
- **Recommended For**: `company`, `enterprise`, `fintech`
- **Layout & Typography**: Standard commercial tax invoice layout with line-item totals, tax identification fields, and payment verification QR.
- **Branding Support**: Vendor company logo, corporate address header, tax authority seal.
- **Supported Fields**:
  - `name`: Client / Billing Entity Name (Required)
  - `course`: Billing Description / Purchase Order Reference (Required)
  - `grade`: Total Amount & Currency e.g., "USD 12,500.00" (Required)
  - `issue_date`: Invoice Date (Required)
  - `certificate_number`: Tax Invoice Serial Number (Required)
- **Status**: Production-ready, deterministic PDF rendering verified.

---

### 10. Medical Fitness Assessment (`tpl_med_01`)
- **Category**: `HEALTHCARE AND GOVERNMENT`
- **Document Type**: `medical_fitness`
- **Recommended For**: `hospital`, `clinic`, `government_board`
- **Layout & Typography**: Clinical assessment layout, medical examination declaration, licensed practitioner registration block, anti-fraud QR anchor.
- **Branding Support**: Hospital / Clinic crest, medical officer signature, institutional seal.
- **Supported Fields**:
  - `name`: Patient / Examinee Full Name (Required)
  - `course`: Purpose of Examination / Category e.g., "Pre-Employment Physical Fitness" (Required)
  - `grade`: Clinical Fitness Outcome e.g., "Fit for Unrestricted Duty" (Required)
  - `issue_date`: Date of Medical Examination (Required)
  - `certificate_number`: Medical Registry Reference (Required)
- **Status**: Production-ready, deterministic PDF rendering verified.

---

## Security and Cryptographic Integration

1. **System Template Immutability**: All 10 built-in templates are flagged `is_system = 1` in SQLite. Attempting to update or delete a system template via the API returns `403 Forbidden` (`Cannot modify system template`).
2. **Deterministic PDF Output**: Templates are compiled using Python ReportLab with fixed page dimensions (`595.27 x 841.89` pt for A4 portrait), precise coordinates, and sanitization filters.
3. **Canonical Field Hashing**: Every certificate's payload is canonicalized into deterministic JSON (sorted keys, no whitespace), hashed via SHA-256, and signed using the issuer's active ECDSA P-256 private key.
4. **QR Verification**: Every rendered certificate embeds a micro QR code in the bottom-right security zone encoding the public online verification URL:
   ```
   https://evidentia.verify/v/{doc_id}
   ```
5. **Customization & Versioning**: Issuers wishing to modify any system template can click **Customize / Save as My Template** in Template Studio to create an issuer-owned copy (`is_system = 0`), which supports semantic versioning (`v1`, `v2`, ...), draft states, and custom coordinate overrides.
