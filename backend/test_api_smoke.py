from fastapi.testclient import TestClient

from core.config import settings
from main import app


client = TestClient(app)
APP_HEADERS = {"x-app-access-key": settings.app_access_key}


def test_root_endpoint_returns_service_metadata() -> None:
    response = client.get("/", headers=APP_HEADERS)

    assert response.status_code == 200
    payload = response.json()
    assert payload["name"] == "TheChatBot API"
    assert payload["status"] == "running"


def test_health_endpoint_reports_healthy() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "healthy"
    assert payload["service"] == "thechatbot-api"


def test_info_endpoint_shape() -> None:
    response = client.get("/info", headers=APP_HEADERS)

    assert response.status_code == 200
    payload = response.json()
    assert "beam_endpoint_configured" in payload
    assert "appwrite_configured" in payload


def test_sessions_endpoint_requires_auth() -> None:
    response = client.get("/sessions/", headers=APP_HEADERS)

    assert response.status_code != 403


def test_sessions_endpoint_rejects_missing_app_key() -> None:
    response = client.get("/sessions/")

    assert response.status_code == 403


def test_sessions_endpoint_rejects_invalid_app_key() -> None:
    response = client.get("/sessions/", headers={"x-app-access-key": "wrong-key"})

    assert response.status_code == 403
