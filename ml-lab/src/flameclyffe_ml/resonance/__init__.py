"""Experimental resonance-memory prototypes.

These modules are research-lab scaffolds. They do not fetch canon records, write indexes,
publish material, or claim literal quantum memory.
"""

from .interaction_rhythm import InteractionRhythmLayer
from .local_context_phase import LocalContextPhaseAnchor, UserLocalityPhaseAnchor
from .narrative_wave_model import (
    NarrativeResonanceModel,
    NarrativeWaveEmbedding,
    PhaseLockNorm,
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
    "StandingWaveMemoryRegister",
    "UserLocalityPhaseAnchor",
    "WaveCoherenceLoss",
    "WaveResonanceMemory",
]
