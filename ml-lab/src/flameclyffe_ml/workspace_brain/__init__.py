"""Local, bounded signal-graph engine for House Workspace OS.

This package coordinates transient runtime signals. It does not define agent identity,
promote canon, or replace durable memory systems.
"""

from .engine import WorkspaceBrain
from .models import BrainIngestReceipt, BrainNode, BrainSignal, BrainSnapshot

__all__ = [
    "BrainIngestReceipt",
    "BrainNode",
    "BrainSignal",
    "BrainSnapshot",
    "WorkspaceBrain",
]
