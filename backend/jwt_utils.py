import jwt
import logging
import os
import secrets
from datetime import datetime, timedelta
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from fastapi import HTTPException, status
from dotenv import load_dotenv

load_dotenv()  # before reading SECRET_KEY, so a local .env is honoured

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    # Never fall back to a value that's published in the repo: anyone could
    # forge tokens with it. A random per-process key is safe; it just means
    # logins reset on restart. Set SECRET_KEY in the environment to persist them.
    SECRET_KEY = secrets.token_urlsafe(48)
    logging.getLogger(__name__).warning(
        "SECRET_KEY is not set; using a random key. Sessions will not survive restarts."
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_access_token(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            print("[verify_access_token] No 'sub' in payload!")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        return email
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
