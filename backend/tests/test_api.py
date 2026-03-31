"""
Basic tests for the Grumpy Gamer backend API.
These tests use TestClient and do not require a real database connection.
"""
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api import app

client = TestClient(app)


class TestHealthEndpoint:
    def test_health_returns_200(self):
        response = client.get("/api/health")
        assert response.status_code == 200

    def test_health_returns_status(self):
        response = client.get("/api/health")
        data = response.json()
        assert "status" in data


class TestAuthEndpoints:
    def test_login_missing_fields_returns_422(self):
        response = client.post("/api/login", json={})
        assert response.status_code == 422

    def test_signup_missing_fields_returns_422(self):
        response = client.post("/api/signup", json={})
        assert response.status_code == 422

    def test_login_invalid_credentials_returns_401(self):
        with patch("auth.get_db") as mock_db:
            mock_conn = MagicMock()
            mock_cursor = MagicMock()
            mock_cursor.fetchone.return_value = None
            mock_conn.cursor.return_value = mock_cursor
            mock_db.return_value = mock_conn
            response = client.post("/api/login", json={
                "email": "nonexistent@test.com",
                "password": "wrongpassword"
            })
            assert response.status_code == 401


class TestStatsEndpoints:
    def test_stats_summary_requires_auth(self):
        response = client.get("/api/stats/summary")
        assert response.status_code == 401

    def test_stats_activity_requires_auth(self):
        response = client.get("/api/stats/activity")
        assert response.status_code == 401

    def test_stats_history_requires_auth(self):
        response = client.get("/api/stats/history")
        assert response.status_code == 401

    def test_stats_record_requires_auth(self):
        response = client.post("/api/stats/record", json={
            "game": "wordle",
            "outcome": "win"
        })
        assert response.status_code == 401


class TestReplaysEndpoints:
    def test_replays_list_requires_auth(self):
        response = client.get("/api/replays")
        assert response.status_code == 401

    def test_replay_detail_requires_auth(self):
        response = client.get("/api/replays/1")
        assert response.status_code == 401

    def test_replay_moves_requires_auth(self):
        response = client.post("/api/replays/moves", json={
            "session_id": 1,
            "move_number": 1,
            "move_data": {}
        })
        assert response.status_code == 401

    def test_public_replay_no_auth_needed(self):
        with patch("replays.get_db") as mock_db:
            mock_conn = MagicMock()
            mock_cursor = MagicMock()
            mock_cursor.fetchone.return_value = None
            mock_conn.cursor.return_value = mock_cursor
            mock_db.return_value = mock_conn
            response = client.get("/api/replays/public/999")
            assert response.status_code == 404
