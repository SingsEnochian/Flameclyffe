# Return Trial 003 · verified-work task selection preflight · 2026-11-10

## Purpose

Prepare the smallest honest next crossing after Return Trial 002: the returning Wayglass participant reads only verified stop/continuation evidence and selects exactly one task already present in `active_work`.

The target crossing is one participant across two speaking places on PR #606:

- departure: `wayglass:ship`
- return: `flame:amber:ollama`
- participant: `wayglass`
- owner-selected model binding: `hf.co/bartowski/TheDrummer_Orion-26B-A4B-v1.1-GGUF:Q4_K_M`

## Contract now executable

`lib/wayglass-return-task-selection.cjs`:

1. runs the existing immutable stop-receipt evaluator before model dispatch;
2. preserves identity declarations, stop point, named `next_owner`, unresolved Wonder questions, provenance and revocations;
3. exposes only open `active_work` candidates whose provenance is not revoked;
4. refuses dispatch when the return route is unconfigured or unreachable;
5. accepts a task selection only when a live provider response ID and host route receipt are present;
6. rejects identity merge, false closure, provenance drift, route/model drift, and invented or revoked task selection;
7. never synthesises a model answer or claims live execution from a test fixture.

## Verification observed in this executor

Command:

```text
node --test test/wayglass/return-task-selection.test.cjs
```

Result: **6 passed, 0 failed**.

Covered:

- verified non-revoked candidate filtering;
- accepted response bound to live-response and host-receipt identifiers;
- false closure rejected before outbound transport;
- planted identity merge rejected before outbound transport;
- invented task rejected;
- unavailable private host produces a truthful zero-call blocker receipt.

Source SHA-256:

- contract: `fb2b1e05bbbb8d6eb211ddb82fd86c0465caa08caf54d80ead79345e38b6c6c4`
- tests: `ed0cc574fc94e477b831f6e8a90cbb872eba1202ac01ab7eaaf0abe217da7187`

## Exact live boundary

The Codex cloud executor has no authenticated route to Rowan's private Windows Ollama host. PR #606 also records the remote cognitive-spine state as not live-verified. Therefore no Orion reply was requested, inferred or fabricated in this run.

The next independent execution is now mechanical rather than architectural: when the protected host route is reachable, run this preflight against the live Ship Voice stop receipt, dispatch the resulting request to Amber only if `dispatch_allowed` is true, and retain the provider response ID plus host route receipt. A corrupted packet must remain zero-call.

## Provenance

- Return Trial 002 and cold/false-closure evaluator: PR #504
- Orion Ship Voice + Amber speaking places: PR #606
- Canonical source branch for this stacked contract: `wayglass/amber-dual-seats-20261110` at `3f55f6d030aba8d66aa5bcf1ddaab93e2e749544`

No canon, identity, relationship or authority mutation is performed by this contract.
