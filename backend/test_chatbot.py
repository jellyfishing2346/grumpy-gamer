import pytest
from fastapi.testclient import TestClient
from backend.api import app


@pytest.fixture
def client():
    return TestClient(app)


def test_chatbot_requires_auth(client):
    response = client.post("/api/chatbot", json={"message": "Hello"})
    assert response.status_code == 401


def test_chatbot_with_invalid_token(client):
    response = client.post("/api/chatbot", json={"message": "Hello"}, headers={"Authorization": "Bearer invalidtoken"})
    assert response.status_code == 401

# Add more tests for valid tokens and LLM/rule-based responses as needed
