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
