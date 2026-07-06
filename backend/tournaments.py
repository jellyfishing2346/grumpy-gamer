"""
Tournament system with Grumpy Coins entry fees and prize pools.
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

try:
    from .auth import get_db
    from .jwt_utils import verify_access_token
except ImportError:
    from auth import get_db
    from jwt_utils import verify_access_token

tournaments_router = APIRouter(tags=["Tournaments"])

PRIZE_DISTRIBUTION = {1: 0.60, 2: 0.30, 3: 0.10}  # 60%, 30%, 10%


class CreateTournamentRequest(BaseModel):
    name: str
    game: str = "tictactoe"
    entry_fee: int = 50
    max_players: int = 8


class JoinTournamentRequest(BaseModel):
    tournament_id: str


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
        """SELECT t.*, COUNT(tp.id) as player_count
           FROM tournaments t
           LEFT JOIN tournament_players tp ON t.id = tp.tournament_id
           GROUP BY t.id
           ORDER BY t.created_at DESC LIMIT 20"""
    )
    rows = cursor.fetchall()
    conn.close()
    return {"tournaments": [dict(r) for r in rows]}


@tournaments_router.post("/tournaments/create")
def create_tournament(
    req: CreateTournamentRequest,
    token_email: str = Depends(verify_access_token)
):
    """Create a new tournament."""
    try:
        init_tournaments_db()
    except Exception:
        pass
    conn = get_db()
    cursor = conn.cursor()

    # Check user has enough coins
    cursor.execute(
        "SELECT COALESCE(coins_balance, 0) as balance FROM users WHERE email = %s",
        (token_email,)
    )
    row = cursor.fetchone()
    if not row or row["balance"] < req.entry_fee:
        conn.close()
        raise HTTPException(status_code=400, detail="Insufficient Grumpy Coins")

    tournament_id = str(uuid.uuid4())[:8].upper()

    # Deduct entry fee and create tournament
    cursor.execute(
        "UPDATE users SET coins_balance = coins_balance - %s WHERE email = %s",
        (req.entry_fee, token_email)
    )
    cursor.execute(
        "INSERT INTO coin_transactions (email, amount, reason) VALUES (%s, %s, %s)",
        (token_email, -req.entry_fee, f"Tournament entry: {req.name}")
    )
    cursor.execute(
        """INSERT INTO tournaments (id, name, game, entry_fee, max_players, prize_pool, created_by)
           VALUES (%s, %s, %s, %s, %s, %s, %s)""",
        (tournament_id, req.name, req.game, req.entry_fee, req.max_players, req.entry_fee, token_email)
    )
    cursor.execute(
        "SELECT username FROM users WHERE email = %s", (token_email,)
    )
    username = cursor.fetchone()["username"]
    cursor.execute(
        "INSERT INTO tournament_players (tournament_id, email, username) VALUES (%s, %s, %s)",
        (tournament_id, token_email, username)
    )
    conn.commit()
    conn.close()
    return {"tournament_id": tournament_id, "message": f"Tournament created! Entry fee: {req.entry_fee} coins"}


@tournaments_router.post("/tournaments/join")
def join_tournament(
    req: JoinTournamentRequest,
    token_email: str = Depends(verify_access_token)
):
    """Join an existing tournament."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM tournaments WHERE id = %s", (req.tournament_id,))
    tournament = cursor.fetchone()
    if not tournament:
        conn.close()
        raise HTTPException(status_code=404, detail="Tournament not found")
    if tournament["status"] != "open":
        conn.close()
        raise HTTPException(status_code=400, detail="Tournament is not open")

    cursor.execute(
        "SELECT COUNT(*) as count FROM tournament_players WHERE tournament_id = %s",
        (req.tournament_id,)
    )
    player_count = cursor.fetchone()["count"]
    if player_count >= tournament["max_players"]:
        conn.close()
        raise HTTPException(status_code=400, detail="Tournament is full")

    cursor.execute(
        "SELECT id FROM tournament_players WHERE tournament_id = %s AND email = %s",
        (req.tournament_id, token_email)
    )
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Already joined this tournament")

    cursor.execute(
        "SELECT COALESCE(coins_balance, 0) as balance FROM users WHERE email = %s",
        (token_email,)
    )
    balance = cursor.fetchone()["balance"]
    if balance < tournament["entry_fee"]:
        conn.close()
        raise HTTPException(status_code=400, detail="Insufficient Grumpy Coins")

    cursor.execute(
        "UPDATE users SET coins_balance = coins_balance - %s WHERE email = %s",
        (tournament["entry_fee"], token_email)
    )
    cursor.execute(
        "INSERT INTO coin_transactions (email, amount, reason) VALUES (%s, %s, %s)",
        (token_email, -tournament["entry_fee"], f"Tournament entry: {tournament['name']}")
    )
    cursor.execute(
        "UPDATE tournaments SET prize_pool = prize_pool + %s WHERE id = %s",
        (tournament["entry_fee"], req.tournament_id)
    )
    cursor.execute("SELECT username FROM users WHERE email = %s", (token_email,))
    username = cursor.fetchone()["username"]
    cursor.execute(
        "INSERT INTO tournament_players (tournament_id, email, username) VALUES (%s, %s, %s)",
        (req.tournament_id, token_email, username)
    )

    new_count = player_count + 1
    if new_count >= tournament["max_players"]:
        cursor.execute(
            "UPDATE tournaments SET status = 'in_progress' WHERE id = %s",
            (req.tournament_id,)
        )

    conn.commit()
    conn.close()
    return {"message": f"Joined tournament! Entry fee: {tournament['entry_fee']} coins deducted"}


@tournaments_router.get("/tournaments/{tournament_id}")
def get_tournament(tournament_id: str):
    """Get tournament details and player list."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tournaments WHERE id = %s", (tournament_id,))
    tournament = cursor.fetchone()
    if not tournament:
        conn.close()
        raise HTTPException(status_code=404, detail="Tournament not found")
    cursor.execute(
        "SELECT username, email, placement, prize_won, joined_at "
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
        """SELECT t.*, tp.placement, tp.prize_won
           FROM tournaments t
           JOIN tournament_players tp ON t.id = tp.tournament_id
           WHERE tp.email = %s
           ORDER BY t.created_at DESC""",
        (token_email,)
    )
    rows = cursor.fetchall()
    conn.close()
    return {"tournaments": [dict(r) for r in rows]}
