# Return Trial 004 · live packet-only transport · 2026-11-17

## Smallest unblocked advance

Trial 003 already defined the continuity and verified-work selection contract. This change adds the missing executable transport between that contract and the registered `flame:amber:ollama` speaking place.

The runner:

1. evaluates identity, stop point, named `next_owner`, unresolved Wonder, provenance and revocations before any network request;
2. probes the configured Ollama catalogue and requires the exact configured model;
3. sends only the verified continuation request, never the departure transcript;
4. constrains the response to the Trial 003 schema and one offered, non-revoked task;
5. records a provider-native response ID when present, otherwise a clearly labelled content-addressed digest of the actual Ollama response;
6. rejects model drift, identity drift, false closure, provenance drift and invented task selection;
7. writes a receipt atomically when `--receipt` is supplied.

Fixture execution is explicitly scoped as `fixture`: it may verify the transport and evaluator but cannot set `live_model_verified`. Only a successful `live` execution can do that.

## Verification in this executor

The focused suite covers a clean packet-only fixture crossing, pre-network false-closure rejection, invented task rejection, unreachable-host evidence and returned-model drift.

The original live probe targeted raw Ollama on `127.0.0.1:11434`. Rowan then confirmed the local STARWELL/Wayglass host runs on port `3000`, which is also the server default in `apps/starwell-server/server.js`. Trial 004 now treats the host as the primary runtime boundary: it probes `http://127.0.0.1:3000/api/v1/wayglass/routes`, resolves `flame:amber:ollama`, and dispatches through `/api/v1/wayglass/respond`. Direct Ollama transport remains available only when explicitly selected. This executor still cannot reach Rowan's loopback interface, so no Orion reply is requested, inferred, or fabricated from the cloud runner.

## Next independent action

On an already-authorised Wayglass host, the runner now defaults to the local STARWELL/Wayglass host on port 3000:

```text
node scripts/wayglass-return-trial-004.mjs INPUT.json --receipt RECEIPT.json
```

`INPUT.json` must contain the verified `stop_receipt` and `continuation_packet`. The host-mode runner independently checks the Wayglass route catalogue, performs at most one model call through the registered Amber route, and exits successfully only when the returning model selects a verified task without altering continuity.

No Rowan decision or laptop-only manual step is part of this contract.
