"""
Grumpy Coins — virtual currency system for Grumpy Gamer.
Users earn coins for playing games and can spend them on premium features.
"""
import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
try:
    from .auth import get_db
    from .jwt_utils import verify_access_token
    from .ledger import apply_coin_change, client_ip, reward_gameplay, user_or_ip_key
    from .limiter import limiter
except ImportError:
    from auth import get_db
    from jwt_utils import verify_access_token
    from ledger import apply_coin_change, client_ip, reward_gameplay, user_or_ip_key
    from limiter import limiter

coins_router = APIRouter(tags=["Coins"])


def award_coins(email: str, outcome: str, game: str, ip: Optional[str] = None) -> dict:
    """
    Award coins for a finished game, subject to the anti-farming rules in
    ledger.reward_gameplay. Returns {"coins_earned": int, "limited": str | None}.
    """
    conn = get_db()
    try:
        result = reward_gameplay(conn.cursor(), email, outcome, game, ip)
        conn.commit()
        return result
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


@coins_router.get("/coins/balance")
def get_balance(token_email: str = Depends(verify_access_token)):
    """Get the current coin balance for the authenticated user."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT COALESCE(coins_balance, 100) as balance FROM users WHERE email = %s",
        (token_email,)
    )
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return {"email": token_email, "balance": row["balance"]}


@coins_router.get("/coins/transactions")
def get_transactions(token_email: str = Depends(verify_access_token)):
    """Get the coin transaction history for the authenticated user."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """SELECT amount, reason, created_at
           FROM coin_transactions
           WHERE email = %s
           ORDER BY created_at DESC
           LIMIT 50""",
        (token_email,)
    )
    rows = cursor.fetchall()
    conn.close()
    return {
        "transactions": [
            {
                "amount": r["amount"],
                "reason": r["reason"],
                "created_at": str(r["created_at"]),
            }
            for r in rows
        ]
    }


@coins_router.get("/coins/leaderboard")
def get_leaderboard():
    """Get the top 10 richest players by coin balance."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """SELECT username, COALESCE(coins_balance, 100) as balance
           FROM users
           ORDER BY balance DESC
           LIMIT 10"""
    )
    rows = cursor.fetchall()
    conn.close()
    return {
        "leaderboard": [
            {"username": r["username"] or "Anonymous", "balance": r["balance"]}
            for r in rows
        ]
    }


class SpendCoinsRequest(BaseModel):
    # gt=0: a negative "spend" used to add coins to the balance.
    amount: int = Field(..., gt=0, le=100_000)
    reason: str = Field(..., min_length=1, max_length=200)


@coins_router.post("/coins/spend")
@limiter.limit("20/minute", key_func=user_or_ip_key)
@limiter.limit("60/minute")
def spend_coins(request: Request, req: SpendCoinsRequest, token_email: str = Depends(verify_access_token)):
    """Spend coins on a feature."""
    conn = get_db()
    try:
        balance = apply_coin_change(
            conn.cursor(), token_email, -req.amount, "spend", req.reason, client_ip(request)
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return {"msg": "Coins spent", "spent": req.amount, "reason": req.reason, "balance": balance}


# ─── Admin: audit log and fraud alerts (issue #232) ──────────────────────────

def require_admin(token_email: str = Depends(verify_access_token)) -> str:
    """Admins are listed in the ADMIN_EMAILS env var (comma-separated). Unset means nobody."""
    admins = {e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()}
    if token_email.lower() not in admins:
        raise HTTPException(status_code=403, detail="Admin only")
    return token_email


@coins_router.get("/admin/coin-alerts")
def list_coin_alerts(
    include_resolved: bool = False,
    limit: int = Query(100, ge=1, le=500),
    _admin: str = Depends(require_admin),
):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """SELECT id, rule, email, ip, details, resolved, created_at FROM coin_alerts
           WHERE %s OR NOT resolved ORDER BY created_at DESC LIMIT %s""",
        (include_resolved, limit),
    )
    rows = cursor.fetchall()
    conn.close()
    return {"alerts": [{**dict(r), "created_at": str(r["created_at"])} for r in rows]}


@coins_router.post("/admin/coin-alerts/{alert_id}/resolve")
def resolve_coin_alert(alert_id: int, _admin: str = Depends(require_admin)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE coin_alerts SET resolved = TRUE WHERE id = %s RETURNING id", (alert_id,))
    found = cursor.fetchone()
    conn.commit()
    conn.close()
    if not found:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"resolved": alert_id}


@coins_router.get("/admin/coin-audit")
def coin_audit_log(
    email: Optional[str] = None,
    ip: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000),
    _admin: str = Depends(require_admin),
):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """SELECT id, email, amount, kind, reason, balance_after, ip, metadata, created_at
           FROM coin_audit_log
           WHERE (%s::text IS NULL OR email = %s) AND (%s::text IS NULL OR ip = %s)
           ORDER BY id DESC LIMIT %s""",
        (email, email, ip, ip, limit),
    )
    rows = cursor.fetchall()
    conn.close()
    return {"entries": [{**dict(r), "created_at": str(r["created_at"])} for r in rows]}
