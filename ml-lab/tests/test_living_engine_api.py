from __future__ import annotations

from fastapi.testclient import TestClient

from flameclyffe_ml.living_engine.api import app
from flameclyffe_ml.provenance import content_hash


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


def _kernel_request() -> dict[str, object]:
    observed_at = "2026-08-02T06:00:00Z"
    source_payload = {
        "kind": "api-fixture",
        "house": "templehouse",
        "observed_at": observed_at,
    }
    return {
        "identity": "api:templehouse:arrival",
        "house_id": "templehouse",
        "observable": {
            "measurements": {"presence": 1.0},
            "chronology": [observed_at],
            "telemetry": {"mode": "test"},
            "canon_sources": ["terra-aeterna-novel-canon"],
            "confidence": 0.98,
            "causal_history": ["manual activation"],
        },
        "experiential": {
            "story": ["A traveller is welcomed at Templehouse."],
            "symbols": ["waiting-glyph", "open-door"],
            "memory": ["the fire was already lit"],
            "tone_tags": ["anchor-voice", "living-voice"],
            "image_tags": ["structure", "atmosphere"],
            "haptic_tags": ["call", "answer", "bind"],
            "relationships": ["traveller", "resident-host"],
            "cultural_meaning": ["hospitality", "recognition"],
            "lived_continuity": ["the House remembers"],
        },
        "premaq": {"P": 0.82, "C": 0.88, "R": 0.79, "E": 0.22, "M": 0.76, "A": 0.84},
        "provenance": [
            {
                "source_id": "api-fixture",
                "source_kind": "synthetic-test",
                "uri": "urn:test:hearthgate-api",
                "content_hash": content_hash(source_payload),
                "classification": "synthetic",
                "retrieved_at": observed_at,
            }
        ],
        "origin_house": "terra-prime",
        "origin_witness": "rowan",
        "reception_witness": "resident-host",
        "observed_at": observed_at,
        "history": ["api-test"],
    }


def test_hearthgate_api_awaken_and_house_registry() -> None:
    client = TestClient(app)

    awaken = client.get("/v1/hearthgate/awaken")
    houses = client.get("/v1/hearthgate/houses")

    assert awaken.status_code == 200
    assert awaken.json()["state"] == "awake"
    assert awaken.json()["centre"] == "hearthweave"
    assert houses.status_code == 200
    registry = houses.json()["houses"]
    assert set(registry) >= {
        "terra-prime",
        "terra-aeterna",
        "templehouse",
        "wheel-of-time-canon",
        "taaveren-vaen",
        "starsong",
    }
    assert registry["terra-aeterna"]["harmonic"] != registry["templehouse"]["harmonic"]


def test_hearthgate_contract_exposes_dual_aspect_schemas() -> None:
    client = TestClient(app)

    response = client.get("/v1/contracts/hearthgate")

    assert response.status_code == 200
    assert set(response.json()) == {
        "projection_request",
        "dual_aspect_packet",
        "observable_aspect",
        "experiential_aspect",
        "premaq",
    }


def test_hearthgate_packet_audit_and_replay_share_one_state() -> None:
    client = TestClient(app)

    projection = client.post("/v1/hearthgate/packet", json=_kernel_request())

    assert projection.status_code == 200, projection.text
    packet = projection.json()
    assert packet["house_id"] == "templehouse"
    assert packet["bridge"]["centre"] == "hearthweave"
    assert packet["sensory"]["source_state_hash"] == packet["correspondence"]["basis_hash"]
    assert {layer["role"] for layer in packet["sensory"]["tones"]} == {
        "anchor",
        "living",
        "bind",
    }
    assert packet["sensory"]["glyph"]["complete"] is True

    audit = client.post("/v1/hearthgate/audit", json=packet)
    replay = client.post("/v1/hearthgate/replay", json=packet)

    assert audit.status_code == 200, audit.text
    assert audit.json()["status"] == "VERIFIED"
    assert set(audit.json()["claims"].values()) == {"VERIFIED"}
    assert replay.status_code == 200, replay.text
    assert replay.json()["verified"] is True
