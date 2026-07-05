"""
Grumpy Coins — virtual currency system for Grumpy Gamer.
Users earn coins for playing games and can spend them on premium features.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
try:
    from .auth import get_db
    from .jwt_utils import verify_access_token
except ImportError:
    from auth import get_db
    from jwt_utils import verify_access_token

coins_router = APIRouter(tags=["Coins"])

COIN_REWARDS = {
    "win": 10,
    "draw": 3,
    "loss": 1,
}


def award_coins(email: str, outcome: str, game: str):
    """Award coins to a user based on game outcome. Called after recordGame."""
    amount = COIN_REWARDS.get(outcome, 1)
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE users SET coins_balance = COALESCE(coins_balance, 100) + %s WHERE email = %s",
            (amount, email)
        )
        cursor.execute(
            "INSERT INTO coin_transactions (email, amount, reason) VALUES (%s, %s, %s)",
            (email, amount, f"{outcome} at {game}")
        )
        conn.commit()
    finally:
        conn.close()
    return amount


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
    amount: int
    reason: str


@coins_router.post("/coins/spend")
def spend_coins(req: SpendCoinsRequest, token_email: str = Depends(verify_access_token)):
    """Spend coins on a feature."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT COALESCE(coins_balance, 100) as balance FROM users WHERE email = %s",
        (token_email,)
    )
    row = cursor.fetchone()
    if not row or row["balance"] < req.amount:
        conn.close()
        raise HTTPException(status_code=400, detail="Insufficient coins")
    cursor.execute(
        "UPDATE users SET coins_balance = coins_balance - %s WHERE email = %s",
        (req.amount, token_email)
    )
    cursor.execute(
        "INSERT INTO coin_transactions (email, amount, reason) VALUES (%s, %s, %s)",
        (token_email, -req.amount, req.reason)
    )
    conn.commit()
    conn.close()
    return {"msg": "Coins spent", "spent": req.amount, "reason": req.reason}
