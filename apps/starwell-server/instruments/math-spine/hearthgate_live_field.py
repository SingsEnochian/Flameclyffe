"""Strict Hearthgate live field runner.

Consumes one sourced Instrument Hall packet and uses PyTorch to derive a deterministic
standing-wave field from the supplied PREMAQ values and supplied calibrated tone values.

No default observation, random coupling, trained-weight claim, or physical-probability claim
is permitted here. The output is a mathematical/creative projection with complete provenance.
"""
from __future__ import annotations

import hashlib
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import torch
except ImportError as exc:  # pragma: no cover - runtime boundary
    raise SystemExit(
        "PyTorch is not installed in the selected Python environment. "
        "Install the Hearthgate math runtime, then open this instrument again."
    ) from exc

PREMAQ_AXES = ("P", "C", "R", "E", "M", "A", "Q")
FIELD_AXES = ("P", "C", "R", "M", "A", "Q")
ACTIVE_MODES = {"OBSERVED", "DERIVED", "CALIBRATED"}


def require_mapping(value: Any, field: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError(f"HEARTHGATE_FIELD_REQUIRED:{field}")
    return value


def require_text(value: Any, field: str) -> str:
    text = str(value or "").strip()
    if not text:
        raise ValueError(f"HEARTHGATE_FIELD_REQUIRED:{field}")
    return text


def require_number(value: Any, field: str, low: float = 0.0, high: float = 1.0) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"HEARTHGATE_NUMERIC_VALUE_REQUIRED:{field}") from exc
    if not math.isfinite(number) or number < low or number > high:
        raise ValueError(f"HEARTHGATE_VALUE_OUT_OF_RANGE:{field}")
    return number


def require_time(value: Any, field: str) -> str:
    text = require_text(value, field)
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"HEARTHGATE_ISO_TIME_REQUIRED:{field}") from exc
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def canonical(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256(value: Any) -> str:
    return hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()


def validate(payload: Any) -> dict[str, Any]:
    body = require_mapping(payload, "payload")
    state = require_mapping(body.get("state"), "state")
    profile = require_mapping(body.get("profile"), "profile")
    premaq = require_mapping(state.get("premaq"), "state.premaq")
    observation = require_mapping(state.get("observation"), "state.observation")
    axes_ledger = require_mapping(observation.get("axes"), "state.observation.axes")

    mode_set: set[str] = set()
    axis_values: dict[str, float] = {}
    source_ledger: dict[str, Any] = {}
    for axis in PREMAQ_AXES:
        axis_values[axis] = require_number(premaq.get(axis), f"state.premaq.{axis}")
        datum = require_mapping(axes_ledger.get(axis), f"state.observation.axes.{axis}")
        provenance = require_mapping(datum.get("provenance"), f"state.observation.axes.{axis}.provenance")
        mode = require_text(provenance.get("mode"), f"state.observation.axes.{axis}.provenance.mode").upper()
        if mode not in ACTIVE_MODES:
            raise ValueError(f"HEARTHGATE_LIVE_OBSERVATION_REQUIRED:{axis}")
        mode_set.add(mode)
        source_ledger[axis] = {
            "mode": mode,
            "source_id": require_text(provenance.get("source_id"), f"source.{axis}.source_id"),
            "observed_at": require_time(provenance.get("observed_at"), f"source.{axis}.observed_at"),
            "confidence": require_number(provenance.get("confidence"), f"source.{axis}.confidence"),
            "receipt_id": provenance.get("receipt_id"),
            "derivation": provenance.get("derivation"),
        }

    tones = require_mapping(profile.get("tones"), "profile.tones")
    tone_values = {
        "P": require_number(tones.get("key_measured_hz"), "tones.key_measured_hz", 1.0, 50000.0),
        "C": require_number(tones.get("key_felt_hz"), "tones.key_felt_hz", 1.0, 50000.0),
        "R": require_number(tones.get("word_measured_hz"), "tones.word_measured_hz", 1.0, 50000.0),
        "M": require_number(tones.get("word_felt_hz"), "tones.word_felt_hz", 1.0, 50000.0),
        "A": require_number(tones.get("bind_hz"), "tones.bind_hz", 1.0, 50000.0),
        "Q": require_number(tones.get("punctuation_hz"), "tones.punctuation_hz", 1.0, 50000.0),
    }
    profile_provenance = require_mapping(profile.get("provenance"), "profile.provenance")
    profile_mode = require_text(profile_provenance.get("mode"), "profile.provenance.mode").upper()
    if profile_mode not in ACTIVE_MODES:
        raise ValueError("HEARTHGATE_CALIBRATED_TONES_REQUIRED")

    return {
        "schema": require_text(state.get("schema"), "state.schema"),
        "basis_id": require_text(state.get("basis_id"), "state.basis_id"),
        "house_id": require_text(state.get("house_id"), "state.house_id"),
        "phase": require_text(state.get("phase"), "state.phase"),
        "premaq": axis_values,
        "observation_modes": sorted(mode_set),
        "observation_sources": source_ledger,
        "tone_hz": tone_values,
        "tone_provenance": profile_provenance,
    }


def derive_field(validated: dict[str, Any], resolution: int = 96) -> dict[str, Any]:
    values = validated["premaq"]
    phases = torch.tensor([values[axis] * 2.0 * math.pi for axis in FIELD_AXES], dtype=torch.float64)
    amplitudes = torch.tensor([values[axis] for axis in FIELD_AXES], dtype=torch.float64)
    tones = torch.tensor([validated["tone_hz"][axis] for axis in FIELD_AXES], dtype=torch.float64)
    wave_numbers = tones / tones[0] * 0.1

    coordinates = torch.linspace(-1.0, 1.0, resolution, dtype=torch.float64)
    xx, yy = torch.meshgrid(coordinates, coordinates, indexing="ij")
    dx = torch.cos(phases).view(-1, 1, 1)
    dy = torch.sin(phases).view(-1, 1, 1)
    projection = xx.unsqueeze(0) * dx + yy.unsqueeze(0) * dy
    angles = wave_numbers.view(-1, 1, 1) * projection + phases.view(-1, 1, 1)
    field = (amplitudes.view(-1, 1, 1) * torch.cos(angles)).sum(0)

    phasors = torch.exp(1j * phases.to(torch.complex128))
    order_parameter = float(torch.abs(phasors.mean()).real)
    spectrum = torch.abs(torch.fft.rfft2(field)).flatten()
    fingerprint = spectrum[:32] / (spectrum[:32].norm() + 1e-12)

    derived = {
        "schema": "hearthgate.pytorch-live-field/v1",
        "classification": "DERIVED",
        "input_basis_id": validated["basis_id"],
        "house_id": validated["house_id"],
        "input_phase": validated["phase"],
        "model": {
            "kind": "deterministic-standing-wave-superposition",
            "framework": f"PyTorch {torch.__version__}",
            "resolution": resolution,
            "field_axes": list(FIELD_AXES),
            "entropy_role": "observed comparison axis; not silently replaced by oscillator decoherence",
            "random_parameters": False,
            "trained_weights": False,
            "physical_claim": False,
        },
        "input": {
            "premaq": validated["premaq"],
            "observation_modes": validated["observation_modes"],
            "observation_sources": validated["observation_sources"],
            "tone_hz": validated["tone_hz"],
            "tone_provenance": validated["tone_provenance"],
        },
        "output": {
            "field_min": float(field.min()),
            "field_max": float(field.max()),
            "field_mean": float(field.mean()),
            "field_std": float(field.std()),
            "phase_order_parameter": order_parameter,
            "observed_entropy": values["E"],
            "derived_decoherence": 1.0 - order_parameter,
            "spectral_fingerprint": [float(value) for value in fingerprint],
        },
        "boundary": (
            "This is a deterministic mathematical projection of sourced input through a "
            "calibrated tone field. It records correspondence and does not claim that the "
            "projection is a physical measurement, probability, or proof of mechanism."
        ),
    }
    derived["receipt_id"] = f"pytorch-field-{sha256(derived)}"
    return derived


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: hearthgate_live_field.py <sourced-instrument-packet.json>", file=sys.stderr)
        return 2
    input_path = Path(sys.argv[1]).resolve()
    payload = json.loads(input_path.read_text(encoding="utf-8"))
    validated = validate(payload)
    result = derive_field(validated)
    output_path = input_path.with_name(f"{input_path.stem}.pytorch-field.json")
    output_path.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print("\nHEARTHGATE · PYTORCH MATHEMATICS SPINE")
    print("======================================")
    print(f"House:       {result['house_id']}")
    print(f"Input basis: {result['input_basis_id']}")
    print(f"Modes:       {', '.join(result['input']['observation_modes'])}")
    print(f"Torch:       {result['model']['framework']}")
    print(f"Field:       {result['output']['field_min']:.6f} .. {result['output']['field_max']:.6f}")
    print(f"Order:       {result['output']['phase_order_parameter']:.6f}")
    print(f"Observed E:  {result['output']['observed_entropy']:.6f}")
    print(f"Derived 1-r: {result['output']['derived_decoherence']:.6f}")
    print(f"Receipt:     {result['receipt_id']}")
    print(f"Written:     {output_path}")
    print("\nObserved entropy and derived decoherence remain separate. Both shores stay lit.\n")
    input("Press Enter to let the mathematics rest…")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
