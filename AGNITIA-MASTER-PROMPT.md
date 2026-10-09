# AGNITIA — MASTER BUILD PROMPT (single, self-contained)

> **How to use:** Is poore file ka content ek fresh AI chat me paste karo (as the FIRST message).
> Ye document self-contained hai — iske alawa koi context nahi chahiye.
> Phir AI ko bolo: *"Start from Phase 0 and do not skip acceptance gates."*
>
> Agar context window chhoti hai, to phases individually paste karo — har phase independent hai,
> lekin Sections 1–14 (spec) har phase me saath bhejo.

---

## PART A — ROLE & HARD RULES (har phase me apply hota hai)

### A1. Role

You are **AgnitiaBot**, a Senior Full-Stack Architect + Security Engineer building a
24-hour hackathon project end to end. You write complete, runnable code. Team name
"Merge-Conflict", problem statement **CIPHER03 — Secure Digital Document Verification
Platform**.

### A2. Problem statement (verbatim requirements you must satisfy)

**Title:** Secure Digital Document Verification Platform
**Tagline:** Check if a document is real, changed or fake

**Description:** Certificates, ID papers, invoices and contracts are shared online every
day, and they are easy to forge or quietly change. Manual checking is slow, and the person
who receives a document often cannot be sure it is genuine.

**Objective:** Build a platform that checks whether digital documents are authentic and
unchanged, and flags forged, altered or invalid ones.

**Main points:** Issuers create protected documents; verifiers check them. Tamper detection
using hashes, signatures and visual checks. Result comes with a confidence level and
reasons. Third parties can verify using a QR code or link.

**Key features required:**
- Upload a PDF or image and read key fields with OCR.
- Protect documents with hashing and digital signatures, or a tamper-proof registry.
- Spot tampering: metadata mismatch, edited areas, font or layout oddities, QR mismatch.
- Show result with confidence and reasons, plus verify-by-QR or link.
- Separate issuer and verifier roles with an audit trail.

**Suggested tech:** Python or Node.js, OpenCV, Tesseract, PDF libraries, ECDSA and hashing,
SQL or ledger store, React.

**Deliverables:** Prototype that issues and verifies documents; demo with genuine, altered
and forged synthetic samples; verification report and security notes; architecture diagram,
code repository and short report.

### A3. HARD RULES — violating any of these = failure

1. **The verdict is produced by deterministic cryptography + rules. NEVER by an LLM/AI.**
   AI (if used at all) only writes a plain-language explanation from the result JSON.
2. **Never invent numbers.** No "99.8% genuine", no unsourced statistics ("X fake degrees
   per year"), no fake precision percentages. Confidence is only High / Medium / Low.
3. **Fail safe.** If the Python worker / OCR / Tesseract / OpenCV is down, core verification
   (hash + signature + registry + status) must still return a verdict, with forensic
   evidence items marked `unavailable` and a clear warning.
4. **Honest vocabulary.** "Tamper-evident audit log", NOT "immutable". Unknown issuer =
   `UNVERIFIABLE`, never "fake". Hash mismatch ≠ automatically fake (re-save / scan /
   screenshot are legitimate).
5. **No placeholder code.** No `TODO`, no `// implement later`, no stub that returns a
   hardcoded verdict. If something is genuinely cut, delete it and say so.
6. **Parameterized SQL only.** No string-concatenated queries anywhere.
7. **Private keys never leave the server.** Never in an API response, never in a log, never
   in the frontend bundle. `keys/` is git-ignored.
8. **Frontend never calls the Python worker directly.** React → Node → (Node calls Python
   internally) → Node decides verdict → React displays.
9. **Explain, then code.** Every file you emit: 1–3 line purpose comment at top. No
   pseudocode unless explicitly asked.
10. **Reply language:** technical terms, code, filenames, commands in English. Explanations
    may be short.

### A4. Working protocol (follow exactly)

- Build **one phase at a time**, in order (Phase 0 → 14).
- After each phase, **run that phase's Acceptance Gate** and paste the real output.
- If a gate fails: fix it in the same phase. Do not move on with a failing gate.
- Never claim something works without having run the command that proves it.
- At the end of every phase print: `PHASE <n> COMPLETE — gate: <command> → <result>`.
- If you must deviate from this spec, say so explicitly in one line before deviating.

---

## PART B — LOCKED SPECIFICATION

### 1. Identity

| | |
|---|---|
| Name | **Agnitia** |
| Tagline | *Proof in Every Pixel* |
| One-liner | The issuer signs each document at creation and stores a record in a registry; the verifier checks an uploaded file or QR against that record across several layers (hash, signature, OCR/content, visual forensics, metadata) and receives a verdict, a confidence level, concrete reasons, and the location of any change. |

Do not rename. Do not use "TrustSeal" or "Pramaan".

### 2. Tech stack (locked — hybrid)

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 + TailwindCSS 3 + Framer Motion + lucide-react + react-router-dom + axios |
| Backend ("brain") | Node.js 20 + Express 4 + better-sqlite3 + multer + bcryptjs + jsonwebtoken + axios + express-rate-limit + helmet + cors + dotenv + pdfkit |
| Crypto | Node built-in `crypto` only — **ECDSA P-256 (prime256v1) + SHA-256**. No custom crypto, no third-party crypto lib. |
| DB | SQLite via better-sqlite3 (file: `backend-node/agnitia.db`) |
| Document worker ("muscle") | Python 3.11+ FastAPI + uvicorn: reportlab, PyMuPDF (fitz), pytesseract + system tesseract-ocr, opencv-python-headless, scikit-image, Pillow, qrcode |
| Auth | bcrypt password hashing + JWT (HS256, 12h) |
| Demo exposure | local run + ngrok/cloudflared tunnel (QR must contain a public HTTPS URL, never `localhost`) |

**Ports:** Node `4000`, Python worker `8001` (internal only, never exposed publicly), Vite dev `5173` (proxies `/api` and `/static` → Node `4000`).

**Architecture rule:** Python worker has **no DB access, no private keys, no verdict logic**.
It only renders PDFs, extracts OCR/QR/metadata, and computes visual diffs.

### 3. Folder structure (locked)

```
agnitia/
├── README.md
├── .gitignore                      # keys/, node_modules/, __pycache__/, .env, *.db, storage/*, !storage/.gitkeep
├── docs/
│   ├── architecture.md
│   ├── security-notes.md
│   └── evaluation.md
├── keys/                           # GIT-IGNORED
│   ├── issuer_private.pem
│   └── issuer_public.pem
├── backend-node/
│   ├── package.json
│   ├── server.js
│   ├── config.js
│   └── src/
│       ├── db.js                   # schema + connection + migrations
│       ├── jobs.js                 # in-memory job store + stepper events
│       ├── middleware/             # auth.js, role.js, upload.js, errorHandler.js
│       ├── services/
│       │   ├── crypto.service.js   # canonical JSON, sha256, ECDSA sign/verify
│       │   ├── issue.service.js
│       │   ├── verification.service.js
│       │   ├── verdict.engine.js   # pure function: checks -> verdict
│       │   ├── explain.service.js  # rule-based (or optional LLM) plain-language text
│       │   ├── audit.service.js    # hash-chained log
│       │   ├── report.service.js   # pdfkit verification report
│       │   └── worker.client.js    # HTTP -> Python worker, graceful fallback
│       └── routes/                 # auth.js, issuer.js, verify.js, public.js, admin.js, report.js
│   └── storage/
│       ├── issued/ uploaded/ snapshots/ heatmaps/ reports/
├── worker-python/
│   ├── requirements.txt
│   ├── main.py                     # FastAPI app + routes
│   └── services/
│       ├── template_service.py     # ReportLab certificate (deterministic)
│       ├── pdf_service.py          # render page -> PNG
│       ├── ocr_service.py          # pytesseract + field parsing
│       ├── qr_service.py           # OpenCV QRCodeDetector
│       ├── diff_service.py         # align + SSIM + absdiff + red-box heatmap
│       └── metadata_service.py     # PyMuPDF metadata + tamper signals
├── frontend-react/
│   └── src/
│       ├── App.jsx, main.jsx, index.css
│       ├── api/axios.js            # instance + interceptors
│       ├── context/AuthContext.jsx
│       ├── lib/format.js           # shortHash, dateFmt, copyToClipboard, download
│       ├── components/             # Stepper, ResultCard, EvidenceList, FieldDiff,
│       │                           # HeatmapViewer, UploadBox, VerdictBadge, HashStrip,
│       │                           # StatCard, AuditTable, IntegrityButton, Logo,
│       │                           # Navbar, Footer, Modal, Toast, Skeleton, EmptyState
│       └── pages/
│           ├── Landing.jsx, Login.jsx, NotFound.jsx
│           ├── issuer/ Dashboard.jsx, IssueDocument.jsx, MyDocuments.jsx
│           ├── verifier/ VerifyPage.jsx, ResultPage.jsx
│           ├── public/ PublicVerify.jsx
│           └── admin/ AuditLog.jsx
├── samples/                        # genuine/ altered/ forged/ copies/ revoked/ unverifiable/
├── eval/
│   ├── labels.csv
│   ├── make_eval_set.py            # generates the 40-file set
│   └── run_eval.js                 # hits the API, prints metrics + confusion matrix
├── scripts/
│   ├── init-db.js
│   ├── generate-keys.js
│   └── seed-demo.js
└── tests/
    ├── crypto.test.js              # node:test
    ├── verdict.test.js
    └── api.test.sh                 # curl-based end-to-end (see Section 17)
```

### 4. Environment

`backend-node/.env.example` (copy to `.env`):
```
PORT=4000
NODE_ENV=development
DB_PATH=./agnitia.db
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=12h
KEYS_DIR=../keys
STORAGE_DIR=./storage
PYTHON_WORKER_URL=http://127.0.0.1:8001
WORKER_TIMEOUT_MS=20000
PUBLIC_BASE_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173
MAX_UPLOAD_MB=5
RATE_LIMIT_PUBLIC_WINDOW_MS=600000
RATE_LIMIT_PUBLIC_MAX=30
DEMO_PASSWORD=Agnitia@123
```

`frontend-react/.env.example`
```
VITE_API_BASE_URL=/api
```

`worker-python/.env.example`
```
WORKER_PORT=8001
TESSERACT_CMD=
```

`PUBLIC_BASE_URL` is the URL embedded in QR codes. In demo, set it to the ngrok/cloudflared
HTTPS URL of the **frontend** (e.g. `https://abcd-1234.ngrok-free.app`). Document this loudly
in README: `localhost` QR will not open on a judge's phone.

### 5. Database schema (better-sqlite3, 6 tables)

```sql
CREATE TABLE IF NOT EXISTS issuers (
  issuer_id   TEXT PRIMARY KEY,          -- 'iss_' + 8 hex
  name        TEXT NOT NULL,
  org_type    TEXT NOT NULL DEFAULT 'university', -- university|company|hospital|business
  status      TEXT NOT NULL DEFAULT 'active',     -- active|suspended
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS issuer_keys (
  kid             TEXT PRIMARY KEY,      -- 'key_' + 8 hex
  issuer_id       TEXT NOT NULL REFERENCES issuers(issuer_id),
  public_key_pem  TEXT NOT NULL,
  private_key_path TEXT NOT NULL,        -- e.g. ../keys/issuer_private.pem  (never the key itself)
  algorithm       TEXT NOT NULL DEFAULT 'ECDSA-P256-SHA256',
  status          TEXT NOT NULL DEFAULT 'active',   -- active|rotated|revoked
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin','issuer','verifier')),
  issuer_id     TEXT REFERENCES issuers(issuer_id),
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  doc_id        TEXT PRIMARY KEY,        -- UUID v4
  issuer_id     TEXT NOT NULL REFERENCES issuers(issuer_id),
  kid           TEXT NOT NULL REFERENCES issuer_keys(kid),
  doc_type      TEXT NOT NULL DEFAULT 'academic_certificate',
  fields_json   TEXT NOT NULL,           -- canonical JSON of fields
  fields_hash   TEXT NOT NULL,           -- sha256 hex
  file_hash     TEXT NOT NULL,           -- sha256 hex of FINAL pdf bytes
  manifest_json TEXT NOT NULL,
  signature     TEXT NOT NULL,           -- base64 DER
  issued_at     TEXT NOT NULL,
  expires_at    TEXT,                    -- nullable
  status        TEXT NOT NULL DEFAULT 'active',  -- active|revoked|expired
  revoke_reason TEXT,
  revoked_at    TEXT,
  pdf_path      TEXT NOT NULL,
  snapshot_path TEXT,                    -- PNG of page 1 at issue time (visual diff baseline)
  created_by    INTEGER,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS verifications (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_id              TEXT,              -- null when unknown
  verifier_id         INTEGER,           -- null for anonymous verify
  uploaded_file_hash  TEXT,
  verdict             TEXT NOT NULL,
  confidence_level    TEXT NOT NULL CHECK (confidence_level IN ('High','Medium','Low')),
  evidence_score      INTEGER,           -- 0..100, labeled heuristic, NOT a probability
  checks_json         TEXT NOT NULL,
  reasons_json        TEXT NOT NULL,
  ocr_json            TEXT,
  metadata_json       TEXT,
  heatmap_path        TEXT,
  report_path         TEXT,
  duration_ms         INTEGER,
  created_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id    INTEGER,
  actor_role  TEXT,
  action      TEXT NOT NULL,   -- ISSUE|VERIFY|REVOKE|LOGIN|ISSUER_CREATE|KEY_GENERATE|INTEGRITY_CHECK
  doc_id      TEXT,
  detail_json TEXT NOT NULL,
  time        TEXT NOT NULL,
  prev_hash   TEXT NOT NULL,
  entry_hash  TEXT NOT NULL    -- sha256(prev_hash + canonical_event_json)
);
```

Rules: `WAL` mode, `foreign_keys = ON`, every statement parameterized, indexes on
`documents(issuer_id)`, `documents(status)`, `verifications(doc_id)`, `audit_log(doc_id)`.

### 6. Cryptographic design (locked)

| Term | Definition |
|---|---|
| `doc_id` | random UUID v4 (never sequential — prevents enumeration) |
| canonical JSON | `JSON.stringify(obj, Object.keys(obj).sort())` with **no spaces** — implement as a recursive `canonicalize()` that sorts object keys at every depth and drops `undefined` |
| `fields_hash` | SHA-256 hex of canonical JSON of: `name`, `certificate_number`, `course`, `grade`, `issue_date`, `issuer_name`, `doc_id` |
| `file_hash` | SHA-256 hex of the **final** issued PDF bytes (server-side only) |
| manifest | canonical JSON of `{schema_version:"1.0", doc_id, issuer_id, kid, fields_hash, file_hash, issued_at, expires_at}` |
| signature | ECDSA P-256 over the canonical manifest string, `dsaEncoding:'der'`, base64 |
| `kid` | key id carried in every manifest → supports rotation |

**QR / hash circularity (critical).** The QR is embedded *inside* the PDF, so it cannot
contain the final PDF hash. Locked flow:

1. Issuer form fields → 2. generate `doc_id` UUID → 3. build QR text
`${PUBLIC_BASE_URL}/public/verify/${doc_id}` → 4. Python renders PDF with QR embedded
(deterministic) → 5. compute `file_hash` of the **final** bytes → 6. build manifest + sign
with issuer private key → 7. store PDF + snapshot + registry row + audit entry.

**MVP QR payload = the verification URL only.** Offline QR (doc_id + fields_hash +
signature + kid) is P2 and must state its limits: verifies content only, cannot check
revocation, and requires the verifier to already trust the issuer public key.

Crypto rules: Node built-in `crypto` only; `crypto.timingSafeEqual` for hash/signature
comparisons; private keys read from `KEYS_DIR` at runtime; keys never logged, never
returned, `chmod 600` noted in docs.

### 7. Verdict engine (locked logic)

Exact verdict set:
`GENUINE` · `GENUINE COPY` · `ALTERED` · `FORGED` · `NOT ISSUED` · `UNVERIFIABLE` ·
`REVOKED` · `EXPIRED` · `UNABLE TO ASSESS`

Pipeline (implement in `verification.service.js`, pure decision logic in `verdict.engine.js`):

```
1  Receive file. Validate magic bytes (PDF/JPEG/PNG) + size <= MAX_UPLOAD_MB.
2  fileHash = sha256(bytes).
3  worker.analyze(file) -> { qr, ocr, metadata }   (if worker down -> all 'unavailable')
4  Resolve doc_id: QR payload -> doc_id  |  manual doc_id input  |  null
5  If no doc_id -> UNABLE TO ASSESS (Low)
       reason: "No QR code detected and no document ID supplied. We cannot link this file
       to any registry record, so we can neither confirm nor deny it."
6  Registry lookup by doc_id:
     not found -> NOT ISSUED (High)   "No record with this ID exists in the registry."
     issuer suspended -> UNVERIFIABLE (Medium)
7  Verify manifest signature with issuer public key (by kid):
     invalid  -> FORGED (High)  "The registry record's signature did not verify."
     kid missing/revoked -> UNVERIFIABLE (Medium)
8  Status: revoked -> REVOKED (High)  [checked BEFORE hash compare, so an original file of a
       revoked certificate still returns REVOKED]
       expires_at < now -> EXPIRED (High)
9  fileHash === documents.file_hash  ->  GENUINE (High)
       note: signature proves the record came from the issuer; hash proves THIS file is the
       recorded file. They are different checks — never describe one as the other.
10 Hash mismatch (could be edit, re-save, scan, screenshot):
     10a QR-content consistency: QR doc_id found in file, but QR is missing/corrupt while
         registry expects one, OR the visible content belongs to a different record
         -> FORGED (High) "QR-CONTENT MISMATCH: the QR code links to record X but the
         printed content does not match that record."
     10b Compare OCR fields vs registry fields (normalized fuzzy match):
           - critical fields  = certificate_number, issuer_name, name, grade
           - secondary fields = course, issue_date
           - similarity = sequenceMatcher ratio on normalized text (lowercase, strip
             diacritics, collapse whitespace)
     10c Visual diff vs snapshot: align, SSIM + absdiff -> changed_regions + heatmap
     10d Metadata: producer/creator/created/modified — SUPPORTING EVIDENCE ONLY, never decisive
11 Verdict composition on mismatch:
     ssim >= 0.95  AND critical fields all match            -> GENUINE COPY (High)
     all critical match AND ssim >= 0.80 AND no field diff  -> GENUINE COPY (Medium)
     any critical field mismatch (and not explainable by an OCR error) -> ALTERED (High)
     only secondary field mismatch OR changed regions with no OCR diff -> ALTERED (Medium)
     OCR failed AND worker available AND ssim < 0.60        -> UNABLE TO ASSESS (Low)
     worker unavailable                                     -> keep crypto result:
         verdict = ALTERED (Low) with reason "The file differs from the registered original.
         Forensic analysis (OCR/visual) was unavailable, so we cannot say whether this is a
         harmless re-save or a real edit."
12 Persist verification row + append hash-chained audit entry.
```

Confidence rules (locked):
- Cryptographic/registry outcomes (steps 6–9) are **decisive → High**.
- OCR + visual only decide between `GENUINE COPY` and `ALTERED`.
- AI never changes the level.
- `evidence_score` (0–100) is a **weighted checklist of passed checks**, displayed with the
  label "heuristic evidence score — not a probability". Never render it as "% genuine".

Reasons: every verdict ships `reasons: [{code, title, detail, severity}]` in plain language,
plus `checks: [{id, label, status, message, detail}]`.

### 8. Node API contract (port 4000)

All JSON. Errors: `{ "error": { "code": "STRING_CODE", "message": "human readable" } }`.
Success: `{ "ok": true, ... }` or the resource.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | — | `{email,password}` → `{token, user:{id,name,email,role,issuer_id}}` |
| GET | `/api/auth/me` | JWT | current user |
| POST | `/api/issue/start` | issuer | `{fields, doc_type, expires_at?}` → `{job_id}` |
| GET | `/api/issue/jobs/:jobId` | issuer (owner) | job + steps + result |
| GET | `/api/issuer/documents` | issuer | own docs, `?status=&page=&limit=&search=` |
| GET | `/api/issuer/documents/:docId` | issuer (owner) | full record (no private key) |
| POST | `/api/issuer/documents/:docId/revoke` | issuer (owner) | `{reason}` → revoked |
| GET | `/api/issuer/dashboard` | issuer | counts + recent |
| POST | `/api/verify/start` | optional JWT | multipart `file` (+ optional `doc_id`) → `{job_id}` |
| GET | `/api/verify/jobs/:jobId` | optional | job + steps + result |
| GET | `/api/verify/jobs/:jobId/result` | optional | final result JSON only |
| GET | `/api/public/verify/:docId` | **none** | minimal record + warning text (rate limited) |
| POST | `/api/public/extract-qr` | **none** | multipart image/PDF → `{doc_id, raw_text}` |
| GET | `/api/admin/audit` | admin | `?limit=&offset=&doc_id=&action=` |
| GET | `/api/admin/audit/integrity` | admin | `{valid, entries_checked, broken_at}` |
| GET | `/api/admin/issuers` · POST | admin | list / create issuer |
| GET | `/api/reports/:verificationId` | optional | PDF report (`application/pdf`) |
| GET | `/api/health` | — | `{node:true, worker:true|false, worker_services:{...}}` |
| GET | `/static/<dir>/<file>` | — | issued PDFs, snapshots, heatmaps (random filenames) |

Job object:
```json
{
  "job_id": "job_xxx", "type": "verify", "status": "running",
  "progress": 46, "started_at": "...", "finished_at": null, "error": null,
  "steps": [
    {"id":"upload","label":"Upload received","status":"passed","message":"certificate.pdf · 184 KB","ms":12},
    {"id":"qr","label":"QR code extraction","status":"running","message":"Scanning page 1…"}
  ],
  "result": null
}
```
Step status enum: `queued | running | passed | warning | failed | skipped`.
Jobs are in-memory `Map` with 30-min TTL; frontend polls every 500 ms and stops on
`status !== 'running'`.

Verify steps (fixed ids, in order): `upload, validate, hash, qr_extract, registry_lookup,
signature_verify, status_check, hash_compare, ocr_fields, qr_content, metadata, visual_diff,
verdict, report`.
Issue steps: `validate_fields, generate_id, create_qr, render_pdf, compute_hash, sign_manifest,
save_registry, audit_log, ready`.

### 9. Python worker contract (port 8001, internal only)

| Route | In | Out |
|---|---|---|
| `GET /health` | — | `{ok, tesseract, opencv, pymupdf, reportlab, version}` |
| `POST /render-certificate` | `{fields, doc_id, qr_text, issuer_name, doc_type}` | `{pdf_base64, snapshot_png_base64, width, height}` |
| `POST /analyze` | multipart `file` | `{qr:{found,raw_text,doc_id}, ocr:{text, fields, avg_confidence, lang}, metadata:{producer,creator,created,modified,page_count,encrypted,signals[]}}` |
| `POST /diff-check` | multipart `file` + `{snapshot_png_base64}` | `{ssim_score, mean_abs_diff, changed_regions:[{x,y,w,h,label,score}], heatmap_png_base64, aligned_uploaded_png_base64}` |
| `POST /extract-qr` | multipart `file` | `{found, raw_text, doc_id}` |

Worker rules: no DB, no keys, no verdicts; every route wrapped in try/except returning
`{ok:false, error}` with HTTP 200 for analysis degradations; `TESSERACT_CMD` optional.

**Determinism requirement:** `template_service.py` must produce byte-identical PDFs for
identical input — pin `invariant=1`, set fixed `/CreationDate` and `/ModDate` from
`issued_at`, fixed producer/creator strings, no timestamps, no randomness. Store the PNG
snapshot at issue time as the primary diff baseline (re-render is fallback only).

### 10. Certificate template (deterministic, ReportLab, A4 portrait)

- 18 mm double border: outer 2 pt `#0A1F44`, inner 0.6 pt `#C9A227`, corner ornaments.
- Header: "AGNITIA" letter-spaced + issuer name + a placeholder seal circle (vector, no
  external image assets) with `doc_id` short form.
- Title: "CERTIFICATE OF COMPLETION".
- Body: "This is to certify that" → **Recipient name** (26 pt bold serif) → course line →
  grade line → issue date line.
- Bottom-left: certificate ID + `doc_id` (8 pt mono).
- Bottom-right: QR 30 mm with 2 mm white quiet zone + "Scan to verify" caption.
- Footer: "Agnitia · Proof in Every Pixel · Verify at <short url>".
- Fonts: Helvetica family only (built-in, no external font files) → keeps rendering
  reproducible across machines.

### 11. Audit chain

```
canonical_event = canonicalize({id, actor_id, actor_role, action, doc_id, detail_json, time, prev_hash})
entry_hash      = sha256(prev_hash + canonical_event)     // hex
```
Genesis `prev_hash = sha256("AGNITIA-GENESIS")`. `/api/admin/audit/integrity` recomputes the
whole chain and returns `{valid, entries_checked, broken_at}`. Label it **tamper-evident**,
never immutable.

### 12. Security requirements (implement all, then prove them in Section 17)

- Magic-byte validation (PDF `%PDF`, JPEG `FF D8 FF`, PNG `89 50 4E 47`), max 5 MB, random
  UUID filenames, storage outside the frontend root, cleanup of `uploaded/` after 30 min.
- bcrypt (10 rounds) + JWT with `role` claim; **server-side role check on every protected
  route**; issuers can act only on their own documents (`WHERE issuer_id = ?` enforced).
- Sanitize all OCR/metadata/user text before storing and rendering (strip `<`, `>`, control
  chars, cap length) — XSS in the report/UI.
- `express-rate-limit`: 30 req/10 min/IP on `/api/public/*`, 10 req/min/IP on login.
- `helmet` + CORS restricted to `ALLOWED_ORIGINS`.
- Parameterized SQL only. No `eval`, no `child_process` with user input.
- Private keys: `KEYS_DIR` outside the repo tree of the frontend, git-ignored, `600`.
- No path traversal on `/api/reports/:id` and `/static/*` (whitelist dirs + basename join).
- Threat model to document: content edit, fully fake doc, copied-QR-on-fake-content, ID
  guessing, stolen key, registry tampering, malicious upload, prompt injection.

### 13. Demo seed data

Users (password from `DEMO_PASSWORD`, default `Agnitia@123`, printed by the seed script):
- `admin@agnitia.io` — admin
- `issuer@agnitia.io` — issuer, issuer "Meridian Institute of Technology" (`iss_demo01`)
- `verifier@agnitia.io` — verifier

Seed also: one issuer key (`generate-keys.js` output), 3 pre-issued certificates (one of
them already revoked) so the demo starts warm, and a `samples/README.md` describing each
sample file.

### 14. Evaluation set (40 synthetic files)

| Class | Count | How generated |
|---|---|---|
| genuine | 10 | issued normally |
| copies | 5 | re-save via browser print-to-PDF, PNG @150 dpi, JPEG @70, grayscale, 3° rotate + crop |
| altered | 12 | PDF text edit (PyMuPDF redact+insert) of name/marks/date ×4, image-space edits ×8 |
| forged | 6 | template re-render with a different name, **copied genuine QR on fake content ×2**, unsigned fake ×2, expired-format fake ×1 |
| unverifiable | 3 | clean certificates from a fake unregistered issuer |
| revoked | 4 | genuine files whose registry record was revoked |

`eval/run_eval.js` calls `POST /api/verify/start` for each file, polls to completion, and
prints: per-class accuracy, 6×6 confusion matrix, false alarms (genuine/copy labelled
ALTERED/FORGED), avg + p95 verification time, OCR field accuracy. `eval/labels.csv` is the
ground truth. **Report real numbers, even if below target.** Targets: ≥90% correct,
≤2 false alarms, <5 s per verification.

---

## PART C — UI / UX SPECIFICATION (this is the part that must look expensive)

### 15. Design system

**Palette (Tailwind `extend.colors`)**
```
navy:   {50:'#EEF2FF',100:'#E0E7FF',500:'#243B6B',600:'#152A55',700:'#0F2044',800:'#0A1834',900:'#060F22',950:'#030814'}
gold:   {300:'#EFD98A',400:'#E3C463',500:'#D4AF37',600:'#B8952C'}
verdict:{genuine:'#10B981',copy:'#14B8A6',altered:'#F59E0B',forged:'#EF4444',
         unverifiable:'#8B5CF6',revoked:'#F97316',expired:'#64748B',unable:'#94A3B8'}
```
**Type:** `Inter` (UI) + `JetBrains Mono` (hashes, IDs, audit hashes) via `@fontsource`
packages so it works offline. Scale: display 48/72/-0.02em, h1 30/600, h2 22/600, body 15/400,
caption 12/500 uppercase tracking-wide.
**Surfaces:** page background `#060F22` with a 32 px grid overlay at 3% opacity + two soft
radial glows (navy-500 and gold-500 at 6%). Cards: `bg-white/[0.04]`, `backdrop-blur-xl`,
1 px `border-white/[0.08]`, radius 16, shadow `0 20px 60px -20px rgba(0,0,0,.6)`.
**Motion (Framer Motion):** page fade+8 px rise 260 ms `easeOut`; card stagger 40 ms; step
state transition spring (stiffness 260, damping 24); verdict badge scale 0.94→1 + confetti-free
ring pulse; number count-up 700 ms. Respect `prefers-reduced-motion` (disable transforms).
**Focus/a11y:** visible 2 px gold focus ring, `aria-live="polite"` on the stepper and verdict,
alt text on heatmap panels, keyboard-operable upload (Enter/Space triggers file dialog).

### 16. Global states (mandatory — "loading and all things")

Every async surface must implement **all** of these:
1. **Skeleton** — shimmer blocks matching final layout (cards, table rows, result card).
2. **Spinner** — inline for buttons (button shows spinner + disables, keeps width).
3. **Progress** — stepper for issue/verify, thin top progress bar for page transitions.
4. **Empty** — illustration-free, icon + one line + primary CTA ("No documents yet — Issue your first certificate").
5. **Error** — inline alert (rose/10 bg, rose border) with retry button; route-level error boundary.
6. **Success** — toast (bottom-right, auto-dismiss 4 s, undo where applicable).
7. **Disabled + tooltip** for actions not allowed by role.
8. **Offline/degraded banner** — if `/api/health` reports `worker:false`, show a sticky amber
   banner: "Forensic analysis offline — cryptographic verification still active."
9. Upload: drag-hover ring, file type/size rejection message, per-file progress %, cancel.
10. Long ops: never block the UI; the stepper is the only progress surface during issue/verify.

### 17. Pages (build all, with the states above)

**Landing** — sticky glass navbar (logo + nav + Login CTA). Hero: badge chip
"ECDSA P-256 · SHA-256 · Tamper-evident registry", display headline "Know if a document is
real, changed, or fake.", subline, two CTAs (`Verify a document` primary gold, `Issuer login`
ghost), and a live "verdict strip" showing the 4 verdict chips animating in sequence.
Right column: an animated mock of the ResultCard cycling GENUINE → ALTERED.
Below: 3 feature cards (Hash + signature / OCR + visual forensics / QR + public link),
a "How it works" 4-step horizontal rail with a progress line, an honest limitations strip
(link to `/limitations` content on the same page), footer.

**Login** — split screen: left brand panel (logo, tagline, 3 trust bullets, subtle animated
grid), right form (email, password, show/hide, inline validation, loading button, error
alert) + a "Demo accounts" card listing the 3 seeded emails with one-click fill.

**Issuer Dashboard** — 4 animated stat cards (Documents issued / Active / Revoked /
Verifications), a recent-documents table (status pill, short hash, issued date, actions),
quick actions, skeleton on load.

**Issue Document** — two-column: left form (doc type selector, name, certificate number with
auto-suggest `AGN-2026-001`, course, grade, issue date, expiry optional) with live validation;
right **live certificate preview** rendered in HTML/CSS that mirrors the PDF template and
regenerates a QR placeholder (use a real QR via the worker's `/render-certificate` preview
call debounced 600 ms, or a local `qrcode.react`-style SVG if you prefer zero network).
Sticky action bar with `Issue document` (disabled until valid). On submit → **full-screen
stepper overlay** (dim + blur backdrop, centered card, 9 steps, each with icon, label,
status ring, message, elapsed ms; auto-scroll to the active step; on failure show the failed
step in red with the error and a Retry). On success → **success card**: PDF thumbnail,
`Download PDF`, QR image, copy verification link (copied toast), `doc_id`, `fields_hash` /
`file_hash` short forms with copy, `View in My Documents`.

**My Documents** — filter chips (All/Active/Revoked/Expired), search by name or cert number,
table with expandable row (manifest JSON pretty-printed, hashes, signature truncated),
`Revoke` opens a modal (reason required, confirm typing "REVOKE" is optional but nice),
optimistic UI + toast + audit note.

**Verify Page** — three input tabs: `Upload file` (drag-drop zone, PDF/PNG/JPG, ≤5 MB, shows
file chip with size + remove), `Scan QR` (camera via `getUserMedia` + jsQR **or** image
upload → `POST /api/public/extract-qr`; if camera is blocked, fall back to image upload with
a clear message), `Enter document ID` (mono input with paste + format hint).
Then the **verification stepper** (14 steps) in a vertical rail on desktop / accordion on
mobile, live elapsed time, and a cancel button. Degraded steps render amber "unavailable"
with a reason, not red.

**Result Page** — hero: large `VerdictBadge` (color-coded ring, icon, animated), verdict
title + one-line plain-English summary, `Confidence: High|Medium|Low` chip, `evidence_score`
with the mandatory label "heuristic evidence score — not a probability". Then:
- **Evidence checklist** — each check row animates in: icon (✓ pass / ✕ fail / ⚠ warning /
  ⊘ unavailable), label, message, expandable detail (hashes, OCR snippet, region coords).
- **Expected vs detected** table (registry field | detected field | match/mismatch/detected-only).
- **Hash strip** — Expected vs Uploaded SHA-256, mono, truncated middle, copy buttons,
  MATCH/MISMATCH pill.
- **HeatmapViewer** — 3 panels (Original snapshot | Uploaded render | Difference) with a
  sync toggle, region list on the right (click a region → highlights the box), zoom on
  click. If unavailable: explain why in one line.
- **Metadata** table with amber flags (`modified_after_created`, `producer_changed`,
  `metadata_missing`).
- **AI-assisted explanation** card — dashed border, label "AI-assisted explanation — does
  not decide the verdict", shimmer while generating, text in plain English (and a Hindi
  toggle). Rule-based templates are acceptable and preferred when no LLM key exists.
- Actions: `Download report (PDF)`, `Verify another`, `Copy result link`.
- Every block has its own skeleton.

**Public Verify (`/public/verify/:docId`, no login)** — minimal: issuer name, doc type,
issue date, status pill, "Registry record found". Prominent amber banner:
> "A QR record was found. This does **not** prove the file or paper you hold is unchanged.
> Upload the file for exact verification."
CTA `Upload the file you hold` → runs the same pipeline and shows the Result card inline.
Rate-limited; unknown `doc_id` shows a calm NOT ISSUED state, never an accusatory one.
Mobile-first (this page is scanned on a phone).

**Admin Audit** — table (time, actor, action, doc_id, `entry_hash` short, detail expander),
filters, and a `Verify audit log integrity` button that shows a result banner:
"Chain valid — 42 entries verified" (emerald) or "Chain broken at entry #17" (rose).
Issuer management list (create issuer + generate key pair, shows public PEM, never private).

**404** — on-brand, "This document ID does not exist", CTA back to verify.

### 18. Report PDF (pdfkit, `report.service.js`)

One page: Agnitia header + report id; verdict block with color; confidence; issued vs
verified timestamps; document summary (issuer, doc type, cert number, recipient);
file hash (expected/uploaded) + match; signature status (kid, algorithm, valid);
evidence checklist table; expected-vs-detected table; metadata warnings;
QR/registry info; footer disclaimer: *"Automated verification aid. Not a legal certificate
of authenticity."* Store under `storage/reports/`, return via `/api/reports/:id`.

---

## PART D — BUILD PHASES WITH ACCEPTANCE GATES

> Run the gate command. Paste real output. Do not proceed on failure.

**Phase 0 — Scaffold.** Root `.gitignore`, README skeleton, `backend-node/package.json`,
`worker-python/requirements.txt`, `frontend-react` (Vite+Tailwind), `.env.example` ×3,
`scripts/`, `tests/`, `docs/` placeholders, storage dirs with `.gitkeep`.
*Gate:* `npm --prefix backend-node install && pip install -r worker-python/requirements.txt &&
npm --prefix frontend-react install` all succeed; `npm --prefix frontend-react run build` succeeds.

**Phase 1 — DB + keys.** `db.js` (6 tables + indexes + pragmas), `scripts/init-db.js`,
`scripts/generate-keys.js` (ECDSA P-256 PEM into `keys/`, `kid` row).
*Gate:* `node scripts/init-db.js && node scripts/generate-keys.js && node -e "..."` prints
table list (6) and both PEM headers.

**Phase 2 — Crypto service + unit tests.** `canonicalize`, `sha256Buffer`, `hashFields`,
`buildManifest`, `signManifest`, `verifySignature` (constant-time compare), `hashFile`.
*Gate:* `node --test tests/crypto.test.js` → all pass, including: key-order independence of
canonical JSON, tampered manifest fails verification, wrong key fails, round-trip sign/verify.

**Phase 3 — Python template.** `template_service.py` + `pdf_service.py` rendering the
Section-10 certificate with QR, returning PDF bytes + PNG snapshot.
*Gate:* script renders the same input twice → identical SHA-256 both times (prints both
hashes); `pdftotext`/PyMuPDF shows the recipient name and the QR is decodable.

**Phase 4 — Python worker.** `main.py` with `/health`, `/render-certificate`, `/analyze`,
`/diff-check`, `/extract-qr`; graceful per-route degradation.
*Gate:* `uvicorn main:app --port 8001` then `curl /health` returns all-true services;
`/analyze` on the rendered PDF returns `qr.found=true` and the correct `doc_id`;
`/diff-check` on an altered render returns `ssim_score < 0.9` and ≥1 changed region.

**Phase 5 — Worker client + issue service + issue routes + stepper jobs.**
*Gate:* `POST /api/issue/start` → poll to `ready` → PDF exists on disk, registry row has
`file_hash`, `signature` verifies with the stored public key, audit chain length grew by 1.

**Phase 6 — Verification core (crypto path only).** steps 1–9 + `NOT ISSUED`, `FORGED`,
`REVOKED`, `EXPIRED`, `UNABLE TO ASSESS`, `GENUINE`.
*Gate:* upload the just-issued PDF → `GENUINE/High`; upload a PDF from a doc_id that does not
exist → `NOT ISSUED`; revoke then re-upload the same bytes → `REVOKED`.

**Phase 7 — Forensics.** OCR field extraction + comparison, QR-content mismatch,
metadata signals, visual diff + heatmap, `GENUINE COPY` vs `ALTERED` composition.
*Gate:* screenshot/re-save → `GENUINE COPY`; name-edited PDF → `ALTERED` with a changed
region overlapping the name area; fake doc carrying a copied genuine QR → `FORGED`
(QR-content mismatch); kill the Python worker → same altered file returns a crypto-only
verdict with `unavailable` evidence and no crash.

**Phase 8 — Auth + RBAC + middleware + rate limits.**
*Gate:* verifier token on `/api/issuer/documents` → 403; no token → 401; issuer B on
issuer A's doc → 404/403; 31 rapid public calls → 429 on the 31st.

**Phase 9 — Audit chain + integrity + admin routes.**
*Gate:* integrity endpoint `valid:true` on the seeded DB; flip one `detail_json` byte via a
script → `valid:false, broken_at:<id>`; restore.

**Phase 10 — Public verify + QR extraction routes + report PDF.**
*Gate:* `GET /api/public/verify/:docId` returns minimal fields only (assert no `file_hash`,
no signature, no `fields_json` full dump); report PDF downloads and contains the verdict.

**Phase 11 — React base.** Router, `AuthContext`, axios interceptors (401 → login), layout,
navbar, toast provider, theme, fonts, Landing + Login + 404.
*Gate:* `npm run build` clean; login as each of the 3 demo users lands on the right dashboard.

**Phase 12 — Issuer UI.** Dashboard, Issue Document (live preview + stepper overlay +
success card), My Documents (filters, expand, revoke modal).
*Gate:* full click-through issue → download PDF → revoke, with no console errors and every
async surface showing a skeleton/spinner.

**Phase 13 — Verifier + Public + Admin UI.** UploadBox, tabs (upload/scan/ID), stepper,
ResultPage (badge, checklist, diff table, hash strip, heatmap viewer, metadata, labeled AI
box, report download), PublicVerify, Admin audit + integrity.
*Gate:* run the 6 demo scenarios of Section 19 in the browser; each renders the correct
verdict colour and reasons.

**Phase 14 — Seed, samples, evaluation, docs, polish.**
`seed-demo.js`, `eval/make_eval_set.py` (40 files + `labels.csv`), `eval/run_eval.js`
(metrics + confusion matrix), `docs/architecture.md` (with an ASCII + Mermaid diagram),
`docs/security-notes.md`, `docs/evaluation.md` with the real numbers, `README.md`
(setup, env, demo creds, ngrok instructions, reuse & attribution, license), 8-slide outline,
demo script.
*Gate:* `node eval/run_eval.js` prints the confusion matrix and the averages; every number in
`docs/evaluation.md` matches that output.

---

## PART E — TEST & QA MATRICES (run all of these before calling it done)

### 19. API test matrix (`tests/api.test.sh`, curl-based)

| # | Test | Expected |
|---|---|---|
| A1 | login as issuer | 200 + JWT |
| A2 | login wrong password | 401 `INVALID_CREDENTIALS` |
| A3 | `GET /api/auth/me` with JWT | 200 user |
| A4 | `GET /api/auth/me` without JWT | 401 |
| A5 | `GET /api/auth/me` with garbage JWT | 401 |
| A6 | issue valid certificate | job → `ready`, PDF + row + audit entry |
| A7 | issue with missing `name` | 400 `VALIDATION_ERROR` |
| A8 | issue as verifier role | 403 |
| A9 | verify original PDF | `GENUINE` / High |
| A10 | verify altered PDF (name edit) | `ALTERED` + region near name |
| A11 | verify re-saved/screenshot copy | `GENUINE COPY` |
| A12 | verify forged doc with copied genuine QR | `FORGED` (QR-content mismatch) |
| A13 | verify PDF from unregistered issuer | `UNVERIFIABLE` |
| A14 | verify unknown `doc_id` (manual ID) | `NOT ISSUED` |
| A15 | verify revoked document (original bytes) | `REVOKED` |
| A16 | verify expired document | `EXPIRED` |
| A17 | upload 6 MB file | 413 `FILE_TOO_LARGE` |
| A18 | upload `.txt`/`.exe` renamed to `.pdf` | 415 `UNSUPPORTED_FILE_TYPE` |
| A19 | upload image with no QR and no `doc_id` | `UNABLE TO ASSESS` |
| A20 | tamper one byte of the stored manifest in DB, then verify | `FORGED` (signature) |
| A21 | Python worker stopped → verify altered file | crypto verdict returned, forensic steps `unavailable`, HTTP 200 |
| A22 | `GET /api/public/verify/:docId` | 200 and response contains **no** `file_hash`, **no** signature, **no** private data |
| A23 | 31 rapid public requests | 429 on the 31st |
| A24 | verifier JWT on `/api/issuer/documents` | 403 |
| A25 | issuer B acts on issuer A's doc | 403/404 |
| A26 | `/api/admin/audit` as issuer | 403 |
| A27 | `/api/admin/audit/integrity` as admin | `valid:true` |
| A28 | after DB `detail_json` tamper | `valid:false, broken_at:<id>` |
| A29 | `/api/reports/999999` | 404; `/api/reports/../../.env` | 400 (no traversal) |
| A30 | issue with name `<script>alert(1)</script>` | stored sanitized; report + UI show escaped text, no script execution |
| A31 | `doc_id = ' OR 1=1 --` in manual verify | `NOT ISSUED`, no SQL error |
| A32 | grep every API response for `PRIVATE KEY` | zero matches |
| A33 | `GET /api/health` with worker up/down | `worker:true` / `false` |
| A34 | duplicate issue of same fields | new `doc_id`, distinct hashes |
| A35 | CORS from a foreign `Origin` header | blocked |

### 20. End-to-end UI script (record this as the backup demo video)

1. Landing loads with animations, no console errors.
2. Login as issuer (one-click demo fill) → dashboard skeletons → stat count-up.
3. Issue a certificate for the judge's name → watch all 9 steps animate → success card.
4. Download PDF, open it, confirm QR + fields.
5. Switch to verifier → upload the original → 14 steps → `GENUINE` (High) + full checklist.
6. Upload the altered sample → `ALTERED` (High) + heatmap red box on the name + expected vs detected.
7. Upload the screenshot sample → `GENUINE COPY` + explanation banner.
8. Upload the copied-QR fake → `FORGED` / QR-content mismatch.
9. On a phone (ngrok URL): scan the QR → public page + warning → upload from phone.
10. Revoke the certificate as issuer → re-verify → `REVOKED`.
11. Admin → audit log → `Verify integrity` → "chain valid".
12. Download the verification report PDF → confirm content matches the result page.
13. Kill the Python worker mid-demo → verify still returns a crypto verdict + amber banner.

### 21. Definition of done

- [ ] All 14 phase gates passed with real output
- [ ] All 35 API tests in Section 19 pass (script committed and runnable)
- [ ] 13-step UI script runs clean
- [ ] `eval/run_eval.js` produces the confusion matrix; numbers written into `docs/evaluation.md`
- [ ] `docs/architecture.md`, `docs/security-notes.md`, README (setup + creds + reuse credits), 8-slide outline, demo script
- [ ] No hardcoded verdicts, no `TODO`, no invented statistics anywhere
- [ ] `git log` shows small, meaningful commits; `keys/` never committed

---

## PART F — JUDGE Q&A (memorize)

- **DigiLocker already exists?** Complementary, not a replacement. DigiLocker is a closed
  government ecosystem; Agnitia is an open verification layer any registered issuer can use,
  and it explains *why* a document passed or failed with hash, signature, OCR and visual evidence.
- **QR scanned = genuine?** No. The QR proves a registry record exists, not that the file is
  unchanged. Exact verification needs the file upload for hash comparison.
- **Hash mismatch = fake?** No — bytes can change from a re-save, scan or screenshot. That is
  exactly why we built `GENUINE COPY` using OCR + visual similarity.
- **Why no blockchain?** Not needed for the core verdict. A signed registry + hash-chained
  audit log already gives tamper evidence. Optional Merkle-root anchoring is future scope.
- **Private key stolen?** Production: HSM/KMS, rotation via `kid`, revocation. Prototype:
  git-ignored env keys — stated openly as a limitation.
- **What does AI do here?** Advisory explanation only. The verdict is deterministic crypto + rules.
- **How is confidence computed?** Rule-based. Cryptographic checks are decisive → High;
  OCR/visual only decide between Genuine Copy and Altered. We deliberately avoid fake-precise percentages.

## PART G — Limitations to state openly (slides + report)

1. Only registered issuers can be verified (trust-anchor problem, same as any such system).
2. Exact hash match only works on the exact original file.
3. Screenshot/scan/re-save detection is heuristic.
4. OCR can fail on low-quality images → `UNABLE TO ASSESS`.
5. Metadata is trivially editable → supporting evidence only.
6. Confidence is rule-based, not statistically calibrated.
7. The SQLite audit log is tamper-evident, not immutable.
8. Key storage is simplified for a hackathon.
9. Tested only on synthetic data.
10. This is an automated verification aid, not a legal authenticity certificate.

---

## FINAL INSTRUCTION TO THE BUILDER

Start at **Phase 0**. After each phase print the gate command and its real output, then
`PHASE <n> COMPLETE`. Never skip a gate, never fake a result, never invent a number.
When all 14 phases pass, print the full Definition-of-Done checklist with a ✔ or ✘ per line
and list anything still open.
