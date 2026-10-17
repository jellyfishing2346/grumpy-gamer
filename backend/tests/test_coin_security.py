"""
Input-validation tests for coin endpoints (issue #232). These reject bad
requests before any database access, so they run without Postgres.
The full money paths are covered in test_finance_integration.py.
"""
import os
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api import app  # noqa: E402
from jwt_utils import create_access_token  # noqa: E402
from limiter import limiter  # noqa: E402
from ledger import client_ip  # noqa: E402

client = TestClient(app)
AUTH = {"Authorization": f"Bearer {create_access_token({'sub': 'player@example.com'})}"}


@pytest.fixture(autouse=True)
def reset_rate_limits():
    limiter.reset()
    yield
    limiter.reset()


@pytest.mark.parametrize("amount", [-1000000, -1, 0])
def test_spend_rejects_non_positive_amounts(amount):
    res = client.post("/api/coins/spend", json={"amount": amount, "reason": "x"}, headers=AUTH)
    assert res.status_code == 422


def test_record_rejects_unknown_outcome():
    res = client.post("/api/stats/record", json={"game": "chess", "outcome": "mega_win"}, headers=AUTH)
    assert res.status_code == 422


def test_record_rejects_unknown_game():
    res = client.post("/api/stats/record", json={"game": "free_coins", "outcome": "win"}, headers=AUTH)
    assert res.status_code == 422


@pytest.mark.parametrize("fee", [-500, 10_001])
def test_tournament_rejects_out_of_range_fees(fee):
    res = client.post("/api/tournaments/create", json={"name": "t", "entry_fee": fee}, headers=AUTH)
    assert res.status_code == 422


@pytest.mark.parametrize("stake", [0, -5, 501])
def test_wager_rejects_out_of_range_stakes(stake):
    res = client.post("/api/predictions/wager", json={"match_id": 1, "pick": "a", "stake": stake}, headers=AUTH)
    assert res.status_code == 422


def test_wager_rejects_unknown_pick():
    res = client.post("/api/predictions/wager", json={"match_id": 1, "pick": "c", "stake": 5}, headers=AUTH)
    assert res.status_code == 422


def test_webhook_refuses_unsigned_events_when_not_configured(monkeypatch):
    monkeypatch.delenv("STRIPE_WEBHOOK_SECRET", raising=False)
    fake = {"type": "checkout.session.completed",
            "data": {"object": {"id": "cs_x", "payment_status": "paid",
                                "metadata": {"email": "player@example.com", "product_id": "coins_pack_large"}}}}
    res = client.post("/api/payments/webhook", json=fake)
    assert res.status_code == 503


def test_webhook_rejects_bad_signature(monkeypatch):
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_test")
    res = client.post("/api/payments/webhook", content=b"{}", headers={"stripe-signature": "t=1,v1=bad"})
    assert res.status_code == 400


def test_admin_endpoints_forbidden_for_regular_users(monkeypatch):
    monkeypatch.setenv("ADMIN_EMAILS", "boss@example.com")
    assert client.get("/api/admin/coin-alerts", headers=AUTH).status_code == 403
    assert client.get("/api/admin/coin-audit", headers=AUTH).status_code == 403


def test_admin_endpoints_forbidden_when_no_admins_configured(monkeypatch):
    monkeypatch.delenv("ADMIN_EMAILS", raising=False)
    assert client.get("/api/admin/coin-alerts", headers=AUTH).status_code == 403


class _Req:
    def __init__(self, xff, host="10.0.0.1"):
        self.headers = {"x-forwarded-for": xff} if xff is not None else {}
        self.client = type("C", (), {"host": host})()


def test_client_ip_ignores_spoofed_forwarded_entries(monkeypatch):
    monkeypatch.setenv("TRUSTED_PROXY_HOPS", "1")
    # A client can prepend anything; only the entry our proxy appended counts.
    assert client_ip(_Req("6.6.6.6, 203.0.113.9")) == "203.0.113.9"
    assert client_ip(_Req(None)) == "10.0.0.1"
    monkeypatch.setenv("TRUSTED_PROXY_HOPS", "0")
    assert client_ip(_Req("6.6.6.6, 203.0.113.9")) == "10.0.0.1"
