"""Train Material Intuition v0.

Tiny PyTorch MLP that maps Observer Math Registry features to grown-material
numeric targets. This is a workshop script, not production runtime code.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Dict, List, Tuple

try:
    import torch
    from torch import nn
except ImportError as exc:  # pragma: no cover
    raise SystemExit("PyTorch is required for this lab. Install torch in a local lab environment.") from exc

LAB_DIR = Path(__file__).resolve().parent
REGISTRY_DIR = LAB_DIR.parent / "observer-math-registry-v0"
sys.path.insert(0, str(REGISTRY_DIR))

from observer_math_registry import default_registry  # noqa: E402

SAMPLE_PATH = LAB_DIR / "material_samples.jsonl"
EXPORT_PATH = LAB_DIR / "material_intuition_export.json"

FEATURE_NAMES = [
    "presence",
    "coherence",
    "resonance",
    "entropy",
    "moon",
    "attention",
    "charge",
    "living_signal",
    "restlessness",
    "stroke_complexity",
    "loop_presence",
    "crossing_pressure",
    "symmetry",
    "closure",
    "density",
]

TARGET_NAMES = [
    "flare_hue",
    "flare_alpha",
    "vein_density",
    "edge_softness",
    "pulse_speed",
    "glass_to_leaf",
]

TARGET_SCALE = torch.tensor([360.0, 1.0, 1.0, 1.0, 12.0, 1.0], dtype=torch.float32)


class MaterialMLP(nn.Module):
    def __init__(self, in_features: int, out_features: int) -> None:
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_features, 24),
            nn.GELU(),
            nn.Linear(24, 16),
            nn.GELU(),
            nn.Linear(16, out_features),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


def load_samples() -> List[Dict[str, object]]:
    rows: List[Dict[str, object]] = []
    with SAMPLE_PATH.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))
    return rows


def vectorize_sample(row: Dict[str, object]) -> Tuple[List[float], List[float]]:
    registry = default_registry()
    source = str(row["source"])
    raw = row["raw"]
    target = row["target"]
    if not isinstance(raw, dict) or not isinstance(target, dict):
        raise ValueError(f"Bad sample row: {row.get('id', '<unknown>')}")

    features = registry.features_for(source, raw)
    x = [float(features.get(name, 0.0)) for name in FEATURE_NAMES]
    y = [float(target[name]) for name in TARGET_NAMES]
    return x, y


def build_tensors(rows: List[Dict[str, object]]) -> Tuple[torch.Tensor, torch.Tensor]:
    xs: List[List[float]] = []
    ys: List[List[float]] = []
    for row in rows:
        x, y = vectorize_sample(row)
        xs.append(x)
        ys.append(y)

    x_tensor = torch.tensor(xs, dtype=torch.float32)
    y_tensor = torch.tensor(ys, dtype=torch.float32) / TARGET_SCALE
    return x_tensor, y_tensor


def train(epochs: int = 1200, lr: float = 0.018) -> MaterialMLP:
    torch.manual_seed(11)
    rows = load_samples()
    x_tensor, y_tensor = build_tensors(rows)

    model = MaterialMLP(x_tensor.shape[1], y_tensor.shape[1])
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=0.002)
    loss_fn = nn.MSELoss()

    for epoch in range(epochs):
        optimizer.zero_grad()
        prediction = model(x_tensor)
        loss = loss_fn(prediction, y_tensor)
        loss.backward()
        optimizer.step()

        if epoch in {0, 50, 200, 600, epochs - 1}:
            print(f"epoch={epoch:04d} loss={loss.item():.6f}")

    export_predictions(model, rows, x_tensor)
    return model


def export_predictions(model: MaterialMLP, rows: List[Dict[str, object]], x_tensor: torch.Tensor) -> None:
    model.eval()
    with torch.no_grad():
        predictions = model(x_tensor) * TARGET_SCALE

    exports = []
    for row, pred in zip(rows, predictions):
        target = row["target"]
        if not isinstance(target, dict):
            continue
        predicted = {name: round(float(value), 4) for name, value in zip(TARGET_NAMES, pred)}
        exports.append(
            {
                "id": row.get("id"),
                "source": row.get("source"),
                "rating": row.get("rating"),
                "target": target,
                "predicted": predicted,
            }
        )

    EXPORT_PATH.write_text(json.dumps({"predictions": exports}, indent=2), encoding="utf-8")
    print(f"wrote {EXPORT_PATH}")


if __name__ == "__main__":
    train()
