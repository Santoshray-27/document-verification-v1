# Agnitia — *Proof in Every Pixel*

**Secure Digital Document Verification Platform.** Check if a document is real, changed or fake.

The issuer signs each document at creation and stores a record in a registry. Anyone can then
check a file — or scan its QR — and get a **verdict**, a **confidence level**, the **reasons**,
and a **heatmap** showing exactly where something changed.

The verdict is produced by deterministic cryptography and rules. **No AI model decides it.**

---

## What it does

| verdict | meaning |
|---|---|
| `GENUINE` | byte-for-byte the file the issuer signed |
| `GENUINE COPY` | content unchanged, bytes differ — a re-save, scan or screenshot |
| `ALTERED` | key content differs from what the issuer signed |
| `FORGED` | signature failed, or a genuine QR sits on rebuilt content |
| `NOT ISSUED` | no registry record for that document ID |
| `UNVERIFIABLE` | the issuer cannot be vouched for right now — **not** "fake" |
| `REVOKED` / `EXPIRED` | withdrawn by the issuer / past its validity |
| `UNABLE TO ASSESS` | not enough readable evidence to decide either way |

Confidence is only ever **High / Medium / Low**. There are no invented percentages anywhere in
this project.

---

## Stack

| layer | |
|---|---|
| Frontend | React 18 · Vite 5 · TailwindCSS 3 · Framer Motion · lucide-react · jsQR |
| Brain | Node 20 · Express 4 · better-sqlite3 · built-in `crypto` (**ECDSA P-256 + SHA-256**) · multer · bcryptjs · jsonwebtoken · pdfkit · helmet · express-rate-limit |
| Muscle | Python FastAPI · ReportLab · PyMuPDF · pytesseract + Tesseract · OpenCV · scikit-image · qrcode |

Node owns the database, the keys and the verdict. Python only renders, extracts and compares —
it has **no DB access, no private keys and no verdict logic**. The frontend never talks to
Python directly.

---

## Quick start

```bash
# 0. system dependency (OCR)
sudo apt-get install -y tesseract-ocr      # macOS: brew install tesseract

# 1. install
npm  --prefix backend-node   install
npm  --prefix frontend-react install
pip  install -r worker-python/requirements.txt

# 2. keys + database + demo users
cp backend-node/.env.example backend-node/.env
node scripts/generate-keys.js
node scripts/init-db.js
node scripts/seed-demo.js

# 3. Python worker (terminal 1)
cd worker-python && python3 -m uvicorn main:app --host 127.0.0.1 --port 8001

# 4. Node API (terminal 2)
npm --prefix backend-node start            # http://localhost:4000

# 5a. UI in dev mode (terminal 3) — proxies /api to :4000
npm --prefix frontend-react run dev        # http://localhost:5173

# 5b. or serve the built UI from Node (one port, one origin)
npm --prefix frontend-react run build
npm --prefix backend-node start            # http://localhost:4000
```

### Demo credentials

Password for all three: **`Agnitia@123`** (from `DEMO_PASSWORD`).

| role | email | can |
|---|---|---|
| issuer | `issuer@agnitia.io` | issue, list and revoke documents |
| verifier | `verifier@agnitia.io` | verify documents |
| admin | `admin@agnitia.io` | audit log, integrity check, onboard issuers |

Verifying a document needs **no account at all**.

### Scanning the QR from a phone

The QR embeds `PUBLIC_BASE_URL`, so `localhost` will not open on a judge's phone:

```bash
ngrok http 4000                       # or: cloudflared tunnel --url http://localhost:4000
# put the https URL into backend-node/.env → PUBLIC_BASE_URL=...
# restart Node, then re-issue — already-issued PDFs keep the old URL inside them
```

---

## Tests

```bash
node --test tests/crypto.test.js tests/verdict.test.js   # 32 unit tests
node tests/e2e.js                                        # 33 end-to-end assertions
python3 eval/make_eval_set.py && node eval/run_eval.js    # 40-file evaluation
```

Latest real results (see `docs/evaluation.md`):

```
unit tests           32/32 pass
e2e assertions       33/33 pass
evaluation set       40/40 correct · 0 false alarms · 0 missed tampering
OCR field accuracy   83.3%
avg verification     5.8 s server-side   (target was < 5 s — MISSED, see docs/evaluation.md)
```

---

## Project layout

```
backend-node/       the brain: auth, crypto, verdict, registry, audit, reports
  src/services/     crypto · issue · verification · verdict.engine · audit · report · worker.client
  src/routes/       auth · issuer · verify · public · admin · report
worker-python/      the muscle: template · pdf · ocr · qr · diff · metadata
frontend-react/     React UI: landing · login · issuer · verifier · public · admin
scripts/            generate-keys · init-db · seed-demo
tests/              crypto.test.js · verdict.test.js · e2e.js (+ tamper helpers)
eval/               make_eval_set.py · run_eval.js · labels.csv · results.json
samples/            demo files: genuine · altered · forged · copies · revoked · unverifiable
docs/               architecture.md · security-notes.md · evaluation.md
keys/               ECDSA private keys — GIT-IGNORED, mode 600, never served or logged
```

---

## Configuration (`backend-node/.env`)

| key | default | notes |
|---|---|---|
| `PORT` | `4000` | |
| `PUBLIC_BASE_URL` | `http://localhost:5173` | **this goes inside the QR** — use your tunnel URL for phone scanning |
| `PYTHON_WORKER_URL` | `http://127.0.0.1:8001` | internal only |
| `KEYS_DIR` | `../keys` | git-ignored |
| `MAX_UPLOAD_MB` | `5` | |
| `RATE_LIMIT_PUBLIC_MAX` | `30` | per window per IP |
| `RATE_LIMIT_DISABLED` | `false` | **test mode only** — prints a warning when set |
| `DEMO_PASSWORD` | `Agnitia@123` | |

---

## 3-minute demo script

1. **Landing** — the problem in one line, no invented statistics.
2. **Issue live** — log in as the issuer, type the judge's name, watch all 9 steps animate
   (validate → UUID → QR → render → hash → sign → registry → audit → ready). Download the PDF.
3. **Verify the original** → `GENUINE` (High), full evidence checklist, 100/100.
4. **Verify `samples/altered/name-edited.pdf`** → `ALTERED` (High), heatmap red box on the
   name, expected-vs-detected table showing *Aarav Sharma* → *Rohan Verma*.
5. **Verify `samples/copies/screenshot.png`** → `GENUINE COPY` — bytes differ, content
   identical. Most systems get this wrong and call it tampering.
6. **Verify `samples/forged/copied-qr-fake.pdf`** → `FORGED` with *QR-CONTENT MISMATCH*: a
   genuine QR pasted onto rebuilt content.
7. **Phone** — the judge scans the QR (tunnel URL) → public page → the amber warning that a QR
   record is **not** proof the file is unchanged → upload from the phone.
8. **Revoke** → re-verify the same original bytes → `REVOKED`.
9. **Admin** → audit log → *Verify integrity* → "chain valid, N entries".
10. **Kill the Python worker** → verify again → still a verdict, forensic steps marked
    unavailable, amber banner in the UI.

Backups to prepare: a recorded run-through, the samples folder, and a manual `doc_id` in case
a QR will not read.

---

## Reuse and attribution

The cryptographic core, the canonical-JSON scheme, the verdict engine and the audit chain are
original to this project. The certificate-rendering approach (ReportLab + embedded QR) follows
the general pattern of public academic-certificate demos; no code was copied from another
repository into this tree. OpenCV, PyMuPDF, ReportLab, scikit-image, Tesseract, FastAPI,
Express, React and Tailwind are third-party libraries used under their own licenses, installed
from their official registries.

---

## Limitations (stated openly)

1. Only registered issuers can be verified — a trust-anchor problem shared by every such system.
2. An exact hash match only works on the exact original file.
3. `GENUINE COPY` detection is heuristic (OCR + visual similarity), not proof.
4. A small, targeted edit that OCR still reads as the original value can be missed.
5. Metadata is trivially editable → supporting evidence only.
6. Confidence is rule-based and **not calibrated**; it is not a probability.
7. The audit log is **tamper-evident, not immutable**.
8. Key storage is file-based — production needs an HSM/KMS.
9. Tested only on synthetic documents.
10. **This is an automated verification aid, not a legal certificate of authenticity.**

Full detail in [`docs/security-notes.md`](docs/security-notes.md).

---

## License

MIT — see `LICENSE`.
