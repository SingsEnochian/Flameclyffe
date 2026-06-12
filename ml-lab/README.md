# Flameclyffe ML Laboratory

This workspace is the experimental and analytical boundary for PyTorch-origin models used by Flameclyffe, STARWELL, DEEP, the Terra Aeterna wiki, Observer Atelier, and accessibility Lantern systems.

It is intentionally separate from the React/Vite applications.

## Authority boundary

Models may:

- create embeddings;
- produce experimental scores;
- rank candidate relationships;
- suggest labels or metadata;
- identify anomalies or duplicates;
- generate reviewable drafts;
- record explanations and uncertainty.

Models may not:

- write directly to canon records;
- publish records;
- alter consent or privacy settings;
- issue emergency decisions without deterministic confirmation paths;
- claim metaphysical, diagnostic, emotional, or relational truth.

All persisted model output belongs in review-only tables with model version, source snapshot, confidence, explanation, and reviewer state.

## Workspace map

```text
ml-lab/
├── pyproject.toml
├── src/flameclyffe_ml/
│   ├── privacy.py       # data classes and release rules
│   ├── provenance.py    # deterministic content and run hashes
│   └── synthetic/       # non-sensitive fixtures for early experiments
├── tests/
├── model_cards/
├── data_cards/
└── sql/                 # proposed Supabase ML boundary
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

The base install does not require PyTorch. Install the relevant optional group only for the experiment being run:

```bash
python -m pip install -e '.[torch,dev]'
python -m pip install -e '.[semantic,dev]'
python -m pip install -e '.[vision,dev]'
python -m pip install -e '.[audio,dev]'
```

This prevents a simple metadata or schema test from downloading a small moon made of wheel files.

## First planned experiments

1. Codex semantic-search benchmark using approved public or synthetic text.
2. DEEP Pattern Laboratory using synthetic channel windows and deterministic baselines.
3. Observer Atelier image-embedding benchmark using approved assets only.
4. Caption Lantern ASR benchmark using explicit test recordings.

## Required artefacts for every experiment

- model card;
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