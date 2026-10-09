# EVIDENTIA — Release Readiness Assessment

## Release Recommendation: CONDITIONAL GO

The **EVIDENTIA Secure Digital Document Verification Platform** is recommended for **CONDITIONAL GO** release for local, staging, and demo deployments.

---

## 1. Readiness Summary

| Evaluation Area | Status | Remarks |
|---|:---:|---|
| **Core Digital Signature Engine** | **READY** | Canonical JSON hashing and ECDSA P-256 signatures verified. |
| **Certificate Templates** | **READY** | All 10 built-in templates render deterministically in ReportLab; Hackathon certificates support full multi-logo branding. |
| **Custom Template Studio** | **READY** | Drag-and-drop field positioning, draft/publish versioning, and RBAC isolation operational. |
| **Bulk Certificate Issuance** | **READY** | Excel (.xlsx) and CSV upload, openpyxl parsing, dynamic column mapping, preview validation with zero side effects, individual PDF generation, safe ZIP packaging, and idempotency recovery verified. |
| **Online Verification Pipeline** | **READY** | Multi-channel verification (QR code, uploaded document, and document ID) fully verified. |
| **Deterministic Verdict Engine** | **READY** | 24-point verdict engine acts as the sole authoritative judge; AI is strictly advisory. |
| **Audit Log Integrity** | **READY** | Tamper-evident hash chaining with automatic tamper detection verified. |
| **Frontend Production Build** | **READY** | React application builds cleanly with zero errors (5.63s build time). |
| **Security Controls** | **READY** | Path traversal protection, SQL parameterization, magic-byte checking, and private key isolation verified. |
| **Host Image OCR** | **CONDITIONAL** | PDF text extraction is native; rasterized image OCR requires host Tesseract binary in container image. |

---

## 2. Deployment Prerequisites

1. **Environment Configuration**:
   - Ensure `keys/` directory exists and has appropriate filesystem permissions (`chmod 700 keys`).
   - Configure environment variables in `.env`:
     ```env
     PORT=4000
     JWT_SECRET=<strong-random-secret>
     PYTHON_WORKER_URL=http://127.0.0.1:8001
     PUBLIC_BASE_URL=https://verify.evidentia.io
     STORAGE_DIR=./storage
     DB_PATH=./evidentia.db
     ```
2. **Container / OS Dependencies**:
   - For complete image-space OCR coverage, ensure `tesseract-ocr` is installed on the host OS or Docker container:
     ```bash
     apt-get update && apt-get install -y tesseract-ocr tesseract-ocr-eng
     ```
3. **Database & Demo Keys**:
   - On first run, seed default database tables and generate active issuer keys:
     ```powershell
     node scripts/generate-keys.js
     node scripts/seed-demo.js
     ```

---

## 3. Local Startup Instructions

To launch the complete application locally across all three services:

1. **Start Python Forensic Worker**:
   ```powershell
   cd worker-python
   python -m uvicorn main:app --host 127.0.0.1 --port 8001
   ```
2. **Start Backend Node.js API**:
   ```powershell
   cd backend-node
   node server.js
   ```
3. **Start Frontend Dev Server**:
   ```powershell
   cd frontend-react
   npm run dev
   ```
   Or access the production build served directly by the Node backend at `http://localhost:4000`.

---

## 4. Test Verification Commands

To verify all test suites locally:
```powershell
# Run all automated test suites (74 tests)
node --test tests/bulk.test.js tests/template.test.js tests/branding.test.js tests/studio.test.js tests/verdict.test.js tests/crypto.test.js backend-node/tests/llm.test.js backend-node/tests/semantic.test.js

# Run full end-to-end scenario runner
node tests/e2e.js

# Verify frontend build
npm --prefix frontend-react run build
```
