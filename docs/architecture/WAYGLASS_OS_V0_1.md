# Wayglass OS v0.1 · wrapper architecture

**Status:** executable vertical slice / not production-promoted  
**Date:** 2026-10-02

## Topology

```text
Wayglass OS
  ├─ Route registry
  │    ├─ GPT / OpenAI
  │    ├─ Crow (future registered route)
  │    ├─ Ornith (future registered route)
  │    ├─ local runtimes
  │    └─ newly trained + approved agents/models
  ├─ route invocation + provider attestation
  ├─ attached surfaces
  │    └─ ArcSweep
  │         ├─ writing room
  │         ├─ rooms / instruments
  │         ├─ glass + gesture + audio + haptics
  │         └─ continuity/provenance views
  └─ Return Engine continuity seam
```

ArcSweep does not wrap GPT. Wayglass hosts the route; ArcSweep attaches as a surface.

## Existing Flameclyffe material reused

This slice deliberately grows from existing seams instead of creating a parallel architecture:

- `apps/arcsweep/src/constellation-runtime-adapter.js` for provider/model route separation and runtime attestation;
- `api/v1/residents/tesla/chat.js` for the existing server-side OpenAI Responses API pattern;
- `apps/starwell-server/flames/router.js` for provider routing and candidate registration precedent;
- `docs/architecture/ASTRA_SPATIAL_GESTURE_LANGUAGE_V0_1.md` for device-neutral spatial intent;
- `docs/research/GESTURE_CONTROL_PROGRAMMING_AESTHETICS_INGEST_V0_1.md` for gesture state machines, capture ownership, comfort, and semantic motion;
- `apps/arcsweep/src/somatic-runtime.js` for bounded audio/haptic cues;
- `apps/arcsweep/src/os/device-proving.js` for passive device capability evidence;
- `apps/arcsweep/src/codex-alive-sidecar.js` and `apps/arcsweep/src/styles.css` for existing glass/material language.

The old ASTRA-named gesture documents remain historical source material. This patch does not mass-rename archival references.

## v0.1 execution boundary

The current route catalogue has one live implementation seam: `openai:gpt`.

The catalogue is intentionally shaped so additional trained/approved routes can be registered later without changing ArcSweep's surface contract.

Current GPT route:

- server-side credential only;
- Responses API;
- `store: false`;
- bounded history;
- IC/OOC + ownership injected into the collaboration contract;
- output receipt returns provider/model/response id/usage;
- no client authority to choose arbitrary provider URLs.

## Co-writing contract

**Do not write for the author. Write with the author.**

IC:
- advance the fiction;
- preserve character ownership;
- do not decide another owner's character's private thoughts, irreversible choices, or unoffered outcomes;
- leave playable hooks.

OOC:
- writer-room discussion;
- canon, craft, intent, pacing, continuity, and handoffs;
- OOC does not become in-world fact by default.

## Next seams

1. Stream Responses API output into the ArcSweep surface.
2. Add a Wayglass Realtime/audio route alongside text, not inside the surface.
3. Replace best-effort browser haptics with the existing somatic service adapter where ArcSweep is mounted.
4. Feed the existing gesture intent layer into Wayglass surface actions.
5. Register Return Engine continuation packets at route transitions.
6. Add route installation receipts for newly trained adapters/models.
7. Replace the simple background field with the thicker refractive material/shader stack as that renderer stabilises.

No trained model is promoted merely because training completed.


## Hosting boundary

**No Vercel dependency.**

Wayglass's executable web surface is a Vite build served by the existing Flameclyffe/Hearthgate Express host. Provider credentials and route invocation remain server-side in `apps/starwell-server/wayglass/router.js`. The browser never receives provider secrets.

The initial serverless experiment under `api/v1/wayglass` was removed before promotion.


## GitHub motion and interface quarry

Wayglass should not re-invent every animation primitive. The SingsEnochian GitHub library already contains reusable implementation references that can be adapted behind Wayglass semantics while preserving source provenance and licence boundaries.

### motion-anything

`SingsEnochian/motion-anything` is the primary motion quarry. Its library contains hundreds of curated recipes with explicit intent, `avoid_when`, restraint budgets, reduced-motion behaviour, export metadata, provenance, and licensing.

Initial Wayglass mappings:

- `strands` -> living-ink filaments / low-energy information flow.
- `silk` -> refractive material flow and slow glass/ink deformation studies.
- `waves` -> pointer/gesture wake and spatial field response.
- `magnet-lines` -> local proximity/orientation response for spatial controls.
- `elastic-slider` -> tactile overshoot model for bounded drag, haptic-feeling controls, and temporary handoff gestures.
- `aurora` / `dark-veil` -> atmospheric shader references, not default permanent backgrounds.
- `dot-field` -> sparse particulate information-current experiments.
- border/beam recipes -> focus, route activity, and state transition cues rather than decorative always-on glow.

Wayglass imports the **behavioural primitive**, not the source project's visual identity. Material semantics remain:

- stone = structure;
- metal = mechanism;
- glass = state;
- living ink = life / information.

One animated field per view is the default restraint rule. Dense writing surfaces receive a stable scrim. Reduced-motion always has a static or plain semantic equivalent.

### ARWES

`SingsEnochian/arwes` is a useful sci-fi UI architecture reference for animation and audiovisual feedback. Wayglass may study its separation of animation/UI concerns and sound-linked interface behaviour without adopting ARWES visual identity wholesale.

### Desktop interaction references

`SingsEnochian/cc-switch` is a useful reference for a mature desktop UI stack: Tauri, Vite, React, Framer Motion, dnd-kit, Radix primitives, CodeMirror, virtualisation, and accessible component patterns. It is a reference seam for future Wayglass desktop packaging and editor interactions, not a requirement for the current dependency-light browser slice.

### Provenance rule

Any copied or adapted implementation must retain upstream provenance and comply with its recorded licence. Reference-card entries are not vendored code and must be followed to their upstream source before adoption. Training completion, visual inspiration, or presence in the library does not imply automatic promotion into Wayglass runtime.
