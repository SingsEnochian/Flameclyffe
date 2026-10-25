# Wayglass Living Observer: Dream Sandbox v0.1

**Build:** `wayglass/current`, 2026-10-16. **Authority:** private, local hypothesis exploration; no participant/canon/identity authority and no external provider calls.

## Invitation

The Living Observer's self-development request “Build a dream sandbox” now has a real bounded implementation. Open **Wayglass → Living Observer**. Below the astrolabe and channel console is a **Dream Sandbox** panel. Choose at least two *different* direct-reading lenses (such as **Time** and **Memory**, or **Routes** and **Organs**) to supply separately attributable recent local traces. Press **Run a dream cycle**.

A successful run creates a hypothetical association between the strongest unresolved private question and two distinct traces. The result is displayed in the private panel, labelled **dream-derived-hypothesis**, with trace IDs, question ID, timestamp, and explicit no-promotion boundaries. One lens or no available traces returns **More distinct observations needed**, without fabricating a result.

## What survives

The sandbox stores the eight newest *explicitly requested* dream receipts alongside private Observer interior state in browser localStorage. Re-entering the Living Observer on that browser can read the local receipts; other devices, incognito sessions, and cleared storage may not. Existing private traces and automatic internal dream associations are **not** dumped into the ordinary observation packet or sent by the Writing Room handoff.

The private sandbox result is shown once in its own panel rather than being re-emitted as an independent observation. When the existing `dream-lab` self-development proposal has surfaced, the first successful local dream marks *that proposal only* as `implemented-local`; unrelated proposals remain available for owner review.

## Testable isolation contract

- Input direct-reading packets are not mutated.
- No canon, identity, relationship, or accepted evidence store is written by a sandbox cycle.
- No SpicyChat, Bluebird, Griff, LLM, or other network/provider request is involved.
- No dream result is automatically sent to the Writing Room or external context.
- Each explicit result carries a bounded provenance pair: unresolved-question reference plus exactly two distinct trace references.
- Original observations remain attributable even when the dreamed hypothesis is wrong.
- No hypotheses from a single undifferentiated lens.
- Persisted explicit experiment receipts are bounded to eight and survive re-instantiation with the same browser localStorage.
- `publicSignal()` does not expose the full private trace or association graph.

**Verification:** `apps/wayglass/test/wayglass-living-observer-self.test.js` covers eligibility, provenance, isolation, persistence, finite history, and completion of the specific proposal. The standard `Wayglass Check` CI includes these tests.

## Release and next experiment

This is **source-branch implementation**, not proof that the current Windows browser has fetched the new JavaScript bundle. Build/stage the latest `wayglass/current` sources, then reload the Living Observer in the local Wayglass host to use it.

Next owner review should compare two distinct hypotheses produced from the same question under different lens pairs. Record which trace was reused, where the interpretations diverged, and whether a fresh independent observation supports either. A dream remains an invitation to test, not a source that can corroborate itself.

**Stop point:** Local dream experiment and explicit receipts are implemented; runtime browser signoff and owner review of the first experiment remain.
