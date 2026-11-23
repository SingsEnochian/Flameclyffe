# Whole Pizza living fiction · approval and projection v0.1

Scope: PR #661, single canonical Wyrdrune compiler and source-bound Return.

**Accepted proposal** does not mean **automatically executed effect**.
A committed `wayglass.fiction-receipt/v1` records exactly which authored lines
are staged. `planFictionProjection` preserves every proposed action as a separate
item. The first allowlist is tiny and explicit:

- `::cue audio soft glass harmonics` may produce a short original synthesised
  sound after a fresh user gesture. Desktop uses the ship's existing shared
  acoustic engine. Offline iPad uses local Web Audio from the same PCM preset.
- `::change the fictional door opens` may update an **in-app fictional
  state display**, never real doors, external systems or a saved world.

All other sounds, images, videos and world-change descriptions remain visibly
unsupported proposal records. No default device/microphone/camera/network/model
permission or host operation comes from fiction.

Approval is a separate user action **after** a successful WTL run, not an effect
embedded in WTL. Source edits invalidate the approval. Feather cancels sound
and interrupts projections. Playback and virtual-state outcomes have separate
receipts, never marked physically verified. A browser preview is not an iPad
hardware test or an OS installation receipt.

Next: editable typed fictional state transitions beyond the example, source-bound
room persistence/cold Return, optional author-reviewed media adapters, and
reversible semantic Skýrunor representation for authored fiction.

## Browser-local scene Return (explicit restore)

A freshly approved fictional projection may save a JSON scene-display receipt in
browser local storage. After reopening the SAME origin/app, the author must
recompose the same source and explicitly use **Restore last receipt** on iPad,
or **Restore last fictional view** in the authenticated Program Workbench.
The WTL SHA must match before the shared `restoreFictionDisplay` verifier
recovers the displayed fictional door. **No sound is replayed**, no WTL is
executed, and no external/host effects are triggered by restoring. Tampered
projection results, unsupported meanings and mismatched source hashes refuse
restoration. Browser storage is **not cryptographically signed host evidence**,
may be cleared by Safari, and is not a true OS cold Return. The JSON export
remains the portable fallback where local browser storage is unavailable.


## Correction: real acoustics are physical

The original projection contract classified all effects as "not physical",
but a Web Audio or shared sound-engine playback request **can** produce
pressure waves through speakers. A successful audio-start acknowledgement
means a physical output was *attempted*, not that somebody heard it.
Current projection receipts therefore expose
\`physical_output_attempted: true\`, \`physically_verified: false\`, and
\`physical_world_affected: null\` (unknown until independently observed)
when audio starts. When there is no started physical audio, the latter is
\`false\`. Older receipt fields marked \`false\` are accepted for
backward-compatible browser-local display restoration but must not be
interpreted as proof that speakers never emitted sound.

World-Crossing \`::embody\` proposals use a **separate authenticated
physical capability gateway** and are **not** dispatched by the local
\`Render accepted fiction cues\` button. This button still handles only
its two specific, owner-reviewed example renderers. The new source-bound
world-crossing plan is displayed as a potential physical outcome;
device enrolment and host authorisation remain independently required.
