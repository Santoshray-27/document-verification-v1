# Integration Gap Report

## Architecture & Libraries
- **Framework:** React 18 (Vite)
- **Router:** `react-router-dom` v6
- **State Management:** React Context (`AuthContext`, `GlobalStates`), standard React Hooks (`useState`, `useRef`). No Redux or Zustand.
- **HTTP Client:** `axios` (configured in `src/api/axios.js`)
- **Environment Variables:** Currently Vite supports `VITE_` prefix, and `axios.js` uses `import.meta.env.VITE_API_BASE_URL`.

## Integration Status
*Good news: Much of the frontend has already been wired up with Axios!*

| Page / Feature | Connected Endpoint | Status / Gaps |
| :--- | :--- | :--- |
| **Login** | `POST /api/auth/login` | Connected. Handles 401 correctly. |
| **Register** | `POST /api/auth/register` | Connected. Validates email properly. |
| **Dashboard** | `GET /api/issuer/dashboard` | Connected. |
| **Issue Document** | `POST /api/issue/start` | Connected. Successfully initiates document generation. |
| **My Documents** | `GET /api/issuer/documents` | Connected. Supports pagination via URL params. |
| **Revoke Document**| `POST /api/issuer/documents/:docId/revoke`| Connected. |
| **Verify (Upload)**| `POST /api/verify/start` | Connected. Returns job ID. |
| **Verify Result** | `GET /api/verify/jobs/:jobId/result` | Connected. Polls until completion. |
| **Public Result** | `GET /api/public/verify/:docId` | Connected. |
| **Audit Log** | `GET /api/admin/audit` | Connected. |

## Mock Data & Hardcoded Values Found
1. **ResultPage & IssueDocument:** Some template text (e.g., "This is to certify that") was heavily tied to specific document types, but this is actively being made dynamic based on backend payloads.
2. **ResultPage Visuals:** Heatmap coordinates are mostly driven by the Python backend's output, so no mock coordinates remain.
3. **Missing Features:** 
   - No built-in TanStack Query (React Query) is present yet (as requested in Phase 2). The app relies on `useEffect` data fetching loops which can be brittle (race conditions, no caching).
   - `Settings` page might not be fully hooked up to a `PUT /api/auth/profile` endpoint if the backend lacks one.

## Network & Configuration Gaps
- **CORS:** Backend `config.js` allows `http://localhost:5173`. We should add a Vite proxy to avoid CORS entirely in development.
- **API Client:** The Axios instance does not implement token refresh flows, it just drops the session on 401. 
- **Error Normalization:** Axios interceptor catches 401s, but generic form field errors aren't perfectly mapped back to UI fields yet.
