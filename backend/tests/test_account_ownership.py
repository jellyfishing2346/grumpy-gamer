"""
Regression tests: a logged-in user can only update or delete their own account.
Previously an `?email=` query parameter let any user target any other account.
"""
import os
import sys
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api import app  # noqa: E402
from jwt_utils import create_access_token  # noqa: E402

client = TestClient(app)

ATTACKER = "attacker@example.com"
VICTIM = "victim@example.com"


def auth_header(email):
    return {"Authorization": f"Bearer {create_access_token({'sub': email})}"}


def emails_in_where_clauses(cursor):
    """Collect the email each UPDATE/DELETE statement targeted (last SQL param)."""
    return [c.args[1][-1] for c in cursor.execute.call_args_list]


def test_update_ignores_email_query_param():
    conn = MagicMock()
    with patch("auth.get_db", return_value=conn), patch(
        "auth.pwd_context.hash", return_value="hashed"
    ):
        res = client.put(
            f"/api/user/update?email={VICTIM}",
            json={"new_password": "hijacked123"},
            headers=auth_header(ATTACKER),
        )
    assert res.status_code == 200
    targets = emails_in_where_clauses(conn.cursor.return_value)
    assert targets, "expected an UPDATE to run"
    assert VICTIM not in targets
    assert all(t == ATTACKER for t in targets)


def test_delete_ignores_email_query_param():
    conn = MagicMock()
    with patch("auth.get_db", return_value=conn):
        res = client.delete(
            f"/api/user/delete?email={VICTIM}", headers=auth_header(ATTACKER)
        )
    assert res.status_code == 200
    targets = emails_in_where_clauses(conn.cursor.return_value)
    assert targets == [ATTACKER]


def test_update_requires_token():
    res = client.put("/api/user/update", json={"new_username": "x"})
    assert res.status_code == 401
