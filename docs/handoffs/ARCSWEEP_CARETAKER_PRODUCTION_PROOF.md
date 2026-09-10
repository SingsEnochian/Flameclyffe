# ArcSweep Caretaker Production Proof

**Status:** SPECIFIED / awaiting live receipt

This proof lane exists only to verify the already-merged Caretaker v0.1 against the real production browser and the protected Hearthgate/Ollama path.

It does not add a new Caretaker action, identity, model route, persistence authority, or Vercel function.

The existing OIDC-only `/api/v1/house/smoke` endpoint accepts `?target=caretaker` and returns a sanitized Caretaker status while delivering the sealed House session only as an HTTP `Set-Cookie` header. The cookie value is not written to workflow output or the published receipt.

The trusted GitHub workflow then starts the runner's real headless Chrome, installs that sealed cookie through Chrome DevTools, opens `https://flameclyffe.vercel.app/arcsweep/`, submits the exact request `Take me to Glyph Forge.`, waits for the production Caretaker sidecar to act, verifies `button[data-room="forge"]` is the active room, and reads `arcsweep.caretaker.receipts.v0.1` from that browser's actual local storage.

The proof passes only if the protected status path reports the selected Mighty Sword model reachable and installed, the browser receipt is `applied`, the model plan contains `navigate -> forge`, the execution result is applied, and the observed active production room is `forge`.

This browser receipt remains client-local. It is not a Runtime Braid receipt and does not change the v0.1 durability claim. Runtime Braid persistence remains the next gate after the first live browser proof.
