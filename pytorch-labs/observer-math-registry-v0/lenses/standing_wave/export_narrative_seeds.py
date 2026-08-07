"""
standing_wave/export_narrative_seeds.py

Train WaveSequenceModel on the Terra Aeterna corpus, extract phase fingerprints,
map them to the canonical seven-dimensional PREMAQ bearing, and export JSON.

PREMAQ reading order:
    Presence · Memory · Qualia · Resonance · Entanglement · Agency · Coherence
Stable wire order:
    P C R E M A Q
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Dict, List

import torch

from .oscillators import KuramotoDeepOscillators, AXIS_ORDER
from .train_terra_aeterna import CORPUS, WordTokenizer, train
from .wave_attention import WaveSequenceModel


PREMAQ_KEY_MAP = {
    "presence": "P",
    "coherence": "C",
    "resonance": "R",
    "entanglement": "E",
    "memory": "M",
    "agency": "A",
    "qualia": "Q",
}


def phrase_fingerprint(
    model: WaveSequenceModel,
    tokenizer: WordTokenizer,
    phrase: str,
    n_coeffs: int = 32,
) -> torch.Tensor:
    """Return a normalised phase fingerprint for one phrase."""
    model.eval()
    ids = torch.tensor(tokenizer.encode(phrase), dtype=torch.long).unsqueeze(0)
    with torch.no_grad():
        report = model.phase_report(ids)

    angles = report[-1]["angles"].squeeze(0)
    mean_angle = angles.mean()
    k = torch.arange(1, n_coeffs + 1, dtype=torch.float32)
    fingerprint = torch.cat([
        torch.sin(k * mean_angle),
        torch.cos(k * mean_angle),
    ])[:n_coeffs]
    return fingerprint / (fingerprint.norm() + 1e-8)


def fingerprint_to_premaq_seed(
    fingerprint: torch.Tensor,
    oscillators: KuramotoDeepOscillators,
) -> Dict[str, float]:
    """Phase fingerprint → canonical PREMAQ seed plus derived wave metrics."""
    n = len(AXIS_ORDER)
    sin_values = fingerprint[:n].clamp(-1.0, 1.0)
    cos_values = (
        fingerprint[n:2 * n].clamp(-1.0, 1.0)
        if len(fingerprint) >= 2 * n
        else torch.zeros(n)
    )
    theta = torch.atan2(sin_values, cos_values)

    theta_final = oscillators.forward(theta.unsqueeze(0), n_steps=50).squeeze(0)
    decoded = oscillators.decode(theta_final)

    return {
        PREMAQ_KEY_MAP[name]: round(float(decoded[name]), 4)
        for name in AXIS_ORDER
    }


def wave_metrics(
    fingerprint: torch.Tensor,
    oscillators: KuramotoDeepOscillators,
) -> Dict[str, float]:
    n = len(AXIS_ORDER)
    sin_values = fingerprint[:n].clamp(-1.0, 1.0)
    cos_values = (
        fingerprint[n:2 * n].clamp(-1.0, 1.0)
        if len(fingerprint) >= 2 * n
        else torch.zeros(n)
    )
    theta = torch.atan2(sin_values, cos_values)
    theta_final = oscillators.forward(theta.unsqueeze(0), n_steps=50).squeeze(0)
    synchronisation = float(oscillators.order_parameter(theta_final.unsqueeze(0)).squeeze())
    return {
        "wave_coherence": round(synchronisation, 4),
        "phase_dispersion": round(1.0 - synchronisation, 4),
    }


def slug(phrase: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", phrase.lower()).strip("_")[:48]


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
    oscillators = KuramotoDeepOscillators()
    oscillators.eval()

    print("\nExtracting phase fingerprints and PREMAQ bearings…")
    entries: List[dict] = []

    for phrase in CORPUS:
        fingerprint = phrase_fingerprint(model, tokenizer, phrase)
        premaq_seed = fingerprint_to_premaq_seed(fingerprint, oscillators)
        metrics = wave_metrics(fingerprint, oscillators)

        entries.append({
            "schema": "hearthgate.narrative-premaq-seed/v0.2",
            "phrase": phrase,
            "tokens": phrase.lower().split(),
            "phase_fingerprint": fingerprint.tolist(),
            "premaq": premaq_seed,
            "wave_metrics": metrics,
            "label": slug(phrase),
        })

        print(
            f"  [R={premaq_seed['R']:.3f} E={premaq_seed['E']:.3f} "
            f"M={premaq_seed['M']:.3f}]  {phrase[:60]}"
        )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(entries, indent=2), encoding="utf-8")
    print(f"\nExported {len(entries)} narrative seeds → {out_path}")


if __name__ == "__main__":
    default_out = (
        Path(__file__).resolve().parents[4] / "data" / "narrative-seeds.json"
    )

    parser = argparse.ArgumentParser(description="Export braided narrative PREMAQ seeds")
    parser.add_argument("--out", type=Path, default=default_out)
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
