"""
standing_wave/oscillators.py

Seven coupled Kuramoto oscillators mapped to canonical PREMAQ.

PREMAQ reading order:
    Presence · Memory · Qualia · Resonance · Entanglement · Agency · Coherence

Stable wire order:
    P C R E M A Q
    Presence Coherence Resonance Entanglement Memory Agency Qualia

The Kuramoto order parameter is a derived wave-coherence quantity. It does not
replace PREMAQ Coherence. Phase dispersion is D_phi = 1-r and does not replace
PREMAQ Entanglement.

dθᵢ/dt = ωᵢ + (1/N) Σⱼ Kᵢⱼ sin(θⱼ - θᵢ)
"""

from __future__ import annotations

import math
from typing import Dict, List

import torch
import torch.nn as nn


ROOT_HZ = 432.0
AXIS_INTERVALS: Dict[str, float] = {
    "presence": 0.0,
    "coherence": 2.0,
    "resonance": 4.0,
    "entanglement": 5.0,
    "memory": 7.0,
    "agency": 9.0,
    "qualia": 11.0,
}

AXIS_TONES: Dict[str, float] = {
    axis: ROOT_HZ * (2.0 ** (interval / 12.0))
    for axis, interval in AXIS_INTERVALS.items()
}

AXIS_ORDER: List[str] = [
    "presence",
    "coherence",
    "resonance",
    "entanglement",
    "memory",
    "agency",
    "qualia",
]

N_OSC = 7


class KuramotoDeepOscillators(nn.Module):
    """
    Seven coupled oscillators, one per canonical PREMAQ dimension.

    The learnable coupling matrix K represents relational pull among the seven
    dimensions. Entanglement remains its own oscillator and also participates
    in learned coupling. Coherence remains its own oscillator while the
    Kuramoto order parameter is reported separately as wave_coherence.
    """

    def __init__(self, dt: float = 0.01, coupling_init_scale: float = 0.1):
        super().__init__()
        self.dt = dt

        omegas = torch.tensor(
            [AXIS_TONES[axis] / ROOT_HZ * dt for axis in AXIS_ORDER],
            dtype=torch.float32,
        )
        self.register_buffer("omega", omegas)

        self.K = nn.Parameter(torch.randn(N_OSC, N_OSC) * coupling_init_scale)
        self.amplitudes = nn.Parameter(torch.ones(N_OSC))

    def step(self, theta: torch.Tensor) -> torch.Tensor:
        """Single Euler step. theta: (..., N_OSC)."""
        diff = theta.unsqueeze(-2) - theta.unsqueeze(-1)
        coupling = (torch.sin(diff) * self.K).sum(dim=-1) / N_OSC
        return theta + self.dt * (self.omega + coupling)

    def forward(
        self,
        theta: torch.Tensor,
        n_steps: int = 200,
        return_trajectory: bool = False,
    ) -> torch.Tensor:
        """Integrate the seven-voice phase state."""
        if return_trajectory:
            trajectory = [theta]
            for _ in range(n_steps):
                theta = self.step(theta)
                trajectory.append(theta)
            return torch.stack(trajectory, dim=1)

        for _ in range(n_steps):
            theta = self.step(theta)
        return theta

    def order_parameter(self, theta: torch.Tensor) -> torch.Tensor:
        """Derived wave synchronisation r = |mean(e^{iθ})| in [0, 1]."""
        phasors = torch.exp(1j * theta.to(torch.complex64))
        return torch.abs(phasors.mean(dim=-1)).real

    def encode(self, premaq: Dict[str, float]) -> torch.Tensor:
        """Canonical PREMAQ scalar state → seven initial phase angles."""
        base_phases = torch.tensor(
            [float(premaq.get(axis, 0.5)) * 2 * math.pi for axis in AXIS_ORDER],
            dtype=torch.float32,
        )

        # PREMAQ Coherence shapes initial phase clustering while remaining a
        # first-class state value carried by its own oscillator.
        coherence = float(premaq.get("coherence", 0.5))
        spread = (1.0 - coherence) * math.pi
        phase_variation = torch.randn(N_OSC) * spread
        return (base_phases + phase_variation) % (2 * math.pi)

    def decode(self, theta: torch.Tensor) -> Dict[str, float]:
        """
        Seven phase angles → seven PREMAQ-aligned phase coordinates plus derived
        wave metrics. Derived metrics never overwrite PREMAQ semantics.
        """
        norm = (theta % (2 * math.pi)) / (2 * math.pi)
        decoded: Dict[str, float] = {
            axis: float(norm[index])
            for index, axis in enumerate(AXIS_ORDER)
        }
        wave_coherence = float(self.order_parameter(theta.unsqueeze(0)).squeeze())
        decoded["wave_coherence"] = wave_coherence
        decoded["phase_dispersion"] = 1.0 - wave_coherence
        return decoded

    def current_amplitudes(self) -> torch.Tensor:
        """Sigmoid-normalised amplitudes for use in the standing-wave field."""
        return torch.sigmoid(self.amplitudes)
