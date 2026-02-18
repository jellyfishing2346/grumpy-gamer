from fastapi.testclient import TestClient

from backend.api import app


client = TestClient(app)


def test_root_endpoint():
    """Test the root endpoint returns correct status."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "message" in data


def test_signup_success():
    """Test successful user signup."""
    # Use a unique email for each test run
    import time
    unique_email = f"test{int(time.time())}@example.com"
    response = client.post(
        "/api/signup",
        json={"email": unique_email, "password": "testpass123"}
    )
    assert response.status_code == 200
    assert response.json()["msg"] == "Signup successful"


def test_signup_invalid_email():
    """Test signup with invalid email format."""
    response = client.post(
        "/api/signup",
        json={"email": "not-an-email", "password": "testpass123"}
    )
    assert response.status_code == 422  # Validation error


def test_login_invalid_credentials():
    """Test login with wrong credentials."""
    response = client.post(
        "/api/login",
        json={"email": "nonexistent@example.com", "password": "wrongpass"}
    )
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]


def test_signup_and_login():
    """Test full signup and login flow."""
    import time
    unique_email = f"logintest{int(time.time())}@example.com"

    # Signup
    signup_response = client.post(
        "/api/signup",
        json={"email": unique_email, "password": "securepass123"}
    )
    assert signup_response.status_code == 200

    # Login
    login_response = client.post(
        "/api/login",
        json={"email": unique_email, "password": "securepass123"}
    )
    assert login_response.status_code == 200
    data = login_response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
