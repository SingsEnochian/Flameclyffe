from __future__ import annotations

from flameclyffe_ml.living_engine import (
    LiquidLightControls,
    Point2D,
    generate_liquid_light_snapshot,
)


def test_liquid_light_snapshot_is_deterministic_and_bounded() -> None:
    controls = LiquidLightControls(
        instrument_id="test-orb",
        seed=41,
        node_count=24,
        coherence=0.81,
        resonance=0.67,
        entropy=0.12,
        pointer=Point2D(x=0.62, y=0.44),
    )

    first = generate_liquid_light_snapshot(controls, time_s=2.75)
    second = generate_liquid_light_snapshot(controls, time_s=2.75)

    assert first == second
    assert len(first.nodes) == 24
    assert len(first.snapshot_id) == 64
    assert first.interpolation_hint_ms == 83
    assert all(0.0 <= node.x <= 1.0 for node in first.nodes)
    assert all(0.0 <= node.y <= 1.0 for node in first.nodes)
    assert all(0.0 <= node.energy <= 1.0 for node in first.nodes)
    assert all(0.0 <= node.trail <= 1.0 for node in first.nodes)


def test_liquid_light_changes_over_time() -> None:
    controls = LiquidLightControls(seed=9, node_count=10)

    first = generate_liquid_light_snapshot(controls, time_s=0.0)
    later = generate_liquid_light_snapshot(controls, time_s=1.0)

    assert first.snapshot_id != later.snapshot_id
    assert [(node.x, node.y) for node in first.nodes] != [
        (node.x, node.y) for node in later.nodes
    ]


def test_pointer_changes_the_field_without_changing_node_count() -> None:
    base = LiquidLightControls(seed=17, node_count=12)
    attracted = base.model_copy(update={"pointer": Point2D(x=0.5, y=0.5)})

    without_pointer = generate_liquid_light_snapshot(base, time_s=3.0)
    with_pointer = generate_liquid_light_snapshot(attracted, time_s=3.0)

    assert len(without_pointer.nodes) == len(with_pointer.nodes) == 12
    assert without_pointer.snapshot_id != with_pointer.snapshot_id
