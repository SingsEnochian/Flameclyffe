from __future__ import annotations

import pytest

pytest.importorskip("torch")

import torch

from flameclyffe_ml.resonance import InteractionRhythmLayer


def test_interaction_rhythm_offsets_are_finite_and_bounded() -> None:
    layer = InteractionRhythmLayer()

    time_scale, amplitude_scale = layer.calculate_offsets(wpm=120.0, energy_level=0.15)

    assert torch.isfinite(time_scale)
    assert torch.isfinite(amplitude_scale)
    assert 0.1 <= time_scale.item() <= 1.5
    assert amplitude_scale.item() == pytest.approx(0.3)


def test_interaction_rhythm_uses_defaults_when_values_are_missing() -> None:
    layer = InteractionRhythmLayer(default_wpm=40.0, default_energy_level=0.8)

    time_scale, amplitude_scale = layer.calculate_offsets()

    assert torch.isfinite(time_scale)
    assert torch.isfinite(amplitude_scale)
    assert 0.1 <= time_scale.item() <= 1.5
    assert amplitude_scale.item() == pytest.approx(0.8)


def test_interaction_rhythm_applies_amplitude_without_mutating_wave_shape() -> None:
    layer = InteractionRhythmLayer()
    real = torch.ones(2, 3, 4)
    imag = torch.ones(2, 3, 4) * 2.0

    attenuated_real, attenuated_imag, time_scale = layer.apply_to_wave(
        real,
        imag,
        wpm=30.0,
        energy_level=0.5,
    )

    assert attenuated_real.shape == real.shape
    assert attenuated_imag.shape == imag.shape
    assert torch.allclose(attenuated_real, real * 0.5)
    assert torch.allclose(attenuated_imag, imag * 0.5)
    assert 0.1 <= time_scale.item() <= 1.5


def test_interaction_rhythm_rejects_invalid_configuration() -> None:
    with pytest.raises(ValueError, match="default_wpm"):
        InteractionRhythmLayer(default_wpm=0)

    with pytest.raises(ValueError, match="default_energy_level"):
        InteractionRhythmLayer(default_energy_level=2.0)

    with pytest.raises(ValueError, match="min_time_scale"):
        InteractionRhythmLayer(min_time_scale=2.0, max_time_scale=1.0)
