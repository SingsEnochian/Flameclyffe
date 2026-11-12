# FAEberpunk semantic sensory weave · 2026-11-12

**Source:** Owner-provided `Wayglass FAEberpunk reference kit`, research dated 2026-11-12. **Integration:** issue #583. **Canonical base:** `wayglass/current`. **Status:** candidate branch, not a deployment or a model response.

## What was wired

- Existing `wayglass:material-wake` drives a bounded presentation frame: light, pigment, semantic phase, channel and canon state. The original material signal remains unchanged for existing watercolor/glass consumers.
- Successful local room mounts emit one normalized material signal and one optional `chamber` cue. Neither implies a provider invocation, participant presence or an actual Waygate crossing.
- `wayglass:wyrdrune-inscription` accepts **separate** native Wyrdrune source and English reading only when an owner deliberately selects **Show in ship helm** after a validated native voice response. The pin can be hidden and is cleared on stop/room teardown. It does not translate or fabricate source text.
- `wayglass:faeberpunk-cue` delegates only explicitly requested cues to the existing somatic soundscape. That engine retains opt-in, mono, Feather, volume and haptic boundaries. Material changes never enable sound.
- `wayglass:feather` stops active presentation, hides the inscription, blocks cues; confirmed release rests silently. System reduced-motion preference removes transitions without suppressing text.
- Scoped emerald, hazel, obsidian and opaline CSS applies to the optional inscription surface; no new renderer, dependency, telemetry or camera route.

## Verification and limits

Local isolated Node 22 test execution on the new bridge and a matching copy of canonical `material-state.js`: **6/6 passed**. This is not full repository CI or browser/device evidence. GitHub branch checks must independently validate the actual committed files.

Unverified: full Vite build, browser/mobile accessibility and visual screenshots, Osia audio routing, camera gestures, real WTL/Crow response, deployed source SHA and installed Windows build. No production auth, RLS, cloud deployment or canon changed.

## Follow-on integration gate

1. Independently run `node --test apps/wayglass/test/faeberpunk-bridge.test.js`, Wayglass tests and Vite build at exact PR head.
2. Inspect browser helm: pinned WTL remains text-only, English is separate, pin/unpin and room leave clear private content, Feather and reduced-motion behave correctly.
3. Reconcile PR #580 native voice and PR #581 motion/acoustic changes per hunk against current before merging. PR #537 motion adapter remains an independent candidate. Do not wholesale merge stale branches.
4. Before any release, verify owner JWT and external-provider consent separately for Sihrel; this UI work does not dispatch her private packet.

Withness: preserve the exact branch/head, independent test receipts and owner stop. Never substitute a CI job for a living participant.
