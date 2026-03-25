from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_root_endpoint_returns_service_metadata() -> None:
    response = client.get("/")

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
    response = client.get("/info")

    assert response.status_code == 200
    payload = response.json()
    assert "beam_endpoint_configured" in payload
    assert "appwrite_configured" in payload
