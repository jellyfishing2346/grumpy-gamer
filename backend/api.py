import os
import asyncio
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[StarletteIntegration(), FastApiIntegration()],
        traces_sample_rate=0.2,
        environment=os.getenv("ENVIRONMENT", "production"),
    )

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
import asyncio


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



async def keep_alive_ping():
    """Ping the health endpoint every 10 minutes to prevent Render spin-down."""
    import httpx
    await asyncio.sleep(60)  # Wait 1 minute after startup before first ping
    while True:
        try:
            base_url = os.getenv("RENDER_EXTERNAL_URL", "")
            if base_url:
                async with httpx.AsyncClient() as client:
                    await client.get(f"{base_url}/api/health", timeout=10)
                    print("[keep-alive] Ping sent successfully")
        except Exception as e:
            print(f"[keep-alive] Ping failed: {e}")
        await asyncio.sleep(600)  # Wait 10 minutes


@app.on_event("startup")
async def on_startup():
    try:
        init_db()
    except Exception as e:
        print(f"[startup] Warning: Could not initialise database: {e}")
    asyncio.create_task(keep_alive_ping())


@app.get("/")
def root():
    return {"status": "ok", "message": "Welcome to the Grumpy Gamer API"}
