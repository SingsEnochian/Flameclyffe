from fastapi.testclient import TestClient

from flameclyffe_ml.living_engine.api import app


def test_loopback_starwell_origin_is_allowed() -> None:
    client = TestClient(app)

    response = client.options(
        "/v1/hearthgate/awaken",
        headers={
            "Origin": "http://127.0.0.1:5173",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:5173"
    assert "GET" in response.headers["access-control-allow-methods"]


def test_non_loopback_origin_is_not_granted_cors_access() -> None:
    client = TestClient(app)

    response = client.options(
        "/v1/hearthgate/awaken",
        headers={
            "Origin": "https://untrusted.example",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers
