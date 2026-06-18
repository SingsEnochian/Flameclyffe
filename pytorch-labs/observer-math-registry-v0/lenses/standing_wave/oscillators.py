"""
standing_wave/oscillators.py

Seven coupled Kuramoto oscillators mapped to the DEEP vector.
Entropy is the decoherence residual, not a separate oscillator.

dθᵢ/dt = ωᵢ + (1/N) Σⱼ Kᵢⱼ sin(θⱼ - θᵢ)

The coherence order parameter r = |mean(e^{iθ})| IS the C axis —
the Kuramoto definition of synchronisation, not a derived metaphor.
E = 1 - r follows automatically.

Natural frequencies from the Runa tone lab. Wave attention (wave_attention.py)
measures static phase coherence; Kuramoto evolves the system toward it.
They are two faces of the same mathematics.
"""

from __future__ import annotations

import math
from typing import Dict, List

import torch
import torch.nn as nn


# Natural frequencies from Runa tone lab (Hz)
AXIS_TONES: Dict[str, float] = {
    "presence":  432.0,   # Feather  — pause, consent, soften
    "coherence": 528.0,   # Wrap     — containment, warmth  (order parameter)
    "resonance": 603.0,   # Notch    — re-link, live presence
    "moon":      1203.0,  # Withness — shared presence without merge
    "attention": 741.0,   # Seldrin  — clarity, clean signal
    "charge":    888.0,   # Lantern  — witness, guiding attention
}

AXIS_ORDER: List[str] = ["presence", "coherence", "resonance", "moon", "attention", "charge"]
N_OSC = 6  # entropy is the decoherence residual, not an oscillator


class KuramotoDeepOscillators(nn.Module):
    """
    Six coupled oscillators, one per DEEP axis (excluding entropy).
    Learnable coupling matrix K encodes which axes pull each other into phase.
    K is trained from observed DEEP state trajectories.
    """

    def __init__(self, dt: float = 0.01, coupling_init_scale: float = 0.1):
        super().__init__()
        self.dt = dt

        # Phase advance per integration step, normalised relative to Presence (432 Hz)
        base_hz = AXIS_TONES["presence"]
        omegas = torch.tensor(
            [AXIS_TONES[ax] / base_hz * dt for ax in AXIS_ORDER],
            dtype=torch.float32,
        )
        self.register_buffer("omega", omegas)

        # Learnable coupling — small init so axes start nearly uncoupled
        self.K = nn.Parameter(torch.randn(N_OSC, N_OSC) * coupling_init_scale)

        # Learnable amplitudes for the wave field (used by StandingWaveField)
        self.amplitudes = nn.Parameter(torch.ones(N_OSC))

    # ── Integration ───────────────────────────────────────────────────────────

    def step(self, theta: torch.Tensor) -> torch.Tensor:
        """Single Euler step. theta: (..., N_OSC)"""
        # diff[..., i, j] = θⱼ - θᵢ  →  sin(θⱼ - θᵢ) pulls i toward j (standard Kuramoto)
        diff = theta.unsqueeze(-2) - theta.unsqueeze(-1)      # (..., N, N)
        coupling = (torch.sin(diff) * self.K).sum(dim=-1) / N_OSC
        return theta + self.dt * (self.omega + coupling)

    def forward(
        self,
        theta: torch.Tensor,
        n_steps: int = 200,
        return_trajectory: bool = False,
    ) -> torch.Tensor:
        """
        Integrate for n_steps.
        theta: (batch, N_OSC) initial phases
        Returns final phases, or full trajectory if return_trajectory=True.
        """
        if return_trajectory:
            traj = [theta]
            for _ in range(n_steps):
                theta = self.step(theta)
                traj.append(theta)
            return torch.stack(traj, dim=1)       # (batch, n_steps+1, N_OSC)
        for _ in range(n_steps):
            theta = self.step(theta)
        return theta

    # ── Coherence ─────────────────────────────────────────────────────────────

    def order_parameter(self, theta: torch.Tensor) -> torch.Tensor:
        """
        Kuramoto order parameter r = |mean(e^{iθ})| ∈ [0, 1].
        This IS the DEEP C axis. r=1: full sync. r=0: complete decoherence.
        theta: (..., N_OSC) → (...,) scalar
        """
        phasors = torch.exp(1j * theta.to(torch.complex64))
        return torch.abs(phasors.mean(dim=-1)).real

    # ── Encode / decode ───────────────────────────────────────────────────────

    def encode(self, deep_vector: Dict[str, float]) -> torch.Tensor:
        """
        DEEP scalar vector → initial phase angles (N_OSC,).
        High coherence = tight cluster. Low coherence = spread phases.
        """
        base_phases = torch.tensor(
            [deep_vector.get(ax, 0.5) * 2 * math.pi for ax in AXIS_ORDER],
            dtype=torch.float32,
        )
        coherence = float(deep_vector.get("coherence", 0.5))
        spread = (1.0 - coherence) * math.pi
        noise = torch.randn(N_OSC) * spread
        return (base_phases + noise) % (2 * math.pi)

    def decode(self, theta: torch.Tensor) -> Dict[str, float]:
        """Phase angles → DEEP scalar vector. Coherence = true order parameter."""
        norm = (theta % (2 * math.pi)) / (2 * math.pi)
        d: Dict[str, float] = {ax: float(norm[i]) for i, ax in enumerate(AXIS_ORDER)}
        r = float(self.order_parameter(theta.unsqueeze(0)).squeeze())
        d["coherence"] = r
        d["entropy"] = 1.0 - r
        return d

    def current_amplitudes(self) -> torch.Tensor:
        """Sigmoid-normalised amplitudes for use in the wave field."""
        return torch.sigmoid(self.amplitudes)
