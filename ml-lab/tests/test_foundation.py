from __future__ import annotations

import numpy as np

from flameclyffe_ml import PrivacyClass, content_hash, evaluate_release, run_fingerprint
from flameclyffe_ml.synthetic import DEEP_CHANNELS, generate_deep_batch


def test_content_hash_is_order_independent_for_mappings() -> None:
    left = {"b": 2, "a": {"y": 4, "x": 3}}
    right = {"a": {"x": 3, "y": 4}, "b": 2}

    assert content_hash(left) == content_hash(right)


def test_run_fingerprint_changes_when_parameters_change() -> None:
    common = {
        "model_name": "tiny-deep-mlp",
        "model_version": "0.1.0",
        "code_revision": "abc123",
        "input_snapshot_hash": "def456",
        "seed": 7,
    }

    first = run_fingerprint(parameters={"hidden": 16}, **common)
    second = run_fingerprint(parameters={"hidden": 32}, **common)

    assert first != second


def test_privacy_can_move_to_more_restrictive_class() -> None:
    decision = evaluate_release(PrivacyClass.INTERNAL, PrivacyClass.PRIVATE)

    assert decision.allowed is True
    assert decision.requires_review is False


def test_private_release_requires_review_and_explicit_consent() -> None:
    without_review = evaluate_release(PrivacyClass.PRIVATE, PrivacyClass.PUBLIC)
    without_consent = evaluate_release(
        PrivacyClass.PRIVATE,
        PrivacyClass.PUBLIC,
        reviewed=True,
    )
    authorised = evaluate_release(
        PrivacyClass.PRIVATE,
        PrivacyClass.PUBLIC,
        reviewed=True,
        explicit_consent=True,
    )

    assert without_review.allowed is False
    assert without_consent.allowed is False
    assert authorised.allowed is True


def test_restricted_material_cannot_be_downgraded() -> None:
    decision = evaluate_release(
        PrivacyClass.RESTRICTED,
        PrivacyClass.PRIVATE,
        reviewed=True,
        explicit_consent=True,
    )

    assert decision.allowed is False


def test_synthetic_deep_batch_is_deterministic_and_bounded() -> None:
    first = generate_deep_batch(samples=64, steps=24, anomaly_fraction=0.25, seed=11)
    second = generate_deep_batch(samples=64, steps=24, anomaly_fraction=0.25, seed=11)

    assert first.channels == DEEP_CHANNELS
    assert first.values.shape == (64, 24, len(DEEP_CHANNELS))
    assert first.anomaly_labels.shape == (64,)
    assert int(first.anomaly_labels.sum()) == 16
    assert np.array_equal(first.values, second.values)
    assert np.array_equal(first.anomaly_labels, second.anomaly_labels)
    assert float(first.values.min()) >= 0.0
    assert float(first.values.max()) <= 1.0
    assert np.all(first.anomaly_steps[~first.anomaly_labels] == -1)
    assert np.all(first.anomaly_steps[first.anomaly_labels] >= 0)
