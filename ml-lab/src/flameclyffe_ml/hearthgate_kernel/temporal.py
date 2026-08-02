"""Receipt-backed temporal graph for Hearthgate packets."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from typing import Literal

from flameclyffe_ml.provenance import content_hash

from .integrity import assert_packet_integrity
from .models import DualAspectPacket

TemporalRelation = Literal["observation", "branch", "answer", "bind", "replay", "return"]


@dataclass(frozen=True, slots=True)
class TemporalEdge:
    source: str
    target: str
    relation: TemporalRelation
    receipt_hash: str


class TemporalGraph:
    """A causal directed graph that rejects cycles and stale receipts."""

    def __init__(self) -> None:
        self._packets: dict[str, DualAspectPacket] = {}
        self._edges: list[TemporalEdge] = []

    @staticmethod
    def packet_key(packet: DualAspectPacket) -> str:
        return packet.temporal.frame_id

    def add_packet(self, packet: DualAspectPacket) -> str:
        assert_packet_integrity(packet, require_receipt=True)
        key = self.packet_key(packet)
        existing = self._packets.get(key)
        if existing is not None and existing != packet:
            raise ValueError(f"Temporal frame collision for {key!r}.")
        self._packets[key] = packet
        return key

    def _path_exists(self, start: str, destination: str) -> bool:
        queue = deque([start])
        visited: set[str] = set()
        adjacency: dict[str, list[str]] = {}
        for edge in self._edges:
            adjacency.setdefault(edge.source, []).append(edge.target)
        while queue:
            node = queue.popleft()
            if node == destination:
                return True
            if node in visited:
                continue
            visited.add(node)
            queue.extend(adjacency.get(node, ()))
        return False

    def link(self, source: str, target: str, relation: TemporalRelation) -> TemporalEdge:
        if source not in self._packets or target not in self._packets:
            raise KeyError("Both temporal frames must exist before they can be linked.")
        assert_packet_integrity(self._packets[source], require_receipt=True)
        assert_packet_integrity(self._packets[target], require_receipt=True)
        if source == target or self._path_exists(target, source):
            raise ValueError("A causal temporal edge cannot create a cycle.")
        receipt_hash = content_hash(
            {
                "source": source,
                "target": target,
                "relation": relation,
                "source_receipt": self._packets[source].receipts[-1].packet_hash,
                "target_receipt": self._packets[target].receipts[-1].packet_hash,
            }
        )
        edge = TemporalEdge(
            source=source,
            target=target,
            relation=relation,
            receipt_hash=receipt_hash,
        )
        self._edges.append(edge)
        return edge

    def ancestors(self, frame_id: str) -> tuple[str, ...]:
        if frame_id not in self._packets:
            raise KeyError(frame_id)
        reverse: dict[str, list[str]] = {}
        for edge in self._edges:
            reverse.setdefault(edge.target, []).append(edge.source)
        queue = deque(reverse.get(frame_id, ()))
        found: list[str] = []
        seen: set[str] = set()
        while queue:
            node = queue.popleft()
            if node in seen:
                continue
            seen.add(node)
            found.append(node)
            queue.extend(reverse.get(node, ()))
        return tuple(found)

    def snapshot(self) -> dict[str, object]:
        for packet in self._packets.values():
            assert_packet_integrity(packet, require_receipt=True)
        packets = {
            key: packet.receipts[-1].packet_hash
            for key, packet in sorted(self._packets.items())
        }
        edges = [
            {
                "source": edge.source,
                "target": edge.target,
                "relation": edge.relation,
                "receipt_hash": edge.receipt_hash,
            }
            for edge in self._edges
        ]
        return {
            "schema": "hearthgate.temporal-graph.v1",
            "packet_count": len(packets),
            "edge_count": len(edges),
            "packets": packets,
            "edges": edges,
            "graph_hash": content_hash({"packets": packets, "edges": edges}),
        }
