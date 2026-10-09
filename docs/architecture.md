# Agnitia — Architecture & Trust Model

*Proof in Every Pixel* · Secure Digital Document Verification Platform

## 1. What the system decides, and what decides it

The verdict is produced by **deterministic cryptography and rules only**. No language model,
no classifier and no human input can change a verdict. An optional plain-language
explanation is generated from the already-computed result by rule-based templates and is
labelled "AI-assisted — does not decide the verdict".

## 2. Components

```
┌────────────────────────────────────────────────────────────────────────────┐
│  React 18 + Vite + Tailwind  (frontend-react)                              │
│  Landing · Login · Issuer dashboard/issue/documents · Verify · Result      │
│  Public QR page · Admin audit log                                          │
└───────────────┬────────────────────────────────────────────────────────────┘
                │  /api  (JWT where required, multipart upload)
                ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  Node.js + Express   —  THE BRAIN          (backend-node, port 4000)       │
│                                                                            │
│   auth (bcrypt + JWT)      RBAC (server-side role check on every route)    │
│   crypto.service           canonical JSON · SHA-256 · ECDSA P-256 sign/ver │
│   issue.service            issue flow coordinator                          │
│   verification.service     pipeline orchestration                          │
│   verdict.engine           PURE rule engine: checks → verdict              │
│   audit.service            hash-chained log + integrity verification       │
│   report.service           PDFKit verification report                      │
│   worker.client            HTTP → Python, degrades gracefully              │
│                                                                            │
│   SQLite (better-sqlite3)  issuers · issuer_keys · users · documents       │
│                            verifications · audit_log                       │
│   storage/                 issued · snapshots · heatmaps · reports         │
│   keys/  (git-ignored)     issuer ECDSA private keys, mode 600             │
└───────────────┬────────────────────────────────────────────────────────────┘
                │  internal HTTP only (never reachable from the browser)
                ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  Python FastAPI worker  —  THE MUSCLE      (worker-python, port 8001)      │
│                                                                            │
│   template_service    ReportLab certificate, byte-deterministic            │
│   pdf_service         PyMuPDF page → PNG (snapshot / render)               │
│   qr_service          OpenCV QRCodeDetector (+ upscale retries)            │
│   ocr_service         pytesseract + rule-based field parsing               │
│   diff_service        align → SSIM → absdiff → red-box heatmap             │
│   metadata_service    PyMuPDF metadata + tamper signals                    │
│                                                                            │
│   NO database. NO private keys. NO verdict logic.                          │
└────────────────────────────────────────────────────────────────────────────┘
```

**Rule:** the frontend never calls the Python worker. Every request goes through Node, which
owns the database, the keys and the verdict.

## 3. Issue flow (solves the QR/hash circularity)

A QR embedded *inside* a PDF cannot contain the hash *of* that PDF — adding the QR changes
the bytes. So the QR carries only the verification URL:

```
1  issuer form fields
2  doc_id            = UUID v4                     (random, not sequential → no enumeration)
3  qr_text           = {PUBLIC_BASE_URL}/public/verify/{doc_id}
4  render PDF        = worker renders the certificate with the QR inside (deterministic)
5  file_hash         = SHA-256(final PDF bytes)     ← hashed AFTER the QR exists
6  fields_hash       = SHA-256(canonical JSON of the key fields)
7  manifest          = canonical JSON {schema_version, doc_id, issuer_id, kid,
                        fields_hash, file_hash, issued_at, expires_at}
8  signature         = ECDSA-P256(manifest) with the issuer private key
9  store             = registry row + PDF + page-1 PNG snapshot + audit entry
```

`kid` is carried in the manifest so keys can be rotated without invalidating old documents.

## 4. Verification pipeline

```
 1 magic bytes (PDF/JPEG/PNG) + size ≤ 5 MB        → else UNABLE TO ASSESS
 2 SHA-256 of the uploaded bytes
 3 worker /analyze                                 → QR, OCR fields, metadata
 4 resolve doc_id: QR payload wins, else manual ID, else UNABLE TO ASSESS
 5 registry lookup                                 → absent  → NOT ISSUED
 6 issuer status                                   → suspended → UNVERIFIABLE
 7 ECDSA verify(manifest, signature, issuer pubkey) → invalid → FORGED
 8 status                                          → revoked → REVOKED, past expiry → EXPIRED
 9 file_hash == registry file_hash                 → equal   → GENUINE (High)
10 bytes differ, so run forensics:
   10a QR/content consistency  → cert number + ≥1 other key field changed → FORGED
                                 (a genuine QR pasted onto rebuilt content)
   10b OCR key fields vs registry (normalised fuzzy match, critical vs secondary)
   10c visual diff vs the issue-time snapshot (SSIM + red-box heatmap)
   10d metadata signals  — SUPPORTING EVIDENCE ONLY, never decisive
11 compose:
      no field mismatch + SSIM ≥ 0.95                    → GENUINE COPY (High)
      no field mismatch + SSIM ≥ 0.72                    → GENUINE COPY (Medium)
      certificate_number + ≥1 critical field changed     → FORGED (High)
      any critical field changed or missing under good OCR → ALTERED (High)
      only secondary field changed                       → ALTERED (Medium)
      OCR unreadable and SSIM < 0.6                      → UNABLE TO ASSESS (Low)
12 persist verification + append hash-chained audit entry + generate the PDF report
```

Two checks are often conflated and are **not** the same thing:

| check | what it proves |
|---|---|
| `file_hash` comparison | this file is byte-identical to the recorded file |
| ECDSA signature | the registry record really came from that issuer |

## 5. Trust model

```
        issuer private key (keys/, git-ignored, mode 600, never leaves the server)
                    │  signs
                    ▼
   canonical manifest ──────────────► issuer_keys.public_key_pem  (in the DB)
                    │                          │
                    │  anchors                  │  verifies
                    ▼                          ▼
             documents row  ◄──────────  verification pipeline
                    │
                    └──► audit_log (prev_hash chain)
```

- **Trust anchor:** an issuer's public key in `issuer_keys`. Anything not anchored there is
  `UNVERIFIABLE` or `NOT ISSUED` — never "fake".
- **Key rotation:** `kid` on every manifest. Rotating means adding a new `issuer_keys` row and
  marking the old one `rotated`; old documents still verify against their original key.
- **Key compromise:** revoke the key row, and every document signed with it stops verifying.
  Production would keep the key in an HSM/KMS; this prototype uses env-configured files and
  says so openly.
- **Registry tampering:** the audit log is hash-chained
  (`entry_hash = SHA-256(prev_hash + canonical_event_json)`), so a rewritten entry is
  detected by `/api/admin/audit/integrity`. It is **tamper-evident, not immutable** — an
  attacker with database write access could recompute a chain; only external anchoring
  (e.g. publishing a Merkle root) would prevent that. Not implemented here.

## 6. Fail-safe behaviour

If the Python worker is down (`GET /api/health` → `worker: false`):

- issue flow: cannot render → the job fails cleanly at the render step;
- verify flow: **still returns a verdict**. Steps 1–9 are pure Node (hash, signature,
  registry, status), so GENUINE / FORGED / NOT ISSUED / REVOKED / EXPIRED all still work.
  The forensic steps are marked `skipped / unavailable`, the verdict for a hash mismatch
  becomes `ALTERED (Low)` with an explicit "forensics unavailable" reason, and the UI shows a
  sticky banner.

## 7. Data flow privacy

- The public endpoint returns only: issuer name, doc type, issued/expiry dates, status and a
  count. It never returns `file_hash`, the signature, the manifest or the full field set.
- Uploaded files are analysed, never modified, and are not retained in the registry — only
  the hash, verdict, evidence and optional heatmap are stored.
- All OCR and metadata text is sanitised (tags and control characters stripped, length
  capped) before it is stored or rendered, so document content cannot inject markup.

## 8. Threat model coverage

| attack | what stops it |
|---|---|
| edit the content of a real PDF | hash mismatch → OCR field diff + heatmap → ALTERED |
| build a fake from scratch | no registry record → NOT ISSUED |
| paste a genuine QR onto fake content | certificate number + key fields differ → FORGED (QR-content mismatch) |
| guess document IDs | UUID v4 + rate limiting on the public endpoint |
| tamper with a registry record | ECDSA signature fails → FORGED |
| tamper with the audit log | hash chain breaks → integrity check reports the entry |
| upload something malicious | magic-byte + size validation, random filenames, sanitised text, parameterized SQL |
| prompt-inject the explainer | no LLM decides anything; explanation is generated from the result JSON |
| stolen private key | revoke/rotate via `kid`; production answer is HSM/KMS |

## 9. Endpoints

| Method | Path | Auth |
|---|---|---|
| POST | `/api/auth/login` | — |
| GET | `/api/auth/me` | JWT |
| POST | `/api/issue/start` · GET `/api/issue/jobs/:jobId` | issuer |
| GET | `/api/issuer/documents` · `/documents/:docId` · `/dashboard` | issuer (own only) |
| POST | `/api/issuer/documents/:docId/revoke` | issuer (own only) |
| POST | `/api/verify/start` · GET `/api/verify/jobs/:jobId[/result]` | optional |
| GET | `/api/public/verify/:docId` · POST `/api/public/extract-qr` | none (rate limited) |
| GET | `/api/admin/audit` · `/api/admin/audit/integrity` · `/api/admin/issuers` | admin |
| POST | `/api/admin/issuers` | admin |
| GET | `/api/reports/:verificationId` | optional |
| GET | `/api/health` | — |
| GET | `/static/<dir>/<file>` | — |

Python worker (internal only): `/health`, `/render-certificate`, `/analyze`, `/diff-check`,
`/extract-qr`.
