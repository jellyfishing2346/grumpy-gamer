"""
Integration tests for coins, anti-farming, payments, tournaments and
prediction markets (issues #230 and #232) against a real Postgres.

Atomicity and locking can't be tested with mocks, so these need a throwaway
database. They are skipped unless TEST_DATABASE_URL is set; the schema in that
database is DROPPED before every test.

    TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/gg_test pytest tests/
"""
import hashlib
import hmac
import json
import os
import sys
import threading
import time

import pytest

TEST_DB = os.getenv("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not TEST_DB, reason="TEST_DATABASE_URL not set")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2  # noqa: E402
from psycopg2.extras import RealDictCursor  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import ai_arena  # noqa: E402
import ledger  # noqa: E402
import predictions  # noqa: E402
from api import app  # noqa: E402
from auth import init_db  # noqa: E402
from jwt_utils import create_access_token  # noqa: E402
from limiter import limiter  # noqa: E402
from tournaments import init_tournaments_db  # noqa: E402

client = TestClient(app)
ALICE, BOB = "alice@example.com", "bob@example.com"


def connect():
    return psycopg2.connect(TEST_DB, cursor_factory=RealDictCursor)


def query(sql, params=()):
    conn = connect()
    cur = conn.cursor()
    cur.execute(sql, params)
    rows = cur.fetchall() if cur.description else None
    conn.commit()
    conn.close()
    return rows


def balance(email):
    return query("SELECT coins_balance FROM users WHERE email = %s", (email,))[0]["coins_balance"]


def auth(email, ip="198.51.100.1"):
    return {"Authorization": f"Bearer {create_access_token({'sub': email})}", "X-Forwarded-For": ip}


def add_user(email, coins=100, username=None):
    query(
        "INSERT INTO users (email, username, hashed_password, coins_balance) VALUES (%s, %s, 'x', %s)",
        (email, username or email.split("@")[0], coins),
    )


@pytest.fixture(autouse=True)
def fresh_db(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", TEST_DB)
    query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    init_db()
    init_tournaments_db()
    conn = connect()
    cur = conn.cursor()
    ledger.init_ledger_db(cur)
    predictions.init_predictions_db(cur)
    conn.commit()
    conn.close()
    add_user(ALICE)
    add_user(BOB)
    limiter.reset()
    yield
    limiter.reset()


# ─── Ledger ───────────────────────────────────────────────────────────────────

def test_spend_debits_and_writes_audit_trail():
    res = client.post("/api/coins/spend", json={"amount": 30, "reason": "hint"},
                      headers=auth(ALICE, ip="6.6.6.6, 203.0.113.7"))
    assert res.status_code == 200
    assert res.json()["balance"] == 70 == balance(ALICE)
    row = query("SELECT * FROM coin_audit_log WHERE email = %s", (ALICE,))[0]
    assert (row["amount"], row["kind"], row["balance_after"]) == (-30, "spend", 70)
    assert row["ip"] == "203.0.113.7"  # spoofed left-hand entry ignored
    assert query("SELECT amount FROM coin_transactions WHERE email = %s", (ALICE,))[0]["amount"] == -30


def test_overspend_is_rejected_and_balance_untouched():
    res = client.post("/api/coins/spend", json={"amount": 101, "reason": "x"}, headers=auth(ALICE))
    assert res.status_code == 400
    assert balance(ALICE) == 100
    assert query("SELECT COUNT(*) AS n FROM coin_audit_log")[0]["n"] == 0


def test_concurrent_spends_never_overdraw():
    outcomes = []

    def spend():
        conn = connect()
        try:
            ledger.apply_coin_change(conn.cursor(), ALICE, -30, "spend", "race")
            time.sleep(0.05)  # hold the row lock a little to force contention
            conn.commit()
            outcomes.append("ok")
        except Exception:
            conn.rollback()
            outcomes.append("rejected")
        finally:
            conn.close()

    threads = [threading.Thread(target=spend) for _ in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert outcomes.count("ok") == 3
    assert balance(ALICE) == 10


def test_audit_log_is_append_only():
    client.post("/api/coins/spend", json={"amount": 5, "reason": "x"}, headers=auth(ALICE))
    with pytest.raises(psycopg2.Error, match="append-only"):
        query("UPDATE coin_audit_log SET amount = 1000000")
    with pytest.raises(psycopg2.Error, match="append-only"):
        query("DELETE FROM coin_audit_log")


def test_spend_is_rate_limited_per_user():
    codes = [client.post("/api/coins/spend", json={"amount": 1, "reason": "x"}, headers=auth(ALICE)).status_code
             for _ in range(21)]
    assert codes[:20] == [200] * 20
    assert codes[20] == 429


# ─── Gameplay rewards / anti-farming ──────────────────────────────────────────

def record(email, outcome="win", game="chess", ip="198.51.100.1"):
    return client.post("/api/stats/record", json={"game": game, "outcome": outcome}, headers=auth(email, ip))


def test_win_earns_coins_then_cooldown_blocks_farming():
    first = record(ALICE).json()
    assert (first["coins_earned"], first["coins_limited"]) == (10, None)
    second = record(ALICE).json()
    assert (second["coins_earned"], second["coins_limited"]) == (0, "cooldown")
    assert balance(ALICE) == 110
    assert query("SELECT COUNT(*) AS n FROM game_results")[0]["n"] == 2  # the game still counts in stats


def test_abandoned_games_earn_nothing(monkeypatch):
    monkeypatch.setattr(ledger, "MIN_SECONDS_BETWEEN_REWARDS", 0)
    assert record(ALICE, outcome="abandoned").json()["coins_earned"] == 0
    assert balance(ALICE) == 100


def test_daily_cap_per_account_and_alert(monkeypatch):
    monkeypatch.setattr(ledger, "MIN_SECONDS_BETWEEN_REWARDS", 0)
    monkeypatch.setattr(ledger, "DAILY_EARN_CAP", 25)
    earned = [record(ALICE).json()["coins_earned"] for _ in range(4)]
    assert earned == [10, 10, 5, 0]  # partial award up to the cap, then nothing
    assert balance(ALICE) == 125
    assert [a["rule"] for a in query("SELECT rule FROM coin_alerts")] == ["daily_cap_reached"]


def test_daily_cap_per_ip_across_accounts(monkeypatch):
    monkeypatch.setattr(ledger, "MIN_SECONDS_BETWEEN_REWARDS", 0)
    monkeypatch.setattr(ledger, "IP_DAILY_EARN_CAP", 15)
    assert record(ALICE, ip="203.0.113.5").json()["coins_earned"] == 10
    assert record(BOB, ip="203.0.113.5").json()["coins_earned"] == 5
    third = record(BOB, ip="203.0.113.5").json()
    assert (third["coins_earned"], third["coins_limited"]) == (0, "ip_daily_cap")
    assert record(BOB, ip="203.0.113.99").json()["coins_earned"] == 10  # different IP unaffected


def test_many_accounts_on_one_ip_raises_alert(monkeypatch):
    monkeypatch.setattr(ledger, "MIN_SECONDS_BETWEEN_REWARDS", 0)
    for i in range(ledger.SHARED_IP_ACCOUNT_THRESHOLD):
        email = f"sock{i}@example.com"
        add_user(email)
        record(email, ip="192.0.2.50")
    alerts = query("SELECT rule, ip, details FROM coin_alerts WHERE rule = 'shared_ip_accounts'")
    assert len(alerts) == 1 and alerts[0]["ip"] == "192.0.2.50"


def test_reward_velocity_alert(monkeypatch):
    monkeypatch.setattr(ledger, "VELOCITY_MAX_EVENTS", 3)
    for _ in range(5):
        record(ALICE)  # mostly cooldown-denied, but the attempts are still counted
    assert query("SELECT COUNT(*) AS n FROM coin_alerts WHERE rule = 'reward_velocity'")[0]["n"] == 1


def test_admin_can_review_and_resolve_alerts(monkeypatch):
    monkeypatch.setenv("ADMIN_EMAILS", BOB)
    monkeypatch.setattr(ledger, "MIN_SECONDS_BETWEEN_REWARDS", 0)
    monkeypatch.setattr(ledger, "DAILY_EARN_CAP", 10)
    record(ALICE)
    record(ALICE)
    alerts = client.get("/api/admin/coin-alerts", headers=auth(BOB)).json()["alerts"]
    assert alerts[0]["rule"] == "daily_cap_reached" and alerts[0]["email"] == ALICE
    assert client.post(f"/api/admin/coin-alerts/{alerts[0]['id']}/resolve", headers=auth(BOB)).status_code == 200
    assert client.get("/api/admin/coin-alerts", headers=auth(BOB)).json()["alerts"] == []
    audit = client.get(f"/api/admin/coin-audit?email={ALICE}", headers=auth(BOB)).json()["entries"]
    assert [e["kind"] for e in audit] == ["game_reward_denied", "game_reward"]


# ─── Payments ─────────────────────────────────────────────────────────────────

def signed(payload: dict, secret: str):
    body = json.dumps(payload).encode()
    ts = int(time.time())
    sig = hmac.new(secret.encode(), f"{ts}.".encode() + body, hashlib.sha256).hexdigest()
    return body, {"stripe-signature": f"t={ts},v1={sig}", "content-type": "application/json"}


def checkout_event(session_id="cs_test_1", paid=True, product="coins_pack_large", coins_claim="999999"):
    return {
        "id": "evt_1", "object": "event", "type": "checkout.session.completed",
        "data": {"object": {
            "id": session_id, "object": "checkout.session",
            "payment_status": "paid" if paid else "unpaid",
            "metadata": {"email": ALICE, "product_id": product, "coins_bonus": coins_claim},
        }},
    }


def test_signed_purchase_credits_catalogue_amount_exactly_once(monkeypatch):
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_test")
    body, headers = signed(checkout_event(), "whsec_test")
    assert client.post("/api/payments/webhook", content=body, headers=headers).json()["status"] == "ok"
    assert balance(ALICE) == 100 + 2000  # from PRODUCTS, not the 999999 in metadata
    replay = client.post("/api/payments/webhook", content=body, headers=headers)
    assert replay.json()["status"] == "already_processed"
    assert balance(ALICE) == 2100


def test_unpaid_or_unknown_purchases_credit_nothing(monkeypatch):
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_test")
    body, headers = signed(checkout_event(paid=False), "whsec_test")
    assert client.post("/api/payments/webhook", content=body, headers=headers).json()["status"] == "unpaid"
    body, headers = signed(checkout_event(session_id="cs_2", product="free_money"), "whsec_test")
    assert client.post("/api/payments/webhook", content=body, headers=headers).status_code == 400
    assert balance(ALICE) == 100


def test_event_signed_with_wrong_secret_is_rejected(monkeypatch):
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_real")
    body, headers = signed(checkout_event(), "whsec_attacker_guess")
    assert client.post("/api/payments/webhook", content=body, headers=headers).status_code == 400
    assert balance(ALICE) == 100


# ─── Tournaments ──────────────────────────────────────────────────────────────

def test_tournament_fees_go_through_ledger_and_emails_stay_private():
    res = client.post("/api/tournaments/create", json={"name": "Cup", "entry_fee": 40, "max_players": 2},
                      headers=auth(ALICE))
    tid = res.json()["tournament_id"]
    assert balance(ALICE) == 60
    assert client.post("/api/tournaments/join", json={"tournament_id": tid}, headers=auth(BOB)).status_code == 200
    assert balance(BOB) == 60
    public = json.dumps([client.get("/api/tournaments").json(), client.get(f"/api/tournaments/{tid}").json(),
                         client.get("/api/tournaments/my/history", headers=auth(BOB)).json()])
    assert "@example.com" not in public
    detail = client.get(f"/api/tournaments/{tid}").json()
    assert detail["tournament"]["prize_pool"] == 80 and detail["tournament"]["status"] == "in_progress"


def test_cannot_join_tournament_without_coins():
    tid = client.post("/api/tournaments/create", json={"name": "Big", "entry_fee": 100},
                      headers=auth(ALICE)).json()["tournament_id"]
    query("UPDATE users SET coins_balance = 5 WHERE email = %s", (BOB,))
    res = client.post("/api/tournaments/join", json={"tournament_id": tid}, headers=auth(BOB))
    assert res.status_code == 400 and balance(BOB) == 5
    assert query("SELECT COUNT(*) AS n FROM tournament_players WHERE email = %s", (BOB,))[0]["n"] == 0


# ─── Prediction markets ───────────────────────────────────────────────────────

def open_matches():
    return client.get("/api/predictions/matches").json()["open"]


def close_betting(match_id):
    query("UPDATE prediction_matches SET betting_closes_at = NOW() - INTERVAL '1 second' WHERE id = %s",
          (match_id,))


def offered_pick(match, winning=None, seed=None):
    """An offered outcome; if winning is True/False, one that does/doesn't match the real result."""
    offered = [k for k, v in match["odds"].items() if v is not None]
    if winning is None:
        return offered[0]
    m = query("SELECT game, bot_a, bot_b, seed FROM prediction_matches WHERE id = %s", (match["id"],))[0]
    result, _ = ai_arena.play_match(m["game"], m["bot_a"], m["bot_b"], m["seed"])
    candidates = [k for k in offered if (k == result) == winning]
    return candidates[0] if candidates else None


def wager(email, match_id, pick, stake=50):
    return client.post("/api/predictions/wager", json={"match_id": match_id, "pick": pick, "stake": stake},
                       headers=auth(email))


def test_listing_schedules_open_matches_without_leaking_seeds():
    matches = open_matches()
    assert len(matches) == predictions.OPEN_MATCH_TARGET
    raw = json.dumps(client.get("/api/predictions/matches").json())
    for m in query("SELECT seed FROM prediction_matches"):
        assert str(m["seed"]) not in raw
    assert all(m["seconds_left"] > 0 for m in matches)
    assert all("moves" not in m for m in matches)
    assert len(open_matches()) == predictions.OPEN_MATCH_TARGET  # no duplicate scheduling


def test_full_market_cycle_pays_winners_at_locked_odds():
    for match in open_matches():
        win_pick, lose_pick = offered_pick(match, True), offered_pick(match, False)
        if win_pick and lose_pick:
            break
    else:
        pytest.skip("no match with both a winning and losing offered outcome")

    w = wager(ALICE, match["id"], win_pick, stake=50)
    assert w.status_code == 200 and balance(ALICE) == 50
    assert wager(BOB, match["id"], lose_pick, stake=40).status_code == 200
    odds = w.json()["odds"]

    close_betting(match["id"])
    assert wager(ALICE, match["id"], win_pick).status_code in (400, 409)

    detail = client.get(f"/api/predictions/matches/{match['id']}").json()
    assert detail["status"] == "settled" and detail["result"] == win_pick and detail["moves"]
    assert balance(ALICE) == 50 + int(50 * odds)
    assert balance(BOB) == 60

    # Settling again (more requests) must not pay twice
    client.get("/api/predictions/matches")
    client.get("/api/predictions/my", headers=auth(ALICE))
    assert balance(ALICE) == 50 + int(50 * odds)

    mine = client.get("/api/predictions/my", headers=auth(ALICE)).json()
    assert mine["summary"] == {"total": 1, "settled": 1, "won": 1, "win_rate": 100.0, "net": int(50 * odds) - 50}
    assert mine["predictions"][0]["status"] == "won"
    bob = client.get("/api/predictions/my", headers=auth(BOB)).json()["summary"]
    assert (bob["won"], bob["net"]) == (0, -40)


def test_wager_rules():
    match = open_matches()[0]
    pick = offered_pick(match)
    assert wager(ALICE, match["id"], pick, stake=101).status_code == 400  # more than balance
    assert balance(ALICE) == 100
    assert wager(ALICE, match["id"], pick, stake=10).status_code == 200
    assert wager(ALICE, match["id"], pick, stake=10).status_code == 409  # one prediction per match
    assert balance(ALICE) == 90
    assert wager(ALICE, 99999, pick).status_code == 404

    unoffered = [(m, k) for m in open_matches() for k, v in m["odds"].items() if v is None]
    if unoffered:
        m, k = unoffered[0]
        assert wager(BOB, m["id"], k).status_code == 400


def test_leaderboard_requires_minimum_predictions_and_hides_emails(monkeypatch):
    monkeypatch.setattr(predictions, "LEADERBOARD_MIN_PREDICTIONS", 2)
    for _ in range(2):
        match = open_matches()[0]
        assert wager(ALICE, match["id"], offered_pick(match), stake=5).status_code == 200
        close_betting(match["id"])
        client.get("/api/predictions/matches")
    match = open_matches()[0]
    wager(BOB, match["id"], offered_pick(match), stake=5)
    close_betting(match["id"])

    board = client.get("/api/predictions/leaderboard").json()
    assert [row["username"] for row in board["leaderboard"]] == ["alice"]  # bob has only 1
    assert "@" not in json.dumps(board)


def test_concurrent_maintenance_settles_each_match_once():
    match = open_matches()[0]
    pick = offered_pick(match, True)
    if pick is None:
        pytest.skip("winning outcome not offered")
    wager(ALICE, match["id"], pick, stake=20)
    close_betting(match["id"])

    barrier = threading.Barrier(8)
    errors = []

    def maintain():
        conn = connect()
        try:
            barrier.wait()  # start all transactions together
            predictions.maintain_matches(conn.cursor())
            conn.commit()
        except Exception as exc:  # pragma: no cover - surfaced below
            conn.rollback()
            errors.append(exc)
        finally:
            conn.close()

    threads = [threading.Thread(target=maintain) for _ in range(8)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert not errors
    payouts = query("SELECT COUNT(*) AS n FROM coin_audit_log WHERE kind = 'prediction_payout'")[0]["n"]
    assert payouts == 1
    assert query("SELECT COUNT(*) AS n FROM prediction_matches WHERE status = 'open'")[0]["n"] == \
        predictions.OPEN_MATCH_TARGET
