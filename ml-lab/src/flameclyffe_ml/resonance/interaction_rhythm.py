"""Consent-gated interaction rhythm modulation for resonance prototypes.

This module intentionally avoids biometric framing. It works with coarse, local,
consented interaction signals such as typing pace and optional presentation-energy
state. It does not record keystrokes, identify the user, mutate learned parameters,
or write telemetry anywhere.
"""

from __future__ import annotations

import torch
from torch import nn


class InteractionRhythmLayer(nn.Module):
    """Apply temporary interaction-rhythm tinting to complex wave states.

    The layer returns a per-call time scale and amplitude scale. Callers may use
    the time scale as a temporary pacing input, but should not overwrite learned
    model parameters with it.
    """

    def __init__(
        self,
        *,
        default_wpm: float = 45.0,
        default_energy_level: float = 1.0,
        min_time_scale: float = 0.1,
        max_time_scale: float = 1.5,
        min_amplitude_scale: float = 0.3,
    ) -> None:
        super().__init__()
        if default_wpm <= 0:
            raise ValueError("default_wpm must be positive")
        if not 0 < default_energy_level <= 1:
            raise ValueError("default_energy_level must be in (0, 1]")
        if min_time_scale <= 0 or max_time_scale <= 0:
            raise ValueError("time-scale bounds must be positive")
        if min_time_scale > max_time_scale:
            raise ValueError("min_time_scale must not exceed max_time_scale")
        if not 0 < min_amplitude_scale <= 1:
            raise ValueError("min_amplitude_scale must be in (0, 1]")

        self.default_wpm = float(default_wpm)
        self.default_energy_level = float(default_energy_level)
        self.min_time_scale = float(min_time_scale)
        self.max_time_scale = float(max_time_scale)
        self.min_amplitude_scale = float(min_amplitude_scale)

    def calculate_offsets(
        self,
        *,
        wpm: float | None = None,
        energy_level: float | None = None,
        device: torch.device | None = None,
        dtype: torch.dtype = torch.float32,
    ) -> tuple[torch.Tensor, torch.Tensor]:
        """Return temporary time-scale and amplitude-scale tensors.

        ``wpm`` should be coarse page-local typing pace. It must not contain raw
        keystrokes or text. ``energy_level`` should be a coarse presentation hint,
        not a required device fingerprint.
        """

        safe_wpm = self.default_wpm if wpm is None else float(wpm)
        safe_energy = self.default_energy_level if energy_level is None else float(energy_level)

        wpm_tensor = torch.tensor(safe_wpm, device=device, dtype=dtype)
        energy_tensor = torch.tensor(safe_energy, device=device, dtype=dtype)

        # Faster interaction means faster phase movement for this call only.
        wpm_norm = torch.clamp(wpm_tensor / 80.0, 0.1, 1.4)
        time_scale = torch.clamp(
            self.max_time_scale - wpm_norm,
            self.min_time_scale,
            self.max_time_scale,
        )

        amplitude_scale = torch.clamp(energy_tensor, self.min_amplitude_scale, 1.0)
        return time_scale, amplitude_scale

    def apply_to_wave(
        self,
        real: torch.Tensor,
        imag: torch.Tensor,
        *,
        wpm: float | None = None,
        energy_level: float | None = None,
    ) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """Scale a wave state without mutating any model parameters."""

        time_scale, amplitude_scale = self.calculate_offsets(
            wpm=wpm,
            energy_level=energy_level,
            device=real.device,
            dtype=real.dtype,
        )
        return real * amplitude_scale, imag * amplitude_scale, time_scale
