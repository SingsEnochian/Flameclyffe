# standing_wave — Kuramoto oscillators + 2D standing wave field + wave-interference attention.
#
# Architecture:
#   oscillators.py       KuramotoDeepOscillators  — 6 oscillators mapped to DEEP axes
#   wave_field.py        StandingWaveField        — 2D Ψ(x,y) superposition + nodal geometry
#   wave_attention.py    WaveResonanceMemory      — complex-interference attention (Rowan's layer)
#                        WaveSequenceModel        — multi-layer sequence model
#   memory.py            StandingWaveMemoryStore  — fingerprint-based phase memory
#   registry_bridge.py   register_standing_wave_lens — Observer Math Registry integration
#   train_terra_aeterna.py                        — training loop on Terra Aeterna lore

from .oscillators import KuramotoDeepOscillators, AXIS_TONES, AXIS_ORDER, N_OSC
from .wave_field import StandingWaveField
from .wave_attention import (
    WaveResonanceMemory,
    MultiHeadWaveAttention,
    WavePositionalEncoding,
    WaveTransformerBlock,
    WaveSequenceModel,
)
from .memory import WaveMemory, StandingWaveMemoryStore
from .registry_bridge import register_standing_wave_lens, standing_wave_adapter, wave_css_head

__all__ = [
    "KuramotoDeepOscillators",
    "AXIS_TONES",
    "AXIS_ORDER",
    "N_OSC",
    "StandingWaveField",
    "WaveResonanceMemory",
    "MultiHeadWaveAttention",
    "WavePositionalEncoding",
    "WaveTransformerBlock",
    "WaveSequenceModel",
    "WaveMemory",
    "StandingWaveMemoryStore",
    "register_standing_wave_lens",
    "standing_wave_adapter",
    "wave_css_head",
]
