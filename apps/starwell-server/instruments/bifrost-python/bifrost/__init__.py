"""BIFRÖST — a dual-aspect bridge.

Not a road that erases the distance between worlds, but one that holds both
shores true while permitting passage between them. The scientific half measures
the bridge; the mythic half gives the bridge meaning. Neither supersedes the other.

The bridge is crossed by a controlled cycle — compress → release → compress →
release — that advances along an outward spiral, r_{n+1} = r_n + Δr_n, so it
remembers every crossing and grows broader without dissolving either side.
"""
from .engine import Bifrost, BreathingBridge
from .models import (
    Breath, SEEDS, COMPRESS, RELEASE,
    MYTH_TO_MEASURED, MEASURED_TO_MYTH,
    FOUNDING, ARCHITECTURE, DOMAINS,
)
from .lineage import Lineage

__all__ = [
    "Bifrost", "BreathingBridge", "Breath", "SEEDS",
    "COMPRESS", "RELEASE", "MYTH_TO_MEASURED", "MEASURED_TO_MYTH",
    "FOUNDING", "ARCHITECTURE", "DOMAINS", "Lineage",
]
__version__ = "1.0.0"
