# Flameclyffe ML Laboratory

This workspace is the experimental and analytical boundary for PyTorch-origin models, procedural state engines, and Python visual laboratories used by Flameclyffe, STARWELL, DEEP, the Terra Aeterna wiki, Observer Atelier, and accessibility Lantern systems.

It is intentionally separate from the React/Vite applications. Python owns computation, modelling, simulation, analysis, and validated state contracts. The browser owns final layout, accessibility, interaction, and high-refresh rendering.

## Authority boundary

Models and procedural engines may:

- create embeddings;
- produce experimental scores;
- rank candidate relationships;
- suggest labels or metadata;
- identify anomalies or duplicates;
- generate reviewable drafts;
- record explanations and uncertainty;
- generate procedural instrument state for browser rendering.

They may not:

- write directly to canon records;
- publish records;
- alter consent or privacy settings;
- issue emergency decisions without deterministic confirmation paths;
- claim metaphysical, diagnostic, emotional, or relational truth.

All persisted model output belongs in review-only tables with model version, source snapshot, confidence, explanation, and reviewer state.

## Python lanes

### 1. ML and analytical forge

PyTorch, NumPy, sentence embeddings, vision, audio, anomaly detection, evaluation, and model export.

### 2. Living Engine

FastAPI and WebSockets produce typed, low-frequency instrument state. React/WebGL interpolates and renders it at display refresh rate.

This keeps the visual layer silky without asking Python to stream every painted pixel across the network.

### 3. Visual laboratory

Pygame Community Edition and ModernGL provide a fast Python sketchbook for liquid light, particles, shaders, sigils, audio-reactive fields, and interaction experiments. Successful visual rules are then translated into browser shaders or exported as assets.

### 4. Browser-local Python

Pyodide may be used for small, private calculations or notebooks that benefit from Python directly in the browser. It is not the default home for PyTorch models or high-refresh rendering because WebAssembly startup and package size would burden ordinary page loads.

## Workspace map

```text
ml-lab/
├── pyproject.toml
├── src/flameclyffe_ml/
│   ├── privacy.py          # data classes and release rules
│   ├── provenance.py       # deterministic content and run hashes
│   ├── synthetic/          # non-sensitive fixtures for early experiments
│   └── living_engine/      # typed procedural state and FastAPI bridge
├── experiments/            # Pygame / ModernGL visual laboratories
├── tests/
├── model_cards/
├── data_cards/
└── sql/                    # proposed Supabase ML boundary
```

## Local setup

Python 3.11 or newer is recommended.

```bash
cd ml-lab
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e '.[dev]'
pytest
```

The base install does not require PyTorch. Install only the group needed by the current experiment:

```bash
python -m pip install -e '.[torch,dev]'
python -m pip install -e '.[semantic,dev]'
python -m pip install -e '.[vision,dev]'
python -m pip install -e '.[audio,dev]'
python -m pip install -e '.[service,dev]'
python -m pip install -e '.[visual-lab,dev]'
```

This prevents a simple metadata or schema test from downloading a small moon made of wheel files.

## Run the Living Engine

```bash
cd ml-lab
python -m pip install -e '.[service]'
flameclyffe-living-engine
```

The local service listens on `127.0.0.1:8765` and exposes:

- `GET /health`
- `POST /v1/liquid-light/frame`
- `GET /v1/contracts/liquid-light`
- `WS /v1/liquid-light/stream`

The WebSocket's first message must contain a complete liquid-light control object. Python emits validated snapshots at 1–20 Hz; the browser should interpolate them to its own refresh rate.

The service is non-persistent and has no canon authority.

## First planned experiments

1. Codex semantic-search benchmark using approved public or synthetic text.
2. DEEP Pattern Laboratory using synthetic channel windows and deterministic baselines.
3. Observer Atelier image-embedding benchmark using approved assets only.
4. Caption Lantern ASR benchmark using explicit test recordings.
5. Liquid-light Pygame laboratory feeding the same state contract used by STARWELL.

## Required artefacts for every experiment

- model or engine card;
- data card;
- exact source revision and licence;
- input snapshot hash;
- environment lock;
- evaluation metrics;
- target-device latency and memory where relevant;
- privacy class;
- reviewer state;
- known limitations and prohibited uses.

See `docs/research/pytorch-engine-roadmap.md` for the full engine map.