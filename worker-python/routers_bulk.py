import io
import csv
import json
import uuid
import zipfile
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Response
from fastapi.responses import StreamingResponse
from db import query_one, query_all, execute
from routers_auth import get_current_user, require_role
from routers_issuer import run_in_process_issuance

router = APIRouter(prefix="", tags=["bulk"])

MAX_BULK_ROWS = 500

def safe_json(val):
    if not val:
        return {}
    if isinstance(val, dict):
        return val
    try:
        return json.loads(val)
    except Exception:
        return {}

def suggest_mapping(headers: list[str], supported_fields: list[str]) -> dict:
    mapping = {}
    normalized_headers = {
        h.lower().replace(" ", "_").replace("-", "_").replace("#", "").replace(".", "").strip("_"): h
        for h in headers
    }
    
    aliases = {
        "name": ["name", "recipient", "student_name", "recipient_name", "candidate_name", "full_name"],
        "certificate_number": ["cert", "cert_number", "certificate_number", "certificate_id", "cert_id", "roll_no", "enrollment_number", "serial_no"],
        "course": ["course", "degree", "program", "programme", "branch", "department", "event", "competition"],
        "grade": ["grade", "division", "class", "cgpa", "score", "marks", "rank", "position"],
        "issue_date": ["issue_date", "date_of_issue", "date", "dated", "issued_on"],
    }
    
    for f in supported_fields:
        cand_keys = aliases.get(f, [f])
        matched = False
        for cand in cand_keys:
            if cand in normalized_headers:
                mapping[f] = normalized_headers[cand]
                matched = True
                break
        if not matched:
            mapping[f] = None
    return mapping

def parse_spreadsheet(content: bytes, filename: str) -> list[list[str]]:
    rows = []
    fname = filename.lower()
    if fname.endswith(".csv"):
        text = content.decode("utf-8-sig", errors="replace")
        reader = csv.reader(io.StringIO(text))
        for r in reader:
            if any(cell.strip() for cell in r):
                rows.append([cell.strip() for cell in r])
    elif fname.endswith((".xlsx", ".xls")):
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
        sheet = wb.active
        for row in sheet.iter_rows(values_only=True):
            r_str = [str(cell).strip() if cell is not None else "" for cell in row]
            if any(r_str):
                rows.append(r_str)
    else:
        raise ValueError("Unsupported spreadsheet format. Please upload .csv or .xlsx")
    return rows

@router.get("/issue/bulk/sample-template")
@router.get("/issuer/bulk/sample-template")
def get_sample_template(template_id: str = "tpl_acad_01", user: dict = Depends(require_role("issuer"))):
    tpl = query_one("SELECT * FROM templates WHERE id = %s", (template_id,))
    if not tpl:
        raise HTTPException(status_code=404, detail={"code": "TEMPLATE_NOT_FOUND", "message": "Template not found"})
        
    fields = safe_json(tpl.get("fields_json")) or ["name", "certificate_number", "course", "grade", "issue_date"]
    if isinstance(fields, dict):
        fields = list(fields.keys())

    header_names = []
    for f in fields:
        if f == "name":
            header_names.append("Student Name")
        elif f == "certificate_number":
            header_names.append("Certificate Number")
        elif f == "course":
            header_names.append("Course")
        elif f == "grade":
            header_names.append("Grade")
        elif f == "issue_date":
            header_names.append("Issue Date")
        else:
            header_names.append(f.replace("_", " ").title())

    row1 = [
        "Aarav Sharma" if f == "name" else
        "CERT-2026-001" if f == "certificate_number" else
        "Computer Science and Engineering" if f == "course" else
        "First Class Honours" if f == "grade" else
        "2026-06-15" if f == "issue_date" else "Sample Value"
        for f in fields
    ]
    row2 = [
        "Ananya Patel" if f == "name" else
        "CERT-2026-002" if f == "certificate_number" else
        "Information Technology" if f == "course" else
        "Distinction" if f == "grade" else
        "2026-06-15" if f == "issue_date" else "Sample Value"
        for f in fields
    ]

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(header_names)
    writer.writerow(row1)
    writer.writerow(row2)

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="sample-{template_id}.csv"'}
    )

@router.post("/issue/bulk/validate")
@router.post("/issuer/bulk/validate")
async def bulk_validate(
    file: UploadFile = File(...),
    template_id: str = Form(...),
    mapping: str = Form(None),
    user: dict = Depends(require_role("issuer"))
):
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail={"code": "NO_FILE", "message": "No spreadsheet file uploaded"})

    tpl = query_one("SELECT * FROM templates WHERE id = %s", (template_id,))
    if not tpl:
        raise HTTPException(status_code=404, detail={"code": "TEMPLATE_NOT_FOUND", "message": "Template not found"})

    rows = parse_spreadsheet(contents, file.filename or "upload.csv")
    if len(rows) < 2:
        raise HTTPException(status_code=400, detail={"code": "EMPTY_SPREADSHEET", "message": "Spreadsheet must contain a header and at least 1 row"})

    headers = rows[0]
    data_rows = rows[1:]

    supported_fields = []
    try:
        sf = json.loads(tpl["fields_json"]) if tpl.get("fields_json") else []
        supported_fields = sf if isinstance(sf, list) else list(sf.keys())
    except Exception:
        supported_fields = ["name", "certificate_number", "course", "grade", "issue_date"]

    active_mapping = {}
    if mapping:
        try:
            active_mapping = json.loads(mapping)
        except Exception:
            pass
    if not active_mapping:
        active_mapping = suggest_mapping(headers, supported_fields)

    # Validate rows
    validated_rows = []
    valid_count = 0
    invalid_count = 0
    cert_nos = set()

    for idx, r in enumerate(data_rows):
        row_num = idx + 2
        raw_dict = {headers[c]: (r[c] if c < len(r) else "") for c in range(len(headers))}
        mapped_dict = {}
        row_errors = []

        for field_k, header_col in active_mapping.items():
            if header_col and header_col in raw_dict:
                mapped_dict[field_k] = raw_dict[header_col]
            else:
                mapped_dict[field_k] = ""

        recipient_name = mapped_dict.get("name") or mapped_dict.get("recipient_name")
        if not recipient_name or not str(recipient_name).strip():
            row_errors.append("Recipient name is required")
        cert_num = mapped_dict.get("certificate_number")
        if not cert_num or not str(cert_num).strip():
            row_errors.append("certificate_number is required")
        elif cert_num in cert_nos:
            row_errors.append(f"Duplicate certificate number '{cert_num}' in batch")
        else:
            cert_nos.add(cert_num)

        status_val = "valid" if len(row_errors) == 0 else "invalid"
        is_val = len(row_errors) == 0
        if is_val:
            valid_count += 1
        else:
            invalid_count += 1

        validated_rows.append({
            "row_number": row_num,
            "raw_data": raw_dict,
            "mapped_data": mapped_dict,
            "validation_status": status_val,
            "is_valid": is_val,
            "errors": row_errors,
        })

    batch_id = str(uuid.uuid4())
    now_str = datetime.now(timezone.utc).isoformat()

    execute(
        """
        INSERT INTO batch_jobs (id, issuer_id, template_id, template_version, total_rows, pending_rows,
                                succeeded_rows, failed_rows, skipped_rows, status, mapping_json, created_by, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, 0, 0, 0, 'draft', %s, %s, %s)
        """,
        (batch_id, user["issuer_id"], template_id, tpl.get("version") or 1, len(data_rows), valid_count, json.dumps(active_mapping), user["id"], now_str)
    )

    from db import execute_batch_values
    batch_rows_records = [
        (
            str(uuid.uuid4()),
            batch_id,
            vr["row_number"],
            json.dumps(vr["raw_data"]),
            json.dumps(vr["mapped_data"]),
            vr["validation_status"],
            json.dumps(vr["errors"]),
            "pending",
            now_str,
        )
        for vr in validated_rows
    ]
    execute_batch_values(
        """
        INSERT INTO batch_rows (id, batch_id, row_number, raw_data_json, mapped_data_json,
                                validation_status, validation_errors_json, status, created_at)
        VALUES %s
        """,
        batch_rows_records
    )

    return {
        "ok": True,
        "batch_id": batch_id,
        "template": {
            "id": tpl["id"],
            "name": tpl["name"],
            "doc_type": tpl["doc_type"],
            "version": tpl["version"],
            "fields": supported_fields,
            "required_fields": json.loads(tpl["required_json"]) if tpl.get("required_json") else []
        },
        "headers": headers,
        "mapping": active_mapping,
        "summary": {
            "total_rows": len(data_rows),
            "valid_rows": valid_count,
            "invalid_rows": invalid_count,
            "duplicate_rows": 0,
            "can_proceed": valid_count > 0,
        },
        "rows_preview": validated_rows[:50]
    }

@router.post("/issue/bulk/start")
@router.post("/issuer/bulk/start")
def bulk_start(payload: dict, user: dict = Depends(require_role("issuer"))):
    batch_id = payload.get("batch_id")
    if not batch_id:
        raise HTTPException(status_code=400, detail={"code": "MISSING_BATCH_ID", "message": "batch_id is required"})

    batch = query_one("SELECT * FROM batch_jobs WHERE id = %s AND issuer_id = %s", (batch_id, user["issuer_id"]))
    if not batch:
        raise HTTPException(status_code=404, detail={"code": "BATCH_NOT_FOUND", "message": "Batch not found"})

    # Pre-fetch issuer and signing key once for the entire batch (massively reduces DB latency)
    issuer = query_one("SELECT * FROM issuers WHERE issuer_id = %s", (user["issuer_id"],))
    if not issuer:
        raise HTTPException(status_code=400, detail={"code": "ISSUER_NOT_FOUND", "message": "Issuer not found"})
        
    from crypto_service import generate_key_pair, private_key_path_for, new_id
    key_exists = False
    if key and key.get("kid"):
        key_exists = os.path.exists(private_key_path_for(key["kid"]))
    
    if not key or not key_exists:
        kid = new_id("key")
        pair = generate_key_pair(kid)
        now_iso = datetime.now(timezone.utc).isoformat()
        execute(
            """
            INSERT INTO issuer_keys (kid, issuer_id, public_key_pem, private_key_path, algorithm, status, created_at)
            VALUES (%s, %s, %s, %s, 'ECDSA-P256-SHA256', 'active', %s)
            """,
            (kid, issuer["issuer_id"], pair["public_key_pem"], pair["private_path"], now_iso)
        )

    # Process all valid rows in-process
    valid_rows = query_all("SELECT * FROM batch_rows WHERE batch_id = %s AND validation_status = 'valid'", (batch_id,)) or []
    
    succeeded = 0
    failed = 0
    issued_doc_ids = []
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    for r in valid_rows:
        mapped = json.loads(r["mapped_data_json"])
        if not mapped.get("issue_date"):
            mapped["issue_date"] = today_str
        try:
            res = run_in_process_issuance(user, mapped, doc_type="academic_certificate", template_id=batch["template_id"])
            doc_id = res["doc_id"]
            issued_doc_ids.append(doc_id)
            execute("UPDATE batch_rows SET status = 'succeeded', doc_id = %s WHERE id = %s", (doc_id, r["id"]))
            succeeded += 1
        except Exception as e:
            failed += 1
            execute("UPDATE batch_rows SET status = 'failed', error_message = %s WHERE id = %s", (str(e), r["id"]))

    execute(
        """
        UPDATE batch_jobs 
        SET status = 'completed', succeeded_rows = %s, failed_rows = %s, pending_rows = 0, completed_at = %s
        WHERE id = %s
        """,
        (succeeded, failed, datetime.now(timezone.utc).isoformat(), batch_id)
    )

    return {
        "ok": True,
        "batch_id": batch_id,
        "status": "completed",
        "total_rows": batch["total_rows"],
        "valid_rows": len(valid_rows),
        "succeeded_rows": succeeded,
        "failed_rows": failed,
        "message": "Batch processed successfully"
    }

@router.get("/issue/bulk/jobs/{batch_id}")
@router.get("/issuer/bulk/jobs/{batch_id}")
def get_bulk_job(batch_id: str, user: dict = Depends(require_role("issuer"))):
    batch = query_one("SELECT * FROM batch_jobs WHERE id = %s AND issuer_id = %s", (batch_id, user["issuer_id"]))
    if not batch:
        raise HTTPException(status_code=404, detail={"code": "BATCH_NOT_FOUND", "message": "Batch not found"})

    rows = query_all("SELECT * FROM batch_rows WHERE batch_id = %s ORDER BY row_number ASC LIMIT 100", (batch_id,)) or []
    formatted_rows = [
        {
            **r,
            "raw_data": safe_json(r.get("raw_data_json")),
            "mapped_data": safe_json(r.get("mapped_data_json")),
            "validation_errors": safe_json(r.get("validation_errors_json")),
        }
        for r in rows
    ]

    total = batch["total_rows"] or 1
    done = (batch["succeeded_rows"] or 0) + (batch["failed_rows"] or 0)
    percent = int((done / total) * 100) if batch["status"] == "completed" else 0

    return {
        "ok": True,
        "batch": {
            **batch,
            "progress_percent": 100 if batch["status"] == "completed" else percent,
        },
        "rows": formatted_rows
    }

@router.get("/issue/bulk/jobs/{batch_id}/download")
@router.get("/issuer/bulk/jobs/{batch_id}/download")
def download_bulk_zip(batch_id: str, user: dict = Depends(require_role("issuer"))):
    batch = query_one("SELECT * FROM batch_jobs WHERE id = %s AND issuer_id = %s", (batch_id, user["issuer_id"]))
    if not batch:
        raise HTTPException(status_code=404, detail={"code": "BATCH_NOT_FOUND", "message": "Batch not found"})

    rows = query_all(
        """
        SELECT r.row_number, r.doc_id, r.mapped_data_json, d.pdf_path
        FROM batch_rows r
        JOIN documents d ON r.doc_id = d.doc_id
        WHERE r.batch_id = %s AND r.status = 'succeeded'
        ORDER BY r.row_number ASC
        """,
        (batch_id,)
    ) or []

    if not rows:
        raise HTTPException(status_code=404, detail={"code": "NO_DOCUMENTS", "message": "No successfully issued documents found in this batch"})

    import os
    from main import STORAGE_DIR

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for r in rows:
            doc_id = r["doc_id"]
            pdf_path = r.get("pdf_path") or os.path.join(STORAGE_DIR, "issued", f"{doc_id}.pdf")
            if os.path.exists(pdf_path):
                mapped = safe_json(r.get("mapped_data_json"))
                safe_name = "".join(c for c in (mapped.get("name") or "certificate") if c.isalnum() or c in ("_", "-")).strip() or "certificate"
                filename = f"{str(r['row_number']).zfill(3)}_{safe_name}_{doc_id[:8]}.pdf"
                with open(pdf_path, "rb") as f:
                    zip_file.writestr(filename, f.read())

    zip_bytes = zip_buffer.getvalue()
    if len(zip_bytes) <= 22:  # Empty zip header size is 22 bytes
        raise HTTPException(status_code=404, detail={"code": "FILES_NOT_FOUND", "message": "Certificate PDF files could not be located on disk"})

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="evidentia_batch_{batch_id[:8]}.zip"'}
    )

@router.get("/issue/bulk/jobs/{batch_id}/report")
@router.get("/issuer/bulk/jobs/{batch_id}/report")
def download_bulk_report(batch_id: str, user: dict = Depends(require_role("issuer"))):
    batch = query_one("SELECT * FROM batch_jobs WHERE id = %s AND issuer_id = %s", (batch_id, user["issuer_id"]))
    if not batch:
        raise HTTPException(status_code=404, detail={"code": "BATCH_NOT_FOUND", "message": "Batch not found"})

    rows = query_all("SELECT * FROM batch_rows WHERE batch_id = %s ORDER BY row_number ASC", (batch_id,)) or []

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Row Number", "Status", "Document ID", "Recipient Name", "Certificate Number", "Course", "Grade", "Issue Date", "Errors"])

    for r in rows:
        mapped = safe_json(r.get("mapped_data_json"))
        errors = safe_json(r.get("validation_errors_json"))
        err_msg = r.get("error_message") or ("; ".join(errors) if isinstance(errors, list) else str(errors)) or ""
        writer.writerow([
            r.get("row_number", ""),
            r.get("status", ""),
            r.get("doc_id", ""),
            mapped.get("name") or mapped.get("recipient_name") or "",
            mapped.get("certificate_number") or "",
            mapped.get("course") or mapped.get("degree") or "",
            mapped.get("grade") or "",
            mapped.get("issue_date") or "",
            err_msg
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="evidentia_report_{batch_id[:8]}.csv"'}
    )

