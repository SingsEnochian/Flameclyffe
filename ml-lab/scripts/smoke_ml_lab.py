"""CPU-only smoke test for the Flameclyffe ML laboratory.

This script is intentionally small: it proves that the installed package, service
contracts, and deterministic living-engine state can start without summoning heavy
model downloads or GPU assumptions.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from flameclyffe_ml import content_hash
from flameclyffe_ml.living_engine.api import app
from flameclyffe_ml.living_engine.field import generate_liquid_light_snapshot
from flameclyffe_ml.living_engine.models import LiquidLightControls


def main() -> None:
    controls = LiquidLightControls(
        instrument_id="ci-smoke-orb",
        seed=11,
        node_count=6,
        stream_hz=10,
    )
    snapshot = generate_liquid_light_snapshot(controls, time_s=0.25)

    assert snapshot.schema_version == "1.0.0"
    assert snapshot.instrument_id == "ci-smoke-orb"
    assert len(snapshot.nodes) == 6
    assert content_hash({"smoke": True}) == content_hash({"smoke": True})

    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["canon_authority"] is False

    geometric_health = client.get("/v1/geometric/health")
    assert geometric_health.status_code == 200
    assert geometric_health.json()["canon_authority"] is False

    reference = client.post(
        "/v1/geometric/reference",
        json={"geometry_id": "penteract"},
    )
    assert reference.status_code == 200
    assert reference.json()["vertex_count"] == 32
    assert reference.json()["receipt"]["status"] == "VERIFIED"

    archivist_health = client.get("/v1/archivist/health")
    assert archivist_health.status_code == 200
    assert archivist_health.json()["canon_authority"] is False
    assert archivist_health.json()["review_required"] is True

    print("flameclyffe-ml smoke: ok")


if __name__ == "__main__":
    main()
