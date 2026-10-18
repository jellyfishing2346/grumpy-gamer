"""
Tournament system with Grumpy Coins entry fees and prize pools.
"""
import uuid
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

try:
    from .auth import get_db
    from .jwt_utils import verify_access_token
    from .ledger import apply_coin_change, client_ip, user_or_ip_key
    from .limiter import limiter
except ImportError:
    from auth import get_db
    from jwt_utils import verify_access_token
    from ledger import apply_coin_change, client_ip, user_or_ip_key
    from limiter import limiter

tournaments_router = APIRouter(tags=["Tournaments"])

PRIZE_DISTRIBUTION = {1: 0.60, 2: 0.30, 3: 0.10}  # 60%, 30%, 10%


class CreateTournamentRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    game: Literal["tictactoe", "connectfour", "wordle"] = "tictactoe"
    # ge=0: a negative fee used to credit coins instead of charging them.
    entry_fee: int = Field(50, ge=0, le=10_000)
    max_players: int = Field(8, ge=2, le=64)


class JoinTournamentRequest(BaseModel):
    tournament_id: str = Field(..., min_length=1, max_length=16)


# Columns safe to show to anyone; emails stay private.
PUBLIC_TOURNAMENT_COLUMNS = (
    "t.id, t.name, t.game, t.entry_fee, t.max_players, t.prize_pool, t.status, t.created_at"
)


def init_tournaments_db():
    """Create tournament tables if they don't exist."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''CREATE TABLE IF NOT EXISTS tournaments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        game TEXT NOT NULL,
        entry_fee INTEGER NOT NULL,
        max_players INTEGER NOT NULL,
        prize_pool INTEGER DEFAULT 0,
        status TEXT DEFAULT 'open',
        winner_email TEXT,
        created_by TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
    )''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS tournament_players (
        id SERIAL PRIMARY KEY,
        tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        username TEXT,
        placement INTEGER,
        prize_won INTEGER DEFAULT 0,
        joined_at TIMESTAMP DEFAULT NOW()
    )''')
    conn.commit()
    conn.close()


@tournaments_router.get("/tournaments")
def list_tournaments():
    """List all open and recent tournaments."""
    try:
        init_tournaments_db()
    except Exception:
        pass
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        f"""SELECT {PUBLIC_TOURNAMENT_COLUMNS}, COUNT(tp.id) as player_count
           FROM tournaments t
           LEFT JOIN tournament_players tp ON t.id = tp.tournament_id
           GROUP BY t.id
           ORDER BY t.created_at DESC LIMIT 20"""
    )
    rows = cursor.fetchall()
    conn.close()
    return {"tournaments": [dict(r) for r in rows]}


@tournaments_router.post("/tournaments/create")
@limiter.limit("5/minute", key_func=user_or_ip_key)
def create_tournament(
    request: Request,
    req: CreateTournamentRequest,
    token_email: str = Depends(verify_access_token)
):
    """Create a new tournament. The creator joins it and pays the entry fee."""
    try:
        init_tournaments_db()
    except Exception:
        pass
    tournament_id = str(uuid.uuid4())[:8].upper()
    conn = get_db()
    try:
        cursor = conn.cursor()
        if req.entry_fee > 0:
            apply_coin_change(
                cursor, token_email, -req.entry_fee, "tournament_entry",
                f"Tournament entry: {req.name}", client_ip(request), {"tournament_id": tournament_id},
            )
        cursor.execute(
            """INSERT INTO tournaments (id, name, game, entry_fee, max_players, prize_pool, created_by)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (tournament_id, req.name, req.game, req.entry_fee, req.max_players, req.entry_fee, token_email)
        )
        cursor.execute("SELECT username FROM users WHERE email = %s", (token_email,))
        username = cursor.fetchone()["username"]
        cursor.execute(
            "INSERT INTO tournament_players (tournament_id, email, username) VALUES (%s, %s, %s)",
            (tournament_id, token_email, username)
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return {"tournament_id": tournament_id, "message": f"Tournament created! Entry fee: {req.entry_fee} coins"}


@tournaments_router.post("/tournaments/join")
@limiter.limit("10/minute", key_func=user_or_ip_key)
def join_tournament(
    request: Request,
    req: JoinTournamentRequest,
    token_email: str = Depends(verify_access_token)
):
    """Join an existing tournament."""
    conn = get_db()
    try:
        cursor = conn.cursor()
        # Lock the tournament so two players can't both take the last seat.
        cursor.execute("SELECT * FROM tournaments WHERE id = %s FOR UPDATE", (req.tournament_id,))
        tournament = cursor.fetchone()
        if not tournament:
            raise HTTPException(status_code=404, detail="Tournament not found")
        if tournament["status"] != "open":
            raise HTTPException(status_code=400, detail="Tournament is not open")

        cursor.execute(
            "SELECT COUNT(*) as count FROM tournament_players WHERE tournament_id = %s",
            (req.tournament_id,)
        )
        player_count = cursor.fetchone()["count"]
        if player_count >= tournament["max_players"]:
            raise HTTPException(status_code=400, detail="Tournament is full")

        cursor.execute(
            "SELECT id FROM tournament_players WHERE tournament_id = %s AND email = %s",
            (req.tournament_id, token_email)
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Already joined this tournament")

        fee = tournament["entry_fee"]
        if fee > 0:
            apply_coin_change(
                cursor, token_email, -fee, "tournament_entry",
                f"Tournament entry: {tournament['name']}", client_ip(request),
                {"tournament_id": req.tournament_id},
            )
            cursor.execute(
                "UPDATE tournaments SET prize_pool = prize_pool + %s WHERE id = %s",
                (fee, req.tournament_id)
            )
        cursor.execute("SELECT username FROM users WHERE email = %s", (token_email,))
        username = cursor.fetchone()["username"]
        cursor.execute(
            "INSERT INTO tournament_players (tournament_id, email, username) VALUES (%s, %s, %s)",
            (req.tournament_id, token_email, username)
        )
        if player_count + 1 >= tournament["max_players"]:
            cursor.execute(
                "UPDATE tournaments SET status = 'in_progress' WHERE id = %s",
                (req.tournament_id,)
            )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return {"message": f"Joined tournament! Entry fee: {fee} coins deducted"}


@tournaments_router.get("/tournaments/{tournament_id}")
def get_tournament(tournament_id: str):
    """Get tournament details and player list."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        f"SELECT {PUBLIC_TOURNAMENT_COLUMNS} FROM tournaments t WHERE t.id = %s", (tournament_id,)
    )
    tournament = cursor.fetchone()
    if not tournament:
        conn.close()
        raise HTTPException(status_code=404, detail="Tournament not found")
    cursor.execute(
        "SELECT username, placement, prize_won, joined_at "
        "FROM tournament_players WHERE tournament_id = %s ORDER BY joined_at",
        (tournament_id,)
    )
    players = cursor.fetchall()
    conn.close()
    return {
        "tournament": dict(tournament),
        "players": [dict(p) for p in players],
        "prize_breakdown": {
            "1st place": int(tournament["prize_pool"] * 0.60),
            "2nd place": int(tournament["prize_pool"] * 0.30),
            "3rd place": int(tournament["prize_pool"] * 0.10),
        }
    }


@tournaments_router.get("/tournaments/my/history")
def my_tournaments(token_email: str = Depends(verify_access_token)):
    """Get all tournaments the user has participated in."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        f"""SELECT {PUBLIC_TOURNAMENT_COLUMNS}, tp.placement, tp.prize_won
           FROM tournaments t
           JOIN tournament_players tp ON t.id = tp.tournament_id
           WHERE tp.email = %s
           ORDER BY t.created_at DESC""",
        (token_email,)
    )
    rows = cursor.fetchall()
    conn.close()
    return {"tournaments": [dict(r) for r in rows]}
