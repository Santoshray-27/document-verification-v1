# EVIDENTIA — Feature Gap Analysis

## Overview

This report provides a critical, objective evaluation of all features in the **EVIDENTIA** platform, distinguishing fully functional, end-to-end implementations from partial, placeholder, or intentionally excluded components.

---

## 1. Feature Status Breakdown

| Feature Area | PRD / Roadmap Goal | Current State | Completeness | Architectural Notes & Next Steps |
|---|---|---|:---:|---|
| **Built-in Templates** | 10 Working Certificate Designs across Universities, Enterprises, and Events | Fully Functional (10 templates) | **100%** | All 10 templates have complete JSON schemas, ReportLab vector rendering, sample previews, and system immutability. |
| **Hackathon Certificate** | Customizable Hackathon Participation & Winner Certificates | Fully Functional | **100%** | Supports primary institution crest, hackathon emblem, up to 4 partner/sponsor logos, and custom color accents. |
| **Template Studio** | Custom background upload, drag/position fields, draft/published versioning | Fully Functional | **100%** | Supports PNG/JPEG/PDF backgrounds, pixel coordinates, semantic versioning (`v1`, `v2`), and draft testing. |
| **Bulk Issuance** | CSV and XLSX spreadsheet batch issuance with ZIP download | Fully Functional | **100%** | Parses CSV and binary XLSX (via Python `openpyxl`), validates column aliases, detects duplicates, signs individually, and supports idempotency crash recovery. |
| **Forensic Diff & Heatmap** | High-res comparison between uploaded file and issued page baseline | Functional | **95%** | Computes SSIM and generates pixel-difference heatmaps via OpenCV. Fully functional on PDFs and images. |
| **OCR Text Extraction** | Extract text from scanned/uploaded files to verify field contents | Mixed (PDF embedded vs Image OCR) | **85%** | PDF embedded text extraction works deterministically via PyMuPDF (`fitz`). Image OCR relies on external `pytesseract`; when Tesseract binary is not installed on the host OS, image OCR gracefully degrades to `avg_confidence = 0` and fail-safe heuristics engage. |
| **AI Assist & Explanations** | Advisory explanation of verdict reasons via Google Gemini | Fully Functional with Circuit Breaker | **100%** | Safe evidence extraction prevents prompt injection. Circuit breaker automatically falls back to deterministic summary on 429 quota exhaustion or network failure. |
| **Semantic Integrity** | Logical consistency checks (future dates, out-of-bounds marks) | Fully Functional | **100%** | Deterministic rule engine checks 7 semantic rules; returns advisory findings without corrupting cryptographic verdict. |
| **Offline Verification** | Verifying certificates offline via client-side QR verification | **Intentionally Excluded** | **N/A** | **Excluded by strict product requirement (FR17)**. Online verification (QR, upload, document ID, and public directory) is the sole authoritative verification channel. |

---

## 2. Analysis of Identified Gaps & Edge Cases

### Gap 1: Host Tesseract Dependency for Rasterized Images
- **Current Behavior**: PDF documents (the primary certificate format) extract embedded text directly via PyMuPDF without any external dependencies. However, for rasterized image formats (e.g., screenshot PNGs or scanned JPEGs), pytesseract requires a native `tesseract.exe` installed on the host OS path.
- **Fail-Safe Behavior**: When `tesseract` is missing, the Python worker returns `avg_confidence: 0` and empty text. The Node.js verdict engine recognizes that OCR was unavailable and applies a safe fallback: it reports `UNABLE TO ASSESS` or uses visual SSIM rather than falsely claiming an image is genuine or forged.
- **Recommendation for Production Deployment**: Package Tesseract OCR binaries into the Docker container (`apt-get install -y tesseract-ocr tesseract-ocr-eng`) in production deployment manifests.

### Gap 2: Browser Automated E2E Testing Environment
- **Current Behavior**: Full API integration testing, backend test suites, and frontend Vite production builds are automated. End-to-end browser automation (e.g. Playwright / Cypress) is not configured in the repository scripts.
- **Mitigation**: End-to-end scenarios are thoroughly exercised at the HTTP and component level via `tests/e2e.js`, validating the exact request/response lifecycles that the UI utilizes.

---

## 3. Deprecated or Ambiguous Requirements

1. **Mainnet Blockchain Anchoring**: Mentioned in early brainstorms as an optional add-on, but properly excluded by the PRD non-goals. EVIDENTIA's SQLite registry with hash-chained audit logging and canonical ECDSA signatures provides strong, self-contained mathematical integrity without the latency and transaction costs of public blockchains.
2. **Offline Verification (FR17)**: Explicitly removed per user directive. Any reference in legacy documentation is marked as superseded.
