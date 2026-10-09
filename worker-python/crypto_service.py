import json
import hashlib
import os
import uuid
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.exceptions import InvalidSignature

ALGORITHM = "ECDSA-P256-SHA256"
FIELD_KEYS = ["name", "certificate_number", "course", "grade", "issue_date", "issuer_name", "doc_id"]
SCHEMA_VERSION = 1
KEYS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "keys"))

def canonicalize(value) -> str:
    """
    Canonical JSON matching Node.js canonicalize:
    - null/None -> 'null'
    - number -> str or JSON representation
    - bool -> 'true' or 'false'
    - str -> json.dumps(value) (escaped)
    - list/tuple -> '[' + comma-separated canonicalized items + ']'
    - dict -> sorted keys by ASCII, undefined/None ignored if handled, '{' + ... + '}'
    """
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return json.dumps(value)
    if isinstance(value, str):
        return json.dumps(value)
    if isinstance(value, (list, tuple)):
        return "[" + ",".join(canonicalize(x) for x in value) + "]"
    if isinstance(value, dict):
        keys = sorted([k for k, v in value.items() if v is not None])
        items = [f"{json.dumps(k)}:{canonicalize(value[k])}" for k in keys]
        return "{" + ",".join(items) + "}"
    return "null"

def sha256_hex(data: bytes | str) -> str:
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()

def hash_fields(fields: dict, doc_id: str, issuer_name: str) -> str:
    payload = {
        "name": fields.get("name") or fields.get("recipient_name") or "",
        "certificate_number": fields.get("certificate_number") or "",
        "course": fields.get("course") or "",
        "grade": fields.get("grade") or "",
        "issue_date": fields.get("issue_date") or "",
        "issuer_name": issuer_name or "",
        "doc_id": doc_id,
    }
    return sha256_hex(canonicalize(payload))

def build_manifest(doc_id: str, issuer_id: str, kid: str, fields_hash: str, file_hash: str, issued_at: str, expires_at: str = None) -> str:
    manifest_dict = {
        "schema_version": SCHEMA_VERSION,
        "doc_id": doc_id,
        "issuer_id": issuer_id,
        "kid": kid,
        "fields_hash": fields_hash,
        "file_hash": file_hash,
        "issued_at": issued_at,
        "expires_at": expires_at or None,
    }
    return canonicalize(manifest_dict)

def private_key_path_for(kid: str) -> str:
    return os.path.join(KEYS_DIR, f"{kid}.pem")

def read_private_key(kid: str) -> bytes:
    p = private_key_path_for(kid)
    if not os.path.exists(p):
        raise FileNotFoundError(f"PRIVATE_KEY_MISSING:{kid} at {p}")
    with open(p, "rb") as f:
        return f.read()

def sign_manifest(manifest_string: str, kid: str) -> str:
    priv_bytes = read_private_key(kid)
    private_key = serialization.load_pem_private_key(priv_bytes, password=None)
    signature = private_key.sign(
        manifest_string.encode("utf-8"),
        ec.ECDSA(hashes.SHA256())
    )
    import base64
    return base64.b64encode(signature).decode("ascii")

def verify_signature(manifest_string: str, signature_b64: str, public_key_pem: str) -> bool:
    import base64
    try:
        pub_bytes = public_key_pem.encode("utf-8") if isinstance(public_key_pem, str) else public_key_pem
        public_key = serialization.load_pem_public_key(pub_bytes)
        sig_bytes = base64.b64decode(signature_b64)
        public_key.verify(
            sig_bytes,
            manifest_string.encode("utf-8"),
            ec.ECDSA(hashes.SHA256())
        )
        return True
    except (InvalidSignature, Exception):
        return False

def generate_key_pair(kid: str) -> dict:
    os.makedirs(KEYS_DIR, exist_ok=True)
    private_key = ec.generate_private_key(ec.SECP256R1())
    priv_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    pub_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    priv_path = private_key_path_for(kid)
    with open(priv_path, "wb") as f:
        f.write(priv_pem)
    return {
        "private_key_pem": priv_pem.decode("utf-8"),
        "public_key_pem": pub_pem.decode("utf-8"),
        "private_path": priv_path,
    }

def new_id(prefix: str, byte_len: int = 4) -> str:
    return f"{prefix}_{os.urandom(byte_len).hex()}"

def generate_uuid() -> str:
    return str(uuid.uuid4())
