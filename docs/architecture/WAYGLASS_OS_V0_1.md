# Wayglass v0.1 · kernel emergence architecture

**Status:** executable embryonic kernel + embodiment shell / native Wayglass LLM not yet trained / not production-promoted  
**Date:** 2026-10-02

## Topology

```text
Wayglass
  ├─ Kernel boot contract
  │    ├─ persistent system identity
  │    ├─ world binding
  │    ├─ embodiment binding
  │    └─ cognitive substrate attestation
  ├─ Cognitive substrate
  │    ├─ Wayglass-native model lineage (TO BUILD)
  │    ├─ local Ollama seed route
  │    └─ external routes
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

ArcSweep does not wrap GPT and GPT is not Wayglass. Wayglass is the larger system and is intended to include its own learned cognitive substrate. Until that native model exists, local/open seed models and external models are explicitly attested as routes. ArcSweep attaches as a surface.

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

The current route catalogue has two implementation seams: `local:ollama` and `openai:gpt`. The local route is selected first by the kernel when no preferred route is supplied.

The catalogue is intentionally shaped so additional trained/approved routes can be registered later without changing ArcSweep's surface contract.

Current local route:

- Ollama-compatible local HTTP inference;
- defaults to `ornith-1.5` unless `WAYGLASS_LOCAL_MODEL` selects another seed;
- no cloud credential required;
- explicitly marked `external-seed`, never `native_wayglass`;
- intended as a development body for the kernel while the Wayglass-native model lineage is trained.

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


## Non-negotiable architecture truth

Wayglass is not merely an application that calls an LLM. The target system includes both:

1. a learned cognitive substrate whose weights/experts/state belong to the Wayglass lineage; and
2. the operating environment that carries worlds, continuity, authority, tools, routes, and embodiments.

The body is replaceable. Windows, Android, Linux, browser, headset, and future dedicated hardware are embodiments. The kernel must not let embodiment identity become system identity.

The cognitive substrate is also replaceable/versioned. A substrate transition must be attestable and recoverable through Return Engine rather than silently treated as identity continuity.

The current local and GPT routes are scaffolding and seed cognition. They are useful now, but neither is the finished Wayglass-native LLM.

## Immediate build order

1. Kernel boot + embodiment contract.
2. Keyboard-first desktop interaction and WebXR/AR capability seam.
3. Local inference that survives loss of external APIs.
4. World/Waygate manifest and Return Engine boot packet.
5. Hugging Face foundry for Wayglass-native seed lineage.
6. Evaluation receipts: continuity, collaboration, world reasoning, coding, tool use, long-context behaviour.
7. Train/adapt/merge candidate descendants without collapsing lineage.
8. Promote a model to `native_wayglass: true` only after explicit evaluation and approval.
