"""Deterministic synthetic DEEP channel windows.

The generator provides non-sensitive fixtures for baselines, model plumbing, tests,
and interface prototypes. It is not intended to simulate or validate lived experience.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

DEEP_CHANNELS: tuple[str, ...] = (
    "presence",
    "coherence",
    "resonance",
    "entropy",
    "memory",
    "alignment",
)


@dataclass(frozen=True, slots=True)
class SyntheticDeepBatch:
    """A batch of synthetic DEEP windows with sample-level anomaly labels."""

    values: NDArray[np.float32]
    anomaly_labels: NDArray[np.bool_]
    anomaly_steps: NDArray[np.int32]
    channels: tuple[str, ...] = DEEP_CHANNELS
    seed: int = 0

    def __post_init__(self) -> None:
        if self.values.ndim != 3:
            raise ValueError("values must have shape (samples, steps, channels)")
        if self.values.shape[2] != len(self.channels):
            raise ValueError("the final values dimension must match channels")
        if self.anomaly_labels.shape != (self.values.shape[0],):
            raise ValueError("anomaly_labels must have one value per sample")
        if self.anomaly_steps.shape != (self.values.shape[0],):
            raise ValueError("anomaly_steps must have one value per sample")

    @property
    def samples(self) -> int:
        return int(self.values.shape[0])

    @property
    def steps(self) -> int:
        return int(self.values.shape[1])

    def channel_index(self, name: str) -> int:
        try:
            return self.channels.index(name)
        except ValueError as exc:
            raise KeyError(f"Unknown DEEP channel: {name}") from exc


def _sigmoid(value: NDArray[np.float64]) -> NDArray[np.float64]:
    return 1.0 / (1.0 + np.exp(-value))


def generate_deep_batch(
    *,
    samples: int = 256,
    steps: int = 32,
    anomaly_fraction: float = 0.125,
    seed: int = 7,
) -> SyntheticDeepBatch:
    """Generate smooth correlated channel windows with injected labelled anomalies.

    Normal windows share three latent signals. Anomaly windows receive a short entropy
    surge together with coherence and alignment loss. The exact parameters are only a
    test fixture and carry no canon or interpretive meaning.
    """

    if samples < 2:
        raise ValueError("samples must be at least 2")
    if steps < 8:
        raise ValueError("steps must be at least 8")
    if not 0.0 <= anomaly_fraction < 1.0:
        raise ValueError("anomaly_fraction must be in [0, 1)")

    rng = np.random.default_rng(seed)
    time = np.linspace(0.0, 2.0 * np.pi, steps, dtype=np.float64)[None, :]

    phase_a = rng.uniform(0.0, 2.0 * np.pi, size=(samples, 1))
    phase_b = rng.uniform(0.0, 2.0 * np.pi, size=(samples, 1))
    amplitude = rng.uniform(0.65, 1.25, size=(samples, 1))

    latent_a = amplitude * np.sin(time + phase_a)
    latent_b = 0.75 * np.cos((time * 0.55) + phase_b)
    latent_c = np.cumsum(rng.normal(0.0, 0.08, size=(samples, steps)), axis=1)
    observation_noise = rng.normal(0.0, 0.12, size=(samples, steps))
    local_change = np.abs(np.gradient(latent_a + observation_noise, axis=1))

    presence = _sigmoid(0.95 * latent_a + 0.25 * latent_c + observation_noise)
    coherence = _sigmoid(1.05 * latent_a - 0.85 * local_change + 0.10 * latent_b)
    resonance = _sigmoid(0.70 * latent_b + 0.35 * latent_a + 0.10 * observation_noise)
    entropy = _sigmoid(-0.55 * latent_a + 0.95 * local_change + 0.20 * observation_noise)
    memory = _sigmoid(0.70 * latent_c + 0.28 * latent_a + 0.12 * latent_b)
    alignment = _sigmoid(
        1.05 * coherence + 0.75 * resonance - 1.00 * entropy + 0.10 * observation_noise
    )

    values = np.stack(
        [presence, coherence, resonance, entropy, memory, alignment],
        axis=2,
    )

    anomaly_labels = np.zeros(samples, dtype=np.bool_)
    anomaly_steps = np.full(samples, -1, dtype=np.int32)
    anomaly_count = int(round(samples * anomaly_fraction))

    if anomaly_count:
        anomaly_rows = rng.choice(samples, size=anomaly_count, replace=False)
        anomaly_labels[anomaly_rows] = True

        coherence_index = DEEP_CHANNELS.index("coherence")
        resonance_index = DEEP_CHANNELS.index("resonance")
        entropy_index = DEEP_CHANNELS.index("entropy")
        alignment_index = DEEP_CHANNELS.index("alignment")

        for row in anomaly_rows:
            start = int(rng.integers(2, steps - 3))
            width = int(rng.integers(2, min(6, steps - start) + 1))
            stop = min(steps, start + width)
            anomaly_steps[row] = start

            values[row, start:stop, entropy_index] += rng.uniform(0.45, 0.75)
            values[row, start:stop, coherence_index] -= rng.uniform(0.35, 0.60)
            values[row, start:stop, alignment_index] -= rng.uniform(0.40, 0.65)
            values[row, start:stop, resonance_index] += rng.normal(0.0, 0.22, size=stop - start)

    clipped = np.clip(values, 0.0, 1.0).astype(np.float32, copy=False)

    return SyntheticDeepBatch(
        values=clipped,
        anomaly_labels=anomaly_labels,
        anomaly_steps=anomaly_steps,
        seed=seed,
    )
