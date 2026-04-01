"""
Extended tests for the Grumpy Gamer backend API.
Tests stats and replay endpoints with mocked database responses.
"""
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api import app

client = TestClient(app)

# ── Helpers ────────────────────────────────────────────────────────────────

def make_mock_db(fetchone_val=None, fetchall_val=None):
    """Create a mock database connection with configurable return values."""
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = fetchone_val
    mock_cursor.fetchall.return_value = fetchall_val or []
    mock_conn.cursor.return_value = mock_cursor
    return mock_conn, mock_cursor


def get_token(email="test@test.com"):
    """Generate a real JWT token for testing."""
    from jwt_utils import create_access_token
    return create_access_token({"sub": email})


# ── Auth Tests ─────────────────────────────────────────────────────────────

class TestAuthSuccess:
    def test_signup_success(self):
        mock_conn, mock_cursor = make_mock_db(fetchone_val=None)
        mock_cursor.fetchone.side_effect = [None, {"id": 1}]
        with patch("auth.get_db", return_value=mock_conn):
            with patch("auth.pwd_context.hash", return_value="hashed"):
                response = client.post("/api/signup", json={
                    "email": "newuser@test.com",
                    "username": "newuser",
                    "password": "password123"
                })
                assert response.status_code == 200
                assert "msg" in response.json()

    def test_login_success(self):
        mock_conn, mock_cursor = make_mock_db()
        mock_cursor.fetchone.return_value = {
            "email": "test@test.com",
            "hashed_password": "hashed",
            "username": "testuser"
        }
        with patch("auth.get_db", return_value=mock_conn):
            with patch("auth.pwd_context.verify", return_value=True):
                response = client.post("/api/login", json={
                    "email": "test@test.com",
                    "password": "password123"
                })
                assert response.status_code == 200
                data = response.json()
                assert "access_token" in data
                assert data["token_type"] == "bearer"

    def test_get_user_info_with_valid_token(self):
        token = get_token()
        mock_conn, mock_cursor = make_mock_db(
            fetchone_val={"username": "testuser"}
        )
        with patch("auth.get_db", return_value=mock_conn):
            response = client.get(
                "/api/user/info",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 200


# ── Stats Tests ────────────────────────────────────────────────────────────

class TestStatsWithAuth:
    def test_stats_summary_returns_data(self):
        token = get_token()
        mock_conn, mock_cursor = make_mock_db(fetchall_val=[
            {"game": "Wordle", "wins": 5, "losses": 2, "draws": 0, "total": 7}
        ])
        with patch("stats.get_db", return_value=mock_conn):
            with patch("stats.cache_get", return_value=None):
                with patch("stats.cache_set"):
                    response = client.get(
                        "/api/stats/summary",
                        headers={"Authorization": f"Bearer {token}"}
                    )
                    assert response.status_code == 200
                    data = response.json()
                    assert "stats" in data

    def test_stats_activity_returns_data(self):
        token = get_token()
        mock_conn, mock_cursor = make_mock_db(fetchall_val=[
            {"date": "2026-03-30", "games_played": 3}
        ])
        with patch("stats.get_db", return_value=mock_conn):
            with patch("stats.cache_get", return_value=None):
                with patch("stats.cache_set"):
                    response = client.get(
                        "/api/stats/activity",
                        headers={"Authorization": f"Bearer {token}"}
                    )
                    assert response.status_code == 200
                    data = response.json()
                    assert "activity" in data

    def test_stats_history_returns_data(self):
        token = get_token()
        mock_conn, mock_cursor = make_mock_db(fetchall_val=[
            {"date": "2026-03-30", "wins": 2, "total": 3}
        ])
        with patch("stats.get_db", return_value=mock_conn):
            with patch("stats.cache_get", return_value=None):
                with patch("stats.cache_set"):
                    response = client.get(
                        "/api/stats/history",
                        headers={"Authorization": f"Bearer {token}"}
                    )
                    assert response.status_code == 200
                    data = response.json()
                    assert "history" in data

    def test_stats_record_returns_session_id(self):
        token = get_token()
        mock_conn, mock_cursor = make_mock_db(fetchone_val={"id": 42})
        with patch("stats.get_db", return_value=mock_conn):
            with patch("stats.cache_invalidate"):
                response = client.post(
                    "/api/stats/record",
                    json={"game": "Wordle", "outcome": "win"},
                    headers={"Authorization": f"Bearer {token}"}
                )
                assert response.status_code == 200
                data = response.json()
                assert data["session_id"] == 42

    def test_stats_history_days_param(self):
        token = get_token()
        mock_conn, _ = make_mock_db(fetchall_val=[])
        with patch("stats.get_db", return_value=mock_conn):
            with patch("stats.cache_get", return_value=None):
                with patch("stats.cache_set"):
                    response = client.get(
                        "/api/stats/history?days=7",
                        headers={"Authorization": f"Bearer {token}"}
                    )
                    assert response.status_code == 200
                    assert response.json()["days"] == 7

    def test_stats_summary_returns_cached(self):
        token = get_token()
        cached_data = {"stats": [{"game": "Chess", "wins": 1, "losses": 0, "draws": 0, "total": 1}]}
        with patch("stats.cache_get", return_value=cached_data):
            response = client.get(
                "/api/stats/summary",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 200
            assert response.json() == cached_data


# ── Replays Tests ──────────────────────────────────────────────────────────

class TestReplaysWithAuth:
    def test_replays_list_returns_data(self):
        token = get_token()
        mock_conn, mock_cursor = make_mock_db(fetchall_val=[
            {
                "session_id": 1,
                "game": "Wordle",
                "outcome": "win",
                "played_at": "2026-03-30 12:00:00",
                "move_count": 4
            }
        ])
        with patch("replays.get_db", return_value=mock_conn):
            response = client.get(
                "/api/replays",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "replays" in data
            assert "page" in data
            assert "limit" in data

    def test_replays_pagination_params(self):
        token = get_token()
        mock_conn, _ = make_mock_db(fetchall_val=[])
        with patch("replays.get_db", return_value=mock_conn):
            response = client.get(
                "/api/replays?page=2&limit=5",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["page"] == 2
            assert data["limit"] == 5

    def test_replay_detail_not_found(self):
        token = get_token()
        mock_conn, mock_cursor = make_mock_db(fetchone_val=None)
        with patch("replays.get_db", return_value=mock_conn):
            response = client.get(
                "/api/replays/9999",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 404

    def test_replay_detail_returns_moves(self):
        token = get_token()
        mock_conn, mock_cursor = make_mock_db()
        mock_cursor.fetchone.return_value = {
            "id": 1, "game": "Wordle", "outcome": "win",
            "played_at": "2026-03-30 12:00:00"
        }
        mock_cursor.fetchall.return_value = [
            {"move_number": 1, "move_data": {"guess": "CRANE", "feedback": ["green"]}, "played_at": "2026-03-30 12:01:00"}
        ]
        with patch("replays.get_db", return_value=mock_conn):
            response = client.get(
                "/api/replays/1",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "moves" in data
            assert data["game"] == "Wordle"

    def test_record_move_success(self):
        token = get_token()
        mock_conn, _ = make_mock_db()
        with patch("replays.get_db", return_value=mock_conn):
            response = client.post(
                "/api/replays/moves",
                json={"session_id": 1, "move_number": 1, "move_data": {"guess": "CRANE"}},
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 200
            assert response.json()["msg"] == "Move recorded"