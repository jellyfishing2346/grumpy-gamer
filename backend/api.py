"""
FastAPI app definition and router registration.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from .auth import auth_router
from .chatbot import chatbot_router


app = FastAPI()

# CORS middleware setup (moved from auth.py)
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


app.include_router(auth_router, prefix="/api")
app.include_router(chatbot_router, prefix="/api")


# Root endpoint for health check and status
@app.get("/")
def root():
    return {"status": "ok", "message": "Welcome to the Grumpy Gamer API"}
