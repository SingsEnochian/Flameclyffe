"""Deterministic recomputation and integrity checks for dual-aspect packets."""

from __future__ import annotations

from typing import Any

from flameclyffe_ml.provenance import content_hash

from .constants import ENGINE_VERSION
from .models import (
    BridgeState,
    ClaimStatus,
    CorrespondenceState,
    DualAspectPacket,
    ExperientialAspect,
    GlyphState,
    HapticPulse,
    ObservableAspect,
    PREMAQ,
    ProvenanceRecord,
    SensoryState,
    TemporalState,
    ToneLayer,
    VisualState,
)
from .registry import HouseProfile, house_profile


def _round(value: float, digits: int = 6) -> float:
    return round(float(value), digits)


def model_hash(value: Any) -> str:
    if hasattr(value, "model_dump"):
        value = value.model_dump(mode="json")
    return content_hash(value)


def basis_payload(
    *,
    identity: str,
    house_id: str,
    temporal: TemporalState,
    observable: ObservableAspect,
    experiential: ExperientialAspect,
    premaq: PREMAQ,
    bridge: BridgeState,
    provenance: tuple[ProvenanceRecord, ...],
    uncertainty: float,
    history: tuple[str, ...],
) -> dict[str, Any]:
    return {
        "identity": identity,
        "house_id": house_id,
        "temporal": temporal.model_dump(mode="json"),
        "observable": observable.model_dump(mode="json"),
        "experiential": experiential.model_dump(mode="json"),
        "premaq": premaq.model_dump(mode="json"),
        "bridge": bridge.model_dump(mode="json"),
        "provenance": [item.model_dump(mode="json") for item in provenance],
        "uncertainty": uncertainty,
        "history": history,
    }


def basis_hash(
    *,
    identity: str,
    house_id: str,
    temporal: TemporalState,
    observable: ObservableAspect,
    experiential: ExperientialAspect,
    premaq: PREMAQ,
    bridge: BridgeState,
    provenance: tuple[ProvenanceRecord, ...],
    uncertainty: float,
    history: tuple[str, ...],
) -> str:
    return content_hash(
        basis_payload(
            identity=identity,
            house_id=house_id,
            temporal=temporal,
            observable=observable,
            experiential=experiential,
            premaq=premaq,
            bridge=bridge,
            provenance=provenance,
            uncertainty=uncertainty,
            history=history,
        )
    )


def packet_basis_hash(packet: DualAspectPacket) -> str:
    return basis_hash(
        identity=packet.identity,
        house_id=packet.house_id,
        temporal=packet.temporal,
        observable=packet.observable,
        experiential=packet.experiential,
        premaq=packet.premaq,
        bridge=packet.bridge,
        provenance=packet.provenance,
        uncertainty=packet.uncertainty,
        history=packet.history,
    )


def derive_tones(profile: HouseProfile, premaq: PREMAQ) -> tuple[ToneLayer, ...]:
    harmonic = profile.harmonic
    root_motion = 1.0 + ((premaq.P - 0.5) * 0.04)
    living_motion = 1.0 + ((premaq.R + premaq.A - 1.0) * 0.03)
    bind_motion = 1.0 + ((premaq.M - premaq.E) * 0.02)

    return (
        ToneLayer(
            role="anchor",
            frequency_hz=_round(harmonic.root_hz * harmonic.anchor_ratio * root_motion, 3),
            gain=_round(0.012 + (premaq.C * 0.024), 4),
            waveform=harmonic.anchor_waveform,
            pan=-0.22,
            modulation_hz=_round(harmonic.pulse_hz * (0.8 + (premaq.M * 0.4)), 3),
        ),
        ToneLayer(
            role="living",
            frequency_hz=_round(harmonic.root_hz * harmonic.living_ratio * living_motion, 3),
            gain=_round(0.01 + (premaq.A * 0.025), 4),
            waveform=harmonic.living_waveform,
            pan=0.22,
            modulation_hz=_round(harmonic.pulse_hz * (0.7 + (premaq.R * 0.6)), 3),
        ),
        ToneLayer(
            role="bind",
            frequency_hz=_round(harmonic.root_hz * harmonic.bind_ratio * bind_motion, 3),
            gain=_round(0.008 + (premaq.M * 0.018), 4),
            waveform=harmonic.bind_waveform,
            pan=0.0,
            modulation_hz=_round(harmonic.pulse_hz, 3),
        ),
    )


def derive_haptics(
    profile: HouseProfile,
    premaq: PREMAQ,
    reception_present: bool,
) -> tuple[HapticPulse, ...]:
    answer_intensity = _round(((premaq.R + premaq.A) / 2.0) if reception_present else 0.0)
    pulses = [
        HapticPulse(
            role="call",
            duration_ms=profile.call_duration_ms,
            intensity=_round((premaq.P + premaq.C) / 2.0),
            gap_after_ms=90,
        ),
        HapticPulse(
            role="answer",
            duration_ms=profile.answer_duration_ms,
            intensity=answer_intensity,
            gap_after_ms=120,
        ),
    ]
    if reception_present:
        pulses.append(
            HapticPulse(
                role="bind",
                duration_ms=profile.bind_duration_ms,
                intensity=_round((premaq.M + premaq.A + premaq.C) / 3.0),
                gap_after_ms=0,
            )
        )
    return tuple(pulses)


def derive_glyph(
    profile: HouseProfile,
    premaq: PREMAQ,
    reception_present: bool,
) -> GlyphState:
    origin_activation = (premaq.P + premaq.C) / 2.0
    reception_activation = ((premaq.R + premaq.A) / 2.0) if reception_present else 0.0
    return GlyphState(
        arrival_stroke=profile.arrival_stroke,
        reception_stroke=profile.reception_stroke if reception_present else None,
        hearthweave_bind=profile.hearthweave_bind,
        activation=_round((origin_activation + reception_activation) / 2.0),
        complete=reception_present,
    )


def derive_visual(profile: HouseProfile, premaq: PREMAQ, confidence: float) -> VisualState:
    return VisualState(
        geometry=profile.geometry,
        palette=profile.palette,
        motion=_round((premaq.R + premaq.M) / 2.0),
        luminance=_round(premaq.A),
        structure_weight=_round((confidence + premaq.C) / 2.0),
        atmosphere_weight=_round((premaq.A + premaq.R) / 2.0),
    )


def derive_sensory(
    *,
    profile: HouseProfile,
    premaq: PREMAQ,
    observable_confidence: float,
    reception_present: bool,
    source_state_hash: str,
) -> SensoryState:
    return SensoryState(
        source_state_hash=source_state_hash,
        tones=derive_tones(profile, premaq),
        haptics=derive_haptics(profile, premaq, reception_present),
        glyph=derive_glyph(profile, premaq, reception_present),
        visual=derive_visual(profile, premaq, observable_confidence),
    )


def expected_correspondence(packet: DualAspectPacket) -> CorrespondenceState:
    profile = house_profile(packet.house_id)
    return CorrespondenceState(
        basis_hash=packet_basis_hash(packet),
        observable_hash=model_hash(packet.observable),
        experiential_hash=model_hash(packet.experiential),
        transfer_function=f"{profile.house_id}.dual-aspect.v1",
        house_profile_version=profile.version,
    )


def expected_sensory(packet: DualAspectPacket) -> SensoryState:
    profile = house_profile(packet.house_id)
    return derive_sensory(
        profile=profile,
        premaq=packet.premaq,
        observable_confidence=packet.observable.confidence,
        reception_present=packet.bridge.reception_witness is not None,
        source_state_hash=packet_basis_hash(packet),
    )


def body_checks(packet: DualAspectPacket) -> dict[str, bool]:
    profile = house_profile(packet.house_id)
    expected_basis = packet_basis_hash(packet)
    correspondence = expected_correspondence(packet)
    sensory = expected_sensory(packet)
    foundation_separate = not profile.project_overlay or (
        profile.project_overlay != profile.canon_foundation
    )
    sensory_exact = packet.sensory == sensory
    correspondence_exact = packet.correspondence == correspondence

    return {
        "shared_state": (
            packet.correspondence.basis_hash == expected_basis
            and packet.sensory.source_state_hash == expected_basis
        ),
        "dual_aspect": bool(packet.observable) and bool(packet.experiential),
        "correspondence_explicit": correspondence_exact,
        "provenance_intact": bool(packet.provenance),
        "house_sovereign": foundation_separate,
        "sound_image_glyph_shared_state": sensory_exact,
        "haptic_call_answer": sensory_exact,
        "glyph_answer_state": sensory_exact,
        "bridge_two_anchors": (
            packet.bridge.origin_house != packet.bridge.destination_house
            and bool(packet.bridge.origin_witness)
        ),
        "hidden_state_divergence": correspondence_exact and sensory_exact,
    }


def body_claims(packet: DualAspectPacket) -> dict[str, ClaimStatus]:
    return {
        name: ClaimStatus.VERIFIED if passed else ClaimStatus.FAILED
        for name, passed in body_checks(packet).items()
    }


def packet_hash(packet: DualAspectPacket) -> str:
    return content_hash(packet.model_dump(mode="json", exclude={"receipts"}))


def receipt_checks(packet: DualAspectPacket) -> dict[str, bool]:
    if not packet.receipts:
        return {
            "receipt_present": False,
            "receipt_packet_hash": False,
            "receipt_engine_version": False,
            "receipt_status": False,
            "receipt_claims": False,
            "receipt_identity": False,
            "receipt_time": False,
        }

    receipt = packet.receipts[-1]
    expected_hash = packet_hash(packet)
    expected_claims = body_claims(packet)
    return {
        "receipt_present": True,
        "receipt_packet_hash": receipt.packet_hash == expected_hash,
        "receipt_engine_version": receipt.engine_version == ENGINE_VERSION,
        "receipt_status": (
            receipt.status == ClaimStatus.VERIFIED
            and all(value == ClaimStatus.VERIFIED for value in expected_claims.values())
        ),
        "receipt_claims": dict(receipt.claims) == expected_claims,
        "receipt_identity": receipt.receipt_id == f"hearthgate-{expected_hash[:24]}",
        "receipt_time": receipt.created_at == packet.temporal.observed_at,
    }


def integrity_claims(packet: DualAspectPacket) -> dict[str, ClaimStatus]:
    checks = {**body_checks(packet), **receipt_checks(packet)}
    checks["receipt_integrity"] = all(receipt_checks(packet).values())
    return {
        name: ClaimStatus.VERIFIED if passed else ClaimStatus.FAILED
        for name, passed in checks.items()
    }


def assert_packet_integrity(packet: DualAspectPacket, *, require_receipt: bool = False) -> None:
    checks = body_checks(packet)
    if require_receipt or packet.receipts:
        checks.update(receipt_checks(packet))
    failed = [name for name, passed in checks.items() if not passed]
    if failed:
        raise ValueError(f"Dual-aspect packet integrity failed: {', '.join(sorted(failed))}.")
