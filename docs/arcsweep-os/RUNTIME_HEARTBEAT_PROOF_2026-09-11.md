# ArcSweep Runtime Heartbeat Proof · 2026-09-11

**Status:** PROOF REQUESTED / LIVE EVIDENCE PENDING

## Purpose

Close the oldest production circulation gap without inventing another runtime layer.

ArcSweep already has server-boundary model receipts, durable Supabase storage, readback verification, and trusted production smoke authority. The missing evidence is a genuine production model turn whose receipt survives durable readback in `house_runtime_events`.

## Proof path

`trusted GitHub OIDC → sealed House session → existing production circulation smoke → real Atlas / Ox Alpha model routes → server-boundary runtime receipts → house_runtime_append_model_reply → Supabase readback verification`

The proof runs through the existing trusted circulation endpoint:

`POST /api/v1/house/smoke`

The production smoke now supplies explicit House thread/turn identity to both real model calls and fails closed unless each returned `runtime_braid` reports both:

- `persisted: true`
- `readback_verified: true`

It also verifies the runtime receipt against the server-observed provider, model, voice, thread, and turn before the smoke can report success.

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

Acceptance requires a real production smoke on the exact deployed SHA and a subsequent durable database observation showing at least one genuine `model-reply-receipted` event. The event must have provider/model/route/World/turn provenance and must have been produced by the live model route rather than fixture or direct row insertion.

The `[auth-smoke]` commit carrying this proof request exists solely to obtain that live evidence. After the run, update this proof with the verified event identity and current ledger counts.
