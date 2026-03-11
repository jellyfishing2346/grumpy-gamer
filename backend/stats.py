"""
Analytics API endpoints for recording and summarising game results.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel

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


@stats_router.post("/stats/coach")
def get_coach_feedback(token_email: str = Depends(verify_access_token)):
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

    client = anthropic.Anthropic()
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        messages=[{"role": "user", "content": f"""You are a friendly game coach. Based on these stats, give encouraging feedback.

{stats_lines}

Respond ONLY with JSON, no markdown:
{{"glows": ["positive thing 1", "positive thing 2"], "grows": ["tip 1", "tip 2"], "summary": "one encouraging sentence"}}"""}]
    )
    text = message.content[0].text.strip()
    return json.loads(text)
