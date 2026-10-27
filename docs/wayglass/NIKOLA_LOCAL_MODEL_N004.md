# Nikola N-004: local model comparison through Wayglass

Status: draft, stacked on N-003 / PR #494; not deployed, not merged, no live Ollama execution claimed.

## Purpose

The ship now has a bounded, user-invoked model experiment through its existing authenticated Wayglass route client. Nikola is a research organ, not a new identity or provider. The Crow (or configured local model) remains an independent substrate; no identity, memory, canon, or permissions are altered.

## User path

Open the native Wayglass OS with `?room=nikola`. Inspect the synthetic oscillator fixture (frequency proportional to sqrt(stiffness/mass)). Choose forward or reverse context order. Click **Run 3-turn local Ollama trial**. The Observatory first checks the existing host route catalogue for an explicitly local, configured `local:ollama` route. If missing, refuse with no model POST. When present, three independent model requests are sent using the existing authenticated same-origin `/api/v1/wayglass/respond` path.

- Plain: question and competing explanations.
- Evidence: declared priors, likelihoods, and attributed synthetic sources.
- Amplitude: adds an explicitly *formal* chosen-angle/dephasing readout, not a measurement of belief or physical quantum state.

Each turn has a fresh session ID, empty history, fixed `maxOutputTokens=500`, fixed synthetic question, and no external-provider consent. The UI reports ephemeral answers, SHA-256 prompt/answer fingerprints, host-reported provider/model, and simple mechanical rubric features. Reported provider names are not independent attestations. The rubric is a heuristic, NOT held-out proof or evidence of improvement. Models are not trained or reweighted.

## Safeguards

- The trial function accepts no arbitrary uploaded manuscript, other-reality record, or private participant memory. It constructs its contexts exclusively from `mechanicsFixture()`.
- No SpicyChat, managed LLM, HTTP external URL, account credential, Supabase insert, canon mutation, release or training call.
- The route checker requires `route_id === 'local:ollama'`, `configured !== false` and `capabilities.local === true`. The host still owns route auth and may reject.
- A click is required to start. Feather aborts the browser fetch and prevents remaining turns. Leaving the surface also aborts. **The host or Ollama may continue computing after the browser disconnects; server-side cancel acknowledgement is not established.**
- Any rejected, empty, mismatched, or oversized reply stops the sweep and preserves only completed local results.
- Local test mocks confirm the request contract, not live execution or source identity.
- Test order can be reversed, allowing a small order-effect check, but does not constitute statistical inference.

## Acceptance checks

1. `node --test apps/wayglass/test/nikola-trials.test.js` and `npm run wayglass:test` pass on the PR head.
2. `npm run wayglass:build` passes with the imported surface.
3. In a browser connected to the actual Windows Wayglass host, verify `?room=nikola`, route preflight, Feather stop, response display and no network calls without the user clicking.
4. With a local Ollama model installed, click once and inspect the actual `/api/v1/wayglass/respond` requests and host receipts: exactly three independent responses, correctly pinned to `local:ollama`, with no provider substitution. No test uses private manuscripts.
5. Repeat with reversed context order; store human-reviewed observations separately from mechanistic rubric scores before making any claims of model benefit.
6. Independently verify the provider/runtime behind the host if physical model identity matters; response metadata alone is insufficient.

## Host framing confound

The existing Wayglass host currently uses a co-writing system instruction for the shared respond route. The N-004 client explicitly sets OOC, scientific-experiment intent, but this does not remove the inherited host-level instruction. It is a useful transport and qualitative smoke, **not** a controlled model-reasoning benchmark until a reviewed, separately authorised scientific host prompt contract exists. Preserve that confound in any interpretation of results.

## Remaining boundaries

The UI has not received a live browser/device signoff. No inference is known to have occurred in the user’s Windows environment. This is one public educational fixture, not an independently validated benchmark. Meaningful evidence requires a larger held-out test suite, counterbalanced runs and independent grading. A durable private receipt/continuity store and Math Spine ingestion should be proposed separately after this read-only seam is proven.

**Wayglass remains the ship. Nikola is the instrument. Wonder First.**
