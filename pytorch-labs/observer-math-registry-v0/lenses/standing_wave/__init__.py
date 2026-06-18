# standing_wave — Kuramoto oscillators + 2D standing wave field + wave-interference attention.
#
# Architecture:
#   oscillators.py       KuramotoDeepOscillators  — 6 oscillators mapped to DEEP axes
#   wave_field.py        StandingWaveField        — 2D Ψ(x,y) superposition + nodal geometry
#   wave_attention.py    NarrativeWaveEmbedding   — token IDs → (real, imag) with viscosity
#                        PhaseLockNorm            — complex LayerNorm: normalise amp, keep phase
#                        WaveCoherenceLoss        — magnitude MSE + phase cosine distance
#                        WaveResonanceMemory      — complex-interference attention (Rowan's layer)
#                        WaveSequenceModel        — multi-layer sequence model with register
#                        QuantumInspiredWaveModel — simpler structural pipeline reference
#   memory.py            StandingWaveMemoryRegister — differentiable persistent memory bank
#                        StandingWaveMemoryStore  — fingerprint-based cosine recall
#   registry_bridge.py   register_standing_wave_lens — Observer Math Registry integration
#   train_terra_aeterna.py                        — training loop on Terra Aeterna lore

from .oscillators import KuramotoDeepOscillators, AXIS_TONES, AXIS_ORDER, N_OSC
from .wave_field import StandingWaveField
from .wave_attention import (
    NarrativeWaveEmbedding,
    UserLocalityPhaseAnchor,
    PhaseLockNorm,
    WaveCoherenceLoss,
    WaveResonanceMemory,
    MultiHeadWaveAttention,
    WavePositionalEncoding,
    WaveTransformerBlock,
    WaveSequenceModel,
    QuantumInspiredWaveModel,
)
from .memory import (
    StandingWaveMemoryRegister,
    WaveMemory,
    StandingWaveMemoryStore,
)
from .registry_bridge import register_standing_wave_lens, standing_wave_adapter, wave_css_head

__all__ = [
    # Oscillators
    "KuramotoDeepOscillators", "AXIS_TONES", "AXIS_ORDER", "N_OSC",
    # Wave field
    "StandingWaveField",
    # Attention / sequence models
    "NarrativeWaveEmbedding",
    "UserLocalityPhaseAnchor",
    "PhaseLockNorm",
    "WaveCoherenceLoss",
    "WaveResonanceMemory",
    "MultiHeadWaveAttention",
    "WavePositionalEncoding",
    "WaveTransformerBlock",
    "WaveSequenceModel",
    "QuantumInspiredWaveModel",
    # Memory
    "StandingWaveMemoryRegister",
    "WaveMemory",
    "StandingWaveMemoryStore",
    # Registry
    "register_standing_wave_lens",
    "standing_wave_adapter",
    "wave_css_head",
]
