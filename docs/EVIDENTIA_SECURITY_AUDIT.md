# EVIDENTIA — Application Security Audit Report

## Security Audit Overview

This report details the static and dynamic application security audit conducted on the **EVIDENTIA Secure Digital Document Verification Platform**. The audit assessed authentication, authorization (RBAC & IDOR), cryptographic key management, input validation, upload handling, injection threats, and audit logging.

- **Target System**: EVIDENTIA API (Node.js/Express) + Python Forensic Worker (FastAPI) + SQLite
- **Audit Environment**: `.worktrees/evidentia-full-requirements-audit`
- **Audit Date**: 2026-10-10

---

## 1. Authentication & Session Security

| Security Control | Implementation Details | Test Evidence | Verdict |
|---|---|---|:---:|
| **Password Hashing** | Uses `bcrypt` with salt rounds = 10 for all stored credentials (`users.password_hash`). | Verified in `routes/auth.js` | **PASS** |
| **Token Handling** | JWT tokens with configured expiry (`JWT_EXPIRES_IN=12h`), signed with server-side `JWT_SECRET`. | Tested `/api/auth/me` with expired & malformed tokens | **PASS** |
| **Anonymous Verification** | Verification endpoint `/api/verify/start` allows anonymous verification (`optionalAuth`), but records verifier user ID when authenticated. | Verified anonymous verify vs authenticated verify | **PASS** |

---

## 2. Authorization & Tenant Isolation (RBAC & IDOR)

| Security Control | Implementation Details | Test Evidence | Verdict |
|---|---|---|:---:|
| **Server-Side RBAC** | Middleware `requireAuth` and `requireRole(...)` guards every sensitive API endpoint. | e2e test A24 & A26: Verifiers calling issuer routes get `403`; Issuers calling admin routes get `403`. | **PASS** |
| **Cross-Issuer Isolation** | All document, batch, branding, and template queries are hard-scoped to the authenticated session's `issuer_id` (`WHERE issuer_id = ?`). Issuers cannot query or download batches belonging to another issuer. | Tested cross-tenant batch download in `tests/bulk.test.js`: returns `403 Forbidden`. | **PASS** |
| **Template Immutability** | System templates (`is_system = 1`) cannot be edited or deleted by issuers (`403 Forbidden: Cannot modify system template`). Custom templates (`is_system = 0`) can only be modified by their owner. | `tests/template.test.js` & `tests/studio.test.js` pass. | **PASS** |

---

## 3. Cryptography & Key Management

| Security Control | Implementation Details | Test Evidence | Verdict |
|---|---|---|:---:|
| **Signature Algorithm** | ECDSA over the NIST P-256 curve with SHA-256 (`ECDSA-P256-SHA256`). Standard Node.js `crypto` library implementation. | `tests/crypto.test.js`: 8/8 tests pass. | **PASS** |
| **Canonical Serialization** | Field hashing relies on deterministic key-sorted JSON without whitespace. Eliminates JSON serialization malleability. | Verified key-order independence at all nesting depths. | **PASS** |
| **Private Key Custody** | Private keys are saved to the filesystem (`keys/`) with path references in `issuer_keys`. Private keys are never returned in API responses or stored in database columns. | e2e test A32: zero private key leakage in responses. | **PASS** |
| **Private Key Endpoint Blocking** | Global Express middleware blocks any request attempting to access `/keys/` or files ending in `.pem`. | e2e test A29e: returns `404 Not Found`. | **PASS** |

---

## 4. Input Validation, Uploads & Path Safety

| Security Control | Implementation Details | Test Evidence | Verdict |
|---|---|---|:---:|
| **Magic-Byte Sniffing** | Validates true file format against binary magic bytes (`%PDF-`, `\x89PNG`, `\xFF\xD8\xFF`). Spoofed file extensions are caught immediately. | e2e test A18: returns `UNSUPPORTED_FILE_TYPE`. | **PASS** |
| **File-Size Limits** | Enforced 5 MB maximum upload limit (`maxUploadMb`) via Multer. | e2e test A17: 6 MB upload returns `413 Payload Too Large`. | **PASS** |
| **Path Traversal Protection** | Express middleware rejects any request path containing `..` (`BAD_PATH`). Zip generator strictly checks filenames against `..` and relative escapes. | e2e tests A29b, A29c, A29d: returns `400 Bad Request`. `tests/bulk.test.js` zip safety passes. | **PASS** |
| **Formula Injection** | Spreadsheet outcome reports prepend a single quote (`'`) to cells starting with `=`, `+`, `-`, or `@`. | `tests/bulk.test.js`: formula injection sanitization passes. | **PASS** |

---

## 5. SQL Injection & Database Safety

| Security Control | Implementation Details | Test Evidence | Verdict |
|---|---|---|:---:|
| **Parameterized Queries** | 100% of SQLite database interactions use `better-sqlite3` parameterized statements (`?`). No string concatenation in SQL queries. | e2e test A31: SQLi string in `doc_id` handled as harmless literal. | **PASS** |
| **Concurrency & Locks** | Enabled WAL mode (`journal_mode = WAL`) and SQLite busy timeout (`busy_timeout = 5000`) to prevent database concurrency deadlocks during parallel workers. | Verified during parallel bulk tests and background execution. | **PASS** |

---

## 6. Audit Trail & Hash-Chaining

| Security Control | Implementation Details | Test Evidence | Verdict |
|---|---|---|:---:|
| **Tamper-Evident Chain** | Each audit log entry calculates `entry_hash = SHA-256(prev_hash + user_id + action + target_id + detail_json + created_at)`. | e2e test A27: 70 sequential audit entries verified. | **PASS** |
| **Tamper Detection** | Modifying any past entry breaks the hash chain upon verification. | e2e test A28: flipped byte detected as `BROKEN`. A28b: restored entry valid. | **PASS** |

---

## 7. AI & Forensic Isolation Safeguards

| Security Control | Implementation Details | Test Evidence | Verdict |
|---|---|---|:---:|
| **Prompt Injection Defense** | Document text is never passed directly into the LLM prompt. Only structured, non-document evidence fields (`verdict`, `confidence_level`, `issuer_name`, `hash_match`, `reasons`) are sent to the AI service. | Verified in `services/llm.service.js`. | **PASS** |
| **Deterministic Authority** | The deterministic rule engine (`verdict.engine.js`) has exclusive authority over verdicts. The AI service is strictly explanatory and advisory. | Verified across all test suites. | **PASS** |
| **Quota & Network Resilience** | Circuit breaker and fallback mechanisms in `llm.service.js` automatically revert to deterministic summary when the Gemini quota is exceeded or offline. | Verified with live quota exhaustion response. | **PASS** |
