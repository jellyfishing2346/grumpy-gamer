"""
Prediction markets on AI vs AI matches (issue #230).

Lifecycle of a match:
  1. open     The server schedules a match between two bots with a secret
              random seed and publishes fixed odds. Users wager coins on
              bot A, bot B or a draw until betting closes.
  2. settled  After betting closes the server plays the match out from the
              seed (ai_arena.play_match), stores the moves for spectating,
              and pays winners stake x odds through the ledger.

There's no background worker (the free Render instance sleeps), so settling
due matches and scheduling new ones happens lazily at the start of the read
endpoints, serialised with a Postgres advisory lock.
"""
import json
import secrets
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

try:
    from . import ai_arena
    from .auth import get_db
    from .jwt_utils import verify_access_token
    from .ledger import apply_coin_change, client_ip, user_or_ip_key
    from .limiter import limiter
except ImportError:
    import ai_arena
    from auth import get_db
    from jwt_utils import verify_access_token
    from ledger import apply_coin_change, client_ip, user_or_ip_key
    from limiter import limiter

predictions_router = APIRouter(tags=["Predictions"])

OPEN_MATCH_TARGET = 3          # keep this many matches open for betting
BETTING_WINDOW_SECONDS = 120   # spacing between consecutive matches closing
MIN_STAKE, MAX_STAKE = 1, 500
LEADERBOARD_MIN_PREDICTIONS = 5
MAINTENANCE_LOCK_KEY = 230_230  # arbitrary advisory lock id (issue number)


def init_predictions_db(cursor) -> None:
    cursor.execute(
        """CREATE TABLE IF NOT EXISTS prediction_matches (
            id SERIAL PRIMARY KEY,
            game TEXT NOT NULL,
            bot_a TEXT NOT NULL,
            bot_b TEXT NOT NULL,
            seed BIGINT NOT NULL,
            odds JSONB NOT NULL,
            status TEXT NOT NULL DEFAULT 'open',
            result TEXT,
            moves JSONB,
            betting_closes_at TIMESTAMPTZ NOT NULL,
            settled_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )"""
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_prediction_matches_status ON prediction_matches(status, betting_closes_at)"
    )
    cursor.execute(
        """CREATE TABLE IF NOT EXISTS predictions (
            id SERIAL PRIMARY KEY,
            match_id INTEGER NOT NULL REFERENCES prediction_matches(id),
            email TEXT NOT NULL,
            pick TEXT NOT NULL,
            stake INTEGER NOT NULL CHECK (stake > 0),
            odds NUMERIC(6, 2) NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            payout INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (match_id, email)
        )"""
    )
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_predictions_email ON predictions(email, created_at)")


# ─── Match lifecycle ──────────────────────────────────────────────────────────

def _schedule_match(cursor) -> None:
    pairings = ai_arena.eligible_pairings()
    game, bot_a, bot_b = pairings[secrets.randbelow(len(pairings))]
    cursor.execute(
        """INSERT INTO prediction_matches (game, bot_a, bot_b, seed, odds, betting_closes_at)
           SELECT %s, %s, %s, %s, %s,
                  GREATEST(NOW(), COALESCE(MAX(betting_closes_at), NOW())) + make_interval(secs => %s)
           FROM prediction_matches WHERE status = 'open'""",
        (game, bot_a, bot_b, secrets.randbits(62), json.dumps(ai_arena.odds_for(game, bot_a, bot_b)),
         BETTING_WINDOW_SECONDS),
    )


def _settle(cursor, match: dict) -> None:
    result, moves = ai_arena.play_match(match["game"], match["bot_a"], match["bot_b"], match["seed"])
    cursor.execute(
        """UPDATE prediction_matches SET status = 'settled', result = %s, moves = %s, settled_at = NOW()
           WHERE id = %s AND status = 'open' RETURNING id""",
        (result, json.dumps(moves), match["id"]),
    )
    if cursor.fetchone() is None:
        return  # already settled
    cursor.execute(
        "SELECT id, email, pick, stake, odds FROM predictions WHERE match_id = %s AND status = 'pending'",
        (match["id"],),
    )
    for bet in cursor.fetchall():
        if bet["pick"] == result:
            payout = int(bet["stake"] * bet["odds"])  # round down
            apply_coin_change(
                cursor, bet["email"], payout, "prediction_payout",
                f"Prediction won: match #{match['id']}", None,
                {"match_id": match["id"], "prediction_id": bet["id"]},
            )
            cursor.execute(
                "UPDATE predictions SET status = 'won', payout = %s WHERE id = %s", (payout, bet["id"])
            )
        else:
            cursor.execute("UPDATE predictions SET status = 'lost' WHERE id = %s", (bet["id"],))


def maintain_matches(cursor) -> None:
    """Settle matches whose betting has closed, then top up the open matches."""
    cursor.execute("SELECT pg_try_advisory_xact_lock(%s) AS locked", (MAINTENANCE_LOCK_KEY,))
    if not cursor.fetchone()["locked"]:
        return  # another request is doing it right now
    cursor.execute(
        """SELECT id, game, bot_a, bot_b, seed FROM prediction_matches
           WHERE status = 'open' AND betting_closes_at <= NOW()
           ORDER BY betting_closes_at FOR UPDATE"""
    )
    for match in cursor.fetchall():
        _settle(cursor, match)
    cursor.execute("SELECT COUNT(*) AS n FROM prediction_matches WHERE status = 'open'")
    for _ in range(max(0, OPEN_MATCH_TARGET - cursor.fetchone()["n"])):
        _schedule_match(cursor)


def _with_maintenance(fn):
    """Run maintenance and the read in one transaction."""
    conn = get_db()
    try:
        cursor = conn.cursor()
        maintain_matches(cursor)
        result = fn(cursor)
        conn.commit()
        return result
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _public_match(row: dict, include_moves: bool = False) -> dict:
    """Shape a match for clients. The seed is never exposed."""
    out = {
        "id": row["id"],
        "game": row["game"],
        "game_label": ai_arena.GAMES[row["game"]]["label"],
        "bot_a": {"id": row["bot_a"], "name": ai_arena.bot_name(row["game"], row["bot_a"])},
        "bot_b": {"id": row["bot_b"], "name": ai_arena.bot_name(row["game"], row["bot_b"])},
        "odds": row["odds"],
        "status": row["status"],
        "result": row["result"],
        "seconds_left": max(0, int(row["seconds_left"])) if row["status"] == "open" else 0,
    }
    if include_moves and row["status"] == "settled":
        out["moves"] = row["moves"]
    return out


MATCH_COLUMNS = """id, game, bot_a, bot_b, odds, status, result, moves,
                   EXTRACT(EPOCH FROM betting_closes_at - NOW()) AS seconds_left"""


# ─── Endpoints ────────────────────────────────────────────────────────────────

@predictions_router.get("/predictions/matches")
def list_matches():
    """Open matches to bet on, plus recently settled ones to watch."""
    def read(cursor):
        cursor.execute(
            f"SELECT {MATCH_COLUMNS} FROM prediction_matches WHERE status = 'open' ORDER BY betting_closes_at"
        )
        open_matches = [_public_match(r) for r in cursor.fetchall()]
        cursor.execute(
            f"""SELECT {MATCH_COLUMNS} FROM prediction_matches WHERE status = 'settled'
                ORDER BY settled_at DESC LIMIT 10"""
        )
        recent = [_public_match(r) for r in cursor.fetchall()]
        return {"open": open_matches, "recent": recent}

    return _with_maintenance(read)


@predictions_router.get("/predictions/matches/{match_id}")
def get_match(match_id: int):
    """One match. Settled matches include their moves for the spectator replay."""
    def read(cursor):
        cursor.execute(f"SELECT {MATCH_COLUMNS} FROM prediction_matches WHERE id = %s", (match_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Match not found")
        return _public_match(row, include_moves=True)

    return _with_maintenance(read)


class WagerRequest(BaseModel):
    match_id: int
    pick: Literal["a", "b", "draw"]
    stake: int = Field(..., ge=MIN_STAKE, le=MAX_STAKE)


@predictions_router.post("/predictions/wager")
@limiter.limit("10/minute", key_func=user_or_ip_key)
@limiter.limit("30/minute")
def place_wager(request: Request, req: WagerRequest, token_email: str = Depends(verify_access_token)):
    conn = get_db()
    try:
        cursor = conn.cursor()
        # Share-lock the match so it can't be settled while this bet is placed.
        cursor.execute(
            """SELECT id, odds, status, betting_closes_at > NOW() AS accepting
               FROM prediction_matches WHERE id = %s FOR SHARE""",
            (req.match_id,),
        )
        match = cursor.fetchone()
        if not match:
            raise HTTPException(status_code=404, detail="Match not found")
        if match["status"] != "open" or not match["accepting"]:
            raise HTTPException(status_code=400, detail="Betting is closed for this match")
        odds = match["odds"].get(req.pick)
        if odds is None:
            raise HTTPException(status_code=400, detail="That outcome isn't offered for this match")

        cursor.execute(
            """INSERT INTO predictions (match_id, email, pick, stake, odds) VALUES (%s, %s, %s, %s, %s)
               ON CONFLICT (match_id, email) DO NOTHING RETURNING id""",
            (req.match_id, token_email, req.pick, req.stake, odds),
        )
        inserted = cursor.fetchone()
        if inserted is None:
            raise HTTPException(status_code=409, detail="You already have a prediction on this match")
        balance = apply_coin_change(
            cursor, token_email, -req.stake, "prediction_stake",
            f"Prediction on match #{req.match_id}", client_ip(request),
            {"match_id": req.match_id, "prediction_id": inserted["id"], "pick": req.pick},
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return {
        "prediction_id": inserted["id"],
        "match_id": req.match_id,
        "pick": req.pick,
        "stake": req.stake,
        "odds": odds,
        "potential_payout": int(req.stake * odds),
        "balance": balance,
    }


@predictions_router.get("/predictions/my")
def my_predictions(token_email: str = Depends(verify_access_token)):
    """The user's prediction history and win rate."""
    def read(cursor):
        cursor.execute(
            """SELECT p.id, p.match_id, p.pick, p.stake, p.odds, p.status, p.payout, p.created_at,
                      m.game, m.bot_a, m.bot_b, m.result
               FROM predictions p JOIN prediction_matches m ON m.id = p.match_id
               WHERE p.email = %s ORDER BY p.created_at DESC LIMIT 50""",
            (token_email,),
        )
        rows = cursor.fetchall()
        cursor.execute(
            """SELECT COUNT(*) AS total,
                      COUNT(*) FILTER (WHERE status <> 'pending') AS settled,
                      COUNT(*) FILTER (WHERE status = 'won') AS won,
                      COALESCE(SUM(stake) FILTER (WHERE status <> 'pending'), 0) AS staked,
                      COALESCE(SUM(payout), 0) AS returned
               FROM predictions WHERE email = %s""",
            (token_email,),
        )
        s = cursor.fetchone()
        return {
            "summary": {
                "total": s["total"],
                "settled": s["settled"],
                "won": s["won"],
                "win_rate": round(100 * s["won"] / s["settled"], 1) if s["settled"] else None,
                "net": int(s["returned"]) - int(s["staked"]),
            },
            "predictions": [
                {
                    "id": r["id"],
                    "match_id": r["match_id"],
                    "game_label": ai_arena.GAMES[r["game"]]["label"],
                    "matchup": f"{ai_arena.bot_name(r['game'], r['bot_a'])} vs "
                               f"{ai_arena.bot_name(r['game'], r['bot_b'])}",
                    "pick": r["pick"],
                    "stake": r["stake"],
                    "odds": float(r["odds"]),
                    "status": r["status"],
                    "payout": r["payout"],
                    "result": r["result"],
                    "created_at": str(r["created_at"]),
                }
                for r in rows
            ],
        }

    return _with_maintenance(read)


@predictions_router.get("/predictions/leaderboard")
def prediction_leaderboard():
    """Best predictors by net coins won (minimum number of settled predictions)."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """SELECT COALESCE(u.username, 'Anonymous') AS username,
                  COUNT(*) AS settled,
                  COUNT(*) FILTER (WHERE p.status = 'won') AS won,
                  SUM(p.payout) - SUM(p.stake) AS net
           FROM predictions p JOIN users u ON u.email = p.email
           WHERE p.status <> 'pending'
           GROUP BY p.email, u.username
           HAVING COUNT(*) >= %s
           ORDER BY net DESC, won DESC
           LIMIT 10""",
        (LEADERBOARD_MIN_PREDICTIONS,),
    )
    rows = cursor.fetchall()
    conn.close()
    return {
        "min_predictions": LEADERBOARD_MIN_PREDICTIONS,
        "leaderboard": [
            {
                "username": r["username"],
                "settled": r["settled"],
                "won": r["won"],
                "accuracy": round(100 * r["won"] / r["settled"], 1),
                "net": int(r["net"]),
            }
            for r in rows
        ],
    }
