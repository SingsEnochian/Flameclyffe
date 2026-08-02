"""FastAPI bridge between Python living-engine state and web instruments."""

from __future__ import annotations

import asyncio
import time
from datetime import datetime
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from flameclyffe_ml.hearthgate_kernel import (
    ClaimStatus,
    DualAspectPacket,
    ExperientialAspect,
    HearthgateKernel,
    ObservableAspect,
    PREMAQ,
    ProvenanceRecord,
    house_registry,
)

from .field import generate_liquid_light_snapshot
from .models import (
    HealthResponse,
    LiquidLightControls,
    LiquidLightFrameRequest,
    LiquidLightSnapshot,
)

app = FastAPI(
    title="Flameclyffe Living Engine",
    version="0.1.0",
    description=(
        "A non-persistent Python state service for living STARWELL instruments and the "
        "deterministic Hearthgate Kernel. It has no canon or publication authority."
    ),
)

_kernel = HearthgateKernel()


class KernelProjectionRequest(BaseModel):
    """Request envelope that creates one receipted dual-aspect packet."""

    model_config = ConfigDict(extra="forbid")

    identity: str = Field(min_length=1)
    house_id: str = Field(min_length=1)
    observable: ObservableAspect
    experiential: ExperientialAspect
    premaq: PREMAQ
    provenance: tuple[ProvenanceRecord, ...] = Field(min_length=1)
    origin_house: str = "terra-prime"
    origin_witness: str = Field(min_length=1)
    reception_witness: str | None = None
    observed_at: datetime | None = None
    branch: str = "present"
    parents: tuple[str, ...] = ()
    horizon: str = "present"
    causal_order: int = Field(default=0, ge=0)
    uncertainty: float = Field(default=0.0, ge=0.0, le=1.0)
    history: tuple[str, ...] = ()


class KernelReplayResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    schema_id: str = Field(default="hearthgate.replay-result.v1", alias="schema")
    packet_hash: str
    verified: bool


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse()


@app.post("/v1/liquid-light/frame", response_model=LiquidLightSnapshot)
async def liquid_light_frame(
    request: LiquidLightFrameRequest,
) -> LiquidLightSnapshot:
    return generate_liquid_light_snapshot(
        request.controls,
        time_s=request.time_s,
    )


@app.get("/v1/contracts/liquid-light")
async def liquid_light_contract() -> dict[str, Any]:
    """Return the exact JSON Schema used by Python producers."""

    return {
        "controls": LiquidLightControls.model_json_schema(),
        "frame_request": LiquidLightFrameRequest.model_json_schema(),
        "snapshot": LiquidLightSnapshot.model_json_schema(),
    }


@app.get("/v1/hearthgate/awaken")
async def hearthgate_awaken() -> dict[str, Any]:
    """Return deterministic kernel and module health without starting persistence."""

    return _kernel.awaken()


@app.get("/v1/hearthgate/houses")
async def hearthgate_houses() -> dict[str, Any]:
    """Return sovereign House profiles, including their harmonic identities."""

    profiles = house_registry()
    return {
        "schema": "hearthgate.house-registry.v1",
        "houses": {
            house_id: profile.model_dump(mode="json")
            for house_id, profile in sorted(profiles.items())
        },
    }


@app.get("/v1/contracts/hearthgate")
async def hearthgate_contract() -> dict[str, Any]:
    """Return the exact shared packet and request schemas."""

    return {
        "projection_request": KernelProjectionRequest.model_json_schema(),
        "dual_aspect_packet": DualAspectPacket.model_json_schema(),
        "observable_aspect": ObservableAspect.model_json_schema(),
        "experiential_aspect": ExperientialAspect.model_json_schema(),
        "premaq": PREMAQ.model_json_schema(),
    }


@app.post("/v1/hearthgate/packet", response_model=DualAspectPacket)
async def hearthgate_packet(request: KernelProjectionRequest) -> DualAspectPacket:
    """Project one shared state into sound, image, glyph and haptic expressions."""

    return _kernel.create_packet(
        identity=request.identity,
        house_id=request.house_id,
        observable=request.observable,
        experiential=request.experiential,
        premaq=request.premaq,
        provenance=request.provenance,
        origin_house=request.origin_house,
        origin_witness=request.origin_witness,
        reception_witness=request.reception_witness,
        observed_at=request.observed_at,
        branch=request.branch,
        parents=request.parents,
        horizon=request.horizon,
        causal_order=request.causal_order,
        uncertainty=request.uncertainty,
        history=request.history,
    )


@app.post("/v1/hearthgate/audit")
async def hearthgate_audit(packet: DualAspectPacket) -> dict[str, Any]:
    """Run Box's dual-aspect integrity matrix against a packet."""

    audit = _kernel.audit(packet)
    return {
        "schema": "hearthgate.integrity-audit.v1",
        "identity": packet.identity,
        "house_id": packet.house_id,
        "status": (
            ClaimStatus.VERIFIED
            if all(value == ClaimStatus.VERIFIED for value in audit.values())
            else ClaimStatus.FAILED
        ),
        "claims": audit,
    }


@app.post("/v1/hearthgate/replay", response_model=KernelReplayResponse)
async def hearthgate_replay(packet: DualAspectPacket) -> KernelReplayResponse:
    """Verify the packet's deterministic receipt without mutating the packet."""

    packet_hash = packet.receipts[-1].packet_hash if packet.receipts else ""
    return KernelReplayResponse(
        packet_hash=packet_hash,
        verified=_kernel.replay_verified(packet),
    )


def _extract_controls(message: Any) -> LiquidLightControls:
    if not isinstance(message, dict):
        raise ValueError(
            "Expected a JSON object containing liquid-light controls."
        )

    payload = message.get("controls", message)
    return LiquidLightControls.model_validate(payload)


async def _send_validation_error(
    websocket: WebSocket,
    exc: Exception,
) -> None:
    detail = exc.errors() if isinstance(exc, ValidationError) else str(exc)
    await websocket.send_json(
        {
            "type": "error",
            "code": "invalid_controls",
            "detail": detail,
        }
    )


@app.websocket("/v1/liquid-light/stream")
async def liquid_light_stream(websocket: WebSocket) -> None:
    """Stream low-frequency state snapshots for browser-side interpolation.

    The first client message must contain a complete LiquidLightControls object, either
    directly or under a `controls` key. Later complete control objects replace it.
    """

    await websocket.accept()

    try:
        initial_message = await websocket.receive_json()
        controls = _extract_controls(initial_message)
    except (ValidationError, ValueError) as exc:
        await _send_validation_error(websocket, exc)
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    except WebSocketDisconnect:
        return

    started = time.monotonic()

    try:
        while True:
            elapsed = max(0.0, time.monotonic() - started)
            snapshot = generate_liquid_light_snapshot(
                controls,
                time_s=elapsed,
            )
            await websocket.send_json(snapshot.model_dump(mode="json"))

            interval = 1.0 / controls.stream_hz
            try:
                message = await asyncio.wait_for(
                    websocket.receive_json(),
                    timeout=interval,
                )
            except TimeoutError:
                continue

            try:
                controls = _extract_controls(message)
            except (ValidationError, ValueError) as exc:
                await _send_validation_error(websocket, exc)
    except WebSocketDisconnect:
        return
