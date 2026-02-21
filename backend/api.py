"""
FastAPI app definition and router registration.
"""

from fastapi import FastAPI
try:
    from .auth import auth_router
    from .chatbot import chatbot_router
except ImportError:
    from auth import auth_router
    from chatbot import chatbot_router
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

import os
ENV = os.environ.get("ENV", "development")
if ENV == "production":
    origins = ["https://grumpy-gamer.vercel.app"]
else:
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
