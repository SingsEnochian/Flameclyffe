"""Compatibility facade for older wave-architecture lab sketches.

Prefer importing the explicit modules directly:

- `NarrativeResonanceModel`
- `LocalContextPhaseAnchor`
- `InteractionRhythmLayer`

This facade exists so demo shells can migrate away from single-file prototypes
without reintroducing hardcoded telemetry, parameter mutation, or biometric naming
as the canonical API.
"""

from __future__ import annotations

from .interaction_rhythm import InteractionRhythmLayer
from .local_context_phase import LocalContextPhaseAnchor, UserLocalityPhaseAnchor
from .narrative_wave_model import (
    NarrativeResonanceModel,
    NarrativeWaveEmbedding,
    PhaseLockNorm,
    QuantumInspiredWaveModel,
    StandingWaveMemoryRegister,
    WaveCoherenceLoss,
    WaveResonanceMemory,
)

__all__ = [
    "InteractionRhythmLayer",
    "LocalContextPhaseAnchor",
    "NarrativeResonanceModel",
    "NarrativeWaveEmbedding",
    "PhaseLockNorm",
    "QuantumInspiredWaveModel",
    "StandingWaveMemoryRegister",
    "UserLocalityPhaseAnchor",
    "WaveCoherenceLoss",
    "WaveResonanceMemory",
]
