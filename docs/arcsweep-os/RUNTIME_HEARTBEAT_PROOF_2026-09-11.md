# ArcSweep Runtime Heartbeat Proof · 2026-09-11

**Status:** PROOF REQUESTED / LIVE EVIDENCE PENDING

## Purpose

Close the oldest production circulation gap without inventing another runtime layer.

ArcSweep already has server-boundary model receipts, durable Supabase storage, readback verification, and trusted production smoke authority. The missing evidence is a genuine production model turn whose receipt survives durable readback in `house_runtime_events`.

## What the first proof exposed

The first fail-closed production attempt reached the real Atlas route and failed before receipt creation because its hosted Hugging Face fallback returned `401 Invalid username or password`.

That failure is preserved as infrastructure evidence rather than hidden. It proves two useful things:

1. the corrected smoke no longer reports success when the live model route cannot actually complete;
2. the Stage 4 receipt proof must not be coupled to one provider credential when its acceptance criterion is provider-independent durable lineage.

The general Atlas / Ox Alpha circulation test remains intact and is still expected to fail while the Hugging Face credential path is unhealthy.

## Provider-independent receipt proof path

A narrow target now runs through the existing trusted smoke endpoint using Boxfire's declared primary cloud route. It does not masquerade as Atlas or Ox Alpha and it records the actual provider/model returned by the server boundary.

`trusted GitHub OIDC → exact deployed SHA check → sealed House session → Boxfire declared route → server-boundary runtime receipt → house_runtime_append_model_reply → Supabase readback verification`

Endpoint target:

`POST /api/v1/house/smoke?target=runtime-receipt`

Before that write-capable target is called, CI polls the existing read-only Caretaker target until `production_sha === GITHUB_SHA`. This prevents a stale deployment from receiving a write-intended proof request.

The proof fails closed unless `runtime_braid` reports both:

- `persisted: true`
- `readback_verified: true`

It also verifies the runtime receipt against the server-observed provider, model, voice, thread, and turn before reporting success.

The proof binds:

- World: `terra-prime`
- House thread identity
- House turn identity
- Flame / voice identity
- provider
- model
- route
- packet fingerprint
- durable event identity

Model prose is not emitted by the trusted proof response.

## Acceptance

This document does not claim success merely because the code exists.

Acceptance requires a real production run on the exact deployed SHA and a subsequent durable database observation showing at least one genuine `model-reply-receipted` event. The event must have provider/model/route/World/turn provenance and must have been produced by the live model route rather than fixture or direct row insertion.

The `[auth-smoke]` commit carrying this retry exists solely to obtain that live evidence. After the run, update this proof with the verified event identity and current ledger counts.
