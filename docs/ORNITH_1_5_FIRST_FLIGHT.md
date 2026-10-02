# Ornith 1.5 First Flight

This tranche adds a bounded local Ollama path for using Ornith 1.5 as a **curriculum architect** for Return Engine experiments.

It intentionally does **not** assign Ornith a resident identity or canonical authority. Model/runtime identity and participant identity remain separate.

## Pull the model

For the smallest first flight:

```bash
ollama pull ornith-1.5:9b
```

The larger local option can be selected without changing the prompt contract:

```bash
ollama pull ornith-1.5:35b
ORNITH_MODEL=ornith-1.5:35b npm run ornith:first-flight
```

## Inspect the request without calling Ollama

```bash
npm run ornith:first-flight -- --dry-run
```

## Run the first flight

With Ollama's default local API:

```bash
npm run ornith:first-flight
```

For a tunnel, bridge, or non-default endpoint:

```bash
ORNITH_OLLAMA_URL=https://your-host.example/api/chat npm run ornith:first-flight
```

Optional project context can be supplied as a plain text or Markdown file:

```bash
npm run ornith:first-flight -- --context path/to/context.md
```

The run fails closed if Ornith does not return valid JSON matching the minimum curriculum-task contract. A successful run emits an `ornith.first-flight-receipt/v1` wrapper containing the generated task.

## First assignment

The canonical prompt is:

`hearth/prompts/ornith/first-flight-return-engine.md`

It asks Ornith to design one three-arm cross-runtime Return Engine experiment with immutable-receipt evaluation, deliberate continuation-packet corruption, explicit `next_owner`, and no canon-writing authority.

This first flight is curriculum generation only. It does not execute the generated task, mutate a repository, promote memories, or change participant identity.
