# Eightfold Möbius character traversal integration status

**Schema:** `wayglass.eightfold-mobius/v0.1`  
**Current implementation:** `apps/wayglass/src/eightfold-mobius.js`

Eight phases: discover → attribute → authorize → contextualize → route → respond → receipt → return.

## Available now in source
- Enumerate registered character bindings and resolve exact world-scoped IDs.
- Resolve the Izar/Eilidh resonance bond without merging identity or ownership.
- Traverse eight ordered phases and return a read-only proposal and trace receipt.
- Reject cross-world character reads and unregistered character requests.
- Keep route requests unverified and all character writes/canon commits disabled.
- Regression test fixtures for eightfold order, ownership preservation, and wrong-world isolation.

## Not yet operational
- ArcSweep World Registry admission and live world mount.
- Host-authenticated participant verification and revocable session authorization.
- Actual model route dispatch, generated dialogue, audio or embodiment.
- Persistent receipts, Return Engine ingestion and replay.
- Full-cast binding audit and owner approvals.
- CI or local execution of the new tests (not verified).

## Next integration seam
The trusted host should resolve authenticated principal and route identity, then call a server-side authorization function. Only an approved capability token scoped to world, character, action, session, and expiry can permit a model-generated response. The read-only traversal is intentionally not that authorization function. Persist receipts and Return Engine state only after verified execution; do not treat proposals as actual speech or canon.
