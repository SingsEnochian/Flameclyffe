# ArcSweep Runtime Heartbeat Proof · 2026-09-11

**Status:** PROOF REQUESTED / EVIDENCE PENDING

## Purpose

Close the oldest production circulation gap without inventing another runtime layer.

ArcSweep already has server-boundary model receipts, durable Supabase storage, readback verification, and trusted production smoke authority. The missing evidence is a genuine production model turn whose receipt survives durable readback in `house_runtime_events`.

## Proof path

`trusted GitHub OIDC → sealed House session → real Atlas model route → server-boundary runtime receipt → house_runtime_append_model_reply → Supabase readback verification`

The proof endpoint is:

`POST /api/v1/house/runtime-heartbeat`

It must fail closed unless the returned `runtime_braid` reports both:

- `persisted: true`
- `readback_verified: true`

The proof also binds and verifies:

- World: `terra-prime`
- House thread identity
- House turn identity
- Flame/voice identity: `atlas`
- provider
- model
- route
- packet fingerprint
- durable event identity

Model prose is not emitted by the proof endpoint.

## Acceptance

This document does not claim success merely because the code exists.

Acceptance requires a real production run on the exact deployed SHA and a subsequent durable database observation showing at least one genuine `model-reply-receipted` event. The event must have provider/model/route/World/turn provenance and must have been produced by the live model route rather than fixture or direct row insertion.

After the run, update this proof with the verified event identity and current ledger counts.
