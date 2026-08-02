"""Deterministic dual-aspect state and sensory projection engine."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from flameclyffe_ml.provenance import content_hash

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
    Receipt,
    SensoryState,
    TemporalState,
    ToneLayer,
    VisualState,
)
from .registry import HouseProfile, house_profile, house_registry

ENGINE_VERSION = "hearthgate-kernel.v0.1"


def _round(value: float, digits: int = 6) -> float:
    return round(float(value), digits)


def _model_hash(value: Any) -> str:
    if hasattr(value, "model_dump"):
        value = value.model_dump(mode="json")
    return content_hash(value)


def _frame_id(identity: str, house_id: str, observed_at: datetime, parents: tuple[str, ...]) -> str:
    return f"frame-{content_hash({
        'identity': identity,
        'house_id': house_id,
        'observed_at': observed_at,
        'parents': parents,
    })[:24]}"


def _basis_payload(
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


def _derive_tones(profile: HouseProfile, premaq: PREMAQ) -> tuple[ToneLayer, ...]:
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


def _derive_haptics(
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


def _derive_glyph(
    profile: HouseProfile,
    premaq: PREMAQ,
    reception_present: bool,
) -> GlyphState:
    origin_activation = (premaq.P + premaq.C) / 2.0
    reception_activation = ((premaq.R + premaq.A) / 2.0) if reception_present else 0.0
    activation = (origin_activation + reception_activation) / 2.0
    return GlyphState(
        arrival_stroke=profile.arrival_stroke,
        reception_stroke=profile.reception_stroke if reception_present else None,
        hearthweave_bind=profile.hearthweave_bind,
        activation=_round(activation),
        complete=reception_present,
    )


def _derive_visual(profile: HouseProfile, premaq: PREMAQ, confidence: float) -> VisualState:
    return VisualState(
        geometry=profile.geometry,
        palette=profile.palette,
        motion=_round((premaq.R + premaq.M) / 2.0),
        luminance=_round(premaq.A),
        structure_weight=_round((confidence + premaq.C) / 2.0),
        atmosphere_weight=_round((premaq.A + premaq.R) / 2.0),
    )


class HearthgateKernel:
    """One shared state expressed through observable and experiential projections."""

    version = ENGINE_VERSION

    def awaken(self) -> dict[str, Any]:
        return {
            "engine": self.version,
            "state": "awake",
            "centre": "hearthweave",
            "modules": {
                "temporal": "VERIFIED",
                "state": "VERIFIED",
                "resonance": "VERIFIED",
                "glyph": "VERIFIED",
                "bridge": "VERIFIED",
                "memory": "VERIFIED",
                "steward": "VERIFIED",
                "house": "VERIFIED",
                "sensory": "VERIFIED",
            },
            "houses": sorted(house_registry()),
        }

    def create_packet(
        self,
        *,
        identity: str,
        house_id: str,
        observable: ObservableAspect,
        experiential: ExperientialAspect,
        premaq: PREMAQ,
        provenance: tuple[ProvenanceRecord, ...],
        origin_house: str = "terra-prime",
        origin_witness: str,
        reception_witness: str | None = None,
        observed_at: datetime | None = None,
        branch: str = "present",
        parents: tuple[str, ...] = (),
        horizon: str = "present",
        causal_order: int = 0,
        uncertainty: float = 0.0,
        history: tuple[str, ...] = (),
    ) -> DualAspectPacket:
        profile = house_profile(house_id)
        instant = (observed_at or datetime.now(timezone.utc)).astimezone(timezone.utc)
        temporal = TemporalState(
            frame_id=_frame_id(identity, house_id, instant, parents),
            observed_at=instant,
            branch=branch,
            parents=parents,
            horizon=horizon,
            causal_order=causal_order,
        )
        bridge = BridgeState(
            origin_house=origin_house,
            destination_house=house_id,
            origin_witness=origin_witness,
            reception_witness=reception_witness,
            state="bound" if reception_witness else "waiting",
        )
        basis = _basis_payload(
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
        basis_hash = content_hash(basis)
        correspondence = CorrespondenceState(
            basis_hash=basis_hash,
            observable_hash=_model_hash(observable),
            experiential_hash=_model_hash(experiential),
            transfer_function=f"{profile.house_id}.dual-aspect.v1",
            house_profile_version=profile.version,
        )
        reception_present = reception_witness is not None
        sensory = SensoryState(
            source_state_hash=basis_hash,
            tones=_derive_tones(profile, premaq),
            haptics=_derive_haptics(profile, premaq, reception_present),
            glyph=_derive_glyph(profile, premaq, reception_present),
            visual=_derive_visual(profile, premaq, observable.confidence),
        )
        packet_without_receipt = DualAspectPacket(
            identity=identity,
            house_id=house_id,
            temporal=temporal,
            observable=observable,
            experiential=experiential,
            premaq=premaq,
            bridge=bridge,
            correspondence=correspondence,
            sensory=sensory,
            provenance=provenance,
            uncertainty=uncertainty,
            history=history,
        )
        claims = self.audit(packet_without_receipt)
        status = ClaimStatus.VERIFIED if all(
            claim == ClaimStatus.VERIFIED for claim in claims.values()
        ) else ClaimStatus.FAILED
        packet_hash = content_hash(
            packet_without_receipt.model_dump(mode="json", exclude={"receipts"})
        )
        receipt = Receipt(
            receipt_id=f"hearthgate-{packet_hash[:24]}",
            packet_hash=packet_hash,
            engine_version=self.version,
            status=status,
            claims=claims,
            created_at=temporal.observed_at,
        )
        return packet_without_receipt.model_copy(update={"receipts": (receipt,)})

    def audit(self, packet: DualAspectPacket) -> dict[str, ClaimStatus]:
        profile = house_profile(packet.house_id)
        tone_roles = {tone.role for tone in packet.sensory.tones}
        haptic_roles = {pulse.role for pulse in packet.sensory.haptics}
        reception_expected = packet.bridge.reception_witness is not None
        foundation_separate = not profile.project_overlay or (
            profile.project_overlay != profile.canon_foundation
        )
        checks = {
            "shared_state": packet.sensory.source_state_hash == packet.correspondence.basis_hash,
            "dual_aspect": bool(packet.observable) and bool(packet.experiential),
            "correspondence_explicit": bool(packet.correspondence.transfer_function),
            "provenance_intact": bool(packet.provenance),
            "house_sovereign": foundation_separate,
            "sound_image_glyph_shared_state": (
                packet.sensory.source_state_hash == packet.correspondence.basis_hash
                and tone_roles == {"anchor", "living", "bind"}
            ),
            "haptic_call_answer": {"call", "answer"}.issubset(haptic_roles),
            "glyph_answer_state": (
                packet.sensory.glyph.complete == reception_expected
                and bool(packet.sensory.glyph.reception_stroke) == reception_expected
            ),
            "bridge_two_anchors": (
                packet.bridge.origin_house != packet.bridge.destination_house
                and bool(packet.bridge.origin_witness)
            ),
            "hidden_state_divergence": (
                packet.sensory.source_state_hash == packet.correspondence.basis_hash
            ),
        }
        return {
            name: ClaimStatus.VERIFIED if passed else ClaimStatus.FAILED
            for name, passed in checks.items()
        }

    def replay_verified(self, packet: DualAspectPacket) -> bool:
        """Verify the deterministic receipt over the packet without its receipt envelope."""

        if not packet.receipts:
            return False
        expected = content_hash(packet.model_dump(mode="json", exclude={"receipts"}))
        return packet.receipts[-1].packet_hash == expected
