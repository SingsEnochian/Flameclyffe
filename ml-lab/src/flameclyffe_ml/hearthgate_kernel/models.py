"""Typed contracts for the Hearthgate braided kernel."""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from datetime import datetime, timezone
from enum import StrEnum
from typing import Any, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_serializer,
    field_validator,
    model_validator,
)

Scalar = str | int | float | bool | None
ScalarItems = tuple[tuple[str, Scalar], ...]


class KernelModel(BaseModel):
    """Strict deeply immutable base model used by every kernel contract."""

    model_config = ConfigDict(
        extra="forbid",
        frozen=True,
        revalidate_instances="always",
    )


class ClaimStatus(StrEnum):
    VERIFIED = "VERIFIED"
    FAILED = "FAILED"
    NOT_YET_TESTED = "NOT_YET_TESTED"


ClaimItems = tuple[tuple[str, ClaimStatus], ...]


def _immutable_items(value: Any, *, field_name: str) -> tuple[tuple[str, Any], ...]:
    """Normalise a mapping or pair iterable into a deterministic immutable tuple."""

    if value is None:
        return ()
    raw_items: Iterable[Any]
    if isinstance(value, Mapping):
        raw_items = value.items()
    elif isinstance(value, (list, tuple)):
        raw_items = value
    else:
        raise TypeError(f"{field_name} must be a mapping or an iterable of key-value pairs")

    normalised: list[tuple[str, Any]] = []
    seen: set[str] = set()
    for raw_item in raw_items:
        if not isinstance(raw_item, (list, tuple)) or len(raw_item) != 2:
            raise TypeError(f"{field_name} entries must be two-item key-value pairs")
        key, item_value = raw_item
        if not isinstance(key, str) or not key:
            raise TypeError(f"{field_name} keys must be non-empty strings")
        if key in seen:
            raise ValueError(f"{field_name} contains duplicate key {key!r}")
        seen.add(key)
        normalised.append((key, item_value))
    return tuple(sorted(normalised, key=lambda item: item[0]))


class PREMAQ(KernelModel):
    """Canonical seven-axis Hearthgate bearing: Presence, Coherence, Resonance, Entanglement, Memory, Agency, Qualia."""

    P: float = Field(ge=0.0, le=1.0, description="Presence")
    C: float = Field(ge=0.0, le=1.0, description="Coherence")
    R: float = Field(ge=0.0, le=1.0, description="Resonance")
    E: float = Field(ge=0.0, le=1.0, description="Entanglement")
    M: float = Field(ge=0.0, le=1.0, description="Memory")
    A: float = Field(ge=0.0, le=1.0, description="Agency")
    Q: float = Field(ge=0.0, le=1.0, description="Qualia")

    @property
    def legacy_q_aggregate_v0(self) -> float:
        """Historical six-axis compatibility transform. It never replaces independent Qualia Q."""

        return round((self.P + self.C + self.R + (1.0 - self.E) + self.M + self.A) / 6.0, 6)


class ObservableAspect(KernelModel):
    measurements: ScalarItems = ()
    chronology: tuple[str, ...] = ()
    telemetry: ScalarItems = ()
    canon_sources: tuple[str, ...] = ()
    confidence: float = Field(ge=0.0, le=1.0)
    causal_history: tuple[str, ...] = ()

    @field_validator(
        "measurements",
        "telemetry",
        mode="before",
        json_schema_input_type=dict[str, Scalar],
    )
    @classmethod
    def freeze_scalar_mapping(cls, value: Any) -> ScalarItems:
        return _immutable_items(value, field_name="observable mapping")

    @field_serializer("measurements", "telemetry", when_used="always")
    def serialize_scalar_mapping(self, value: ScalarItems) -> dict[str, Scalar]:
        return dict(value)

    @model_validator(mode="after")
    def require_observable_anchor(self) -> "ObservableAspect":
        if not (self.measurements or self.telemetry or self.canon_sources or self.causal_history):
            raise ValueError("The observable aspect requires measurement, telemetry, canon, or history.")
        return self


class ExperientialAspect(KernelModel):
    story: tuple[str, ...] = ()
    symbols: tuple[str, ...] = ()
    memory: tuple[str, ...] = ()
    tone_tags: tuple[str, ...] = ()
    image_tags: tuple[str, ...] = ()
    haptic_tags: tuple[str, ...] = ()
    relationships: tuple[str, ...] = ()
    cultural_meaning: tuple[str, ...] = ()
    lived_continuity: tuple[str, ...] = ()

    @model_validator(mode="after")
    def require_experiential_answer(self) -> "ExperientialAspect":
        values = (
            self.story,
            self.symbols,
            self.memory,
            self.tone_tags,
            self.image_tags,
            self.haptic_tags,
            self.relationships,
            self.cultural_meaning,
            self.lived_continuity,
        )
        if not any(values):
            raise ValueError("The experiential aspect requires at least one lived expression.")
        return self


class TemporalState(KernelModel):
    frame_id: str = Field(min_length=1)
    observed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    branch: str = "present"
    parents: tuple[str, ...] = ()
    horizon: str = "present"
    causal_order: int = Field(default=0, ge=0)

    @field_validator("observed_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("observed_at must be timezone-aware")
        return value.astimezone(timezone.utc)


class ProvenanceRecord(KernelModel):
    source_id: str = Field(min_length=1)
    source_kind: str = Field(min_length=1)
    uri: str = Field(min_length=1)
    content_hash: str = Field(pattern=r"^[0-9a-f]{64}$")
    classification: str = Field(min_length=1)
    retrieved_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("retrieved_at")
    @classmethod
    def normalise_retrieved_at(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("retrieved_at must be timezone-aware")
        return value.astimezone(timezone.utc)


class BridgeState(KernelModel):
    origin_house: str = Field(min_length=1)
    destination_house: str = Field(min_length=1)
    centre: Literal["hearthweave"] = "hearthweave"
    origin_witness: str = Field(min_length=1)
    reception_witness: str | None = None
    state: Literal["waiting", "received", "crossing", "bound", "returned"] = "waiting"

    @model_validator(mode="after")
    def answer_required_for_bound_state(self) -> "BridgeState":
        if self.state in {"received", "crossing", "bound", "returned"} and not self.reception_witness:
            raise ValueError(f"Bridge state {self.state!r} requires a reception witness.")
        return self


class ToneLayer(KernelModel):
    role: Literal["anchor", "living", "bind"]
    frequency_hz: float = Field(gt=0.0, le=20_000.0)
    gain: float = Field(ge=0.0, le=0.25)
    waveform: Literal["sine", "triangle", "square", "sawtooth"] = "sine"
    detune_cents: float = Field(default=0.0, ge=-100.0, le=100.0)
    pan: float = Field(default=0.0, ge=-1.0, le=1.0)
    modulation_hz: float = Field(default=0.0, ge=0.0, le=100.0)


class HapticPulse(KernelModel):
    role: Literal["call", "answer", "bind"]
    duration_ms: int = Field(ge=10, le=5_000)
    intensity: float = Field(ge=0.0, le=1.0)
    gap_after_ms: int = Field(default=0, ge=0, le=10_000)


class GlyphState(KernelModel):
    arrival_stroke: str = Field(min_length=1)
    reception_stroke: str | None = None
    hearthweave_bind: str = Field(min_length=1)
    activation: float = Field(ge=0.0, le=1.0)
    complete: bool = False

    @model_validator(mode="after")
    def complete_requires_answer(self) -> "GlyphState":
        if self.complete and not self.reception_stroke:
            raise ValueError("A complete glyph requires the reception stroke.")
        return self


class VisualState(KernelModel):
    geometry: str = Field(min_length=1)
    palette: tuple[str, ...] = Field(min_length=2)
    motion: float = Field(ge=0.0, le=1.0)
    luminance: float = Field(ge=0.0, le=1.0)
    structure_weight: float = Field(ge=0.0, le=1.0)
    atmosphere_weight: float = Field(ge=0.0, le=1.0)


class SensoryState(KernelModel):
    source_state_hash: str = Field(pattern=r"^[0-9a-f]{64}$")
    tones: tuple[ToneLayer, ...] = Field(min_length=3)
    haptics: tuple[HapticPulse, ...] = Field(min_length=2)
    glyph: GlyphState
    visual: VisualState

    @model_validator(mode="after")
    def require_dual_sensory_roles(self) -> "SensoryState":
        tone_roles = {layer.role for layer in self.tones}
        if tone_roles != {"anchor", "living", "bind"}:
            raise ValueError("Sensory tones must contain anchor, living, and bind roles.")
        haptic_roles = {pulse.role for pulse in self.haptics}
        if not {"call", "answer"}.issubset(haptic_roles):
            raise ValueError("Sensory haptics must contain call and answer roles.")
        return self


class CorrespondenceState(KernelModel):
    basis_hash: str = Field(pattern=r"^[0-9a-f]{64}$")
    observable_hash: str = Field(pattern=r"^[0-9a-f]{64}$")
    experiential_hash: str = Field(pattern=r"^[0-9a-f]{64}$")
    transfer_function: str = Field(min_length=1)
    house_profile_version: str = Field(min_length=1)


class Receipt(KernelModel):
    receipt_id: str = Field(min_length=1)
    packet_hash: str = Field(pattern=r"^[0-9a-f]{64}$")
    engine_version: str = Field(min_length=1)
    status: ClaimStatus
    claims: ClaimItems = ()
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator(
        "claims",
        mode="before",
        json_schema_input_type=dict[str, ClaimStatus],
    )
    @classmethod
    def freeze_claims(cls, value: Any) -> ClaimItems:
        return _immutable_items(value, field_name="receipt claims")

    @field_serializer("claims", when_used="always")
    def serialize_claims(self, value: ClaimItems) -> dict[str, ClaimStatus]:
        return dict(value)

    @field_validator("created_at")
    @classmethod
    def normalise_created_at(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("created_at must be timezone-aware")
        return value.astimezone(timezone.utc)


class DualAspectPacket(KernelModel):
    schema: Literal["hearthgate.dual-aspect-packet.v1"] = "hearthgate.dual-aspect-packet.v1"
    identity: str = Field(min_length=1)
    house_id: str = Field(min_length=1)
    temporal: TemporalState
    observable: ObservableAspect
    experiential: ExperientialAspect
    premaq: PREMAQ
    bridge: BridgeState
    correspondence: CorrespondenceState
    sensory: SensoryState
    provenance: tuple[ProvenanceRecord, ...] = Field(min_length=1)
    uncertainty: float = Field(ge=0.0, le=1.0)
    history: tuple[str, ...] = ()
    receipts: tuple[Receipt, ...] = ()

    @model_validator(mode="after")
    def enforce_recomputed_integrity(self) -> "DualAspectPacket":
        if self.bridge.destination_house != self.house_id:
            raise ValueError("The packet House must match the bridge destination.")

        from .integrity import assert_packet_integrity

        assert_packet_integrity(self, require_receipt=bool(self.receipts))
        return self
