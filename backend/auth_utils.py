import hashlib
import hmac as hmac_lib
import struct
import base64
import secrets
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt

SECRET_KEY  = "your-secret-key-should-be-very-secure"
ALGORITHM   = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


def get_password_hash(plain_password: str) -> str:
    """ASP.NET Identity v3 compatible: PBKDF2-HMAC-SHA256, 10000 iterations."""
    prf        = 1          # HMACSHA256
    iterations = 10000
    salt       = secrets.token_bytes(16)
    dk         = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, iterations, dklen=32)
    payload    = struct.pack(">BIII", 0x01, prf, iterations, len(salt)) + salt + dk
    return base64.b64encode(payload).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password — supports bcrypt (legacy) and ASP.NET Identity v3 PBKDF2 (new)."""
    if not hashed_password:
        return False
    # Legacy bcrypt hashes start with $2b$ or $2a$
    if hashed_password.startswith(("$2b$", "$2a$")):
        try:
            import bcrypt as _bcrypt
            return _bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
        except Exception:
            return False
    # ASP.NET Identity v3 PBKDF2
    try:
        data       = base64.b64decode(hashed_password)
        version    = data[0]
        if version != 0x01:
            return False
        prf        = struct.unpack_from(">I", data, 1)[0]
        iterations = struct.unpack_from(">I", data, 5)[0]
        salt_size  = struct.unpack_from(">I", data, 9)[0]
        salt       = data[13:13 + salt_size]
        stored     = data[13 + salt_size:]
        alg        = "sha256" if prf == 1 else "sha512"
        computed   = hashlib.pbkdf2_hmac(alg, plain_password.encode("utf-8"), salt, iterations, dklen=len(stored))
        return hmac_lib.compare_digest(computed, stored)
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire    = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
