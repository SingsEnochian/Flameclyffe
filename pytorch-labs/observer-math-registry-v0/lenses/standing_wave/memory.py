"""
standing_wave/memory.py

Wave memory in two forms:

  StandingWaveMemoryRegister  (nn.Module, differentiable)
      Fixed-capacity persistent memory bank — learned via gradient descent.
      Real part = amplitude envelope; imaginary part = phase profile.
      Retrieval: Re(Q * conj(M)) = Q_real * M_real + Q_imag * M_imag.
      Same formula as WaveResonanceMemory. This is the learnable analogue of
      StandingWaveMemoryStore.

  WaveMemory / StandingWaveMemoryStore  (dataclasses, static)
      DEEP state snapshots keyed by cosine similarity in fingerprint space.
      Non-differentiable. For runtime recall, JSON persistence, and
      Bridge-Pulse temporal export.

Recall metric shared by both: cosine(a, b) = Σ aᵢbᵢ / (|a||b|)
= wave interference in phase-fingerprint space.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Dict, List

import torch
import torch.nn as nn


# ── Differentiable memory register ───────────────────────────────────────────

class StandingWaveMemoryRegister(nn.Module):
    """
    Fixed-capacity persistent memory bank using learned complex wave packets.

    Differentiable counterpart to StandingWaveMemoryStore. The registers are
    learned by gradient descent; recall is soft attention over all slots.

    Retrieval uses Re(Q * conj(M)) = Q_real·M_real + Q_imag·M_imag, scaled by
    sqrt(embed_dim) for gradient stability, then softmax to get resonance scores.

    After retrieval, expose resonance_scores to the training loop for inspection:
    the score distribution shows which memory slots the current batch attended to.
    A peaked distribution = some slots are specialising; flat = register is idle.

    write() is a no-grad soft associative write for seeding specific slots
    (e.g. loading a Stonewood phase fingerprint into a dedicated slot before
    training or inference).
    """

    def __init__(self, num_memories: int, embed_dim: int):
        super().__init__()
        self.num_memories = num_memories
        self.embed_dim    = embed_dim
        # Small-scale init avoids large initial interference magnitudes
        self.register_real = nn.Parameter(torch.randn(num_memories, embed_dim) * 0.02)
        self.register_imag = nn.Parameter(torch.randn(num_memories, embed_dim) * 0.02)

    def forward(
        self,
        query_real: torch.Tensor,
        query_imag: torch.Tensor,
    ) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """
        query_real, query_imag: (batch, embed_dim)
        Returns: retrieved_real, retrieved_imag (batch, embed_dim), scores (batch, num_memories)
        """
        interference = (
            torch.matmul(query_real, self.register_real.t())
            + torch.matmul(query_imag, self.register_imag.t())
        ) / (self.embed_dim ** 0.5)
        scores   = torch.softmax(interference, dim=-1)
        r_real   = torch.matmul(scores, self.register_real)
        r_imag   = torch.matmul(scores, self.register_imag)
        return r_real, r_imag, scores

    @torch.no_grad()
    def write(
        self,
        key_real: torch.Tensor,
        key_imag: torch.Tensor,
        strength: float = 1.0,
    ) -> None:
        """
        Soft associative write — blend the key toward the most resonant slots.
        Use to seed place/character memories before training (e.g. Stonewood).
        Does NOT use gradients.
        """
        _, _, scores = self.forward(key_real, key_imag)
        gate = scores.mean(0, keepdim=True).t()          # (num_memories, 1)
        target_real = key_real.mean(0)
        target_imag = key_imag.mean(0)
        self.register_real.data += strength * gate * (target_real - self.register_real.data)
        self.register_imag.data += strength * gate * (target_imag - self.register_imag.data)

    def resonance_summary(self, scores: torch.Tensor) -> str:
        """Human-readable summary of which slots fired. scores: (batch, num_memories)"""
        mean_scores = scores.mean(0)
        top = torch.topk(mean_scores, k=min(5, self.num_memories))
        parts = [f"slot {i}: {v:.3f}" for v, i in zip(top.values.tolist(), top.indices.tolist())]
        entropy = float(-torch.sum(mean_scores * torch.log(mean_scores + 1e-8)))
        return "  ".join(parts) + f"  (H={entropy:.3f})"


# ── Static snapshot memory ────────────────────────────────────────────────────

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

    def _bank(self) -> torch.Tensor:
        """Stacked, L2-normalised fingerprint matrix — built fresh each call."""
        mat = torch.stack([torch.tensor(m.fingerprint, dtype=torch.float32)
                           for m in self.memories])
        return mat / (mat.norm(dim=1, keepdim=True) + 1e-8)

    def recall(
        self, query_fingerprint: torch.Tensor, top_k: int = 3
    ) -> List[WaveMemory]:
        if not self.memories:
            return []
        q      = _normalise(query_fingerprint)
        scores = self._bank() @ q
        top_k  = min(top_k, len(self.memories))
        idx    = torch.topk(scores, k=top_k).indices.tolist()
        return [self.memories[i] for i in idx]

    def recall_above(
        self, query_fingerprint: torch.Tensor, threshold: float = 0.8
    ) -> List[WaveMemory]:
        if not self.memories:
            return []
        q      = _normalise(query_fingerprint)
        scores = self._bank() @ q
        return [m for m, s in zip(self.memories, scores.tolist()) if s >= threshold]

    def save(self, path: Path | str) -> None:
        Path(path).write_text(
            json.dumps([m.to_dict() for m in self.memories], indent=2), encoding="utf-8"
        )

    def load(self, path: Path | str) -> None:
        raw = json.loads(Path(path).read_text(encoding="utf-8"))
        self.memories = [WaveMemory.from_dict(d) for d in raw]

    def bridge_pulse_export(self, mem: WaveMemory) -> dict:
        """Temporal-grounding-only export. DEEP vector stays in Flameclyffe."""
        return {
            "timestamp":          mem.timestamp,
            "moon":               {"age_days": mem.moon_age_days, "phase": mem.moon_phase},
            "rune":               mem.rune,
            "coherence_snapshot": round(mem.coherence, 4),
            "label":              mem.label,
        }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _normalise(v: torch.Tensor) -> torch.Tensor:
    return v / (v.norm() + 1e-8)


def _cosine(a: torch.Tensor, b: torch.Tensor) -> torch.Tensor:
    n = min(len(a), len(b))
    return torch.dot(_normalise(a[:n]), _normalise(b[:n]))
