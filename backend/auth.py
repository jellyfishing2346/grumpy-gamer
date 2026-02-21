from fastapi import HTTPException, APIRouter, Depends, Query, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
import sqlite3
from passlib.context import CryptContext
from jwt_utils import verify_access_token, create_access_token


auth_router = APIRouter()


@auth_router.get("/user/info")
async def get_user_info(token_email: str = Depends(verify_access_token)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT username FROM users WHERE email = ?", (token_email,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return {"email": token_email, "username": row[0]}


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
                "UPDATE users SET email = ? WHERE email = ?",
                (update.new_email, target_email)
            )
        except Exception:
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
    cursor.execute(
        "DELETE FROM users WHERE email = ?",
        (target_email,)
    )
    return {"msg": f"Account and all related data deleted for {target_email}"}

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
