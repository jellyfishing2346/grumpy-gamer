"""
FastAPI app definition and router registration.
"""

from fastapi import FastAPI
from .auth import auth_router

app = FastAPI()
app.include_router(auth_router)


# Root endpoint for health check and status
@app.get("/")
def root():
    return {"status": "ok", "message": "Welcome to the Grumpy Gamer API"}
