"""FastAPI routes for deterministic geometric references and bounded probes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, status

from flameclyffe_ml.geometric_engine import (
    GeometricEngineHealth,
    GeometricProbeRequest,
    GeometricProbeResponse,
    GeometryReferenceRequest,
    GeometryReferenceSnapshot,
    build_reference_snapshot,
    run_probe,
    torch_available,
)

router = APIRouter(prefix="/v1/geometric", tags=["geometric-manifold-engine"])


@router.get("/health", response_model=GeometricEngineHealth)
async def geometric_health() -> GeometricEngineHealth:
    return GeometricEngineHealth(torch_available=torch_available())


@router.get("/contracts")
async def geometric_contracts() -> dict[str, Any]:
    return {
        "reference_request": GeometryReferenceRequest.model_json_schema(),
        "reference_snapshot": GeometryReferenceSnapshot.model_json_schema(),
        "probe_request": GeometricProbeRequest.model_json_schema(),
        "probe_response": GeometricProbeResponse.model_json_schema(),
    }


@router.post("/reference", response_model=GeometryReferenceSnapshot)
async def geometric_reference(
    request: GeometryReferenceRequest,
) -> GeometryReferenceSnapshot:
    return build_reference_snapshot(request)


@router.post("/probe", response_model=GeometricProbeResponse)
async def geometric_probe(
    request: GeometricProbeRequest,
) -> GeometricProbeResponse:
    if not torch_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "PyTorch is not installed. Install the ml-lab torch extra "
                "to run geometric probes."
            ),
        )
    try:
        return run_probe(request)
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
