"""Semantic consistency engine: validates extracted OCR data against registry fields."""

from datetime import datetime

def check_semantics(registry_fields: dict, ocr_fields: dict) -> list[dict]:
    findings = []
    if not registry_fields:
        return findings

    ocr = ocr_fields or {}

    def add(rule_id, field, status, severity, observed, expected, reason):
        findings.append({
            "rule_id": rule_id,
            "field": field,
            "status": status,
            "severity": severity,
            "observed_value": observed,
            "expected_rule": expected,
            "reason": reason
        })

    # 1. Missing required fields
    for key, expected_value in registry_fields.items():
        if expected_value and not ocr.get(key):
            add(
                "SEM_MISSING_FIELD",
                key,
                "FLAGGED",
                "WARNING",
                None,
                "Must be present",
                f'Field "{key}" is missing from extracted text.'
            )

    # 2. Marks exceeding max (e.g. grade > 100)
    if ocr.get("grade"):
        grade_str = "".join(c for c in str(ocr["grade"]) if c.isdigit() or c == ".")
        try:
            grade_num = float(grade_str)
            if grade_num > 100 or "%" in str(ocr["grade"]):
                if grade_num > 100:
                    add(
                        "SEM_EXCEEDS_MAX",
                        "grade",
                        "FLAGGED",
                        "WARNING",
                        ocr["grade"],
                        "<= 100",
                        "Grade/Marks extracted appears to exceed 100."
                    )
                else:
                    add(
                        "SEM_EXCEEDS_MAX",
                        "grade",
                        "PASS",
                        "INFO",
                        ocr["grade"],
                        "<= 100",
                        "Grade is within normal bounds."
                    )
        except Exception:
            pass

    # 3. Issue date check (future date)
    if ocr.get("issue_date"):
        try:
            d_str = str(ocr["issue_date"]).split("T")[0]
            dt = datetime.fromisoformat(d_str)
            if dt > datetime.now():
                add(
                    "SEM_FUTURE_DATE",
                    "issue_date",
                    "FLAGGED",
                    "ERROR",
                    ocr["issue_date"],
                    "Past or present date",
                    "Issue date is in the future."
                )
            else:
                add(
                    "SEM_FUTURE_DATE",
                    "issue_date",
                    "PASS",
                    "INFO",
                    ocr["issue_date"],
                    "Past or present date",
                    "Issue date is valid."
                )
        except Exception:
            pass

    return findings
