"""CPU-only smoke test for the Flameclyffe ML laboratory.

This script is intentionally small: it proves that the installed package, service
contract, and deterministic living-engine state can start without summoning heavy
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

    print("flameclyffe-ml smoke: ok")


if __name__ == "__main__":
    main()
