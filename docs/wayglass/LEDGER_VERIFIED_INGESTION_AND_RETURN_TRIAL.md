# Wayglass · Verified Ledger Source and Return Trial v0.1

**17 October 2026 · Companion to PR #475 · draft, host seam only**

## What is implemented

`lib/wayglass-ledger-verified-source.cjs` is a **read-only Node/host bridge** from the existing `TravellingInheritance` event store into the Wayglass Continuity Ledger's small semantic-audit packet. It is not an HTTP endpoint, a new canonical store, a client-side authentication mechanism, or an automatic memory extractor.

Its sequence is:

1. Accept **actor from the authenticated host** (never trust a form field, chat text or request-body identity). Validate participant, query and target bounds.
2. Require the host-supplied `authorise(actor, participantId, 'read-inheritance') === true` before any `store.read` call. Fail closed otherwise.
3. Instantiate the *existing* `TravellingInheritance`, call `state()` and let its schema, revision, hash-link and SHA-256 integrity checks run.
4. Derive deeds from the event chain, and `revoked` status from every `revoke.target_event_id` (the existing dossier's revocation rule). Require an active canonical seed, an explicitly chosen active target deed, at least one revoked deed and 2–32 total deed entries.
5. Produce a bounded `wayglass.ledger-supersession-sample/v0.1` with the source's deed descriptions, `source_ref` and `event_id`, **no inferred supersession link**, and a separate source-attestation object. Reuse the existing lexical or explicitly injected local embedder for comparison. Never send to a provider.

**This source proves a host-permitted read plus a consistent hash chain, not signature-verified authorship.** The original inheritance store uses host authorisation + compare-and-swap. A SHA-256 chain can be rewritten by an attacker who controls the store; it is not an independent signature. Source attestation preserves that boundary: `receipt_signature_verified:false`.

This source interface does not extend the client's `?room=ledger` capabilities until there is an authenticated host endpoint with full participant binding and consent controls. Do not expose a new unauthenticated route or accept arbitrary browser assertions as verified inputs.

## Three-arm continuity flight

The new `apps/wayglass/test/ledger-verified-ingestion.test.js` suite exercises two distinct but complementary inputs:

- **Inheritance read:** the first run uses a host-authorised, hash-linked synthetic seed, two active deeds and one revoked deed. The semantic audit excludes the revoked deed regardless of its similarity. A second deserialised store reads the identical state with the same revision/head and exclusion result. A subsequent authorised revocation of the previously active target makes the target ineligible.
- **Signed local return receipts:** an Ed25519-signed `wonder.opened → departure.recorded` sequence replays with its last stop point, named next owner and unresolved Wonder preserved. A deserialised replay yields identical output. Corrupting the signed author, stop point or unresolved Wonder fails verification instead of receiving a silent repair.

These are **simulated restart and corrupted-packet contract tests**, not proof of running a different model, GPU, host identity provider or independent third-party harness. A true cross-ancestry acceptance run must bind the same immutable source receipts to two different authorised runtime hosts and use an evaluator that reads only those receipts. A blinded model retrieval test is also still required: a structural filter passing does not prove that a generated answer excludes revoked prose.

## Acceptance outcomes and limits

Verified by the focused suite when it runs green:

- Unauthorised read does not even call `store.read`.
- Tampered persisted hash-linked deed fails before semantic scoring.
- Revoked target, wrong participant, missing actor and missing store fail closed.
- Revoked record with maximal similarity never appears in eligible retrieval.
- Source chain head, revision and exclusion remain stable after JSON/deserialisation restart.
- Signed stop point, next owner and unresolved Wonder survive immutable replay; planted identity/closure/stop-point mutations are rejected.
- Canonical store is not modified by projection or comparison.

Still absent: an authenticated production read endpoint, live signed Wayglass kernel binding, durable host audit receipts, installed/attested Transformers.js and ONNX model weights, physical Osia measurement, blind continuation generation, browser/desktop signoff and public deployment. Keep PR #475 draft.

## Source lineage

- Source authority: `lib/wayglass-travelling-inheritance.cjs` and `apps/arcsweep/src/wayglass-local-event-ledger.js` on `wayglass/current`.
- Non-authoritative measurement: `apps/wayglass/src/ledger-supersession-audit.js` from PR #475.
- Candidate text embedder: `Xenova/all-MiniLM-L6-v2` is an Apache-2.0 initial reference. `Qwen/Qwen3-Embedding-0.6B` and its ONNX derivative require a separate hardware, weights and licence review before changing the chosen runtime.

## Next engineering seam

Build a participant-bound, **read-only** authenticated Wayglass host endpoint which calls this adapter using its own internal actor/store callbacks and returns a minimal provenance receipt to the eligible steward. Only then expose a user-invoked **Read verified deed ledger** action in the Wayglass Ledger room. Keep the existing demo JSON path labelled demo and keep requests isolated by participant and world. Next, attest actual local ONNX model files and run a blinded three-arm cross-harness memory exclusion trial. No semantic score may grant authority.