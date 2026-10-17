"""
Coin ledger: the single place where coin balances change (issue #232).

Every credit or debit goes through `apply_coin_change`, which:
  * changes the balance atomically, refusing anything that would go negative
    (one conditional UPDATE, so concurrent requests can't double-spend),
  * writes an append-only audit log row with the balance after, client IP and
    metadata,
  * runs fraud checks and raises alerts for suspicious patterns.

Gameplay rewards additionally go through `reward_gameplay`, which enforces a
cooldown between rewarded games plus daily caps per account and per IP, so
scripting /stats/record can't farm unlimited coins.

All functions take an open cursor and never commit: the caller commits once,
so the balance change, audit row and whatever else the endpoint does succeed
or fail together.
"""
import json
import logging
import os
from typing import Optional

import jwt
from fastapi import HTTPException, Request

try:
    from .jwt_utils import ALGORITHM, SECRET_KEY
except ImportError:
    from jwt_utils import ALGORITHM, SECRET_KEY

log = logging.getLogger("grumpy.ledger")


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except ValueError:
        return default


STARTING_BALANCE = 100

# Gameplay reward rules
COIN_REWARDS = {"win": 10, "draw": 3, "loss": 1, "abandoned": 0}
MIN_SECONDS_BETWEEN_REWARDS = _env_int("COIN_MIN_SECONDS_BETWEEN_REWARDS", 15)
DAILY_EARN_CAP = _env_int("COIN_DAILY_EARN_CAP", 150)        # per account
IP_DAILY_EARN_CAP = _env_int("COIN_IP_DAILY_EARN_CAP", 400)  # across all accounts on one IP

# Fraud alert thresholds
VELOCITY_WINDOW_MINUTES = 10
VELOCITY_MAX_EVENTS = 25           # reward attempts (granted or denied) per window
SHARED_IP_ACCOUNT_THRESHOLD = 4    # distinct accounts earning from one IP per day
LARGE_CREDIT_THRESHOLD = 1000      # single non-purchase credit
ALERT_DEDUPE_MINUTES = 60

GAMEPLAY_KINDS = ("game_reward", "game_reward_denied")


# ─── Client identity ──────────────────────────────────────────────────────────

def client_ip(request: Optional[Request]) -> str:
    """
    The caller's IP. Behind Render/Fly/Vercel the socket address is the proxy,
    so read X-Forwarded-For. Only the entries appended by our own proxies can
    be trusted (anything to their left was supplied by the client), so take the
    entry TRUSTED_PROXY_HOPS from the right.
    """
    if request is None:
        return "unknown"
    hops = _env_int("TRUSTED_PROXY_HOPS", 1)
    forwarded = request.headers.get("x-forwarded-for", "")
    parts = [p.strip() for p in forwarded.split(",") if p.strip()]
    if hops > 0 and len(parts) >= hops:
        return parts[-hops]
    return request.client.host if request.client else "unknown"


def user_or_ip_key(request: Request) -> str:
    """Rate-limit key: the authenticated user if the token is valid, else the IP."""
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        try:
            payload = jwt.decode(auth[7:], SECRET_KEY, algorithms=[ALGORITHM])
            if payload.get("sub"):
                return "user:" + payload["sub"]
        except jwt.PyJWTError:
            pass
    return "ip:" + client_ip(request)


# ─── Schema ───────────────────────────────────────────────────────────────────

def init_ledger_db(cursor) -> None:
    cursor.execute(
        """CREATE TABLE IF NOT EXISTS coin_audit_log (
            id BIGSERIAL PRIMARY KEY,
            email TEXT NOT NULL,
            amount INTEGER NOT NULL,
            kind TEXT NOT NULL,
            reason TEXT NOT NULL,
            balance_after INTEGER,
            ip TEXT,
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )"""
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_coin_audit_email_time ON coin_audit_log(email, created_at)"
    )
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_coin_audit_ip_time ON coin_audit_log(ip, created_at)")
    # Audit rows are evidence: make the table append-only at the database level.
    cursor.execute(
        """CREATE OR REPLACE FUNCTION coin_audit_log_immutable() RETURNS trigger AS $$
           BEGIN RAISE EXCEPTION 'coin_audit_log is append-only'; END;
           $$ LANGUAGE plpgsql"""
    )
    cursor.execute("DROP TRIGGER IF EXISTS coin_audit_log_no_change ON coin_audit_log")
    cursor.execute(
        """CREATE TRIGGER coin_audit_log_no_change
           BEFORE UPDATE OR DELETE ON coin_audit_log
           FOR EACH ROW EXECUTE FUNCTION coin_audit_log_immutable()"""
    )
    cursor.execute(
        """CREATE TABLE IF NOT EXISTS coin_alerts (
            id BIGSERIAL PRIMARY KEY,
            rule TEXT NOT NULL,
            email TEXT,
            ip TEXT,
            details JSONB NOT NULL DEFAULT '{}'::jsonb,
            resolved BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )"""
    )
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_coin_alerts_open ON coin_alerts(resolved, created_at)")
    cursor.execute(
        """CREATE TABLE IF NOT EXISTS processed_payments (
            session_id TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            coins INTEGER NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )"""
    )


# ─── Core operations ──────────────────────────────────────────────────────────

def _audit(cursor, email, amount, kind, reason, balance_after, ip, metadata) -> None:
    cursor.execute(
        """INSERT INTO coin_audit_log (email, amount, kind, reason, balance_after, ip, metadata)
           VALUES (%s, %s, %s, %s, %s, %s, %s)""",
        (email, amount, kind, reason[:200], balance_after, ip, json.dumps(metadata or {})),
    )


def apply_coin_change(
    cursor,
    email: str,
    amount: int,
    kind: str,
    reason: str,
    ip: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> int:
    """
    Add `amount` (negative to debit) to the user's balance and return the new
    balance. Raises HTTP 400 if the balance would go negative.
    """
    if not isinstance(amount, int) or isinstance(amount, bool) or amount == 0:
        raise ValueError("amount must be a non-zero integer")
    # A single conditional UPDATE: Postgres locks the row and re-checks the
    # WHERE clause, so two concurrent debits can't both pass a stale check.
    cursor.execute(
        """UPDATE users
           SET coins_balance = COALESCE(coins_balance, %s) + %s
           WHERE email = %s AND COALESCE(coins_balance, %s) + %s >= 0
           RETURNING coins_balance""",
        (STARTING_BALANCE, amount, email, STARTING_BALANCE, amount),
    )
    row = cursor.fetchone()
    if row is None:
        raise HTTPException(status_code=400, detail="Insufficient coins")
    balance = row["coins_balance"]
    cursor.execute(
        "INSERT INTO coin_transactions (email, amount, reason) VALUES (%s, %s, %s)",
        (email, amount, reason[:200]),
    )
    _audit(cursor, email, amount, kind, reason, balance, ip, metadata)
    if amount > 0:
        run_fraud_checks(cursor, email, ip, amount=amount, kind=kind)
    return balance


def reward_gameplay(cursor, email: str, outcome: str, game: str, ip: Optional[str]) -> dict:
    """
    Award coins for a finished game, subject to anti-farming rules.
    Returns {"coins_earned": int, "limited": None | "cooldown" | "daily_cap" | "ip_daily_cap"}.
    """
    base = COIN_REWARDS.get(outcome, 0)
    # Serialise reward decisions per user so parallel requests can't all pass
    # the cooldown check at once.
    cursor.execute("SELECT 1 FROM users WHERE email = %s FOR UPDATE", (email,))
    if cursor.fetchone() is None:
        raise HTTPException(status_code=404, detail="User not found")

    cursor.execute(
        """SELECT
             EXTRACT(EPOCH FROM NOW() - MAX(created_at) FILTER (WHERE kind = 'game_reward')) AS since_last,
             COALESCE(SUM(amount) FILTER (
                 WHERE kind = 'game_reward' AND created_at > NOW() - INTERVAL '1 day'), 0) AS earned_today
           FROM coin_audit_log WHERE email = %s""",
        (email,),
    )
    row = cursor.fetchone()
    since_last, earned_today = row["since_last"], int(row["earned_today"])

    ip_earned_today = 0
    if ip and ip != "unknown":
        cursor.execute(
            """SELECT COALESCE(SUM(amount), 0) AS earned FROM coin_audit_log
               WHERE ip = %s AND kind = 'game_reward' AND created_at > NOW() - INTERVAL '1 day'""",
            (ip,),
        )
        ip_earned_today = int(cursor.fetchone()["earned"])

    limited = None
    amount = base
    if base > 0 and since_last is not None and float(since_last) < MIN_SECONDS_BETWEEN_REWARDS:
        limited, amount = "cooldown", 0
    elif base > 0 and earned_today >= DAILY_EARN_CAP:
        limited, amount = "daily_cap", 0
    elif base > 0 and ip_earned_today >= IP_DAILY_EARN_CAP:
        limited, amount = "ip_daily_cap", 0
    else:
        amount = max(0, min(base, DAILY_EARN_CAP - earned_today, IP_DAILY_EARN_CAP - ip_earned_today))

    meta = {"game": game, "outcome": outcome}
    if amount > 0:
        apply_coin_change(cursor, email, amount, "game_reward", f"{outcome} at {game}", ip, meta)
    else:
        if limited:
            meta["limited"] = limited
        _audit(cursor, email, 0, "game_reward_denied", f"{outcome} at {game}", None, ip, meta)
        run_fraud_checks(cursor, email, ip, amount=0, kind="game_reward_denied", limited=limited)
    return {"coins_earned": amount, "limited": limited}


# ─── Fraud detection ──────────────────────────────────────────────────────────

def raise_alert(cursor, rule: str, email: Optional[str], ip: Optional[str], details: dict) -> bool:
    """Record an alert unless the same rule already fired for this user/IP recently."""
    cursor.execute(
        """SELECT 1 FROM coin_alerts
           WHERE rule = %s AND email IS NOT DISTINCT FROM %s AND ip IS NOT DISTINCT FROM %s
             AND created_at > NOW() - make_interval(mins => %s)
           LIMIT 1""",
        (rule, email, ip, ALERT_DEDUPE_MINUTES),
    )
    if cursor.fetchone():
        return False
    cursor.execute(
        "INSERT INTO coin_alerts (rule, email, ip, details) VALUES (%s, %s, %s, %s)",
        (rule, email, ip, json.dumps(details)),
    )
    log.warning("coin alert %s email=%s ip=%s details=%s", rule, email, ip, details)
    try:
        import sentry_sdk

        sentry_sdk.capture_message(f"Coin alert: {rule}", level="warning")
    except Exception:  # Sentry is optional
        pass
    return True


def run_fraud_checks(cursor, email: str, ip: Optional[str], amount: int, kind: str,
                     limited: Optional[str] = None) -> None:
    if kind in GAMEPLAY_KINDS:
        cursor.execute(
            """SELECT COUNT(*) AS n FROM coin_audit_log
               WHERE email = %s AND kind IN %s
                 AND created_at > NOW() - make_interval(mins => %s)""",
            (email, GAMEPLAY_KINDS, VELOCITY_WINDOW_MINUTES),
        )
        events = cursor.fetchone()["n"]
        if events > VELOCITY_MAX_EVENTS:
            raise_alert(cursor, "reward_velocity", email, ip,
                        {"events": events, "window_minutes": VELOCITY_WINDOW_MINUTES})
        if limited in ("daily_cap", "ip_daily_cap"):
            raise_alert(cursor, limited + "_reached", email, ip, {})

    if ip and ip != "unknown" and amount > 0:
        cursor.execute(
            """SELECT COUNT(DISTINCT email) AS n FROM coin_audit_log
               WHERE ip = %s AND amount > 0 AND created_at > NOW() - INTERVAL '1 day'""",
            (ip,),
        )
        accounts = cursor.fetchone()["n"]
        if accounts >= SHARED_IP_ACCOUNT_THRESHOLD:
            raise_alert(cursor, "shared_ip_accounts", None, ip, {"accounts_24h": accounts})

    if amount >= LARGE_CREDIT_THRESHOLD and kind != "purchase":
        raise_alert(cursor, "large_credit", email, ip, {"amount": amount, "kind": kind})
