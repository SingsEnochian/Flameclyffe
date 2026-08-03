"""Lazy runtime helpers that keep PyTorch optional for the Living Engine."""

from __future__ import annotations

from importlib.util import find_spec

from flameclyffe_ml.provenance import content_hash

from .contracts import GeometricProbeRequest, GeometricProbeResponse, GeometricRunReceipt


def torch_available() -> bool:
    return find_spec("torch") is not None


def run_probe(request: GeometricProbeRequest) -> GeometricProbeResponse:
    if not torch_available():
        raise RuntimeError(
            "PyTorch is not installed. Install the ml-lab torch extra to run probes."
        )

    import torch

    from .torch_engine import AnchorManifoldProjection

    torch.manual_seed(request.seed)
    layer = AnchorManifoldProjection(
        d_model=request.d_model,
        geometry_id=request.geometry_id,
    )
    layer.eval()
    hidden = torch.randn(
        request.batch_size,
        request.sequence_length,
        request.d_model,
    )

    with torch.no_grad():
        output, diagnostics = layer(hidden, return_diagnostics=True)

    finite = bool(torch.isfinite(output).all() and torch.isfinite(diagnostics["live_gram"]).all())
    claims = {
        "shape_preserved": (
            "VERIFIED" if tuple(output.shape) == tuple(hidden.shape) else "FAILED"
        ),
        "finite": "VERIFIED" if finite else "FAILED",
        "live_geometry_present": (
            "VERIFIED"
            if diagnostics["live_gram"].shape[-2:] == (
                layer.vertex_count,
                layer.vertex_count,
            )
            else "FAILED"
        ),
    }
    status = "VERIFIED" if all(value == "VERIFIED" for value in claims.values()) else "FAILED"

    input_hash = content_hash(request.model_dump(mode="json"))
    config_hash = content_hash(
        {
            "module": "AnchorManifoldProjection",
            "engine_version": layer.engine_version,
            "geometry_id": request.geometry_id,
            "seed": request.seed,
        }
    )
    output_payload = {
        "output_shape": tuple(output.shape),
        "live_gram_shape": tuple(diagnostics["live_gram"].shape),
        "finite": finite,
        "gate": float(diagnostics["gate"].item()),
    }
    output_hash = content_hash(output_payload)
    receipt = GeometricRunReceipt(
        receipt_id=content_hash(
            {
                "operation": "torch-probe",
                "input_hash": input_hash,
                "config_hash": config_hash,
                "output_hash": output_hash,
            }
        ),
        operation="torch-probe",
        input_hash=input_hash,
        config_hash=config_hash,
        output_hash=output_hash,
        status=status,
        claims=claims,
    )

    return GeometricProbeResponse(
        torch_available=True,
        geometry_id=request.geometry_id,
        input_shape=tuple(hidden.shape),
        output_shape=tuple(output.shape),
        live_gram_shape=tuple(diagnostics["live_gram"].shape),
        finite=finite,
        gate=float(diagnostics["gate"].item()),
        receipt=receipt,
    )
