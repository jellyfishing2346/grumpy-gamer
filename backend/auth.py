from fastapi import HTTPException, APIRouter, Depends, Query, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from passlib.context import CryptContext
from dotenv import load_dotenv
try:
    from .jwt_utils import verify_access_token, create_access_token
except ImportError:
    from jwt_utils import verify_access_token, create_access_token

load_dotenv()

auth_router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_db():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL environment variable is not set.")
    conn = psycopg2.connect(database_url, cursor_factory=RealDictCursor)
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        '''CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            username TEXT,
            hashed_password TEXT NOT NULL
        )'''
    )
    cursor.execute(
        '''CREATE TABLE IF NOT EXISTS game_results (
            id SERIAL PRIMARY KEY,
            email TEXT NOT NULL,
            game TEXT NOT NULL,
            outcome TEXT NOT NULL,
            played_at TIMESTAMP DEFAULT NOW()
        )'''
    )
    conn.commit()
    conn.close()


@auth_router.get("/user/info")
async def get_user_info(token_email: str = Depends(verify_access_token)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT username FROM users WHERE email = %s", (token_email,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return {"email": token_email, "username": row["username"]}


class UserUpdate(BaseModel):
    new_email: Optional[EmailStr] = None
    new_username: Optional[str] = None
    new_password: Optional[str] = None


@auth_router.put("/user/update")
async def update_user(
    update: UserUpdate,
    token_email: str = Depends(verify_access_token),
    email: str = Query(None),
    request: Request = None
):
    conn = get_db()
    cursor = conn.cursor()
    target_email = email if email else token_email
    if update.new_email:
        try:
            cursor.execute(
                "UPDATE users SET email = %s WHERE email = %s",
                (update.new_email, target_email)
            )
            conn.commit()
        except Exception:
            conn.rollback()
            conn.close()
            raise HTTPException(status_code=400, detail="Email already in use")
    if update.new_username:
        cursor.execute(
            "UPDATE users SET username = %s WHERE email = %s",
            (update.new_username, update.new_email or target_email)
        )
        conn.commit()
    if update.new_password:
        hashed_pw = pwd_context.hash(update.new_password)
        cursor.execute(
            "UPDATE users SET hashed_password = %s WHERE email = %s",
            (hashed_pw, update.new_email or target_email)
        )
        conn.commit()
    conn.close()
    return {"msg": f"User info updated for {target_email}"}


@auth_router.delete("/user/delete")
async def delete_user(
    token_email: str = Depends(verify_access_token),
    email: str = Query(None),
    request: Request = None
):
    print("[delete_user] Headers:", dict(request.headers))
    print(f"[delete_user] token_email from JWT: {token_email}")
    conn = get_db()
    cursor = conn.cursor()
    target_email = email if email else token_email
    cursor.execute("DELETE FROM users WHERE email = %s", (target_email,))
    conn.commit()
    conn.close()
    return {"msg": f"Account and all related data deleted for {target_email}"}


class UserSignup(BaseModel):
    email: EmailStr
    username: Optional[str] = None
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    username: Optional[str] = None
    password: str


@auth_router.post("/signup")
def signup(user: UserSignup):
    conn = get_db()
    cursor = conn.cursor()
    hashed_pw = pwd_context.hash(user.password)
    try:
        cursor.execute(
            "INSERT INTO users (email, username, hashed_password) VALUES (%s, %s, %s)",
            (user.email, user.username, hashed_pw)
        )
        conn.commit()
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Email already registered")
    finally:
        conn.close()
    return {"msg": "Signup successful"}


@auth_router.post("/login")
def login(user: UserLogin):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT hashed_password FROM users WHERE email = %s",
        (user.email,)
    )
    row = cursor.fetchone()
    conn.close()
    if not row or not pwd_context.verify(user.password, row["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}
