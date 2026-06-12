"""Deterministic procedural liquid-light state generation.

The generator emits low-frequency state snapshots. React/WebGL clients should
interpolate and render those snapshots at display refresh rate.
"""

from __future__ import annotations

import math

import numpy as np
from numpy.typing import NDArray

from flameclyffe_ml.provenance import content_hash

from .models import LiquidLightControls, LiquidLightNode, LiquidLightSnapshot

_GOLDEN_ANGLE = math.pi * (3.0 - math.sqrt(5.0))
FloatArray = NDArray[np.float64]


def _round(value: float) -> float:
    return round(float(value), 6)


def _raw_positions(
    controls: LiquidLightControls,
    time_s: float,
) -> tuple[FloatArray, FloatArray, FloatArray, FloatArray, FloatArray]:
    rng = np.random.default_rng(controls.seed)
    indices = np.arange(controls.node_count, dtype=np.float64)
    phases = rng.uniform(
        0.0,
        2.0 * math.pi,
        size=controls.node_count,
    )
    radial_jitter = rng.uniform(
        -0.045,
        0.045,
        size=controls.node_count,
    )
    hue_jitter = rng.uniform(
        -0.12,
        0.12,
        size=controls.node_count,
    )

    speed = 0.16 + (0.66 * controls.resonance) + (0.18 * controls.entropy)
    breathing = np.sin(
        (time_s * (0.38 + 0.30 * controls.resonance)) + phases
    )
    swirl = (indices * _GOLDEN_ANGLE) + phases + (time_s * speed)

    base_radius = 0.16 + (0.18 * controls.coherence) + radial_jitter
    radius = base_radius + (0.035 + 0.045 * controls.entropy) * breathing

    turbulence = (0.010 + 0.055 * controls.entropy) * np.sin(
        (time_s * 1.7) + phases * 1.9 + indices * 0.31
    )
    x = 0.5 + (radius * np.cos(swirl)) + turbulence
    y = 0.5 + (radius * np.sin(swirl)) + (
        (0.010 + 0.04 * (1.0 - controls.viscosity))
        * np.cos((time_s * 1.25) + phases + indices * 0.17)
    )

    if controls.pointer is not None:
        dx = controls.pointer.x - x
        dy = controls.pointer.y - y
        distance_sq = (dx * dx) + (dy * dy)
        attraction = np.exp(-distance_sq / 0.055) * (
            0.04 + 0.14 * controls.coherence
        )
        x += dx * attraction
        y += dy * attraction

    x = np.clip(x, 0.025, 0.975)
    y = np.clip(y, 0.025, 0.975)

    energy = np.clip(
        0.34
        + (0.38 * controls.brightness)
        + (0.20 * controls.resonance * np.sin(swirl + phases))
        - (0.13 * controls.entropy * np.cos(swirl * 0.5)),
        0.0,
        1.0,
    )
    node_radius = np.clip(
        0.010
        + (0.022 * energy)
        + (0.012 * controls.coherence)
        + (0.007 * np.sin(phases + time_s)),
        0.006,
        0.065,
    )
    hue_shift = np.clip(
        hue_jitter
        + (0.22 * controls.resonance * np.sin(swirl * 0.45))
        + (0.10 * controls.entropy * np.cos(swirl * 1.8)),
        -1.0,
        1.0,
    )

    return x, y, energy, node_radius, hue_shift


def generate_liquid_light_snapshot(
    controls: LiquidLightControls,
    *,
    time_s: float,
) -> LiquidLightSnapshot:
    """Generate one bounded, deterministic liquid-light state snapshot."""

    x, y, energy, radius, hue_shift = _raw_positions(controls, time_s)
    epsilon = 0.02
    next_x, next_y, _, _, _ = _raw_positions(controls, time_s + epsilon)
    vx = (next_x - x) / epsilon
    vy = (next_y - y) / epsilon

    trail = np.clip(
        controls.viscosity
        + (0.18 * controls.coherence)
        - (0.22 * controls.entropy)
        + (0.08 * energy),
        0.0,
        1.0,
    )

    nodes = [
        LiquidLightNode(
            id=index,
            x=_round(x[index]),
            y=_round(y[index]),
            vx=_round(vx[index]),
            vy=_round(vy[index]),
            energy=_round(energy[index]),
            radius=_round(radius[index]),
            hue_shift=_round(hue_shift[index]),
            trail=_round(trail[index]),
        )
        for index in range(controls.node_count)
    ]

    snapshot_payload = {
        "instrument_id": controls.instrument_id,
        "seed": controls.seed,
        "time_s": _round(time_s),
        "controls": controls.model_dump(mode="json"),
        "nodes": [node.model_dump(mode="json") for node in nodes],
    }

    return LiquidLightSnapshot(
        snapshot_id=content_hash(snapshot_payload),
        instrument_id=controls.instrument_id,
        time_s=_round(time_s),
        interpolation_hint_ms=round(1000.0 / controls.stream_hz),
        coherence=controls.coherence,
        resonance=controls.resonance,
        entropy=controls.entropy,
        brightness=controls.brightness,
        viscosity=controls.viscosity,
        nodes=nodes,
    )
