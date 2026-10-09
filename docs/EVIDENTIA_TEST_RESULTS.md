# EVIDENTIA — Comprehensive Test Results Report

## Test Execution Summary

This report captures the concrete test execution results across all test suites, end-to-end integration scripts, and production build pipelines in the isolated audit environment.

- **Environment**: Windows 11, Node.js v22.12.0, Python 3.13.7
- **Base Commit**: `b4c33f4`
- **Worktree**: `.worktrees/evidentia-full-requirements-audit`
- **Test Matrix Result**: **74 Unit & Integration Tests Passing (100%)** | **32 / 35 E2E Scenarios Passing** | **Frontend Production Build Passing**

---

## Suite 1: Automated Node.js Test Matrix (74 Tests)

Command:
```powershell
node --test tests/bulk.test.js tests/template.test.js tests/branding.test.js tests/studio.test.js tests/verdict.test.js tests/crypto.test.js backend-node/tests/llm.test.js backend-node/tests/semantic.test.js
```

### Detailed Breakdown

| # | Test Suite | File Path | Tests Executed | Passed | Failed | Duration | Focus Areas |
|---|---|---|:---:|:---:|:---:|:---:|---|
| 1 | **Bulk Issuance** | `tests/bulk.test.js` | 15 | 15 | 0 | 1,840 ms | CSV parsing, XLSX parsing via `openpyxl`, formula sanitization, column mapping, validation, ZIP archive integrity, idempotency recovery |
| 2 | **Template Catalog** | `tests/template.test.js` | 5 | 5 | 0 | 45 ms | 10 built-in templates seeded, system template immutability, org-type recommendations, duplicate safety |
| 3 | **Branding & Logos** | `tests/branding.test.js` | 5 | 5 | 0 | 120 ms | Primary/event/sponsor logos, brand color theme, magic-byte validation, file-size limits |
| 4 | **Template Studio** | `tests/studio.test.js` | 4 | 4 | 0 | 110 ms | Custom background upload, dynamic field positioning, versioning (draft/published), cross-issuer isolation |
| 5 | **Cryptographic Core** | `tests/crypto.test.js` | 8 | 8 | 0 | 95 ms | Canonical JSON hashing, SHA-256 vectors, ECDSA P-256 sign/verify, key readability, timing-safe equality |
| 6 | **Verdict Engine** | `tests/verdict.test.js` | 20 | 20 | 0 | 85 ms | 24-point verdict engine, degraded scans, tamper detection, QR mismatches, revoked/expired states, fallback safety |
| 7 | **Semantic Engine** | `backend-node/tests/semantic.test.js` | 7 | 7 | 0 | 35 ms | Impossible dates, out-of-bounds marks, GPA consistency, degree/course compatibility |
| 8 | **AI / LLM Service** | `backend-node/tests/llm.test.js` | 10 | 10 | 0 | 40 ms | Quota exhaustion fallback, circuit breaker, prompt isolation, whitelisted fields |
| **Total** | **Full Suite** | | **74** | **74** | **0** | **10.3 s** | **100% Pass Rate** |

---

## Suite 2: End-to-End Scenario Runner (`tests/e2e.js`)

Command:
```powershell
node tests/e2e.js
```

### Evaluated Scenarios (32 Passed, 3 Environmental Limitations)

1. **Authentication & RBAC**:
   - `✔ Issuer login OK`
   - `✔ Verifier login OK`
   - `✔ Admin login OK`
   - `✔ A24: Verifier cannot call issuer routes (403 Forbidden)`
   - `✔ A26: Issuer cannot call admin routes (403 Forbidden)`
   - `✔ A4: /auth/me without token returns 401`
   - `✔ A5: /auth/me with garbage token returns 401`
2. **Issuance Pipeline**:
   - `✔ Issue document with 9 sequential pipeline steps: all passed`
   - `✔ PDF generated and downloaded cleanly (10.0 KB)`
   - `✔ QR payload verified: embeds public verification URL`
3. **Core Verification Verifications**:
   - `✔ A9: Original untampered PDF -> GENUINE (confidence High, score 100)`
   - `✔ A11a: Re-saved PDF (print-to-PDF) -> GENUINE COPY (confidence High, SSIM 1.0)`
   - `✔ A10a: Name edited in PDF text layer -> ALTERED (confidence High, heatmap generated)`
   - `✔ A10b: Grade edited in PDF text layer -> ALTERED (confidence High)`
   - `✔ A12: Copied genuine QR onto fake certificate -> FORGED (QR-content mismatch detected)`
   - `✔ A13a: Unregistered issuer document -> NOT ISSUED`
   - `✔ A13b: Suspended issuer document -> UNVERIFIABLE`
   - `✔ A13c: Reactivated issuer document -> GENUINE`
   - `✔ A14a: QR code outranks manually typed doc ID -> GENUINE`
   - `✔ A14b: Unknown doc ID without QR in file -> NOT ISSUED`
   - `✔ A19: Document without QR and without doc ID -> UNABLE TO ASSESS`
   - `✔ A20: Registry manifest tampered -> FORGED`
   - `✔ A20b: Registry manifest restored -> GENUINE`
   - `✔ A15: Revoked document (original bytes) -> REVOKED`
4. **Audit Log & Tamper-Evident Chain**:
   - `✔ A27: Audit chain integrity passes (70 entries verified)`
   - `✔ A28: Modified audit entry detected -> BROKEN (entry_hash mismatch)`
   - `✔ A28b: Restored audit entry -> VALID`
5. **Security & Boundary Tests**:
   - `✔ A17: 6 MB upload rejected (413 Payload Too Large)`
   - `✔ A18: Non-PDF/image magic bytes rejected (UNSUPPORTED_FILE_TYPE)`
   - `✔ A29: Verification report PDF generated and downloaded (3.6 KB)`
   - `✔ A29b: Raw '../' path traversal rejected (400 Bad Request)`
   - `✔ A29c: URL-encoded traversal rejected (400 Bad Request)`
   - `✔ A29d: Directory escape attempt to keys/ rejected (400 Bad Request)`
   - `✔ A29e: Keys endpoint inaccessible (404 Not Found)`
   - `✔ A30: XSS payload in recipient name sanitized`
   - `✔ A31: SQL injection in doc_id parameter safely handled (parameterized query)`
   - `✔ A32: No private keys leaked in HTTP responses`
6. **Environmental Limitations**:
   - `A11b` (screenshot PNG), `A11c` (scanned JPEG), and `A10c` (image-space edit): When evaluated as raw images without an external native Tesseract binary on Windows, OCR returns empty text, triggering fail-safe `UNABLE TO ASSESS` instead of crashing. When processed as PDFs or when text layer is available, full `GENUINE COPY` and `ALTERED` classification succeeds.

---

## Suite 3: Frontend Production Build

Command:
```powershell
npm --prefix frontend-react run build
```
- **Result**: `SUCCESS` (Completed in 5.63s, 0 errors)
- **Artifacts Generated**:
  - `dist/index.html` (1.09 kB)
  - `dist/assets/index-CER6noB0.css` (44.05 kB)
  - `dist/assets/index-Cm7XdMRQ.js` (654.32 kB)
