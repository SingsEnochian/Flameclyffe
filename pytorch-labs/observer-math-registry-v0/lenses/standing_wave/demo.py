"""
standing_wave/demo.py

End-to-end walkthrough of the standing wave lens — no training required.

Demonstrates:
  1. DEEP vector → Kuramoto oscillators → convergence trajectory
  2. Oscillator phases → 2D wave field → nodal geometry
  3. Wave fingerprint → memory store → phase-resonance recall
  4. Observer Math Registry integration (standing_wave → wave_css)

Run from observer-math-registry-v0/:
    python -m lenses.standing_wave.demo
"""

from __future__ import annotations

import math

import torch

from observer_math_registry import ObserverMathRegistry
from .oscillators import KuramotoDeepOscillators, AXIS_ORDER
from .wave_field import StandingWaveField
from .memory import WaveMemory, StandingWaveMemoryStore
from .registry_bridge import register_standing_wave_lens


def _bar(val: float, width: int = 24) -> str:
    filled = round(max(0.0, min(1.0, val)) * width)
    return "[" + "█" * filled + "·" * (width - filled) + f"] {val:.3f}"


def run_demo() -> None:
    print("=" * 65)
    print("Standing Wave Lens — demo")
    print("=" * 65)

    osc = KuramotoDeepOscillators()
    field = StandingWaveField(resolution=48)
    store = StandingWaveMemoryStore()

    # ── 1. Three DEEP states with distinct characters ──────────────────────
    states = {
        "high_coherence": {"presence": 0.9, "coherence": 0.9, "resonance": 0.8,
                           "entropy": 0.1, "moon": 0.6, "attention": 0.85, "charge": 0.7},
        "high_entropy":   {"presence": 0.4, "coherence": 0.2, "resonance": 0.3,
                           "entropy": 0.9, "moon": 0.3, "attention": 0.5, "charge": 0.6},
        "lunar_peak":     {"presence": 0.6, "coherence": 0.6, "resonance": 0.5,
                           "entropy": 0.3, "moon": 0.95, "attention": 0.7, "charge": 0.5},
    }

    print("\n1. Kuramoto integration — watching coherence stabilise\n")
    for label, deep in states.items():
        theta0 = osc.encode(deep)
        traj = osc.forward(theta0.unsqueeze(0), n_steps=300, return_trajectory=True).squeeze(0)
        r_start = float(osc.order_parameter(traj[0].unsqueeze(0)))
        r_mid   = float(osc.order_parameter(traj[150].unsqueeze(0)))
        r_final = float(osc.order_parameter(traj[-1].unsqueeze(0)))
        print(f"  {label:<20}  r₀={r_start:.3f}  r₁₅₀={r_mid:.3f}  r₃₀₀={r_final:.3f}")

    # ── 2. Wave field and nodal geometry ──────────────────────────────────────
    print("\n2. Wave field — nodal density and SVG path count\n")
    fingerprints: dict[str, torch.Tensor] = {}
    for label, deep in states.items():
        theta = osc.forward(osc.encode(deep).unsqueeze(0), n_steps=200).squeeze(0)
        amps = osc.current_amplitudes()
        psi = field.forward(theta, amps)
        density = field.nodal_density(psi)
        fp = field.fingerprint(theta, amps)
        paths = field.svg_paths(theta, amps)
        fingerprints[label] = fp

        decoded = osc.decode(theta)
        print(f"  {label:<20}  nodal_density={density:.3f}  svg_paths={len(paths)}  "
              f"wave_coherence={decoded['coherence']:.3f}")

        # Store in memory
        store.store(WaveMemory(
            label=label,
            deep=deep,
            fingerprint=fp.tolist(),
            phase_angles=theta.tolist(),
            coherence=decoded["coherence"],
            timestamp="2026-06-18T00:00:00Z",
            rune="Sowilo" if label == "high_coherence" else "Hagalaz" if label == "high_entropy" else "Mannaz",
            moon_phase="new" if label == "high_coherence" else "waning" if label == "high_entropy" else "full",
            moon_age_days=1.0 if label == "high_coherence" else 22.0 if label == "high_entropy" else 14.8,
        ))

    # ── 3. Memory recall ──────────────────────────────────────────────────────
    print("\n3. Memory recall — query with a near-coherent state\n")
    query_deep = {"presence": 0.85, "coherence": 0.82, "resonance": 0.75,
                  "entropy": 0.15, "moon": 0.5, "attention": 0.8, "charge": 0.65}
    theta_q = osc.forward(osc.encode(query_deep).unsqueeze(0), n_steps=200).squeeze(0)
    fp_q = field.fingerprint(theta_q, osc.current_amplitudes())

    recalled = store.recall(fp_q, top_k=3)
    print("  Query: near-coherent DEEP state")
    for i, mem in enumerate(recalled):
        fp_m = torch.tensor(mem.fingerprint)
        score = float(torch.dot(fp_q / fp_q.norm(), fp_m / fp_m.norm()))
        print(f"  #{i+1}  {mem.label:<20}  resonance={score:.3f}  rune={mem.rune}  moon={mem.moon_phase}")

    # ── 4. Registry integration ───────────────────────────────────────────────
    print("\n4. Observer Math Registry integration\n")
    registry = ObserverMathRegistry()
    register_standing_wave_lens(registry)

    sample = {"P": 0.9, "C": 0.9, "R": 0.8, "E": 0.1, "M": 0.6, "A": 0.85, "charge": 0.7}
    css = registry.output_for("standing_wave", "wave_css", sample)
    print("  Input:  high_coherence DEEP vector")
    for k, v in css.items():
        print(f"    {k}: {v}")

    print("\n" + "=" * 65)
    print("Sources registered:", list(registry.sources.keys()))
    print("Heads registered:  ", list(registry.heads.keys()))
    print("=" * 65)
    print()
    print("The wave field is up. Oscillators are coupled. Memory is listening.")


if __name__ == "__main__":
    run_demo()
