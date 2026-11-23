# WAYGLASS-LAW-FOCUS-001 · Focus Router and Return

**Adopted by Rowan:** 23 November 2026. **Integration status:** candidate in PR #661; not canonical or deployed until verified and reviewed.

**Authority:** One Ship Directive and [mission #583](https://github.com/SingsEnochian/Flameclyffe/issues/583). This Law governs engineering prerequisites; the existing #583 Focus Router is the one work queue. It does not replace any participant's consent, voice, or freedom to explore.

## The Law

**Wonder may branch freely; implementation must converge.**

Every new idea is welcome and preserved. An idea by itself does not authorise a new repository, PR, duplicate engine, autonomous code modification or deployment.

Before implementing, delegating engineering, opening a source PR, or reconciling code, the accountable builder MUST:
1. **Capture** Rowan's intended outcome, source and unresolved questions in #583 or an existing owned candidate. Never require Rowan to file or sort ideas manually.
2. **Compare** the canonical `wayglass/current` head, #583, current #661 train and related open source candidates. Look for duplicate organs, contracts, files and consent boundaries.
3. **Classify** work NOW / NEXT / PARKED / BLOCKED. Only owner-authorised NOW work may become implementation. Everything else stays discoverable, not discarded.
4. **Consolidate** changes in the existing #661 integration train by default. An independent PR needs a genuine separate review boundary and explicit owner-accepted exception recorded against #583/#661. Preserve originals and avoid blind whole-branch merges.
5. **Verify** relevant exact-SHA tests, negative cases, and impacts before claiming a result. Group coherent changes into checkpoints; reserve expensive OS/image/release builds for meaningful checkpoints. Do not weaken tests or erase failed receipts.
6. **Return** with Built / Verified / Held, rollback, named next owner, unresolved blockers and the next specific action. Leave a stable Return marker so progress does not depend on Rowan remembering what was happening.

## Mechanical prerequisite

Every implementation or workflow change must have a same-PR `CHANGE_IMPACT.json` entry declaring `focus_router`: law ID, NOW classification, #583 mission, #661 train, existing-train routing, concrete duplicate review, owner outcome, finish line and Return marker. The existing One Ship CI validator rejects missing declarations, implementation classified as parked/blocked/next, second-train routing, and missing completion or Return records.

This gate checks that a decision was documented, not that its claims have been independently verified. Human review, actual build results, and branch protection are separate acceptance evidence.

Feather, revocation, consent and explicit owner release decisions are higher-priority stop conditions. Do not auto-merge, force-push, close evidence PRs, cancel consequential workflows, alter credentials or promote production under this Law. Independent exploratory thought does not require CI permission.

**Division of labour:** Rowan brings the sparks. Wayglass builders maintain the map. Never turn curiosity into clerical homework.

**Mnemonic:** Capture → Compare → Classify → Consolidate → Verify → Return.

**Withness:** Built. Verified. Held.
