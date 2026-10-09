# Missing Backend Endpoints

This document tracks endpoints or data structures that are required by the frontend designs but are not currently implemented in the backend API.

## 1. Dashboard Sparkline Time-Series Data
The dashboard stats tiles (Issued, Active, Revoked, Checks) require historical sparkline data to render the mini-charts.
**Current State:** The `/api/issuer/dashboard` endpoint only returns flat aggregates (e.g., `stats: { total: 10 }`).
**Proposed Endpoint / Payload Addition:**
Update `GET /api/issuer/dashboard` to include `timeseries` arrays for the past 90 days.
```json
{
  "stats": { ... },
  "timeseries": {
    "issued": [1, 3, 2, 5, 0, 4, ...],
    "verifications": [12, 18, 10, 22, ...]
  }
}
```

## 2. Dashboard Live Log (Activity Feed)
The "Live Log" panel on the dashboard requires a stream of recent system activity (verifications, anomalies, document issuance).
**Current State:** No endpoint exists. Currently using UI mock data.
**Proposed Endpoint:**
`GET /api/issuer/activity-feed` or `GET /api/issuer/audit` (if scoped correctly) returning recent timestamped events.
Alternatively, Server-Sent Events (SSE) or WebSockets at `/api/events` for real-time updates.

## 3. Analysis Pipeline & Heatmap Delta (Recent Verification Jobs)
The dashboard shows an "Analysis Pipeline" and "Heatmap" of the latest or currently running verification jobs.
**Current State:** No endpoint to get a feed of verification jobs tied to the issuer's documents.
**Proposed Endpoint:**
`GET /api/issuer/verifications/recent`
```json
{
  "recent_checks": [
    {
      "job_id": "job_123",
      "doc_id": "doc_abc",
      "status": "completed",
      "verdict": "ALTERED",
      "ocr_delta": { ... }
    }
  ]
}
```

## 4. Auth - Forgot/Reset Password
The UI design specification requested "Forgot/Reset" password flows.
**Current State:** The `/api/auth` router only implements `/login`, `/register`, and `/me`.
**Proposed Endpoints:**
`POST /api/auth/forgot-password` (sends reset email)
`POST /api/auth/reset-password` (accepts token and new password)
