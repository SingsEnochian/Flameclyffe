from __future__ import annotations

from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from flameclyffe_ml.hearthgate_kernel import (
    ClaimStatus,
    DualAspectPacket,
    ExperientialAspect,
    HearthgateKernel,
    ObservableAspect,
    PREMAQ,
    ProvenanceRecord,
    TemporalGraph,
    house_profile,
    house_registry,
)
from flameclyffe_ml.provenance import content_hash

FIXED_TIME = datetime(2026, 8, 2, 6, 0, tzinfo=timezone.utc)
FIXED_PREMAQ = PREMAQ(P=0.82, C=0.88, R=0.79, E=0.22, M=0.76, A=0.84)


def provenance(label: str) -> tuple[ProvenanceRecord, ...]:
    payload = {"label": label, "observed_at": FIXED_TIME.isoformat()}
    return (
        ProvenanceRecord(
            source_id=label,
            source_kind="synthetic-test",
            uri=f"urn:test:{label}",
            content_hash=content_hash(payload),
            classification="synthetic",
            retrieved_at=FIXED_TIME,
        ),
    )


def packet(
    house_id: str,
    *,
    answer: bool = True,
    causal_order: int = 0,
) -> DualAspectPacket:
    return HearthgateKernel().create_packet(
        identity=f"test:{house_id}:{causal_order}",
        house_id=house_id,
        observable=ObservableAspect(
            measurements={"presence": 1.0},
            chronology=(FIXED_TIME.isoformat(),),
            telemetry={"fixture": True},
            canon_sources=(f"canon:{house_id}",),
            confidence=0.96,
            causal_history=("fixture-created",),
        ),
        experiential=ExperientialAspect(
            story=("A traveller arrives.",),
            symbols=("waiting-glyph",),
            memory=("the House remembers",),
            tone_tags=("anchor", "living"),
            image_tags=("structure", "atmosphere"),
            haptic_tags=("call", "answer"),
            relationships=("traveller", "host"),
            cultural_meaning=("hospitality",),
            lived_continuity=("crossing",),
        ),
        premaq=FIXED_PREMAQ,
        provenance=provenance(house_id),
        origin_house="terra-prime" if house_id != "terra-prime" else "templehouse",
        origin_witness="rowan",
        reception_witness="resident-host" if answer else None,
        observed_at=FIXED_TIME,
        causal_order=causal_order,
    )


def test_every_house_has_a_distinct_harmonic_signature() -> None:
    signatures = {}
    for house_id in house_registry():
        rendered = packet(house_id)
        signatures[house_id] = tuple(layer.frequency_hz for layer in rendered.sensory.tones)

    assert len(set(signatures.values())) == len(signatures)
    assert signatures["terra-prime"] != signatures["terra-aeterna"]
    assert signatures["terra-aeterna"] != signatures["templehouse"]
    assert signatures["wheel-of-time-canon"] != signatures["taaveren-vaen"]


def test_waiting_glyph_is_partial_until_the_answer_arrives() -> None:
    waiting = packet("taaveren-vaen", answer=False)

    assert waiting.bridge.state == "waiting"
    assert waiting.sensory.glyph.complete is False
    assert waiting.sensory.glyph.reception_stroke is None
    answer_pulse = next(pulse for pulse in waiting.sensory.haptics if pulse.role == "answer")
    assert answer_pulse.intensity == 0.0
    assert HearthgateKernel().audit(waiting)["glyph_answer_state"] == ClaimStatus.VERIFIED


def test_every_modality_uses_the_same_state_basis() -> None:
    rendered = packet("templehouse")
    audit = HearthgateKernel().audit(rendered)

    assert rendered.sensory.source_state_hash == rendered.correspondence.basis_hash
    assert rendered.receipts[-1].status == ClaimStatus.VERIFIED
    assert all(value == ClaimStatus.VERIFIED for value in audit.values())
    assert HearthgateKernel().replay_verified(rendered) is True


def test_hidden_state_divergence_is_rejected() -> None:
    rendered = packet("starsong")
    payload = rendered.model_dump(mode="json")
    payload["sensory"]["source_state_hash"] = "0" * 64

    with pytest.raises(ValidationError, match="integrity failed"):
        DualAspectPacket.model_validate(payload)


def test_equal_forged_hashes_cannot_mask_changed_state() -> None:
    rendered = packet("templehouse")
    payload = rendered.model_dump(mode="json")
    forged_hash = "a" * 64
    payload["observable"]["measurements"]["presence"] = 0.125
    payload["correspondence"]["basis_hash"] = forged_hash
    payload["correspondence"]["observable_hash"] = forged_hash
    payload["correspondence"]["experiential_hash"] = forged_hash
    payload["sensory"]["source_state_hash"] = forged_hash

    with pytest.raises(ValidationError, match="integrity failed"):
        DualAspectPacket.model_validate(payload)


def test_nested_contract_mappings_are_immutable() -> None:
    rendered = packet("terra-prime")

    with pytest.raises(TypeError):
        rendered.observable.measurements["presence"] = 0.0  # type: ignore[index]
    with pytest.raises(TypeError):
        rendered.observable.telemetry["fixture"] = False  # type: ignore[index]
    with pytest.raises(TypeError):
        rendered.receipts[-1].claims["shared_state"] = ClaimStatus.FAILED  # type: ignore[index]


def test_canon_overlay_never_replaces_its_foundation() -> None:
    vaen = house_profile("taaveren-vaen")
    templehouse = house_profile("templehouse")

    assert vaen.canon_foundation == "wheel-of-time-book-canon"
    assert vaen.project_overlay == "taaveren-vaen"
    assert vaen.project_overlay != vaen.canon_foundation
    assert templehouse.canon_foundation == "terra-aeterna-novel-canon"
    assert templehouse.project_overlay == "templehouse-continuity"


def test_temporal_graph_is_receipted_and_acyclic() -> None:
    first = packet("wheel-of-time-canon", causal_order=1)
    second = packet("taaveren-vaen", causal_order=2)
    graph = TemporalGraph()
    first_key = graph.add_packet(first)
    second_key = graph.add_packet(second)
    edge = graph.link(first_key, second_key, "branch")

    assert edge.receipt_hash
    assert graph.ancestors(second_key) == (first_key,)
    assert graph.snapshot()["packet_count"] == 2

    with pytest.raises(ValueError, match="cycle"):
        graph.link(second_key, first_key, "return")


def test_temporal_graph_rejects_stale_receipts() -> None:
    rendered = packet("taaveren-vaen")
    tampered = rendered.model_copy(update={"history": ("changed-after-receipt",)})

    with pytest.raises(ValueError, match="integrity failed"):
        TemporalGraph().add_packet(tampered)
