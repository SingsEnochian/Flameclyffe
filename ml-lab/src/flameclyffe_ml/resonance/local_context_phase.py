"""Consent-gated local context phase anchoring for resonance prototypes.

This module rotates complex wave states by a coarse, explicit context phase. It is
for local/consented context tinting only. It must not receive precise coordinates
unless a caller has an explicit local-only reason and a visible consent gate.
"""

from __future__ import annotations

import math

import torch
from torch import nn


class LocalContextPhaseAnchor(nn.Module):
    """Project coarse local context into a phase rotation for wave states."""

    def __init__(self, embed_dim: int, context_dim: int = 4) -> None:
        super().__init__()
        if embed_dim <= 0:
            raise ValueError("embed_dim must be positive")
        if context_dim <= 0:
            raise ValueError("context_dim must be positive")

        self.embed_dim = embed_dim
        self.context_dim = context_dim
        self.context_projector = nn.Linear(context_dim, embed_dim)

    def compute_context_phase(
        self,
        *,
        latitude_bucket: float = 0.0,
        longitude_bucket: float = 0.0,
        local_hour: float = 12.0,
        device: torch.device | None = None,
        dtype: torch.dtype = torch.float32,
    ) -> torch.Tensor:
        """Project coarse locality and cyclical time into phase angles.

        ``latitude_bucket`` and ``longitude_bucket`` should be coarse values in
        the range [-1, 1], not raw GPS coordinates. ``local_hour`` is folded onto
        a 24-hour sin/cos cycle so midnight and noon remain distinct.
        """

        lat = torch.clamp(torch.tensor(latitude_bucket, device=device, dtype=dtype), -1.0, 1.0)
        lon = torch.clamp(torch.tensor(longitude_bucket, device=device, dtype=dtype), -1.0, 1.0)
        hour_angle = 2.0 * math.pi * (float(local_hour) % 24.0) / 24.0

        context = torch.stack(
            [
                lat,
                lon,
                torch.tensor(math.sin(hour_angle), device=device, dtype=dtype),
                torch.tensor(math.cos(hour_angle), device=device, dtype=dtype),
            ]
        )

        if self.context_dim != 4:
            raise ValueError("compute_context_phase currently expects context_dim=4")

        raw_angles = self.context_projector(context)
        return torch.tanh(raw_angles) * math.pi

    def apply_anchor_to_wave(
        self,
        real: torch.Tensor,
        imag: torch.Tensor,
        context_phase: torch.Tensor,
    ) -> tuple[torch.Tensor, torch.Tensor]:
        """Apply complex rotation: psi_new = psi * exp(i * theta)."""

        phase = context_phase.to(device=real.device, dtype=real.dtype)
        while phase.ndim < real.ndim:
            phase = phase.unsqueeze(0)

        cos_phase = torch.cos(phase)
        sin_phase = torch.sin(phase)

        anchored_real = (real * cos_phase) - (imag * sin_phase)
        anchored_imag = (real * sin_phase) + (imag * cos_phase)
        return anchored_real, anchored_imag


# Compatibility alias for older lab sketches. Prefer LocalContextPhaseAnchor.
UserLocalityPhaseAnchor = LocalContextPhaseAnchor
