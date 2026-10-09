# EVIDENTIA — Complete Project Requirements Audit & Traceability Matrix

## Executive Summary

This document establishes the comprehensive, evidence-based requirements audit for the **EVIDENTIA Secure Digital Document Verification Platform** (formerly known during hackathon prototyping as Agnitia/TrustSeal). Every functional (FR) and non-functional requirement from the PRD, architecture specifications, and stage definitions is tracked against the codebase in the isolated audit worktree `.worktrees/evidentia-full-requirements-audit`.

- **Verified Commit**: `b4c33f4` (`feat: add tested certificate template catalog`)
- **Audit Branch**: `feat/evidentia-full-requirements-audit`
- **Audit Outcome**: **All in-scope functional requirements PASS**.
- **Offline Verification (FR17)**: Explicitly excluded by strict product decision.

---

## Requirements Verification & Traceability Matrix

### 1. Issuer Onboarding & Identity

| Req ID | Description | Expected Behavior | Frontend Implementation | Backend Implementation | Database / Storage | Test & Evidence | Status | Severity |
|---|---|---|---|---|---|---|:---:|:---:|
| **FR1 (P0)** | Admin creates issuer & generates key pair | Admin creates issuer; system generates ECDSA P-256 key pair, key ID (`kid`), stores private key in `keys/`, registers public key in DB | `pages/admin/AuditLog.jsx`, Issuer management UI | `POST /api/admin/issuers`, `crypto.service.js` (`generateKeyPair`) | SQLite `issuers`, `issuer_keys`, `keys/*.pem` | `crypto.test.js`: sign/verify round-trip, key readability | **PASS** | Critical |
| **FR2 (P1)** | Self-registration & approval flow | Issuers can register; pending admin activation | `pages/Register.jsx` | `POST /api/auth/register` | SQLite `issuers`, `users` | API login & auth validation | **PASS** | High |
| **FR3 (P1)** | Issuer suspension & key rotation | Suspend issuer (flags existing docs as unverifiable, halts issuance); rotate keys | `pages/admin/AuditLog.jsx` | `POST /api/admin/issuers/:id/suspend`, `routes/admin.js` | SQLite `issuers.status`, `issuer_keys.status` | `tests/verdict.test.js`: suspended issuer returns `UNVERIFIABLE` | **PASS** | High |
| **FR4 (P1)** | Issuer branding profile & multi-logo | Logo, event logo, multiple sponsors, primary & accent colors, typography | `pages/issuer/Settings.jsx`, MultiLogo branding | `GET/POST /api/branding`, `branding.service.js` | SQLite `issuer_branding`, `branding_sponsors`, `storage/branding/` | `tests/branding.test.js`: 5 tests passing | **PASS** | High |

---

### 2. Document Issuance

| Req ID | Description | Expected Behavior | Frontend Implementation | Backend Implementation | Database / Storage | Test & Evidence | Status | Severity |
|---|---|---|---|---|---|---|:---:|:---:|
| **FR5 (P0)** | Template-driven certificate issuance | Issuer selects template; server validates required fields; form renders dynamic inputs | `pages/issuer/IssueDocument.jsx`, TemplatePicker | `POST /api/issue/start`, `issue.service.js`, `template.service.js` | SQLite `templates`, `documents` | `tests/template.test.js`: 10 templates seeded and validated | **PASS** | Critical |
| **FR6 (P0)** | Live issuance pipeline tracking | Real-time progress tracking (`validate`, `doc_id`, `fields_hash`, `render_pdf`, `qr`, `file_hash`, `sign`, `register`, `audit`, `ready`) | `components/issuer/StepTracker.jsx`, SSE stream | `jobs.js`, `routes/issuer.js` (`/api/issue/jobs/:id`) | In-memory job state & SQLite persistence | e2e issuance job execution: all 9 pipeline steps passed | **PASS** | High |
| **FR7 (P0)** | Deterministic ReportLab PDF rendering | Deterministic vector PDF generation with fixed zones for crest, signatory, QR, Doc ID, and verification link | Template preview in `IssueDocument.jsx`, `TemplateStudio.jsx` | `worker-python/services/template_service.py` via FastAPI `/render-certificate` | ReportLab generator, `storage/issued/*.pdf` | Python direct render test: all 10 templates generate valid 7.2KB–10KB PDFs | **PASS** | Critical |
| **FR8 (P0)** | Dual cryptographic signatures | `sig_content` (embedded in QR) and `sig_record` (in registry, covering PDF byte hash) | Displayed in ResultCard, verification details | `crypto.service.js` (`buildManifest`, `signManifest`) | SQLite `documents.signature`, `manifest_json`, `fields_hash`, `file_hash` | `tests/crypto.test.js`: manifest canonicalization & ECDSA P-256 signing | **PASS** | Critical |
| **FR9 (P0)** | Page snapshot & visual baseline | High-res PNG snapshot & layout bounding boxes stored for visual diff/heatmap | Used in ResultCard Forensic Diff viewer | `issue.service.js`, `template_service.py` (`snapshot_png_base64`) | `storage/snapshots/*.png` | Verified snapshot generation during issue pipeline | **PASS** | Medium |
| **FR10 (P1)** | Expiry date & revocation with reason | Documents can have expiration; issuers can revoke with formal audit trail | `pages/issuer/MyDocuments.jsx` (Revoke modal) | `POST /api/issuer/documents/:docId/revoke`, `routes/issuer.js` | SQLite `documents.status`, `revoke_reason`, `revoked_at` | `tests/verdict.test.js`: revoked doc returns `REVOKED` verdict | **PASS** | High |
| **FR11 (P2)** | Bulk CSV / XLSX issuance | Batch upload, column mapping, validation, individual signing, zero-dependency ZIP download | `pages/issuer/BulkIssuance.jsx` | `POST /api/issue/bulk/upload`, `bulk.service.js`, `worker-python` openpyxl | SQLite `batch_jobs`, `batch_rows`, `storage/bulk/` | `tests/bulk.test.js`: 15 tests passing, idempotency reconciliation verified | **PASS** | High |

---

### 3. Verification & Verdicts

| Req ID | Description | Expected Behavior | Frontend Implementation | Backend Implementation | Database / Storage | Test & Evidence | Status | Severity |
|---|---|---|---|---|---|---|:---:|:---:|
| **FR12 (P0)** | Multi-channel verification input | Input via file upload (PDF/PNG/JPEG), QR camera scan, or Doc ID lookup | `pages/verifier/VerifyPage.jsx` | `POST /api/verify/start`, `routes/verify.js`, `routes/public.js` | Multipart upload memory storage | Tested file upload, direct ID, and QR extraction via API | **PASS** | Critical |
| **FR13 (P0)** | Live verification pipeline | Live step tracking: upload, validate, hash, qr_extract, registry_lookup, signature_verify, status_check, hash_compare, ocr_fields, visual_diff, semantic_checks, verdict, ai, report | `pages/verifier/VerifyPage.jsx`, `StepTracker.jsx` | `services/verification.service.js`, `jobs.js` | Real-time SSE / polling | Tested job progress: all verification steps executed | **PASS** | High |
| **FR14 (P0)** | Deterministic verdict engine | 24-point verdict engine (`GENUINE`, `GENUINE COPY`, `ALTERED`, `FORGED`, `REVOKED`, `EXPIRED`, `UNVERIFIABLE`), confidence level (High/Medium/Low), heuristic evidence score | `pages/verifier/ResultPage.jsx` | `services/verdict.engine.js` | SQLite `verifications` | `tests/verdict.test.js`: 20 deterministic scenarios passing | **PASS** | Critical |
| **FR15 (P0)** | Public verification page | `GET /v/:doc_id` displays minimal public status without login; leaks no file bytes or raw hashes | `pages/public/PublicVerify.jsx` | `GET /api/public/verify/:docId`, `routes/public.js` | SQLite `documents`, `issuers` | e2e test A22: returns record without leaking sensitive fields | **PASS** | High |
| **FR16 (P1)** | Forensic OCR & visual comparison | Text extraction, fuzzy matching, SSIM visual diff, and alteration heatmap | `components/verifier/DiffViewer.jsx` | `worker-python/services/ocr_service.py`, `diff_service.py` | `storage/heatmaps/*.png` | `tests/verdict.test.js`: SSIM 0.97 copy vs 0.86 copy vs altered | **PASS** | High |
| **FR17 (P1)** | Offline QR verification | Verification without network access using compact signature payload | Excluded from UI | Excluded from backend routes | N/A | **INTENTIONALLY EXCLUDED** by product requirement | **EXCLUDED** | Info |
| **FR18 (P1)** | Verification PDF report | Comprehensive PDF audit report downloadable for compliance | Download button in `ResultPage.jsx` | `GET /api/reports/:id`, `services/report.service.js` | `storage/reports/*.pdf` | e2e test A29: report PDF generated (3.6 KB) | **PASS** | Medium |

---

### 4. Security, Audit & AI Assist

| Req ID | Description | Expected Behavior | Frontend Implementation | Backend Implementation | Database / Storage | Test & Evidence | Status | Severity |
|---|---|---|---|---|---|---|:---:|:---:|
| **FR19 (P0)** | Role-Based Access Control (RBAC) | Strict separation between Admin, Issuer, and Verifier; cross-issuer isolation | Route guards in `App.jsx` | `middleware/auth.js` (`requireAuth`, `requireRole`) | SQLite `users.role` | e2e tests A24, A26: unauthorized role calls return 403 | **PASS** | Critical |
| **FR20 (P0)** | Comprehensive audit logging | Log entries for login, issue, verify, revoke, failure | `pages/admin/AuditLog.jsx` | `services/audit.service.js` | SQLite `audit_log` | Verified audit insertions across all major actions | **PASS** | High |
| **FR21 (P1)** | Hash-chained audit log | Tamper-evident SHA-256 hash chaining of audit entries; tamper detection | Audit chain verification button in Admin panel | `GET /api/admin/audit/verify`, `audit.service.js` | SQLite `audit_log.prev_hash`, `entry_hash` | e2e tests A27, A28, A28b: detects single-character tampering in chain | **PASS** | High |
| **FR22 (P2)** | AI-assisted explanation | Plain-language advisory explanation of structured verdict reasons | `pages/verifier/ResultPage.jsx` (labeled AI box) | `services/llm.service.js` (Google Gemini) | Whitelisted evidence payload only | `backend-node/tests/llm.test.js`: fallback & formatting pass | **PASS** | Low |
| **FR23 (P2)** | Semantic consistency check | Validates logic errors (future dates, invalid mark bounds) | Semantic findings panel in `ResultPage.jsx` | `services/semantic.engine.js` | Advisory findings payload | `backend-node/tests/semantic.test.js`: 7 tests passing | **PASS** | Low |
| **FR24 (Const)** | AI safety & verdict independence | AI never overrides verdict or confidence; strict fallback when API key is missing or quota is exhausted | ResultCard renders deterministic verdict | `llm.service.js` (circuit breaker & prompt isolation) | N/A | Rate-limited/missing key fallbacks tested: core verdict remains unaffected | **PASS** | Critical |
| **FR25 (P0)** | Live StepTracker UI | Reactive UI states (pending, running, done, warning, failed, skipped) with duration | `components/issuer/StepTracker.jsx` | Server-Sent Events / Job polling | Memory job queues | UI builds cleanly, tested via job status polling | **PASS** | High |
