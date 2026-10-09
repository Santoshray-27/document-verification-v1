import json
from datetime import datetime, timezone
from db import query_one, query_all, execute
from crypto_service import canonicalize, sha256_hex

GENESIS = sha256_hex("EVIDENTIA-GENESIS")

def last_hash() -> str:
    row = query_one("SELECT entry_hash FROM audit_log ORDER BY id DESC LIMIT 1")
    return row["entry_hash"] if row and row.get("entry_hash") else GENESIS

def sanitize_detail(detail) -> dict:
    if not detail or not isinstance(detail, dict):
        return {"note": str(detail or "")}
    out = {}
    for k, v in detail.items():
        if v is None or isinstance(v, (str, int, float, bool)):
            out[k] = v
        elif isinstance(v, list):
            out[k] = [json.dumps(x) if isinstance(x, dict) else x for x in v][:50]
        else:
            out[k] = str(v)
    return out

def append_audit(actor_id=None, actor_role=None, action="ACTION", doc_id=None, detail=None):
    now_str = datetime.now(timezone.utc).isoformat()
    prev = last_hash()
    safe_detail = sanitize_detail(detail or {})
    candidate = {
        "actor_id": actor_id,
        "actor_role": actor_role,
        "action": action,
        "doc_id": doc_id,
        "detail_json": safe_detail,
        "time": now_str,
        "prev_hash": prev,
    }
    entry_hash = sha256_hex(prev + canonicalize(candidate))
    
    execute(
        """
        INSERT INTO audit_log (actor_id, actor_role, action, doc_id, detail_json, time, prev_hash, entry_hash)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (actor_id, actor_role, action, doc_id, json.dumps(safe_detail), now_str, prev, entry_hash)
    )
    
    return query_one("SELECT * FROM audit_log ORDER BY id DESC LIMIT 1")
