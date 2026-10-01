"""Typed contracts for transient House Workspace neural traffic."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

BrainLane = Literal[
    "sensory",
    "session",
    "presence",
    "runtime",
    "capability",
    "agent",
    "tool",
    "artifact",
    "astra",
    "continuity",
    "ui",
]

EpistemicClass = Literal[
    "FORMAL",
    "SIMULATED",
    "MEASURED",
    "DERIVED",
    "INTERPRETIVE",
    "SPECULATIVE",
    "FICTIONAL",
    "UNKNOWN",
]

NodeKind = Literal[
    "agent",
    "runtime",
    "surface",
    "session",
    "capability",
    "artifact",
    "unknown",
]


class BrainSignal(BaseModel):
    """One bounded signal travelling through the transient workspace graph."""

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    schema: Literal["house.brain-signal/v0.1"] = "house.brain-signal/v0.1"
    id: str = Field(min_length=1, max_length=180)
    lane: BrainLane
    kind: str = Field(min_length=1, max_length=96)
    source: str = Field(min_length=1, max_length=160)
    target: str | None = Field(default=None, max_length=160)
    trajectory_id: str | None = Field(default=None, alias="trajectoryId", max_length=180)
    request_id: str | None = Field(default=None, alias="requestId", max_length=180)
    session_id: str | None = Field(default=None, alias="sessionId", max_length=180)
    occurred_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="occurredAt")
    epistemic_class: EpistemicClass | None = Field(default=None, alias="epistemicClass")
    priority: float = Field(default=0.5, ge=0.0, le=1.0)
    transient: bool = True
    payload: Any = None


class BrainNode(BaseModel):
    """Current transient activation state for one graph node."""

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    id: str
    kind: NodeKind = "unknown"
    state: str = "unknown"
    activation: float = Field(default=0.0, ge=0.0)
    signal_count: int = Field(default=0, ge=0, alias="signalCount")
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="updatedAt")
    metadata: dict[str, Any] = Field(default_factory=dict)


class BrainIngestReceipt(BaseModel):
    """Receipt proving what the local transient engine accepted."""

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    schema: Literal["house.brain-ingest-receipt/v0.1"] = "house.brain-ingest-receipt/v0.1"
    signal_id: str = Field(alias="signalId")
    accepted: bool
    duplicate: bool = False
    stored_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="storedAt")
    signal_count: int = Field(alias="signalCount")


class BrainSnapshot(BaseModel):
    """Inspectable bounded working-state snapshot."""

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    schema: Literal["house.brain-snapshot/v0.2"] = "house.brain-snapshot/v0.2"
    signal_count: int = Field(alias="signalCount")
    recent_signals: tuple[BrainSignal, ...] = Field(alias="recentSignals")
    nodes: tuple[BrainNode, ...]
    trajectories: dict[str, tuple[str, ...]]
    duplicate_count: int = Field(alias="duplicateCount")
