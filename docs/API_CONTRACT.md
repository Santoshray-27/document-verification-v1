# API Contract

## Global Configuration
- **Base URL:** `http://localhost:4000` (configurable via `PORT` and `PUBLIC_BASE_URL`)
- **Prefix:** `/api`
- **Health Endpoint:** `GET /api/health`
- **CORS:** Allowed origins configured via `ALLOWED_ORIGINS` env var. Localhost defaults included.
- **Upload Limits:** 5MB max (`MAX_UPLOAD_MB`)
- **Auth Mechanism:** Bearer Token (JWT) in Authorization header (`Authorization: Bearer <token>`). Tokens expire based on `JWT_EXPIRES_IN`.

## Required Env Vars
- `PORT` (default 4000)
- `DB_PATH`
- `JWT_SECRET`
- `KEYS_DIR`
- `STORAGE_DIR`
- `PYTHON_WORKER_URL`
- `PUBLIC_BASE_URL`

## Common Error Shape
```json
{
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human readable message"
  }
}
```

## Endpoints

### Auth (`/api/auth`)
- **POST `/login`**
  - **Body:** `{ "email": "...", "password": "..." }`
  - **Response:** `{ "ok": true, "token": "jwt...", "user": { "id": 1, "name": "...", "email": "...", "role": "...", "issuer_id": "iss_..." } }`
  - **Role:** Anonymous
- **POST `/register`**
  - **Body:** `{ "name": "...", "email": "...", "password": "...", "org_type": "university" }`
  - **Response:** `{ "ok": true, "token": "jwt...", "user": { ... } }`
  - **Role:** Anonymous
- **GET `/me`**
  - **Response:** `{ "ok": true, "user": { ... } }`
  - **Role:** Authenticated user

### Issuer (`/api/issuer` & `/api/issue`)
- **POST `/api/issue/start`**
  - **Body:** `{ "fields": { "name": "...", "certificate_number": "...", "course": "...", "grade": "...", "issue_date": "YYYY-MM-DD" }, "doc_type": "...", "expires_at": null }`
  - **Response:** `{ "ok": true, "job_id": "job_..." }`
  - **Role:** `issuer`
- **GET `/api/issue/jobs/:jobId`**
  - **Response:** Job status object
  - **Role:** `issuer`
- **GET `/api/issuer/documents`**
  - **Query:** `limit=25`, `offset=0`, `status`, `search`
  - **Response:** `{ "ok": true, "total": 10, "documents": [ ... ] }`
  - **Role:** `issuer`
- **GET `/api/issuer/documents/:docId`**
  - **Response:** `{ "ok": true, "document": { "doc_id": "...", "pdf_url": "...", "snapshot_url": "...", ... } }`
  - **Role:** `issuer`
- **POST `/api/issuer/documents/:docId/revoke`**
  - **Body:** `{ "reason": "..." }`
  - **Response:** `{ "ok": true, "doc_id": "...", "status": "revoked" }`
  - **Role:** `issuer`
- **GET `/api/issuer/dashboard`**
  - **Response:** `{ "ok": true, "counts": { ... }, "recent": [ ... ] }`
  - **Role:** `issuer`

### Public (`/api/public`)
- **GET `/verify/:docId`**
  - **Response:** Minimal public record for the document.
  - **Role:** Anonymous (Rate Limited)
- **POST `/extract-qr`**
  - **Form Data:** `file` (PDF/PNG/JPEG)
  - **Response:** `{ "ok": true, "found": true, "doc_id": "...", "raw_text": "..." }`
  - **Role:** Anonymous

### Verify (`/api/verify`)
- **POST `/start`**
  - **Form Data:** `file` (PDF/PNG/JPEG), optionally `doc_id`
  - **Response:** `{ "ok": true, "job_id": "job_..." }`
  - **Role:** Optional Auth
- **GET `/jobs/:jobId/result`**
  - **Response:** `{ "ok": true, "verdict": "GENUINE", ... }` or `202 Accepted` if running.
  - **Role:** Optional Auth
