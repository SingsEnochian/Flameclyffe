"""Deterministic reference geometries and receipted inspection snapshots."""

from __future__ import annotations

import itertools
import math
from collections.abc import Iterable

import numpy as np

from flameclyffe_ml.provenance import content_hash

from .contracts import (
    ENGINE_VERSION,
    GeometricRunReceipt,
    GeometryId,
    GeometryReferenceRequest,
    GeometryReferenceSnapshot,
)


def _normalise_rows(values: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(values, axis=1, keepdims=True)
    if np.any(norms <= 0):
        raise ValueError("Reference geometry contains a zero-length vertex")
    return values / norms


def dodecahedron_vertices() -> np.ndarray:
    phi = (1.0 + math.sqrt(5.0)) / 2.0
    inv_phi = 1.0 / phi
    values = np.array(
        [
            [1, 1, 1],
            [1, 1, -1],
            [1, -1, 1],
            [1, -1, -1],
            [-1, 1, 1],
            [-1, 1, -1],
            [-1, -1, 1],
            [-1, -1, -1],
            [0, phi, inv_phi],
            [0, phi, -inv_phi],
            [0, -phi, inv_phi],
            [0, -phi, -inv_phi],
            [inv_phi, 0, phi],
            [inv_phi, 0, -phi],
            [-inv_phi, 0, phi],
            [-inv_phi, 0, -phi],
            [phi, inv_phi, 0],
            [phi, -inv_phi, 0],
            [-phi, inv_phi, 0],
            [-phi, -inv_phi, 0],
        ],
        dtype=np.float64,
    )
    return _normalise_rows(values)


def hypercube_vertices(dimension: int) -> np.ndarray:
    if dimension < 1:
        raise ValueError("dimension must be positive")
    values = np.array(
        list(itertools.product((-1.0, 1.0), repeat=dimension)),
        dtype=np.float64,
    )
    return _normalise_rows(values)


def reference_vertices(geometry_id: GeometryId) -> np.ndarray:
    if geometry_id == "dodecahedron":
        return dodecahedron_vertices()
    if geometry_id == "tesseract":
        return hypercube_vertices(4)
    if geometry_id == "penteract":
        return hypercube_vertices(5)
    raise ValueError(f"Unsupported geometry: {geometry_id}")


def _nearest_neighbour_edges(vertices: np.ndarray) -> tuple[tuple[int, int], ...]:
    distances = np.linalg.norm(
        vertices[:, None, :] - vertices[None, :, :],
        axis=-1,
    )
    positive = distances[distances > 1e-10]
    minimum = float(positive.min())
    tolerance = max(1e-9, minimum * 1e-7)
    edges: list[tuple[int, int]] = []
    for left in range(len(vertices)):
        for right in range(left + 1, len(vertices)):
            if abs(float(distances[left, right]) - minimum) <= tolerance:
                edges.append((left, right))
    return tuple(edges)


def reference_edges(geometry_id: GeometryId, vertices: np.ndarray) -> tuple[tuple[int, int], ...]:
    if geometry_id in {"tesseract", "penteract"}:
        raw_signs = np.sign(vertices)
        edges = []
        for left in range(len(vertices)):
            for right in range(left + 1, len(vertices)):
                differing = np.count_nonzero(raw_signs[left] != raw_signs[right])
                if differing == 1:
                    edges.append((left, right))
        return tuple(edges)
    return _nearest_neighbour_edges(vertices)


def _projection_basis(dimension: int) -> np.ndarray:
    if dimension == 3:
        return np.eye(3, dtype=np.float64)
    index = np.arange(1, dimension + 1, dtype=np.float64)
    candidates = np.stack(
        [
            np.cos(index * math.pi / (dimension + 1)),
            np.sin(index * math.pi / (dimension + 1)),
            np.cos(index * 2.0 * math.pi / (dimension + 1))
            + 0.5 * np.sin(index * 3.0 * math.pi / (dimension + 1)),
        ],
        axis=1,
    )
    basis, _ = np.linalg.qr(candidates)
    return basis[:, :3]


def project_to_3d(vertices: np.ndarray) -> np.ndarray:
    projected = vertices @ _projection_basis(vertices.shape[1])
    maximum = float(np.abs(projected).max())
    if maximum > 0:
        projected = projected / maximum
    return projected


def _rounded_rows(values: Iterable[Iterable[float]]) -> tuple[tuple[float, ...], ...]:
    return tuple(tuple(round(float(value), 8) for value in row) for row in values)


def build_reference_snapshot(
    request: GeometryReferenceRequest,
    *,
    source_state_fingerprint: str | None = None,
) -> GeometryReferenceSnapshot:
    vertices = reference_vertices(request.geometry_id)
    edges = reference_edges(request.geometry_id, vertices)
    gram = vertices @ vertices.T
    frame = vertices.T @ vertices
    diagonal = np.diag(frame)
    frame_constant = float(diagonal.mean())
    expected_frame = np.eye(vertices.shape[1]) * frame_constant

    claims = {
        "unit_vertices": (
            "VERIFIED"
            if np.allclose(np.linalg.norm(vertices, axis=1), 1.0, atol=1e-9)
            else "FAILED"
        ),
        "centred": (
            "VERIFIED"
            if np.allclose(vertices.mean(axis=0), 0.0, atol=1e-9)
            else "FAILED"
        ),
        "tight_frame": (
            "VERIFIED"
            if np.allclose(frame, expected_frame, atol=1e-9)
            else "FAILED"
        ),
        "finite": "VERIFIED" if np.isfinite(vertices).all() else "FAILED",
    }
    status = "VERIFIED" if all(value == "VERIFIED" for value in claims.values()) else "FAILED"

    input_payload = request.model_dump(mode="json")
    output_payload = {
        "geometry_id": request.geometry_id,
        "vertices": _rounded_rows(vertices),
        "edges": edges,
        "gram_values": tuple(
            sorted({round(float(value), 8) for value in gram.reshape(-1)})
        ),
        "frame_constant": round(frame_constant, 8),
        "claims": claims,
    }
    input_hash = content_hash(input_payload)
    config_hash = content_hash(
        {
            "engine_version": ENGINE_VERSION,
            "normalised": True,
            "projection": "deterministic-orthonormal-v1",
        }
    )
    output_hash = content_hash(output_payload)
    receipt = GeometricRunReceipt(
        receipt_id=content_hash(
            {
                "operation": "reference-inspection",
                "input_hash": input_hash,
                "config_hash": config_hash,
                "output_hash": output_hash,
            }
        ),
        operation="reference-inspection",
        source_state_fingerprint=source_state_fingerprint,
        input_hash=input_hash,
        config_hash=config_hash,
        output_hash=output_hash,
        status=status,
        claims=claims,
    )
    projection = project_to_3d(vertices) if request.include_projection_3d else np.empty((0, 3))

    return GeometryReferenceSnapshot(
        snapshot_id=content_hash(
            {
                "geometry_id": request.geometry_id,
                "output_hash": output_hash,
                "receipt_id": receipt.receipt_id,
            }
        ),
        geometry_id=request.geometry_id,
        ambient_dimension=vertices.shape[1],
        vertex_count=vertices.shape[0],
        edge_count=len(edges),
        frame_constant=round(frame_constant, 8),
        gram_values=tuple(sorted({round(float(value), 8) for value in gram.reshape(-1)})),
        rotation_plane_count=vertices.shape[1] * (vertices.shape[1] - 1) // 2,
        vertices=_rounded_rows(vertices) if request.include_vertices else (),
        edges=edges if request.include_edges else (),
        projection_3d=(
            tuple(
                (round(float(row[0]), 8), round(float(row[1]), 8), round(float(row[2]), 8))
                for row in projection
            )
            if request.include_projection_3d
            else ()
        ),
        claims=claims,
        receipt=receipt,
    )
