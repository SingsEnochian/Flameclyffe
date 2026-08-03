"""Typed, torch-free contracts for the Geometric Manifold Engine."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

ENGINE_VERSION: Literal["1.0.0"] = "1.0.0"
GeometryId = Literal["dodecahedron", "tesseract", "penteract"]
ClaimStatus = Literal["VERIFIED", "FAILED", "NOT_YET_TESTED"]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class GeometryReferenceRequest(StrictModel):
    geometry_id: GeometryId
    include_vertices: bool = True
    include_edges: bool = True
    include_projection_3d: bool = True


class GeometryReferenceSnapshot(StrictModel):
    schema_version: Literal["1.0.0"] = ENGINE_VERSION
    snapshot_id: str = Field(min_length=64, max_length=64)
    engine: Literal["geometric-manifold-engine"] = "geometric-manifold-engine"
    engine_version: Literal["1.0.0"] = ENGINE_VERSION
    classification: Literal["experimental-computational"] = "experimental-computational"
    geometry_id: GeometryId
    ambient_dimension: int = Field(ge=3, le=5)
    vertex_count: int = Field(ge=1)
    edge_count: int = Field(ge=0)
    frame_constant: float = Field(gt=0)
    gram_values: tuple[float, ...]
    rotation_plane_count: int = Field(ge=0)
    vertices: tuple[tuple[float, ...], ...] = ()
    edges: tuple[tuple[int, int], ...] = ()
    projection_3d: tuple[tuple[float, float, float], ...] = ()
    claims: dict[str, ClaimStatus]
    receipt: "GeometricRunReceipt"


class GeometricRunReceipt(StrictModel):
    schema_version: Literal["1.0.0"] = ENGINE_VERSION
    receipt_id: str = Field(min_length=64, max_length=64)
    engine: Literal["geometric-manifold-engine"] = "geometric-manifold-engine"
    engine_version: Literal["1.0.0"] = ENGINE_VERSION
    operation: str = Field(min_length=1, max_length=80)
    classification: Literal["experimental-computational"] = "experimental-computational"
    source_state_fingerprint: str | None = None
    input_hash: str = Field(min_length=64, max_length=64)
    config_hash: str = Field(min_length=64, max_length=64)
    output_hash: str = Field(min_length=64, max_length=64)
    status: ClaimStatus
    claims: dict[str, ClaimStatus]


class GeometricActivationControls(StrictModel):
    """Versioned controls bound to one sealed Hearthweave state fingerprint."""

    schema_version: Literal["1.0.0"] = ENGINE_VERSION
    source_state_fingerprint: str = Field(min_length=64, max_length=64)
    geometry_id: GeometryId
    calibration_id: str = Field(min_length=1, max_length=120)
    curvature: float = Field(default=1.0, gt=0.0, le=20.0)
    distance_temperature: float = Field(default=1.0, gt=0.0, le=20.0)
    geometry_gate: float = Field(default=0.0, ge=-1.0, le=1.0)
    rotation_angles: tuple[float, ...] = Field(default_factory=lambda: (0.0,) * 10)
    quintic_tension: float = Field(default=1.0, gt=0.0, le=100.0)
    uncertainty: float = Field(default=0.0, ge=0.0, le=1.0)

    @field_validator("rotation_angles")
    @classmethod
    def validate_rotation_angles(cls, value: tuple[float, ...]) -> tuple[float, ...]:
        if len(value) != 10:
            raise ValueError("rotation_angles must contain ten SO(5) plane angles")
        return value


class GeometricProbeRequest(StrictModel):
    geometry_id: GeometryId = "penteract"
    batch_size: int = Field(default=1, ge=1, le=4)
    sequence_length: int = Field(default=8, ge=1, le=32)
    d_model: int = Field(default=64, ge=8, le=256)
    seed: int = Field(default=17, ge=0, le=2_147_483_647)


class GeometricProbeResponse(StrictModel):
    schema_version: Literal["1.0.0"] = ENGINE_VERSION
    engine: Literal["geometric-manifold-engine"] = "geometric-manifold-engine"
    torch_available: bool
    geometry_id: GeometryId
    input_shape: tuple[int, int, int]
    output_shape: tuple[int, int, int]
    live_gram_shape: tuple[int, int, int, int]
    finite: bool
    gate: float
    receipt: GeometricRunReceipt


class GeometricEngineHealth(StrictModel):
    status: Literal["ok"] = "ok"
    service: Literal["geometric-manifold-engine"] = "geometric-manifold-engine"
    engine_version: Literal["1.0.0"] = ENGINE_VERSION
    persistent: Literal[False] = False
    canon_authority: Literal[False] = False
    torch_available: bool
    geometries: tuple[GeometryId, ...] = (
        "dodecahedron",
        "tesseract",
        "penteract",
    )
    experimental_modules: tuple[str, ...] = (
        "anchor-manifold-projection",
        "poincare-ball-attention",
        "rotating-penteract",
        "projective-quintic-proxy",
        "complex-interference-decoder",
        "preference-tuning",
    )


GeometryReferenceSnapshot.model_rebuild()
