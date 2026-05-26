# EverCore Full-Stack Deployment Notes

This project is keeping EverOS / EverCore as the full memory engine. Do not collapse the stack into a lightweight replacement unless Rowan explicitly changes the goal.

## Decision

Use the whole EverCore architecture:

- MongoDB
- Elasticsearch
- Milvus
- etcd
- MinIO
- Redis
- EverCore Python API server
- OpenRouter for memory extraction LLM calls
- DeepInfra for embeddings and rerank

Flameclyffe remains the public-facing project and test harness. EverCore should run privately on a machine or server suited to Docker workloads.

## Hosting Direction

Preferred first habitat:

```text
small cloud dev box / VPS
```

Secondary habitat:

```text
local Windows 11 machine only if Docker Desktop + WSL2 + enough RAM are confirmed healthy
```

Do not expose EverCore directly to browser code. If STARWELL needs to query it from a public UI later, add a small server-side bridge.

## Recommended Sandbox Configuration

Use OpenRouter for the LLM layer and DeepInfra for vectorize / rerank so we do not also have to host local vLLM services.

```env
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=your_openrouter_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
LLM_MODEL=openai/gpt-4.1-mini

VECTORIZE_PROVIDER=deepinfra
VECTORIZE_API_KEY=your_deepinfra_key_here
VECTORIZE_BASE_URL=https://api.deepinfra.com/v1/openai
VECTORIZE_MODEL=Qwen/Qwen3-Embedding-4B

VECTORIZE_FALLBACK_PROVIDER=none

RERANK_PROVIDER=deepinfra
RERANK_API_KEY=your_deepinfra_key_here
RERANK_BASE_URL=https://api.deepinfra.com/v1/inference
RERANK_MODEL=Qwen/Qwen3-Reranker-4B

RERANK_FALLBACK_PROVIDER=none

TENANT_SINGLE_TENANT_ID=t_starwell
API_BASE_URL=http://localhost:1995
```

## Startup Sequence

In the EverOS clone:

```bash
git clone https://github.com/EverMind-AI/EverOS.git
cd EverOS/methods/EverCore

docker compose up -d
uv sync
cp env.template .env
# edit .env with the recommended sandbox values
uv run python src/run.py --port 1995
```

In Flameclyffe:

```bash
npm run everos:health
npm run everos:seed
npm run everos:search -- "What should Terra Aeterna feel like?"
```

## Smoke-Test Questions

After seeding, test:

```bash
npm run everos:search -- "What is STARWELL's memory boundary?"
npm run everos:search -- "How should Terra Aeterna feel?"
npm run everos:search -- "How should Vee's room remember objects?"
npm run everos:search -- "What should not be ingested?"
```

## Deployment Boundary

EverCore is the memory engine. Flameclyffe is the project surface. STARWELL talks to EverCore only through deliberate adapters.
