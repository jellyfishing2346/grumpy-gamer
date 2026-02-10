

from fastapi import FastAPI, HTTPException, APIRouter, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional
import os
import sqlite3
from passlib.context import CryptContext
try:
    from .jwt_utils import create_access_token, verify_access_token
except ImportError:
    from jwt_utils import create_access_token, verify_access_token
auth_router = APIRouter(tags=["auth"])


class UserUpdate(BaseModel):
    new_email: Optional[EmailStr] = None
    new_username: Optional[str] = None
    new_password: Optional[str] = None


@auth_router.put("/user/update")
def update_user(
    update: UserUpdate,
    token_email: str = Depends(verify_access_token),
    email: str = Query(None)
):
    conn = get_db()
    cursor = conn.cursor()
    target_email = email if email else token_email
    if update.new_email:
        try:
            cursor.execute(
                "UPDATE users SET email = ? WHERE email = ?",
                (update.new_email, target_email)
            )
            conn.commit()
        except sqlite3.IntegrityError:
            conn.close()
            raise HTTPException(status_code=400, detail="Email already in use")
    if update.new_username:
        cursor.execute(
            "UPDATE users SET username = ? WHERE email = ?",
            (update.new_username, update.new_email or target_email)
        )
        conn.commit()
    if update.new_password:
        hashed_pw = pwd_context.hash(update.new_password)
        cursor.execute(
            "UPDATE users SET hashed_password = ? WHERE email = ?",
            (hashed_pw, update.new_email or target_email)
        )
        conn.commit()
    conn.close()
    return {"msg": f"User info updated for {target_email}"}


from fastapi import Query


@auth_router.delete("/user/delete")
def delete_user(
    token_email: str = Depends(verify_access_token),
    email: str = Query(None)
):
    conn = get_db()
    cursor = conn.cursor()
    target_email = email if email else token_email
    cursor.execute(
        "DELETE FROM users WHERE email = ?",
        (target_email,)
    )
    conn.commit()
    conn.close()
    return {"msg": f"Account deleted for {target_email}"}


app = FastAPI()


allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,https://grumpy-gamer.vercel.app"
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "Grumpy Gamer API is running!",
        "docs": "/docs"
    }


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_db():
    conn = sqlite3.connect("users.db")
    conn.execute(
        '''CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            username TEXT,
            hashed_password TEXT NOT NULL
        )'''
    )
    return conn


class UserSignup(BaseModel):
    email: EmailStr
    username: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    username: Optional[str] = None
    password: str


@auth_router.post("/signup")
@app.post("/signup")  # Also register on standalone app for testing
def signup(user: UserSignup):
    conn = get_db()
    cursor = conn.cursor()
    hashed_pw = pwd_context.hash(user.password)
    try:
        cursor.execute(
            "INSERT INTO users (email, username, hashed_password) VALUES (?, ?, ?)",
            (user.email, user.username, hashed_pw)
        )
        conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Email already registered")
    finally:
        conn.close()
    return {"msg": "Signup successful"}


@auth_router.post("/login")
@app.post("/login")  # Also register on standalone app for testing
def login(user: UserLogin):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT hashed_password FROM users WHERE email = ?",
        (user.email,)
    )
    row = cursor.fetchone()
    conn.close()
    if not row or not pwd_context.verify(user.password, row[0]):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}
    cursor.execute(
        "SELECT hashed_password FROM users WHERE email = ?",
        (user.email,)
    )
    row = cursor.fetchone()
    conn.close()
    if not row or not pwd_context.verify(user.password, row[0]):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )
    # Create JWT access token
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}
    row = cursor.fetchone()
