import os
import json
import base64
import hashlib
import time
from datetime import datetime, timezone
import jwt
from passlib.context import CryptContext
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional

from db import query_one, query_all, execute

SECRET_KEY = os.environ.get("JWT_SECRET", "agnitia-dev-secret-change-me")
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter(prefix="/auth", tags=["auth"])

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    org_type: Optional[str] = "university"

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def hash_password(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    to_encode.update({"iat": int(time.time()), "exp": int(time.time()) + 12 * 3600})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Missing bearer token"})
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("id")
        user = query_one("SELECT id, name, email, role, issuer_id FROM users WHERE id = %s", (user_id,))
        if not user:
            raise HTTPException(status_code=401, detail={"code": "USER_NOT_FOUND", "message": "Invalid session"})
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail={"code": "INVALID_TOKEN", "message": "Session expired or invalid"})

def require_role(required_role: str):
    def role_checker(user: dict = Depends(get_current_user)):
        if user.get("role") != required_role:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": f"Requires {required_role} role"})
        return user
    return role_checker

@router.post("/login")
def login(req: LoginRequest):
    try:
        email = req.email.strip().lower()
        user = query_one("SELECT * FROM users WHERE lower(email) = %s", (email,))
        if not user:
            raise HTTPException(status_code=401, detail={"code": "INVALID_CREDENTIALS", "message": "Invalid email or password"})
        
        valid = False
        try:
            valid = verify_password(req.password, user["password_hash"])
        except Exception:
            pass

        if not valid:
            try:
                import bcrypt
                valid = bcrypt.checkpw(req.password.encode("utf-8"), user["password_hash"].encode("utf-8"))
            except Exception:
                pass

        if not valid:
            raise HTTPException(status_code=401, detail={"code": "INVALID_CREDENTIALS", "message": "Invalid email or password"})

        token = create_access_token({
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "issuer_id": user["issuer_id"],
            "name": user["name"]
        })

        return {
            "ok": True,
            "token": token,
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role"],
                "issuer_id": user["issuer_id"]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail={"code": "SERVER_ERROR", "message": str(e)})

@router.post("/register")
def register(req: RegisterRequest):
    try:
        clean_email = req.email.strip().lower()
        existing = query_one("SELECT id FROM users WHERE lower(email) = %s", (clean_email,))
        if existing:
            raise HTTPException(status_code=409, detail={"code": "EMAIL_TAKEN", "message": "An account with this email already exists"})

        issuer_id = f"iss_{hashlib.md5(f'{clean_email}:{time.time()}'.encode()).hexdigest()[:8]}"
        kid = f"key_{hashlib.md5(f'{issuer_id}:1'.encode()).hexdigest()[:8]}"
        now = datetime.now(timezone.utc).isoformat()
        hashed_pwd = hash_password(req.password)

        # Insert Issuer
        execute(
            "INSERT INTO issuers (issuer_id, name, org_type, status, created_at) VALUES (%s, %s, %s, %s, %s)",
            (issuer_id, req.name.strip(), (req.org_type or 'university').strip(), "active", now)
        )

        from crypto_service import generate_key_pair, ALGORITHM
        key_pair = generate_key_pair(kid)

        # Insert Real ECDSA P-256 Key
        execute(
            """INSERT INTO issuer_keys (kid, issuer_id, public_key_pem, private_key_path, algorithm, status, created_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (kid, issuer_id, key_pair["public_key_pem"], f"../keys/{kid}.pem", ALGORITHM, "active", now)
        )

        # Insert User
        execute(
            "INSERT INTO users (name, email, password_hash, role, issuer_id, created_at) VALUES (%s, %s, %s, %s, %s, %s)",
            (req.name.strip(), clean_email, hashed_pwd, "issuer", issuer_id, now)
        )

        user = query_one("SELECT id, name, email, role, issuer_id FROM users WHERE lower(email) = %s", (clean_email,))
        token = create_access_token(user)

        return {
            "ok": True,
            "token": token,
            "user": user
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail={"code": "SERVER_ERROR", "message": str(e)})

@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    issuer = None
    if user.get("issuer_id"):
        issuer = query_one(
            "SELECT issuer_id, name, org_type, status, created_at FROM issuers WHERE issuer_id = %s",
            (user["issuer_id"],)
        )
    return {
        "ok": True,
        "user": {**user, "issuer": issuer}
    }
