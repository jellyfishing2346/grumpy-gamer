"""
Analytics API endpoints for recording and summarising game results.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
try:
    from .auth import get_db
    from .jwt_utils import verify_access_token
except ImportError:
    from auth import get_db
    from jwt_utils import verify_access_token

stats_router = APIRouter()


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
        "INSERT INTO game_results (email, game, outcome) VALUES (%s, %s, %s)",
        (token_email, result.game, result.outcome)
    )
    conn.commit()
    conn.close()
    return {"msg": "Result recorded"}


@stats_router.get("/stats/summary")
def get_summary(token_email: str = Depends(verify_access_token)):
    """Return aggregated win/loss/draw stats per game for the authenticated user."""
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
    return {"stats": [dict(r) for r in rows]}


@stats_router.get("/stats/activity")
def get_activity(token_email: str = Depends(verify_access_token)):
    """Return daily game counts for the past 30 days (for activity heatmap)."""
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
    return {"activity": [{"date": str(r["date"]), "count": r["games_played"]} for r in rows]}


@stats_router.get("/stats/history")
def get_history(token_email: str = Depends(verify_access_token)):
    """Return win rate per day for the past 30 days (for performance over time chart)."""
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
          AND played_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(played_at)
        ORDER BY date
        """,
        (token_email,)
    )
    rows = cursor.fetchall()
    conn.close()
    return {
        "history": [
            {
                "date": str(r["date"]),
                "win_rate": round(r["wins"] / r["total"] * 100, 1) if r["total"] else 0
            }
            for r in rows
        ]
    }
