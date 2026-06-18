"""
standing_wave/export_narrative_seeds.py

Train WaveSequenceModel on the Terra Aeterna corpus, extract phase fingerprints
per phrase, map them to DEEP seed vectors, and export to JSON.

The exported JSON is the bridge between the PyTorch narrative layer and the
JS runtime. It is loaded by apps/starwell/src/lib/narrativeSeed.js for
phrase → DEEP-seed lookup in the browser.

Run from observer-math-registry-v0/:
    python -m lenses.standing_wave.export_narrative_seeds
    python -m lenses.standing_wave.export_narrative_seeds --out /path/to/output.json
    python -m lenses.standing_wave.export_narrative_seeds --epochs 60

Output schema (one entry per phrase):
    {
        "phrase": str,
        "tokens": [str, ...],
        "phase_fingerprint": [float, ...],   # 32 values, L2-normalised
        "deep_seed": {
            "P": float, "C": float, "R": float,
            "E": float, "M": float, "A": float, "charge": float
        },
        "coherence": float,
        "label": str
    }
"""

from __future__ import annotations

import argparse
import json
import math
import re
from pathlib import Path
from typing import Dict, List

import torch
import torch.nn.functional as F

from .oscillators import KuramotoDeepOscillators, AXIS_ORDER
from .train_terra_aeterna import CORPUS, WordTokenizer, LoreDataset, train
from .wave_attention import WaveSequenceModel


# ── Phase fingerprint extraction ──────────────────────────────────────────────

def phrase_fingerprint(
    model: WaveSequenceModel,
    tokenizer: WordTokenizer,
    phrase: str,
    n_coeffs: int = 32,
) -> torch.Tensor:
    """
    Mean Q phase vector for a phrase from the final model layer.
    Shape: (n_coeffs,), L2-normalised.
    """
    model.eval()
    ids = torch.tensor(tokenizer.encode(phrase), dtype=torch.long).unsqueeze(0)
    with torch.no_grad():
        report = model.phase_report(ids)
    # Final layer phase angles: (1, seq_len)
    angles = report[-1]["angles"].squeeze(0)   # (seq_len,)
    # Mean across tokens → single phase value
    mean_angle = angles.mean()
    # Expand into a fingerprint via sinusoidal projection (n_coeffs dimensions)
    k = torch.arange(1, n_coeffs + 1, dtype=torch.float32)
    fp = torch.cat([torch.sin(k * mean_angle), torch.cos(k * mean_angle)])[:n_coeffs]
    fp = fp / (fp.norm() + 1e-8)
    return fp


def fingerprint_to_deep_seed(
    fp: torch.Tensor,
    osc: KuramotoDeepOscillators,
) -> Dict[str, float]:
    """
    Phase fingerprint → DEEP seed via Kuramoto oscillators.
    The fingerprint encodes phase angles; we recover them and decode to DEEP values.
    """
    # Recover N_OSC phase angles from the fingerprint via atan2
    n = len(AXIS_ORDER)
    # Use first n values (sin projection) to recover angles
    sin_vals = fp[:n].clamp(-1.0, 1.0)
    cos_vals = fp[n:2*n].clamp(-1.0, 1.0) if len(fp) >= 2*n else torch.zeros(n)
    theta = torch.atan2(sin_vals, cos_vals)

    # Run a short integration to let the oscillators find their natural attractor
    theta_final = osc.forward(theta.unsqueeze(0), n_steps=50).squeeze(0)
    deep = osc.decode(theta_final)

    # Map axis names to DEEP vector keys
    key_map = {"presence": "P", "coherence": "C", "resonance": "R",
               "moon": "M", "attention": "A", "charge": "charge"}
    seed = {key_map.get(k, k): round(v, 4) for k, v in deep.items()
            if k in key_map}
    seed["E"] = round(deep.get("entropy", 1.0 - seed.get("C", 0.5)), 4)
    return seed


def slug(phrase: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", phrase.lower()).strip("_")[:48]


# ── Export pipeline ───────────────────────────────────────────────────────────

def export(
    out_path: Path,
    n_epochs: int = 40,
    embed_dim: int = 64,
    n_layers: int = 3,
    n_heads: int = 4,
    seed: int = 42,
) -> None:
    print("Training WaveSequenceModel on Terra Aeterna lore corpus…")
    model = train(
        n_epochs=n_epochs,
        embed_dim=embed_dim,
        n_layers=n_layers,
        n_heads=n_heads,
        seed=seed,
    )

    tokenizer = WordTokenizer(CORPUS)
    osc = KuramotoDeepOscillators()
    osc.eval()

    print("\nExtracting phase fingerprints…")
    entries: List[dict] = []
    for phrase in CORPUS:
        fp = phrase_fingerprint(model, tokenizer, phrase)
        deep_seed = fingerprint_to_deep_seed(fp, osc)

        # Compute coherence from the seed's C axis (already the order parameter)
        coherence = float(deep_seed.get("C", 0.5))

        entries.append({
            "phrase":            phrase,
            "tokens":            phrase.lower().split(),
            "phase_fingerprint": fp.tolist(),
            "deep_seed":         deep_seed,
            "coherence":         round(coherence, 4),
            "label":             slug(phrase),
        })
        print(f"  [{coherence:.3f}]  {phrase[:60]}")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(entries, indent=2), encoding="utf-8")
    print(f"\nExported {len(entries)} narrative seeds → {out_path}")


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    _default_out = (
        Path(__file__).resolve().parents[4] / "data" / "narrative-seeds.json"
    )

    parser = argparse.ArgumentParser(description="Export narrative seeds to JSON")
    parser.add_argument("--out", type=Path, default=_default_out)
    parser.add_argument("--epochs", type=int, default=40)
    parser.add_argument("--embed-dim", type=int, default=64)
    parser.add_argument("--layers", type=int, default=3)
    parser.add_argument("--heads", type=int, default=4)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    export(
        out_path=args.out,
        n_epochs=args.epochs,
        embed_dim=args.embed_dim,
        n_layers=args.layers,
        n_heads=args.heads,
        seed=args.seed,
    )
