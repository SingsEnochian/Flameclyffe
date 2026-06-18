from __future__ import annotations

import pytest

pytest.importorskip("torch")

import torch

from flameclyffe_ml.resonance import LocalContextPhaseAnchor, UserLocalityPhaseAnchor


def test_local_context_phase_returns_embed_dim_angles() -> None:
    anchor = LocalContextPhaseAnchor(embed_dim=16)

    phase = anchor.compute_context_phase(
        latitude_bucket=0.25,
        longitude_bucket=-0.5,
        local_hour=15.0,
    )

    assert phase.shape == (16,)
    assert torch.isfinite(phase).all()
    assert torch.all(phase <= torch.pi)
    assert torch.all(phase >= -torch.pi)


def test_local_context_phase_rotates_wave_without_changing_shape() -> None:
    anchor = LocalContextPhaseAnchor(embed_dim=16)
    real = torch.randn(2, 4, 16)
    imag = torch.randn(2, 4, 16)
    phase = anchor.compute_context_phase(local_hour=6.0)

    anchored_real, anchored_imag = anchor.apply_anchor_to_wave(real, imag, phase)

    assert anchored_real.shape == real.shape
    assert anchored_imag.shape == imag.shape
    assert torch.isfinite(anchored_real).all()
    assert torch.isfinite(anchored_imag).all()


def test_local_context_alias_points_to_safe_anchor() -> None:
    assert UserLocalityPhaseAnchor is LocalContextPhaseAnchor


def test_local_context_phase_rejects_invalid_embed_dim() -> None:
    with pytest.raises(ValueError, match="embed_dim"):
        LocalContextPhaseAnchor(embed_dim=0)
