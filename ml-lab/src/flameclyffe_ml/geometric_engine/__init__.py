"""Review-gated Geometric Manifold Engine.

The package root remains torch-free. Import ``flameclyffe_ml.geometric_engine.torch_engine``
only inside workers or installations that include the optional torch dependency.
"""

from .contracts import (
    ENGINE_VERSION,
    GeometricActivationControls,
    GeometricEngineHealth,
    GeometricProbeRequest,
    GeometricProbeResponse,
    GeometricRunReceipt,
    GeometryReferenceRequest,
    GeometryReferenceSnapshot,
)
from .reference import build_reference_snapshot, reference_edges, reference_vertices
from .runtime import run_probe, torch_available

__all__ = [
    "ENGINE_VERSION",
    "GeometricActivationControls",
    "GeometricEngineHealth",
    "GeometricProbeRequest",
    "GeometricProbeResponse",
    "GeometricRunReceipt",
    "GeometryReferenceRequest",
    "GeometryReferenceSnapshot",
    "build_reference_snapshot",
    "reference_edges",
    "reference_vertices",
    "run_probe",
    "torch_available",
]
