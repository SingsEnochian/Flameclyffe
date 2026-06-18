"""
standing_wave/wave_field.py

2D standing wave superposition: Ψ(x,y) = Σᵢ Aᵢ cos(kᵢ(x cosθᵢ + y sinθᵢ) + φᵢ)

Nodal lines (|Ψ| ≈ 0) are the Chladni figures. These ARE the sacred geometry forms
when the DEEP wave configuration takes specific values — Metatron's Cube, the Flower of
Life, and the rest are the nodal patterns of particular standing wave configurations.

One component wave per DEEP axis (N_OSC=6).
Direction θᵢ = current Kuramoto oscillator phase.
Wavenumber kᵢ ∝ Runa tone frequency ratio.
"""

from __future__ import annotations

from typing import List

import torch
import torch.nn as nn

from .oscillators import AXIS_TONES, AXIS_ORDER, N_OSC


class StandingWaveField(nn.Module):
    """
    Computes Ψ(x,y) over a resolution×resolution grid and extracts nodal geometry.
    Phase angles and amplitudes come from KuramotoDeepOscillators at runtime.
    """

    def __init__(self, resolution: int = 64):
        super().__init__()
        self.resolution = resolution

        base_hz = AXIS_TONES["presence"]
        k = torch.tensor(
            [AXIS_TONES[ax] / base_hz * 0.1 for ax in AXIS_ORDER],
            dtype=torch.float32,
        )
        self.register_buffer("k", k)

        xs = torch.linspace(-1.0, 1.0, resolution)
        ys = torch.linspace(-1.0, 1.0, resolution)
        xx, yy = torch.meshgrid(xs, ys, indexing="ij")
        self.register_buffer("xx", xx)  # (res, res)
        self.register_buffer("yy", yy)

    def forward(
        self, theta: torch.Tensor, amplitudes: torch.Tensor
    ) -> torch.Tensor:
        """
        theta:      (N_OSC,) phase angles
        amplitudes: (N_OSC,) positive amplitudes
        returns:    (resolution, resolution) — values in [-Σ|A|, +Σ|A|]
        """
        # Vectorised: (N_OSC, res, res) → sum over oscillators
        dx = torch.cos(theta).view(-1, 1, 1)   # propagation direction x-component
        dy = torch.sin(theta).view(-1, 1, 1)   # propagation direction y-component
        proj   = self.xx.unsqueeze(0) * dx + self.yy.unsqueeze(0) * dy
        phases = self.k.view(-1, 1, 1) * proj + theta.view(-1, 1, 1)
        return (amplitudes.view(-1, 1, 1) * torch.cos(phases)).sum(0)

    def nodal_mask(self, psi: torch.Tensor, threshold: float = 0.15) -> torch.Tensor:
        """Boolean mask of nodal lines — the sacred geometry forms."""
        return torch.abs(psi) < threshold

    def nodal_density(self, psi: torch.Tensor, threshold: float = 0.15) -> float:
        """Fraction of grid on nodal lines — a DEEP field intensity metric."""
        return float(self.nodal_mask(psi, threshold).float().mean())

    def fingerprint(
        self,
        theta: torch.Tensor,
        amplitudes: torch.Tensor,
        n_coeffs: int = 32,
    ) -> torch.Tensor:
        """
        Compact normalised spectral descriptor of the nodal pattern.
        Used by StandingWaveMemoryStore for cosine-similarity recall.
        Two DEEP states with similar fingerprints produce similar nodal geometry.
        """
        psi = self.forward(theta, amplitudes)
        nodal = self.nodal_mask(psi).float()
        fft = torch.fft.rfft2(nodal)
        mag = torch.abs(fft).flatten()[:n_coeffs]
        return mag / (mag.norm() + 1e-8)

    def svg_paths(
        self,
        theta: torch.Tensor,
        amplitudes: torch.Tensor,
        threshold: float = 0.15,
        viewbox: float = 200.0,
    ) -> List[str]:
        """
        Convert nodal grid to SVG 'M x y L x y' path strings.
        Scan column-runs of nodal pixels; emit vertical segments.
        Suitable for direct insertion into Runa's sacred-geometry SVG layer.
        """
        psi = self.forward(theta, amplitudes)
        mask = self.nodal_mask(psi, threshold)
        res = self.resolution
        scale = viewbox / res
        offset = viewbox / 2.0

        paths: List[str] = []
        for col in range(res):
            run_start: int | None = None
            for row in range(res + 1):
                is_nodal = bool(mask[row, col]) if row < res else False
                if is_nodal and run_start is None:
                    run_start = row
                elif not is_nodal and run_start is not None:
                    x = col * scale - offset
                    y1 = run_start * scale - offset
                    y2 = row * scale - offset
                    paths.append(f"M {x:.1f} {y1:.1f} L {x:.1f} {y2:.1f}")
                    run_start = None
        return paths
