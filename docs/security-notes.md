# Agnitia — Security Notes

Everything below is either implemented (with the test that proves it) or explicitly listed as
a limitation. Nothing is aspirational.

## 1. Cryptography

| item | implementation |
|---|---|
| Hashing | SHA-256 via Node built-in `crypto` |
| Signing | ECDSA on P-256 (`prime256v1`), `dsaEncoding: 'der'`, over a **canonical** manifest |
| Canonical JSON | recursive key sorting, no whitespace, `undefined` dropped — so key order can never change a hash or break a signature |
| Comparison | `crypto.timingSafeEqual` for hash/signature equality, length-guarded |
| Key rotation | `kid` in every manifest; `issuer_keys.status` = active/rotated/revoked |
| Third-party crypto | **none** — no custom primitives, no crypto libraries |

Tests: `tests/crypto.test.js` (8 tests) covers key-order independence of the canonical form, a
known SHA-256 vector, sign/verify round-trip, tampered-manifest rejection, wrong-key
rejection, malformed-signature handling without throwing, and `0600` permissions on the
private key file.

## 2. Key handling

- Private keys live in `keys/` (git-ignored), written with mode `0600`, path from `KEYS_DIR`.
- Only the **public** key PEM is stored in the database (`issuer_keys.public_key_pem`);
  `private_key_path` stores a path, never key material.
- Test `A32` asserts that no API response — login, issue job, verification result, public
  record, document list — contains the string `PRIVATE KEY`.
- `server.js` rejects any request path containing `/keys/` or ending in `.pem` before routing.
- Private keys are never logged. The audit log stores `kid`, never key bytes.

**Limitation (stated openly):** file-based keys are fine for a hackathon, not for production.
The production answer is an HSM/KMS with the signing operation performed inside the boundary.

## 3. Authentication & authorisation

- bcrypt (10 rounds) password hashing; JWT HS256 with a 12 h expiry, `JWT_SECRET` from env.
- Login compares against a dummy hash when the user does not exist, so a missing account and a
  wrong password behave the same way.
- **Server-side** role checks on every protected route (`requireAuth`, `requireRole`).
- Issuers are scoped to their own rows: every document query carries
  `WHERE issuer_id = @issuer_id`. Test `A25`/`ownDoc` covers a second issuer trying to act on
  another issuer's document.
- Only `/api/public/*` and `/api/health` are unauthenticated. Verification accepts an optional
  token so anonymous third parties can verify.

Tests: `A4` (no token → 401), `A5` (garbage token → 401), `A24` (verifier on an issuer route →
403), `A26` (issuer on an admin route → 403).

> Router note: the issuer router is mounted at `/api/issue` and `/api/issuer`, **not** at
> `/api`. Mounting it at `/api` would run its `requireRole('issuer')` guard on every request,
> which is exactly the bug that was found and fixed while building this.

## 4. Uploads

- Magic-byte validation (`%PDF-`, `FF D8 FF`, `89 50 4E 47`) — the extension is not trusted.
- Hard size cap (`MAX_UPLOAD_MB`, default 5 MB) enforced by multer **and** re-checked in the
  service.
- Extension whitelist at the multer filter (`.pdf .png .jpg .jpeg`).
- Memory storage; nothing is written to the upload folder by the verify path, and random
  filenames are used for anything persisted.
- All stored artifacts live under `backend-node/storage/`, outside the frontend source tree,
  and are served read-only with `X-Content-Type-Options: nosniff`.

Tests: `A17` (6 MB → 413), `A18` (a `.txt` renamed to `.pdf` → `UNABLE TO ASSESS`, pipeline
stops at validation).

## 5. Injection

- **SQL:** every statement is parameterized (`@named` bindings in better-sqlite3). There is no
  string-concatenated query in the codebase. Test `A31` passes `' OR 1=1 --` as a `doc_id` and
  gets a clean `NOT ISSUED` with no SQL error.
- **XSS:** all OCR/metadata/user text passes through `sanitizeText` (strips tags, then stray
  angle brackets, then control characters, then caps length) before storage or rendering.
  Test `A30` issues a certificate named `<script>alert(1)</script>Bob` and the stored value is
  `alert(1)Bob`.
- **Path traversal:** `/api/reports/:id` accepts a positive integer only and re-joins
  `basename`; `/static` is a plain `express.static` on one directory with `dotfiles: 'deny'`.
  Tests `A29b` (`../` normalised away → 404) and `A29c` (encoded traversal → 400).

## 6. Rate limiting & enumeration

- `express-rate-limit` on `/api/public/*`: 30 requests / 10 min / IP by default
  (`RATE_LIMIT_PUBLIC_MAX`, `RATE_LIMIT_PUBLIC_WINDOW_MS`).
- Login: 10 attempts / min / IP.
- Document IDs are UUID v4, so a useful ID cannot be guessed or enumerated.
- `trust proxy` is enabled so the limiter keys correctly behind a tunnel.
- Verified manually: with `RATE_LIMIT_PUBLIC_MAX=5`, requests 1–5 return `200` and 6–8 return
  `429`.

`RATE_LIMIT_DISABLED=true` exists **only** so the automated suite can run without starving
itself inside one window; it prints a warning at boot and must not be set in real use.

## 7. Transport & headers

- `helmet` enabled (CSP disabled because the SPA is served from the same origin with inline
  Vite assets; `crossOriginResourcePolicy: cross-origin` so the QR page can load its images).
- CORS restricted to `ALLOWED_ORIGINS`, plus `*.ngrok-free.app` / `*.trycloudflare.com` for
  the demo tunnel.
- The demo must run over the tunnel's HTTPS URL, not `http://localhost`.

## 8. Audit log integrity

```
prev_hash(genesis) = SHA-256("AGNITIA-GENESIS")
entry_hash         = SHA-256(prev_hash + canonicalize(event))
```

`GET /api/admin/audit/integrity` recomputes the whole chain and returns
`{valid, entries_checked, broken_at, reason}`.

Tests: `A27` (valid on a clean log), `A28` (rewrite one `detail_json` → `valid:false` with the
exact `broken_at` id), `A28b` (restore → valid again).

**Honest wording:** this is **tamper-evident, not immutable**. An attacker with write access
to the database could recompute a whole chain. Preventing that needs external anchoring
(publishing a Merkle root somewhere the attacker cannot rewrite), which is future scope here.

## 9. Privacy

- Synthetic data only; no real personal data anywhere in the repo or the demo.
- The public page returns the minimum needed to identify a record and a warning; it never
  exposes `file_hash`, the signature, the manifest or the full field set (test `A22`).
- The verify path stores the uploaded file's hash, verdict, evidence and optional heatmap —
  not the uploaded document itself.
- OCR/metadata text is capped in length before storage.

## 10. Threats that are NOT covered (say these out loud)

1. **Trust anchor.** Only registered issuers can be verified. An unknown issuer returns
   `UNVERIFIABLE`/`NOT ISSUED` — which is honest, but it means the platform cannot vouch for
   documents it has never seen.
2. **Exact hash match** only works on the exact original file.
3. **`GENUINE COPY` is a heuristic.** It rests on OCR plus visual similarity. A skilled edit
   that OCR cannot read and that leaves the layout almost identical can be mislabelled.
4. **A very small, targeted edit** that OCR still reads as the original value can be missed.
   During evaluation one date-only edit was initially mislabelled; the rule was tightened
   (a registry field that OCR cannot find, under otherwise reliable OCR, now counts as a
   mismatch) and the set went to 40/40. That is one dataset, not a guarantee.
5. **Metadata** is trivially editable and is used as supporting evidence only.
6. **Confidence** is a rule-based label (High/Medium/Low). It is not calibrated and is not a
   probability. `evidence_score` is a weighted count of passed checks, labelled as such.
7. **SQLite** is single-node; there is no replication, no backup strategy, no HA.
8. **Key storage** is file-based (see §2).
9. **No blockchain anchoring** — deliberately. The core verdict does not need it.
10. **This is an automated verification aid, not a legal certificate of authenticity.**
