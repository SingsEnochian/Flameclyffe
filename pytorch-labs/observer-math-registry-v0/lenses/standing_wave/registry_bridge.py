"""
standing_wave/registry_bridge.py

Connects the standing wave lens to the Observer Math Registry.

Source adapter: DEEP vector dict → wave-field feature map
    Runs KuramotoDeepOscillators + StandingWaveField.
    Adds wave_coherence, nodal_density, and phase_entropy alongside existing DEEP features.

Output head: wave features → CSS custom properties
    Extends material_css_head with wave-specific properties.

Usage:
    from lenses.standing_wave.registry_bridge import register_standing_wave_lens
    registry = default_registry()
    register_standing_wave_lens(registry)
    out = registry.output_for("standing_wave", "wave_css", sample)
"""

from __future__ import annotations

import math
from typing import MutableMapping

import torch

from observer_math_registry import (
    FeatureMap,
    ObserverHead,
    ObserverMathRegistry,
    ObserverSource,
    RawSample,
    clamp,
)
from .oscillators import KuramotoDeepOscillators, AXIS_ORDER
from .wave_field import StandingWaveField


# Shared instances — stateless for adapter use; K matrix at default init
_osc = KuramotoDeepOscillators()
_field = StandingWaveField(resolution=32)   # low-res for fast adapter calls
_osc.eval()
_field.eval()


def _num(sample: RawSample, key: str, default: float = 0.5) -> float:
    val = sample.get(key, default)
    try:
        return float(val)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default


# ── Source adapter ────────────────────────────────────────────────────────────

def standing_wave_adapter(sample: RawSample) -> FeatureMap:
    """
    DEEP vector → wave-field feature map.
    Integrates Kuramoto oscillators for 100 steps, computes the 2D field,
    and extracts wave_coherence, nodal_density, phase_entropy.
    """
    deep = {
        "presence":  clamp(_num(sample, "P")),
        "coherence": clamp(_num(sample, "C")),
        "resonance": clamp(_num(sample, "R")),
        "entropy":   clamp(_num(sample, "E")),
        "moon":      clamp(_num(sample, "M")),
        "attention": clamp(_num(sample, "A")),
        "charge":    clamp(_num(sample, "charge")),
    }

    with torch.no_grad():
        theta0 = _osc.encode(deep)                              # initial phases
        theta = _osc.forward(theta0.unsqueeze(0), n_steps=100).squeeze(0)
        r = float(_osc.order_parameter(theta.unsqueeze(0)))
        amplitudes = _osc.current_amplitudes()
        psi = _field.forward(theta, amplitudes)
        nodal_d = _field.nodal_density(psi)

        # Phase entropy: Shannon entropy of the histogram of phase angles / 2π
        normed = (theta % (2 * math.pi)) / (2 * math.pi)
        hist = torch.histc(normed, bins=8, min=0.0, max=1.0)
        hist = hist / (hist.sum() + 1e-8)
        phase_entropy = float(-torch.sum(hist * torch.log(hist + 1e-8)) / math.log(8))

    living_signal = clamp((deep["presence"] + deep["resonance"] + deep["attention"] + deep["charge"]) / 4.0)
    restlessness  = clamp((deep["entropy"] + deep["charge"]) / 2.0)

    return {
        # Standard DEEP features (compatible with material_css_head)
        "presence":     deep["presence"],
        "coherence":    deep["coherence"],
        "resonance":    deep["resonance"],
        "entropy":      deep["entropy"],
        "moon":         deep["moon"],
        "attention":    deep["attention"],
        "charge":       deep["charge"],
        "living_signal": living_signal,
        "restlessness":  restlessness,
        # Wave-specific features
        "wave_coherence":  clamp(r),
        "nodal_density":   clamp(nodal_d),
        "phase_entropy":   clamp(phase_entropy),
    }


# ── Output head ───────────────────────────────────────────────────────────────

def wave_css_head(features: FeatureMap) -> MutableMapping[str, object]:
    """
    Wave features → CSS custom properties for STARWELL visual layer.
    Extends material_css_head with wave-specific properties.
    """
    living  = clamp(features.get("living_signal", 0.45))
    restless = clamp(features.get("restlessness", 0.28))
    moon    = clamp(features.get("moon", 0.35))
    res     = clamp(features.get("resonance", 0.4))
    w_coh   = clamp(features.get("wave_coherence", 0.5))
    nodal   = clamp(features.get("nodal_density", 0.2))
    p_ent   = clamp(features.get("phase_entropy", 0.5))

    hue          = round(150 - (moon * 18) + (res * 42))
    alpha        = round(0.16 + living * 0.34, 3)
    vein_density = round(0.18 + res * 0.44 + restless * 0.18, 3)
    edge_softness = round(0.42 + living * 0.36 - restless * 0.12, 3)

    # Wave-specific CSS vars — readable by STARWELL's wave visualisation layer
    nodal_opacity  = round(0.1 + w_coh * 0.6, 3)
    nodal_scale    = round(0.6 + nodal * 1.4, 3)
    phase_blur     = round(p_ent * 8.0, 2)      # px — more entropic = more blur
    resonance_glow = round(w_coh * 0.9, 3)

    return {
        "--flare-hue":          str(hue),
        "--flare-alpha":        str(alpha),
        "--grown-vein-density": str(clamp(vein_density)),
        "--grown-edge-softness": str(clamp(edge_softness)),
        "--wave-nodal-opacity": str(nodal_opacity),
        "--wave-nodal-scale":   str(nodal_scale),
        "--wave-phase-blur":    f"{phase_blur}px",
        "--wave-resonance-glow": str(resonance_glow),
    }


# ── Registration ──────────────────────────────────────────────────────────────

def register_standing_wave_lens(registry: ObserverMathRegistry) -> None:
    """
    Register the standing wave lens into the Observer Math Registry.
    After this call:
        registry.output_for("standing_wave", "wave_css", deep_sample)
    returns the full CSS property dict including wave-specific vars.
    """
    registry.register_source(
        ObserverSource(
            "standing_wave",
            standing_wave_adapter,
            description=(
                "Kuramoto oscillators + 2D standing wave field. "
                "Adds wave_coherence, nodal_density, phase_entropy to the DEEP feature map."
            ),
        )
    )
    registry.register_head(
        ObserverHead(
            "wave_css",
            wave_css_head,
            description="Wave-field features → CSS custom properties including nodal layer vars.",
        )
    )
