"""Typed contracts shared by Python living-engine producers and web clients."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

SCHEMA_VERSION: Literal["1.0.0"] = "1.0.0"


class StrictModel(BaseModel):
    """Reject unknown fields so interface drift fails loudly."""

    model_config = ConfigDict(extra="forbid")


class Point2D(StrictModel):
    x: float = Field(ge=0.0, le=1.0)
    y: float = Field(ge=0.0, le=1.0)


class LiquidLightControls(StrictModel):
    """Low-frequency controls for a browser-rendered liquid-light field.

    Python emits coherent state snapshots. The browser interpolates and renders at its
    own refresh rate; Python is not asked to push sixty full visual frames per second.
    """

    instrument_id: str = Field(default="starwell-liquid-light", min_length=1, max_length=80)
    seed: int = Field(default=17, ge=0, le=2_147_483_647)
    node_count: int = Field(default=18, ge=3, le=96)
    stream_hz: float = Field(default=12.0, ge=1.0, le=20.0)
    coherence: float = Field(default=0.72, ge=0.0, le=1.0)
    resonance: float = Field(default=0.64, ge=0.0, le=1.0)
    entropy: float = Field(default=0.18, ge=0.0, le=1.0)
    brightness: float = Field(default=0.82, ge=0.0, le=1.0)
    viscosity: float = Field(default=0.68, ge=0.0, le=1.0)
    pointer: Point2D | None = None


class LiquidLightFrameRequest(StrictModel):
    controls: LiquidLightControls = Field(default_factory=LiquidLightControls)
    time_s: float = Field(default=0.0, ge=0.0)


class LiquidLightNode(StrictModel):
    id: int = Field(ge=0)
    x: float = Field(ge=0.0, le=1.0)
    y: float = Field(ge=0.0, le=1.0)
    vx: float
    vy: float
    energy: float = Field(ge=0.0, le=1.0)
    radius: float = Field(ge=0.0, le=0.25)
    hue_shift: float = Field(ge=-1.0, le=1.0)
    trail: float = Field(ge=0.0, le=1.0)


class LiquidLightSnapshot(StrictModel):
    schema_version: Literal["1.0.0"] = SCHEMA_VERSION
    snapshot_id: str = Field(min_length=64, max_length=64)
    instrument_id: str
    source: Literal["synthetic-procedural"] = "synthetic-procedural"
    time_s: float = Field(ge=0.0)
    interpolation_hint_ms: int = Field(ge=50, le=1000)
    coherence: float = Field(ge=0.0, le=1.0)
    resonance: float = Field(ge=0.0, le=1.0)
    entropy: float = Field(ge=0.0, le=1.0)
    brightness: float = Field(ge=0.0, le=1.0)
    viscosity: float = Field(ge=0.0, le=1.0)
    nodes: list[LiquidLightNode]


class HealthResponse(StrictModel):
    status: Literal["ok"] = "ok"
    service: Literal["flameclyffe-living-engine"] = "flameclyffe-living-engine"
    schema_version: Literal["1.0.0"] = SCHEMA_VERSION
    persistent: Literal[False] = False
    canon_authority: Literal[False] = False
