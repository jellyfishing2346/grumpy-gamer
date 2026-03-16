"""
Replay API endpoints for recording and retrieving game moves.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Any

try:
    from .auth import get_db
    from .jwt_utils import verify_access_token
except ImportError:
    from auth import get_db
    from jwt_utils import verify_access_token

replays_router = APIRouter()


class MoveRecord(BaseModel):
    session_id: int
    move_number: int
    move_data: Any  # flexible JSON: board state, piece moved, guess, etc.


@replays_router.post("/replays/moves")
def record_move(
    move: MoveRecord,
    token_email: str = Depends(verify_access_token)
):
    """Record a single move for a game session."""
    import json
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO game_moves (session_id, move_number, move_data)
        VALUES (%s, %s, %s)
        """,
        (move.session_id, move.move_number, json.dumps(move.move_data))
    )
    conn.commit()
    conn.close()
    return {"msg": "Move recorded"}


@replays_router.get("/replays")
def list_replays(token_email: str = Depends(verify_access_token)):
    """List the authenticated user's past game sessions that have recorded moves."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT
            gr.id AS session_id,
            gr.game,
            gr.outcome,
            gr.played_at,
            COUNT(gm.id) AS move_count
        FROM game_results gr
        LEFT JOIN game_moves gm ON gm.session_id = gr.id
        WHERE gr.email = %s
        GROUP BY gr.id, gr.game, gr.outcome, gr.played_at
        HAVING COUNT(gm.id) > 0
        ORDER BY gr.played_at DESC
        LIMIT 50
        """,
        (token_email,)
    )
    rows = cursor.fetchall()
    conn.close()
    return {
        "replays": [
            {
                "session_id": r["session_id"],
                "game": r["game"],
                "outcome": r["outcome"],
                "played_at": str(r["played_at"]),
                "move_count": r["move_count"],
            }
            for r in rows
        ]
    }


@replays_router.get("/replays/{session_id}")
def get_replay(
    session_id: int,
    token_email: str = Depends(verify_access_token)
):
    """Fetch all moves for a specific game session (must belong to the user)."""
    conn = get_db()
    cursor = conn.cursor()

    # Verify the session belongs to the user
    cursor.execute(
        "SELECT id, game, outcome, played_at FROM game_results WHERE id = %s AND email = %s",
        (session_id, token_email)
    )
    session = cursor.fetchone()
    if not session:
        conn.close()
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Replay not found")

    # Fetch all moves ordered by move number
    cursor.execute(
        """
        SELECT move_number, move_data, played_at
        FROM game_moves
        WHERE session_id = %s
        ORDER BY move_number ASC
        """,
        (session_id,)
    )
    moves = cursor.fetchall()
    conn.close()

    return {
        "session_id": session["id"],
        "game": session["game"],
        "outcome": session["outcome"],
        "played_at": str(session["played_at"]),
        "moves": [
            {
                "move_number": m["move_number"],
                "move_data": m["move_data"],
                "played_at": str(m["played_at"]),
            }
            for m in moves
        ]
    }


@replays_router.get("/replays/public/{session_id}")
def get_public_replay(session_id: int):
    """Fetch a replay publicly — no auth required. Anyone with the link can watch."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, game, outcome, played_at FROM game_results WHERE id = %s",
        (session_id,)
    )
    session = cursor.fetchone()
    if not session:
        conn.close()
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Replay not found")
    cursor.execute(
        """
        SELECT move_number, move_data, played_at
        FROM game_moves
        WHERE session_id = %s
        ORDER BY move_number ASC
        """,
        (session_id,)
    )
    moves = cursor.fetchall()
    conn.close()
    return {
        "session_id": session["id"],
        "game": session["game"],
        "outcome": session["outcome"],
        "played_at": str(session["played_at"]),
        "moves": [
            {
                "move_number": m["move_number"],
                "move_data": m["move_data"],
                "played_at": str(m["played_at"]),
            }
            for m in moves
        ]
    }
