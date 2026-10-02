"""Bounded, inspectable signal graph for House Workspace OS.

The graph is deliberately transient. It coordinates current activity and working context;
it does not promote canon or claim to be durable agent memory.
"""

from __future__ import annotations

from collections import deque
from datetime import datetime, timezone
from threading import RLock
from typing import Iterable

from .models import BrainIngestReceipt, BrainNode, BrainSignal, BrainSnapshot


class WorkspaceBrain:
    """A small deterministic activation graph with trajectory-scoped working memory."""

    def __init__(self, *, max_signals: int = 256, max_trajectory_signals: int = 32) -> None:
        if max_signals < 1:
            raise ValueError("max_signals must be positive")
        if max_trajectory_signals < 1:
            raise ValueError("max_trajectory_signals must be positive")
        self.max_signals = max_signals
        self.max_trajectory_signals = max_trajectory_signals
        self._signals: deque[BrainSignal] = deque(maxlen=max_signals)
        self._nodes: dict[str, BrainNode] = {}
        self._trajectories: dict[str, deque[str]] = {}
        self._seen: deque[str] = deque(maxlen=max_signals * 4)
        self._seen_set: set[str] = set()
        self._duplicates = 0
        self._lock = RLock()

    def _remember_seen(self, signal_id: str) -> None:
        if len(self._seen) == self._seen.maxlen:
            evicted = self._seen.popleft()
            self._seen_set.discard(evicted)
        self._seen.append(signal_id)
        self._seen_set.add(signal_id)

    @staticmethod
    def _activation(previous: float, priority: float) -> float:
        # Deterministic leaky integration. Recent repeated activity raises activation,
        # while every new signal naturally decays prior activation a little.
        return round((previous * 0.82) + (0.35 + (priority * 0.65)), 6)

    def _touch_node(self, node_id: str, signal: BrainSignal, *, relation: str) -> None:
        key = node_id.strip()
        if not key:
            return
        previous = self._nodes.get(key)
        metadata = dict(previous.metadata) if previous else {}
        metadata.update(
            {
                "lastLane": signal.lane,
                "lastKind": signal.kind,
                "lastRelation": relation,
                "lastSignalId": signal.id,
                "epistemicClass": signal.epistemic_class,
            }
        )
        self._nodes[key] = BrainNode(
            id=key,
            kind=previous.kind if previous else ("agent" if signal.lane == "agent" else "unknown"),
            state=previous.state if previous else "active",
            activation=self._activation(previous.activation if previous else 0.0, signal.priority),
            signalCount=(previous.signal_count if previous else 0) + 1,
            updatedAt=signal.occurred_at,
            metadata=metadata,
        )

    def ingest(self, signal: BrainSignal) -> BrainIngestReceipt:
        with self._lock:
            if signal.id in self._seen_set:
                self._duplicates += 1
                return BrainIngestReceipt(
                    signalId=signal.id,
                    accepted=True,
                    duplicate=True,
                    signalCount=len(self._signals),
                )

            self._remember_seen(signal.id)
            self._signals.append(signal)
            self._touch_node(signal.source, signal, relation="source")
            if signal.target:
                self._touch_node(signal.target, signal, relation="target")

            if signal.trajectory_id:
                lane = self._trajectories.setdefault(
                    signal.trajectory_id,
                    deque(maxlen=self.max_trajectory_signals),
                )
                lane.append(signal.id)

            return BrainIngestReceipt(
                signalId=signal.id,
                accepted=True,
                duplicate=False,
                signalCount=len(self._signals),
            )

    def ingest_many(self, signals: Iterable[BrainSignal]) -> tuple[BrainIngestReceipt, ...]:
        return tuple(self.ingest(signal) for signal in signals)

    def set_node(
        self,
        node_id: str,
        *,
        kind: str = "unknown",
        state: str = "unknown",
        metadata: dict[str, object] | None = None,
    ) -> BrainNode:
        with self._lock:
            previous = self._nodes.get(node_id)
            merged = dict(previous.metadata) if previous else {}
            merged.update(metadata or {})
            node = BrainNode(
                id=node_id,
                kind=kind,  # type: ignore[arg-type]
                state=state,
                activation=previous.activation if previous else 0.0,
                signalCount=previous.signal_count if previous else 0,
                updatedAt=datetime.now(timezone.utc),
                metadata=merged,
            )
            self._nodes[node_id] = node
            return node

    def snapshot(self) -> BrainSnapshot:
        with self._lock:
            return BrainSnapshot(
                signalCount=len(self._signals),
                recentSignals=tuple(self._signals),
                nodes=tuple(sorted(self._nodes.values(), key=lambda node: node.id)),
                trajectories={key: tuple(value) for key, value in sorted(self._trajectories.items())},
                duplicateCount=self._duplicates,
            )

    def clear_transient(self) -> None:
        with self._lock:
            self._signals.clear()
            self._trajectories.clear()
            self._seen.clear()
            self._seen_set.clear()
            self._duplicates = 0
            for key, previous in tuple(self._nodes.items()):
                self._nodes[key] = previous.model_copy(
                    update={
                        "activation": 0.0,
                        "signal_count": 0,
                        "updated_at": datetime.now(timezone.utc),
                    }
                )
