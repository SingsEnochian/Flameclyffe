"""FastAPI bridge between Python living-engine state and web instruments."""

from __future__ import annotations

import asyncio
import time
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, status
from pydantic import ValidationError

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
        "A non-persistent Python state service for living STARWELL instruments. "
        "It has no canon or publication authority."
    ),
)


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
