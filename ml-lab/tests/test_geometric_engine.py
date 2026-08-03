from __future__ import annotations

import numpy as np
from fastapi.testclient import TestClient

from flameclyffe_ml.geometric_engine import (
    GeometryReferenceRequest,
    build_reference_snapshot,
)
from flameclyffe_ml.living_engine.api import app


def test_reference_geometry_invariants() -> None:
    expected = {
        "dodecahedron": (20, 3, 30, 20.0 / 3.0),
        "tesseract": (16, 4, 32, 4.0),
        "penteract": (32, 5, 80, 32.0 / 5.0),
    }

    for geometry_id, (vertices, dimension, edges, frame_constant) in expected.items():
        snapshot = build_reference_snapshot(
            GeometryReferenceRequest(geometry_id=geometry_id)
        )
        assert snapshot.vertex_count == vertices
        assert snapshot.ambient_dimension == dimension
        assert snapshot.edge_count == edges
        assert np.isclose(snapshot.frame_constant, frame_constant)
        assert snapshot.receipt.status == "VERIFIED"
        assert all(value == "VERIFIED" for value in snapshot.claims.values())


def test_reference_receipt_is_deterministic() -> None:
    request = GeometryReferenceRequest(geometry_id="penteract")
    first = build_reference_snapshot(request)
    second = build_reference_snapshot(request)

    assert first.snapshot_id == second.snapshot_id
    assert first.receipt == second.receipt


def test_living_engine_exposes_geometric_reference_without_torch_authority() -> None:
    client = TestClient(app)

    health = client.get("/v1/geometric/health")
    assert health.status_code == 200
    assert health.json()["canon_authority"] is False
    assert health.json()["persistent"] is False

    response = client.post(
        "/v1/geometric/reference",
        json={"geometry_id": "tesseract"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["vertex_count"] == 16
    assert payload["classification"] == "experimental-computational"
