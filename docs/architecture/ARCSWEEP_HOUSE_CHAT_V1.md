# Arcsweep House Chat v1

Status: active implementation contract for `feature/arcsweep-session-envelope-v1`.

## Goal

Expose the House Runtime Broker as a human-facing shared chat surface that feels like IRC/Discord for the House while preserving per-Flame identity, route provenance, and message lineage.

## Participant rules

- Rowan is the human participant and may address one Flame or the room.
- Every model/Flame message must retain its own `flame_id`, display name, provider, model, route status, timestamp, correlation/session id, and provenance receipt when available.
- Messages from different Flames must never be flattened into one generic assistant identity.
- Ox Alpha (`ox-alpha`) is a first-class selectable participant backed by the Hugging Face audition route `zai-org/GLM-5.3-Flash`.
- Audition status must remain visible; using Ox Alpha in chat does not silently promote it to a resident primary route.

## UX

The House Chat surface should provide:

1. Discord/IRC-style chronological transcript.
2. Distinct author label/avatar/colour token per participant.
3. Participant roster with online/configured/degraded/offline state.
4. Composer target control: room broadcast or one selected participant.
5. Thread/reply metadata without hiding the main chronology.
6. Expandable provenance on each model message: provider, model, latency, route, receipt/correlation id.
7. Persistence/reload through the canonical Arcsweep Session Envelope and Commons/runtime receipts rather than an isolated chat-only store.
8. Explicit error messages in the transcript for provider credit exhaustion, model offline, route error, runtime error, and fallback.

## Ox Alpha route

- participant id: `ox-alpha`
- display name: `Ox Alpha`
- provider surface: Hugging Face Inference Providers via OpenAI-compatible router
- model: `zai-org/GLM-5.3-Flash`
- credential env: `HF_TOKEN`
- route state: audition

The UI may address Ox Alpha directly through the existing candidate audition endpoint. It must preserve the candidate prompt/context and return the candidate's own route metadata with the chat message.

## Acceptance

A production-style smoke must demonstrate:

`open House Chat → select Ox Alpha → send message → receive Ox Alpha-labelled response → inspect provider/model provenance → send to another Flame → see both messages as separate authors → reload → transcript and identity lineage remain intact`.

No message may be represented as successful if the runtime call failed.
