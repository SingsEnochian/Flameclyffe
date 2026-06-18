from __future__ import annotations

import pytest

pytest.importorskip("torch")

from flameclyffe_ml.resonance import NarrativeResonanceModel
from flameclyffe_ml.resonance.wave_architecture import (
    InteractionRhythmLayer,
    LocalContextPhaseAnchor,
    QuantumInspiredWaveModel,
    UserLocalityPhaseAnchor,
)


def test_wave_architecture_facade_exports_safe_model_alias() -> None:
    assert QuantumInspiredWaveModel is NarrativeResonanceModel


def test_wave_architecture_facade_exports_context_and_rhythm_layers() -> None:
    assert UserLocalityPhaseAnchor is LocalContextPhaseAnchor
    assert InteractionRhythmLayer.__name__ == "InteractionRhythmLayer"
