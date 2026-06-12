from __future__ import annotations

from fastapi.testclient import TestClient

from flameclyffe_ml.living_engine.api import app


def test_health_declares_non_persistent_non_canon_service() -> None:
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "flameclyffe-living-engine",
        "schema_version": "1.0.0",
        "persistent": False,
        "canon_authority": False,
    }


def test_one_shot_liquid_light_frame() -> None:
    client = TestClient(app)

    response = client.post(
        "/v1/liquid-light/frame",
        json={
            "controls": {
                "instrument_id": "api-test-orb",
                "seed": 3,
                "node_count": 7,
                "stream_hz": 10,
            },
            "time_s": 1.25,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["schema_version"] == "1.0.0"
    assert body["instrument_id"] == "api-test-orb"
    assert body["interpolation_hint_ms"] == 100
    assert len(body["nodes"]) == 7


def test_contract_endpoint_exposes_all_shared_schemas() -> None:
    client = TestClient(app)

    response = client.get("/v1/contracts/liquid-light")

    assert response.status_code == 200
    assert set(response.json()) == {"controls", "frame_request", "snapshot"}


def test_websocket_stream_accepts_controls_and_emits_snapshot() -> None:
    client = TestClient(app)

    with client.websocket_connect("/v1/liquid-light/stream") as websocket:
        websocket.send_json(
            {
                "controls": {
                    "instrument_id": "socket-test-orb",
                    "seed": 4,
                    "node_count": 5,
                    "stream_hz": 20,
                }
            }
        )
        snapshot = websocket.receive_json()

    assert snapshot["schema_version"] == "1.0.0"
    assert snapshot["instrument_id"] == "socket-test-orb"
    assert len(snapshot["nodes"]) == 5
