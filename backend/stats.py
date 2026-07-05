"""
Analytics API endpoints for recording and summarising game results.
"""
import time
from fastapi import APIRouter, Depends, Query, Request
try:
    from .limiter import limiter
except ImportError:
    from limiter import limiter
from pydantic import BaseModel
try:
    from .auth import get_db
    from .jwt_utils import verify_access_token
except ImportError:
    from auth import get_db
    from jwt_utils import verify_access_token

try:
    from coins import award_coins
except ImportError:
    def award_coins(email, outcome, game): return 0

stats_router = APIRouter(tags=["Stats"])

# Simple in-memory cache: { cache_key: { "data": ..., "expires_at": float } }
_cache: dict = {}
CACHE_TTL = 60  # seconds


def cache_get(key: str):
    entry = _cache.get(key)
    if entry and entry["expires_at"] > time.time():
        return entry["data"]
    return None


def cache_set(key: str, data):
    _cache[key] = {"data": data, "expires_at": time.time() + CACHE_TTL}


def cache_invalidate(email: str):
    """Invalidate all cached entries for a user."""
    keys_to_delete = [k for k in _cache if k.startswith(f"{email}:")]
    for k in keys_to_delete:
        del _cache[k]


class GameResult(BaseModel):
    game: str
    outcome: str  # "win", "loss", or "draw"


@stats_router.post("/stats/record")
def record_result(
    result: GameResult,
    token_email: str = Depends(verify_access_token)
):
    """Record a single game result for the authenticated user."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO game_results (email, game, outcome) VALUES (%s, %s, %s) RETURNING id",
        (token_email, result.game, result.outcome)
    )
    session_id = cursor.fetchone()["id"]
    conn.commit()
    conn.close()
    # Invalidate cache for this user
    cache_invalidate(token_email)
    # Award coins based on outcome
    coins_earned = award_coins(token_email, result.outcome, result.game)
    return {"msg": "Result recorded", "session_id": session_id, "coins_earned": coins_earned}


@stats_router.get("/stats/summary")
def get_summary(token_email: str = Depends(verify_access_token)):
    """Return aggregated win/loss/draw stats per game for the authenticated user."""
    cache_key = f"{token_email}:summary"
    cached = cache_get(cache_key)
    if cached:
        return cached

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT
            game,
            COUNT(*) FILTER (WHERE outcome = 'win')  AS wins,
            COUNT(*) FILTER (WHERE outcome = 'loss') AS losses,
            COUNT(*) FILTER (WHERE outcome = 'draw') AS draws,
            COUNT(*) AS total
        FROM game_results
        WHERE email = %s
        GROUP BY game
        ORDER BY game
        """,
        (token_email,)
    )
    rows = cursor.fetchall()
    conn.close()
    result = {"stats": [dict(r) for r in rows]}
    cache_set(cache_key, result)
    return result


@stats_router.get("/stats/activity")
def get_activity(token_email: str = Depends(verify_access_token)):
    """Return daily game counts for the past 30 days (for activity heatmap)."""
    cache_key = f"{token_email}:activity"
    cached = cache_get(cache_key)
    if cached:
        return cached

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT
            DATE(played_at) AS date,
            COUNT(*) AS games_played
        FROM game_results
        WHERE email = %s
          AND played_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(played_at)
        ORDER BY date
        """,
        (token_email,)
    )
    rows = cursor.fetchall()
    conn.close()
    result = {"activity": [{"date": str(r["date"]), "count": r["games_played"]} for r in rows]}
    cache_set(cache_key, result)
    return result


@stats_router.get("/stats/history")
def get_history(
    token_email: str = Depends(verify_access_token),
    days: int = Query(30, ge=1, le=365)
):
    """Return win rate per day for the past 30 days (for performance over time chart)."""
    cache_key = f"{token_email}:history"
    cached = cache_get(cache_key)
    if cached:
        return cached

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT
            DATE(played_at) AS date,
            COUNT(*) FILTER (WHERE outcome = 'win')  AS wins,
            COUNT(*) AS total
        FROM game_results
        WHERE email = %s
          AND played_at >= NOW() - INTERVAL '1 day' * %s
        GROUP BY DATE(played_at)
        ORDER BY date
        """,
        (token_email, days)
    )
    rows = cursor.fetchall()
    conn.close()
    result = {
        "days": days,
        "history": [
            {
                "date": str(r["date"]),
                "win_rate": round(r["wins"] / r["total"] * 100, 1) if r["total"] else 0
            }
            for r in rows
        ]
    }
    cache_set(cache_key, result)
    return result


@stats_router.post("/stats/coach")
@limiter.limit("5/minute")
def get_coach_feedback(request: Request, token_email: str = Depends(verify_access_token)):
    """Return AI-generated glows and grows feedback based on the user's game history."""
    import anthropic
    import json
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT game, outcome FROM game_results WHERE email = %s ORDER BY played_at DESC LIMIT 50",
        (token_email,)
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    if not rows:
        return {
            "glows": ["You're just getting started!"],
            "grows": ["Play some games to get personalized tips."],
            "summary": "Every game is a chance to learn."
        }
    stats_text = {}
    for row in rows:
        game, outcome = row["game"], row["outcome"]
        if game not in stats_text:
            stats_text[game] = {"win": 0, "loss": 0, "draw": 0}
        stats_text[game][outcome] = stats_text[game].get(outcome, 0) + 1
    stats_lines = "\n".join(
        f"{g}: {v.get('win', 0)}W / {v.get('loss', 0)}L / {v.get('draw', 0)}D"
        for g, v in stats_text.items()
    )
    prompt = (
        "You are a friendly game coach. Based on these stats, give encouraging feedback.\n\n"
        f"{stats_lines}\n\n"
        "Respond ONLY with JSON, no markdown:\n"
        '{"glows": ["positive thing 1", "positive thing 2"], '
        '"grows": ["tip 1", "tip 2"], "summary": "one encouraging sentence"}'
    )
    client = anthropic.Anthropic()
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}]
    )
    text = message.content[0].text.strip()
    return json.loads(text)
