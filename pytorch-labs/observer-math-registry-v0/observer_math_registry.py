"""Observer Math Registry v0.

Small pure-Python contract for swappable STARWELL observer mathematics.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Dict, Mapping, MutableMapping

FeatureMap = Dict[str, float]
RawSample = Mapping[str, object]
Adapter = Callable[[RawSample], FeatureMap]
OutputHead = Callable[[FeatureMap], MutableMapping[str, object]]


def _num(sample: RawSample, key: str, default: float = 0.0) -> float:
    value = sample.get(key, default)
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


@dataclass(frozen=True)
class ObserverSource:
    name: str
    adapter: Adapter
    description: str = ""


@dataclass(frozen=True)
class ObserverHead:
    name: str
    head: OutputHead
    description: str = ""


@dataclass
class ObserverMathRegistry:
    sources: Dict[str, ObserverSource] = field(default_factory=dict)
    heads: Dict[str, ObserverHead] = field(default_factory=dict)

    def register_source(self, source: ObserverSource) -> None:
        self.sources[source.name] = source

    def register_head(self, head: ObserverHead) -> None:
        self.heads[head.name] = head

    def features_for(self, source_name: str, sample: RawSample) -> FeatureMap:
        return self.sources[source_name].adapter(sample)

    def output_for(self, source_name: str, head_name: str, sample: RawSample) -> MutableMapping[str, object]:
        features = self.features_for(source_name, sample)
        return self.heads[head_name].head(features)


def deep_theory_adapter(sample: RawSample) -> FeatureMap:
    presence = clamp(_num(sample, "P", 0.55))
    coherence = clamp(_num(sample, "C", 0.50))
    resonance = clamp(_num(sample, "R", 0.45))
    entropy = clamp(_num(sample, "E", 0.38))
    moon = clamp(_num(sample, "M", 0.30))
    attention = clamp(_num(sample, "A", 0.65))
    charge = clamp(_num(sample, "charge", 0.50))

    return {
        "presence": presence,
        "coherence": coherence,
        "resonance": resonance,
        "entropy": entropy,
        "moon": moon,
        "attention": attention,
        "charge": charge,
        "living_signal": clamp((presence + resonance + attention + charge) / 4.0),
        "restlessness": clamp((entropy + charge) / 2.0),
    }


def sigil_topology_adapter(sample: RawSample) -> FeatureMap:
    strokes = clamp(_num(sample, "stroke_count", 4.0) / 24.0)
    loops = clamp(_num(sample, "loop_count", 0.0) / 8.0)
    crossings = clamp(_num(sample, "crossing_count", 0.0) / 16.0)
    symmetry = clamp(_num(sample, "symmetry", 0.5))
    closure = clamp(_num(sample, "closure", 0.4))
    density = clamp(_num(sample, "density", 0.45))

    return {
        "stroke_complexity": strokes,
        "loop_presence": loops,
        "crossing_pressure": crossings,
        "symmetry": symmetry,
        "closure": closure,
        "density": density,
        "living_signal": clamp((symmetry + closure + loops) / 3.0),
        "restlessness": clamp((crossings + density) / 2.0),
    }


def material_css_head(features: FeatureMap) -> MutableMapping[str, object]:
    living = clamp(features.get("living_signal", 0.45))
    restless = clamp(features.get("restlessness", 0.28))
    moon = clamp(features.get("moon", 0.35))
    resonance = clamp(features.get("resonance", features.get("loop_presence", 0.4)))

    hue = round(150 - (moon * 18) + (resonance * 42))
    alpha = round(0.16 + living * 0.34, 3)
    vein_density = round(0.18 + resonance * 0.44 + restless * 0.18, 3)
    edge_softness = round(0.42 + living * 0.36 - restless * 0.12, 3)

    return {
        "--flare-hue": str(hue),
        "--flare-alpha": str(alpha),
        "--grown-vein-density": str(clamp(vein_density)),
        "--grown-edge-softness": str(clamp(edge_softness)),
    }


def default_registry() -> ObserverMathRegistry:
    registry = ObserverMathRegistry()
    registry.register_source(ObserverSource("deep_theory", deep_theory_adapter))
    registry.register_source(ObserverSource("sigil_topology", sigil_topology_adapter))
    registry.register_head(ObserverHead("material_css", material_css_head))
    return registry


if __name__ == "__main__":
    registry = default_registry()
    sample = {"P": 0.55, "C": 0.50, "R": 0.45, "E": 0.38, "M": 0.30, "A": 0.65, "charge": 0.94}
    print(registry.output_for("deep_theory", "material_css", sample))
