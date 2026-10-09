# Agnitia: Product Requirements Document (Complete)

**Product:** Agnitia, Secure Digital Document Verification Platform (earlier placeholder name: TrustSeal)
**Hackathon PS:** CIPHER03 | **Build window:** 24 hours | **Team:** 4 | **Version:** 3.0 (final, supersedes earlier Python-only plan)
**Stack decision:** React (UI) + Node.js (API, crypto, verdict) + Python (forensics worker) + SQLite
**Tagline:** *Every document carries its own proof.*

---

## 1. Summary

Agnitia lets an **issuer** (university, company) create cryptographically signed documents and lets any **verifier or third party** check a document. The result is a **verdict, a confidence level, concrete reasons, and the location of any change**. Every step of issuing and verifying is shown **live** in the UI (loading, running, done, warning, failed).

Principles:
1. **Crypto and rules decide the verdict. AI never decides.** AI only reads, hints and explains.
2. **Never overclaim.** Only claim what is built and measured.
3. **Fail safe.** If the Python worker, OCR, AI or blockchain is down, core verification still works.
4. **Privacy by default.** Synthetic data only; minimal data on the public page.
5. **Finish the PS first** (Phase 1), then extras (Phase 2), then winning edge (Phase 3).

## 2. Problem

Certificates, IDs, invoices and contracts are shared online daily and are easy to forge or quietly edit. Manual checks are slow. Existing tools usually return only valid/invalid, cannot show what changed, mislabel harmless copies (screenshots) as fake, and treat "issuer not on the platform" the same as "forged".

## 3. Goals and non-goals

**Goals:** (G1) issue signed documents with a scannable QR; (G2) classify tampering using hash, signature, content, visual and metadata evidence; (G3) explain every result; (G4) public verification by QR/link without login; (G5) role separation and tamper-evident audit trail; (G6) prove quality with numbers on a labelled synthetic set; (G7) show every pipeline step live in the UI.

**Non-goals:** real institutional integration; real personal data; LLM-decided verdicts; mainnet blockchain; production key custody (HSM/KMS); voice verification; proving authenticity for issuers who are not on the platform.

## 4. Scope: what Agnitia can and cannot verify

| Document | Result |
|---|---|
| Issued by Agnitia, unchanged | GENUINE |
| Issued by Agnitia, edited | ALTERED (+ where) |
| Issued by Agnitia, screenshot/re-save, same content | GENUINE COPY |
| Registered issuer, no matching record, or QR/record mismatch | FORGED (NOT ISSUED) |
| Issued then revoked / past expiry | REVOKED / EXPIRED |
| Issuer not registered on the platform | **UNVERIFIABLE** (never called "fake"; only suspicion hints) |

Agnitia cannot tell whether an arbitrary document from a non-registered issuer is real. This is the trust-anchor limitation and is stated openly.

## 5. Users

| Role | Account | Needs |
|---|---|---|
| Admin | Yes | Create/suspend issuers, view audit, check log integrity |
| Issuer | Yes (created by admin) | Issue, revoke, view own documents and audit |
| Verifier | Optional | Upload/scan/ID verify, history, report |
| Holder | No | Receives the PDF, forwards it |
| Third party | No | Scan QR, see minimal public status |

## 6. PS compliance map

| PS requirement | Agnitia feature | Where | Done when |
|---|---|---|---|
| Issuers create protected documents | Issuer panel: form to signed PDF with QR | Node, React | Signed PDF downloads; QR scans on phone |
| Verifiers check them | Verifier panel: upload / QR / link | Node, React | All 3 input methods work |
| Upload PDF/image and OCR key fields | OCR of name, ID, marks, date | Python `/ocr` | Fields shown in result |
| Hash + digital signature / registry | SHA-256, ECDSA P-256, SQLite registry, hash-chained audit | Node | Tampered or unsigned file is caught |
| Metadata mismatch | PDF producer/creator/date check | Python `/metadata` | Editor-made PDF flagged |
| Edited areas | Heatmap with boxes | Python `/diff` | Changed field highlighted |
| Font/layout oddities | Layout diff regions | Python `/diff` | Layout change in reasons |
| QR mismatch | QR payload vs registry vs fields | Node | Copied QR on fake content caught |
| Confidence and reasons | Level + reasons list | Node | Every result has at least 1 reason |
| Verify by QR or link | Public page `/v/:id` | Node, React | Works without login |
| Issuer/verifier roles + audit | RBAC + hash-chained log | Node | Wrong role gets 403; log entries exist |
| Deliverables | Prototype, samples, report, security notes, diagram, repo | all | Submission pack complete |

## 7. Functional requirements

Priority: **P0** must (Phase 1), **P1** should (Phase 2), **P2** bonus (Phase 3).

### 7.1 Issuer onboarding
- **FR1 (P0)** Admin creates an issuer (name, type, official email, registration no., contact, website, optional logo, allowed document types). System generates an ECDSA P-256 key pair, key ID `kid` (e.g. `abc-uni-01`), stores the private key outside the database (encrypted file or env), publishes the public key in the **Issuer Directory**, and creates an Issuer user.
- **FR2 (P1)** Self-registration with PENDING status and admin approve/reject.
- **FR3 (P1)** Suspend issuer (no new issuance; existing documents flagged per policy). Key rotation via a new `kid`.
- **FR4 (P1)** Issuer branding profile (logo, colour, font, seal text, signatory) used as the template theme.

### 7.2 Issuance
- **FR5 (P0)** Issuer chooses a template (Degree, Marksheet, Bonafide/Experience letter). Form fields come from the template definition. Server-side validation.
- **FR6 (P0)** Pipeline with live steps: `validate, doc_id, fields_hash, render_pdf, qr, file_hash, sign, register, audit, ready`.
- **FR7 (P0)** The PDF is rendered from a deterministic HTML/CSS template with embedded fonts. Fixed zones: logo/header, key fields, signatory, QR, Doc ID, verify link.
- **FR8 (P0)** Two signatures (see Section 9): `sig_content` (embedded in QR) and `sig_record` (registry only, covers file hash).
- **FR9 (P0)** A PNG snapshot of the issued page (A4, 150 DPI) and field bounding boxes are stored for the heatmap.
- **FR10 (P1)** Expiry date; revocation with reason.
- **FR11 (P2)** Option 2: issuer uploads an existing PDF and Agnitia stamps the QR and seals it. CSV bulk issue.

### 7.3 Verification
- **FR12 (P0)** Input by upload (PDF/PNG/JPG), camera QR scan, or Doc ID/link.
- **FR13 (P0)** Pipeline with live steps: `receive, qr, issuer, registry, signature, status, hash, ocr, fields, visual, metadata, ai, verdict`. Early exit marks the remaining steps as skipped.
- **FR14 (P0)** Verdict, confidence level, reasons, and (when available) changed fields and heatmap.
- **FR15 (P0)** Public page `GET /v/:doc_id` shows only status, issuer, issue date; plus "verify the file you hold".
- **FR16 (P1)** OCR comparison with fuzzy matching, GENUINE COPY via perceptual hash plus field match, metadata checks.
- **FR17 (P1)** Offline verification from the QR payload: check `sig_content`, then compare `fields_hash` with fields typed or OCR'd. Limits: content only, no file bytes, no revocation check.
- **FR18 (P1)** Verification report as PDF.

### 7.4 Roles, audit, security
- **FR19 (P0)** RBAC (Admin, Issuer, Verifier); issuers act only on their own documents.
- **FR20 (P0)** Audit entries for login, issue, verify, revoke, failures.
- **FR21 (P1)** Hash-chained audit with integrity check endpoint and UI button ("tamper-evident", not "immutable").

### 7.5 AI assist (advisory, optional)
- **FR22 (P2)** Plain-language explanation (English/Hindi) of the structured reasons.
- **FR23 (P2)** Semantic consistency check (marks above maximum, impossible dates, issuer/course mismatch).
- **FR24 (constraint)** AI never changes verdict or confidence level; it appears in a labelled "AI-assisted" box; only extracted fields go to the LLM; strict JSON validation; document text is untrusted (prompt-injection); full no-AI fallback.

### 7.6 Live progress UI (core requirement)
- **FR25 (P0)** Both pipelines stream events via Server-Sent Events. The UI shows a step tracker with states pending, running, done, warn, fail, skipped, per-step duration, and a one-line detail; overall progress bar; skeletons/spinners; no blank screens; clear error states, including "forensics unavailable (fallback)".

## 8. Verdicts and confidence

| Verdict | Condition |
|---|---|
| GENUINE | Records and signatures valid, file hash equals stored, active |
| GENUINE COPY | File hash differs, all key fields match, perceptual similarity at or above threshold |
| ALTERED | Record valid but uploaded content differs (fields or visuals) |
| FORGED (NOT ISSUED) | Issuer registered but no record, invalid signature, or QR payload does not match the record |
| UNVERIFIABLE | Issuer not in directory, or no QR/ID found (with suspicion hints only) |
| REVOKED / EXPIRED | Status check |

**Confidence** is a level (High/Medium/Low) plus a heuristic score labelled as heuristic. Cryptographic outcomes are High. OCR confidence, field edit distance, visual similarity and metadata adjust confidence only inside ALTERED vs GENUINE COPY. AI cannot change it. No fake-precise percentages.

## 9. Core cryptographic design (corrected)

An earlier draft signed the file hash inside a QR that lives inside the file, which is circular. The corrected design uses two signatures:

- `fields_hash = SHA-256(canonical JSON of fields + doc_id + issuer_id + template_id + template_version)`
- **`sig_content`**: ECDSA P-256 over canonical `{v, doc_id, issuer_id, kid, fields_hash, issued_at, expires_at}`. Does not depend on file bytes, so it can be embedded in the QR.
- QR payload (compact JSON, about 250 bytes): `{v, id, kid, fh, sig, u}`.
- After the PDF with QR is rendered, `file_hash = SHA-256(final PDF bytes)`.
- **`sig_record`**: ECDSA P-256 over canonical `{doc_id, ..., fields_hash, file_hash, sig_content}`. Stored in the registry only.
- Private keys never leave the server; `kid` on every signature enables rotation; constant-time comparisons; standard library only.

## 10. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | Verification under 5 s for a 1-2 page document; live step events within 200 ms of step change |
| Security | See Section 11 |
| Reliability | Core verdict works with the worker, AI and network down |
| Usability | Result card readable in 10 s; mobile-friendly; QR scan works on a phone browser |
| Explainability | At least one concrete reason per verdict |
| Privacy | Hashes and required fields only; synthetic data |

## 11. Security requirements

Keys outside repo and DB, never logged or sent to the client; bcrypt/argon2; JWT in httpOnly SameSite=Strict cookie (same-origin via dev proxy) with short expiry; backend RBAC on every route; upload validation (magic bytes, 5 MB, page limit, random names, delete after use); parameterized SQL; sanitize OCR/metadata text; rate-limit public routes; UUID doc IDs; `helmet`; Python worker bound to localhost; append-only hash-chained audit; AI isolation.

**Threat model:** content edit (hash, OCR, heatmap); fake document (registry, signature); fake/copied QR (sig_content plus fields hash); ID guessing (UUID plus rate limit); key theft (rotation, revocation, HSM/KMS in production); log tampering (hash chain); malicious upload (validation); prompt injection (deterministic verdict); role escalation (server-side RBAC).

**Limitations to state:** screenshots and print-scans break byte hashes, so GENUINE COPY is heuristic; offline mode cannot detect revocation; confidence is rule-based; AI is advisory; key storage is simplified; only registered issuers can be verified; tested on synthetic data only.

## 12. Evaluation and acceptance

**Dataset (40 synthetic files):** Genuine 10, Genuine Copy 5, Altered 12 (name/marks/date; PDF edits and image edits), Forged 6 (self-made, copied QR), Unverifiable 3, Revoked 4.
**Metrics:** per-class accuracy, confusion matrix, false alarms, average verification time, OCR field accuracy, ablation with/without AI on logic-error cases.
**Targets:** at least 90% correct, at most 2 false alarms, under 5 s per verification. Report real numbers.

**Acceptance criteria:**
1. Issue a document; the signed PDF downloads and its QR scans on a phone.
2. Untouched PDF returns GENUINE with reasons.
3. Edited marks return ALTERED, name the changed field, and show a heatmap on that region.
4. Screenshot of a genuine document returns GENUINE COPY.
5. Self-made document with a copied QR returns FORGED.
6. Document from an unregistered issuer returns UNVERIFIABLE.
7. Revoked document returns REVOKED.
8. Public page works without login and shows only minimal fields.
9. Audit integrity passes, then fails after one log row is manually altered.
10. With the worker stopped, verification still returns a crypto verdict and marks forensic steps unavailable.
11. Role tests: Issuer cannot call Admin or Verifier-only routes.
12. Live StepTracker works in both issue and verify flows.

## 13. Phases

| Phase | Content |
|---|---|
| **1 (must)** | Everything in Section 6 plus live StepTracker, one Degree template with 2 issuer themes |
| **2 (strong)** | Heatmap, GENUINE COPY, UNVERIFIABLE and Issuer Directory, revocation/expiry, hash-chained audit, report PDF, phone QR demo, evaluation table, Marksheet and Bonafide templates |
| **3 (bonus)** | AI explanation and semantic check, offline mode, self-registration, existing-PDF stamping, bulk CSV, Merkle proof, optional testnet anchoring (mention only if built) |

**Cut order if late:** blockchain, bulk/Merkle, AI agent, offline mode, extra templates, revocation, heatmap. **Never cut:** sign/verify, distinct verdicts, QR verify, reasons, audit, live steps, eval numbers, backup video.

## 14. Timeline (24 h)

| Hours | Work | Check |
|---|---|---|
| 0-1 | Setup, repo, Tesseract, `npm run dev` for three services | Same env on all laptops |
| 1-5 | DB, crypto, auth/RBAC, audit, issuer onboarding, worker `/health` and `/ocr`, React shell | curl issue and verify work |
| 5-6 | First Node to Python call | If it fails, decide Node-only fallback now |
| 5-8 | Template, PDF, QR, snapshot, issue pipeline with SSE | Signed PDF downloads |
| 8-11 | Verify pipeline, verdicts, samples | Three verdicts distinct (MVP) |
| 11-15 | OCR, GENUINE COPY, metadata, confidence | Copy vs Altered separated |
| 15-18 | React panels, StepTracker, ResultCard, public page, QR scan | Full flow clickable |
| 18-20 | Heatmap, revocation, audit integrity UI, report PDF, optional AI | Differentiators live |
| 20-21 | Evaluation run | Numbers recorded |
| 21-23 | Report, diagram, slides, backup video, printed QR | Submission pack |
| 23-24 | Code freeze | Bug fixes only |

**Team:** P1 Node core (crypto, registry, pipelines, audit, SSE); P2 Python worker and forensics; P3 React UI; P4 samples, evaluation, report, slides, video, QA.

## 15. Risks

| Risk | Mitigation |
|---|---|
| OCR inaccuracy | Embedded fonts, 150-300 DPI, key fields only, fuzzy matching |
| Heatmap misalignment | Deterministic template, same DPI, ORB alignment for images, field-level fallback |
| Puppeteer install problems | Test in hour 1; fallback to `pdfkit`/`pdf-lib` |
| Two services to run | One root `npm run dev` with `concurrently`; health checks |
| AI failure or injection | Advisory only, schema validation, fallback |
| Demo network failure | Local run, hotspot, recorded video |
| Time overrun | Checkpoints and cut order |

## 16. Deliverables

Working prototype (issue and verify); demo with genuine, altered, forged (plus copy, unverifiable, revoked) samples; verification report and security notes; architecture diagram; code repository with README and reuse credits; short report with evaluation table and limitations; slides, backup video, printed QR.

## 17. Open questions (ask organizers)

Judging criteria and weights; attribution rule for reused open-source code; PS swap rule; LLM API key availability; whether judging is within each PS or across all.
