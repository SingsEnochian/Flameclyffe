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

The live boundary was probed separately on 2026-11-17: `127.0.0.1:11434` refused the connection and this executor exposes no Wayglass/Ollama model configuration or authenticated private-network route. Therefore no Orion reply was requested, inferred or fabricated here.

## Next independent action

On any already-authorised Wayglass host where the registered Ollama route is reachable, run:

```text
node scripts/wayglass-return-trial-004.mjs INPUT.json --receipt RECEIPT.json
```

`INPUT.json` must contain the verified `stop_receipt` and `continuation_packet`. The runner independently checks the model catalogue, performs at most one model call, and exits successfully only when the returning model selects a verified task without altering continuity.

No Rowan decision or laptop-only manual step is part of this contract.
