"""
FastAPI app definition and router registration.
"""
from fastapi import FastAPI
try:
    from .auth import auth_router, init_db
    from .chatbot import chatbot_router
    from .stats import stats_router
except ImportError:
    from auth import auth_router, init_db
    from chatbot import chatbot_router
    from stats import stats_router
try:
    from .replays import replays_router
except ImportError:
    from replays import replays_router
from fastapi.middleware.cors import CORSMiddleware
import os


app = FastAPI()

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
@app.get("/api/health")
def health_check():
    """Health check endpoint for uptime monitoring."""
    return {"status": "ok", "service": "grumpy-gamer-api"}

app.include_router(auth_router, prefix="/api")
app.include_router(chatbot_router, prefix="/api")
app.include_router(stats_router, prefix="/api")
app.include_router(replays_router, prefix="/api")


@app.on_event("startup")
def on_startup():
    try:
        init_db()
    except Exception as e:
        print(f"[startup] Warning: Could not initialise database: {e}")


@app.get("/")
def root():
    return {"status": "ok", "message": "Welcome to the Grumpy Gamer API"}
