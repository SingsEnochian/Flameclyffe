"""DEEPTime temporal sequence domain.

DEEPTime preserves receipted PREMAQ trajectories anchored to real-world time.
Each record is one instrumented sequence: an ordered list of temporal snapshots
with PREMAQ state, spiral coordinates, and source provenance at every step.

Invariants enforced at construction:
  - Steps are monotonically ordered (step index increases by 1 each time).
  - Spiral radius is non-decreasing across steps.
  - Every source_ref cited in a snapshot is declared in the record-level source_refs.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class EpistemicStatus(str, Enum):
    KNOWN = "KNOWN"
    BOUNDED = "BOUNDED"
    SYMBOLIC = "SYMBOLIC"
    UNKNOWN = "UNKNOWN"


@dataclass(frozen=True)
class AxisValue:
    axis: str
    value: Optional[float]
    epistemic_status: EpistemicStatus
    confidence: float
    uncertainty: Optional[float] = None

    def __post_init__(self) -> None:
        if self.epistemic_status is EpistemicStatus.KNOWN and self.value is None:
            raise ValueError(f"Axis {self.axis}: KNOWN status requires a value.")
        if self.epistemic_status is EpistemicStatus.UNKNOWN and self.value is not None:
            raise ValueError(f"Axis {self.axis}: UNKNOWN status must have value=None.")
        if not (0.0 <= self.confidence <= 1.0):
            raise ValueError(f"Axis {self.axis}: confidence must be in [0, 1].")


@dataclass(frozen=True)
class PREMAQSnapshot:
    P: AxisValue
    C: AxisValue
    R: AxisValue
    E: AxisValue
    M: AxisValue
    A: AxisValue
    Q: AxisValue

    def axes(self) -> dict[str, AxisValue]:
        return {ax: getattr(self, ax) for ax in ("P", "C", "R", "E", "M", "A", "Q")}


@dataclass(frozen=True)
class AcceptanceMask:
    P: bool
    C: bool
    R: bool
    E: bool
    M: bool
    A: bool
    Q: bool


@dataclass(frozen=True)
class SpiralCoordinate:
    radius: float
    angle: float
    cycle: int

    def __post_init__(self) -> None:
        if self.radius < 0:
            raise ValueError("Spiral radius must be non-negative.")
        if self.cycle < 0:
            raise ValueError("Spiral cycle must be non-negative.")


@dataclass(frozen=True)
class TemporalSnapshot:
    step: int
    utc_timestamp: str
    premaq: PREMAQSnapshot
    spiral: SpiralCoordinate
    acceptance_mask: AcceptanceMask
    source_ref: str
    note: Optional[str] = None


@dataclass(frozen=True)
class TimeAnchors:
    utc_start: str
    utc_end: Optional[str] = None
    calendar_system: str = "gregorian"
    timezone: str = "UTC"


@dataclass(frozen=True)
class SourceRef:
    ref: str
    dataset: str
    record_type: str
    checksum: Optional[str] = None
    note: Optional[str] = None


@dataclass
class DEEPTimeRecord:
    dataset_kind: str
    sequence_id: str
    created_at: str
    time_anchors: TimeAnchors
    snapshots: list[TemporalSnapshot]
    source_refs: list[SourceRef]
    consent_scope: dict
    privacy_scope: str
    schema_version: str = "0.1.0"
    summary: Optional[str] = None
    notes: Optional[str] = None
    tags: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        if self.dataset_kind != "deep_time":
            raise ValueError(f"dataset_kind must be 'deep_time', got '{self.dataset_kind}'.")

        declared_refs = {sr.ref for sr in self.source_refs}
        if len(declared_refs) != len(self.source_refs):
            raise ValueError("Duplicate source refs detected in source_refs.")

        if not self.snapshots:
            raise ValueError("At least one snapshot is required.")

        for index, snapshot in enumerate(self.snapshots):
            if snapshot.step != index:
                raise ValueError(
                    f"Steps must be monotonically ordered starting at 0. "
                    f"Expected step {index}, got {snapshot.step}."
                )
            if snapshot.source_ref not in declared_refs:
                raise ValueError(
                    f"Snapshot step {index} references undeclared source_ref '{snapshot.source_ref}'."
                )

        for index in range(1, len(self.snapshots)):
            prev_radius = self.snapshots[index - 1].spiral.radius
            curr_radius = self.snapshots[index].spiral.radius
            if curr_radius < prev_radius:
                raise ValueError(
                    f"Spiral radius must be non-decreasing. "
                    f"Step {index - 1} radius={prev_radius}, step {index} radius={curr_radius}."
                )
