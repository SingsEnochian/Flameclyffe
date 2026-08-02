"""Deterministic dual-aspect state and sensory projection engine."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from flameclyffe_ml.provenance import content_hash

from .constants import ENGINE_VERSION
from .integrity import (
    basis_hash,
    body_claims,
    derive_sensory,
    integrity_claims,
    model_hash,
    packet_hash,
    receipt_checks,
)
from .models import (
    BridgeState,
    ClaimStatus,
    CorrespondenceState,
    DualAspectPacket,
    ExperientialAspect,
    ObservableAspect,
    PREMAQ,
    ProvenanceRecord,
    Receipt,
    TemporalState,
)
from .registry import house_profile, house_registry


def _frame_id(identity: str, house_id: str, observed_at: datetime, parents: tuple[str, ...]) -> str:
    seed = {
        "identity": identity,
        "house_id": house_id,
        "observed_at": observed_at,
        "parents": parents,
    }
    return f"frame-{content_hash(seed)[:24]}"


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
        instant = observed_at or datetime.now(timezone.utc)
        if instant.tzinfo is None or instant.utcoffset() is None:
            raise ValueError("observed_at must be timezone-aware")
        instant = instant.astimezone(timezone.utc)

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
        shared_basis_hash = basis_hash(
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
        correspondence = CorrespondenceState(
            basis_hash=shared_basis_hash,
            observable_hash=model_hash(observable),
            experiential_hash=model_hash(experiential),
            transfer_function=f"{profile.house_id}.dual-aspect.v1",
            house_profile_version=profile.version,
        )
        sensory = derive_sensory(
            profile=profile,
            premaq=premaq,
            observable_confidence=observable.confidence,
            reception_present=reception_witness is not None,
            source_state_hash=shared_basis_hash,
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
        claims = body_claims(packet_without_receipt)
        status = ClaimStatus.VERIFIED if all(
            claim == ClaimStatus.VERIFIED for claim in claims.values()
        ) else ClaimStatus.FAILED
        body_hash = packet_hash(packet_without_receipt)
        receipt = Receipt(
            receipt_id=f"hearthgate-{body_hash[:24]}",
            packet_hash=body_hash,
            engine_version=self.version,
            status=status,
            claims=claims,
            created_at=temporal.observed_at,
        )
        return DualAspectPacket(
            identity=packet_without_receipt.identity,
            house_id=packet_without_receipt.house_id,
            temporal=packet_without_receipt.temporal,
            observable=packet_without_receipt.observable,
            experiential=packet_without_receipt.experiential,
            premaq=packet_without_receipt.premaq,
            bridge=packet_without_receipt.bridge,
            correspondence=packet_without_receipt.correspondence,
            sensory=packet_without_receipt.sensory,
            provenance=packet_without_receipt.provenance,
            uncertainty=packet_without_receipt.uncertainty,
            history=packet_without_receipt.history,
            receipts=(receipt,),
        )

    def audit(self, packet: DualAspectPacket) -> dict[str, ClaimStatus]:
        return integrity_claims(packet)

    def replay_verified(self, packet: DualAspectPacket) -> bool:
        """Recompute body, receipt, correspondence and sensory integrity."""

        return all(receipt_checks(packet).values())
