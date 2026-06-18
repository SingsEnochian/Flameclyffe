"""
standing_wave/memory.py

Persistent wave memory — store DEEP state snapshots keyed by their standing wave
fingerprint. Recall by cosine similarity in fingerprint space.

Recall metric: cosine(fingerprint_a, fingerprint_b) = Σ aᵢbᵢ / (|a||b|)
This IS the wave interference metric — the same cos(Δφ) as WaveResonanceMemory.
Phase-coherent DEEP states produce phase-coherent nodal fingerprints.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Dict, List

import torch


@dataclass
class WaveMemory:
    """A single stored memory: a DEEP state + its standing wave fingerprint + metadata."""
    label: str
    deep: Dict[str, float]
    fingerprint: List[float]       # from StandingWaveField.fingerprint()
    phase_angles: List[float]      # final Kuramoto oscillator phases (N_OSC values)
    coherence: float               # Kuramoto order parameter at storage time
    timestamp: str = ""            # ISO 8601
    rune: str = ""                 # Elder Futhark rune (from Bridge-Pulse temporal layer)
    moon_phase: str = ""           # moon phase name or emoji
    moon_age_days: float = 0.0

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "WaveMemory":
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})


@dataclass
class StandingWaveMemoryStore:
    """
    In-memory store with cosine-similarity recall and JSON persistence.

    Bridge-Pulse export emits only temporal grounding fields (timestamp, moon, rune)
    matching Bridge-Pulse's actual scope — the DEEP vector stays in Flameclyffe.
    """
    memories: List[WaveMemory] = field(default_factory=list)

    def store(self, mem: WaveMemory) -> None:
        self.memories.append(mem)

    def recall(
        self, query_fingerprint: torch.Tensor, top_k: int = 3
    ) -> List[WaveMemory]:
        """Return the k stored memories most resonant with the query fingerprint."""
        if not self.memories:
            return []
        q = _normalise(query_fingerprint)
        scored = [(float(_cosine(q, torch.tensor(m.fingerprint, dtype=torch.float32))), m)
                  for m in self.memories]
        scored.sort(key=lambda x: x[0], reverse=True)
        return [m for _, m in scored[:top_k]]

    def recall_above(
        self, query_fingerprint: torch.Tensor, threshold: float = 0.8
    ) -> List[WaveMemory]:
        """Return all memories above the coherence threshold."""
        if not self.memories:
            return []
        q = _normalise(query_fingerprint)
        return [
            m for m in self.memories
            if float(_cosine(q, torch.tensor(m.fingerprint, dtype=torch.float32))) >= threshold
        ]

    # ── Persistence ───────────────────────────────────────────────────────────

    def save(self, path: Path | str) -> None:
        Path(path).write_text(
            json.dumps([m.to_dict() for m in self.memories], indent=2), encoding="utf-8"
        )

    def load(self, path: Path | str) -> None:
        raw = json.loads(Path(path).read_text(encoding="utf-8"))
        self.memories = [WaveMemory.from_dict(d) for d in raw]

    # ── Bridge-Pulse export ───────────────────────────────────────────────────

    def bridge_pulse_export(self, mem: WaveMemory) -> dict:
        """
        Temporal-grounding-only export matching Bridge-Pulse's actual scope.
        Moon phase + rune + timestamp. The DEEP vector stays in Flameclyffe.
        """
        return {
            "timestamp": mem.timestamp,
            "moon": {
                "age_days": mem.moon_age_days,
                "phase": mem.moon_phase,
            },
            "rune": mem.rune,
            "coherence_snapshot": round(mem.coherence, 4),
            "label": mem.label,
        }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _normalise(v: torch.Tensor) -> torch.Tensor:
    return v / (v.norm() + 1e-8)


def _cosine(a: torch.Tensor, b: torch.Tensor) -> torch.Tensor:
    n = min(len(a), len(b))
    return torch.dot(_normalise(a[:n]), _normalise(b[:n]))
