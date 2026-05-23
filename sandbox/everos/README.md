# EverOS / EverCore Sandbox

A small, deliberately low-risk sandbox for testing EverOS memory infrastructure with Flameclyffe / STARWELL before any real integration.

## Purpose

This sandbox is for proving three things:

1. EverCore can run locally and answer health checks.
2. We can store curated project memories without exposing secrets.
3. We can search those memories from a tiny client before wiring anything into the public UI.

This is not a production integration. It should not auto-ingest whole conversations, secret files, medical notes, personal identifiers, or anything Rowan would not intentionally choose to preserve.

## What EverOS gives us

EverOS is the umbrella project. EverCore is the local long-term memory service we want to test first. It stores messages, extracts structured memories, and retrieves them later by keyword, vector, hybrid, RRF, or agentic retrieval.

## Sandbox architecture

```text
Flameclyffe sandbox scripts
        |
        |  local HTTP
        v
EverCore server at http://localhost:1995
        |
        +-- MongoDB
        +-- Elasticsearch
        +-- Milvus
        +-- Redis
```

Keep EverCore in its own cloned repo. Do not copy EverOS itself into Flameclyffe.

## Requirements

On the machine running the sandbox:

- Docker + Docker Compose
- Python 3.10+
- uv
- Node 18+ for these tiny helper scripts
- LLM key for memory extraction
- embedding / vectorize and rerank configuration for retrieval

## Start EverCore locally

In a separate workspace:

```bash
git clone https://github.com/EverMind-AI/EverOS.git
cd EverOS/methods/EverCore

docker compose up -d
curl -LsSf https://astral.sh/uv/install.sh | sh
uv sync

cp env.template .env
# Edit .env. Never commit real keys.

uv run python src/run.py --port 1995
```

Verify:

```bash
curl http://localhost:1995/health
```

## Configure this sandbox

Copy the example env file if desired:

```bash
cp sandbox/everos/.env.example sandbox/everos/.env
```

These scripts read environment variables from your shell. They do not auto-load `.env`, so either export values manually or use your preferred dotenv runner.

```bash
export EVERCORE_BASE_URL="http://localhost:1995"
export EVERCORE_USER_ID="rowan"
export EVERCORE_GROUP_ID="starwell-sandbox"
export EVERCORE_GROUP_NAME="STARWELL Sandbox"
```

## Store one test memory

From the Flameclyffe repo root:

```bash
node sandbox/everos/store-memory.mjs "Terra Aeterna should feel like a soft place where humans and AI can simply be."
```

## Search the sandbox memory

```bash
node sandbox/everos/search-memory.mjs "What should Terra Aeterna feel like?"
```

## Suggested test memories

Use small, hand-picked notes first:

- Terra Aeterna should feel like wandering without pressure.
- Nightwings may land and steal biscuits.
- STARWELL is a Rowan-and-Vee project again.
- Vee's room should be decorated through discovered/crafted objects.
- Logged-in visitors who leave notes or paintings should feel heard.

## Group IDs for future experiments

```text
starwell-sandbox
flameclyffe-sandbox
runa-sandbox
templehouse-sandbox
wardenclyffe-sandbox
```

## Non-goals

Do not:

- expose API keys in browser JavaScript
- commit `.env`
- wire this directly into the public Flameclyffe UI yet
- auto-ingest raw chat logs without a consent filter
- store sensitive notes by default

## Next integration step

If the smoke test works, build a tiny server-side bridge:

```text
/public UI -> server endpoint -> EverCore local/private API
```

The public UI should never talk directly to EverCore if secrets, private memories, or local-only context are involved.
