# Wayglass Toybox GitHub ingest v0.1

**Date:** 2026-10-10 / 2026-10-11 America/New_York  
**Purpose:** source research for optional sensory play inside Wayglass OS.  
**Implementation rule:** learn from public projects, preserve provenance, and only adapt code when licence terms are clear. Wayglass Toybox v0.1 is original implementation and does not copy third-party source.

## Product law

Toybox is not a diagnostic surface, behaviour score, treatment claim, or productivity enforcement system.

A toy may help someone occupy their hands, eyes, ears, sense of time, or spare attention. It is also allowed to exist simply because it is satisfying.

Sensory profiles are user-selected render envelopes:

- **Soft** — slower, rounder, lower density and lower output intensity.
- **Balanced** — moderate motion and response.
- **Sparkly** — crisp, bright, fast and highly reactive.

These are not ADHD/autism labels. The same toy remains available in every profile. Browser reduced-motion preference suppresses autonomous movement while preserving interactive response.

## GitHub quarry

### PavelDoGreat/WebGL-Fluid-Simulation

Repository: https://github.com/PavelDoGreat/WebGL-Fluid-Simulation  
Licence: MIT, verified in repository `LICENSE`.

Learn:
- pointer/touch energy can inject motion into a continuous visual field;
- GPU fluid motion can be intrinsically satisfying without goals;
- quality knobs should be separated from the interaction itself.

Wayglass candidate: **Fluid Glass**. Not included in v0.1; future WebGL drawer.

### liabru/matter-js

Repository: https://github.com/liabru/matter-js  
Licence: MIT, verified in repository `LICENSE`.

Learn:
- ball pools, soft bodies, Newton's cradle, stacks, cloth and gravity reversal make excellent tactile playground primitives;
- physics toys can share one engine while exposing very different sensory surfaces.

Wayglass candidates: **Orb Pile**, **Soft Chain**, **Reverse Gravity**, **Jewel Cradle**.

### tsparticles/tsparticles

Repository: https://github.com/tsparticles/tsparticles  
Licence: MIT, verified in repository `LICENSE`.

Learn:
- particle behaviour can be decomposed into engine + interaction + presets;
- attraction, repulsion, density and lifecycle should remain separately tunable.

Wayglass candidate: production-scale **Mote Herd** / particle drawer. v0.1 currently uses a tiny native Canvas implementation to avoid a new dependency.

### pineapplemachine/websand

Repository: https://github.com/pineapplemachine/websand  
Licence: zlib/libpng, verified in repository `license`.

Learn:
- direct painting plus local cellular simulation produces an excellent low-instruction sensory toy;
- materials can behave differently without requiring scores, levels or goals.

Wayglass candidate: **Star Sand**.

### samccone/fidgetspin.xyz

Repository: https://github.com/samccone/fidgetspin.xyz  
Licence: MIT, verified in `LICENSE.md`.

Learn:
- a single inertial gesture can be enough;
- a progressive web fidget should respond instantly and stay understandable without instruction.

Wayglass candidate: **Spin Jewel**.

### benjaminhunter773/haptic-fidget-app

Repository: https://github.com/benjaminhunter773/haptic-fidget-app  
Licence posture: README states MIT, but no root licence file was visible during this pass. Treat as behaviour reference only unless licence provenance is clarified.

Learn:
- several named haptic rhythms are more useful than a binary vibration toggle;
- vibration must remain explicit, user-started, and device-gated.

Wayglass v0.1: **Vibe Stone**, independently implemented with the browser vibration API.

### bradtraversy/ambient-sound-mixer

Repository: https://github.com/bradtraversy/ambient-sound-mixer  
Licence posture: no root licence file was found during this pass. Treat code and bundled audio as reference-only.

Learn:
- independent sound choices, saved preference, master intensity and a visible stop control form a good sensory-audio grammar;
- sound should remain local and opt-in.

Wayglass v0.1: **Sound Nest**, independently generated Web Audio hum/pink/brown noise. No source audio copied.

### refparo/silk

Repository: https://github.com/refparo/silk  
Licence posture: archived repository; no obvious root licence/readme found during this pass. Visual inspiration only.

Learn:
- mirrored gestural drawing can turn simple pointer movement into a rewarding visual loop.

Wayglass candidate: **Silk Loom**. Do not closely adapt source until licence provenance is clear.

### mrseth01/awesome-adhd

Repository: https://github.com/mrseth01/awesome-adhd  
Licence: CC0 for the curated repository text.

Use boundary:
- useful as a discovery index for tool ideas;
- health/diagnostic claims in linked materials are not automatically inherited as Wayglass claims;
- Toybox does not claim medical benefit.

## v0.1 playable drawer

Implemented without additional dependencies:

1. **Mote Herd** — attract/repel luminous particles.
2. **Ghost Trace** — draw fading light trails.
3. **Click Garden** — toggle jewel seeds; optional tiny haptic response.
4. **Vibe Stone** — explicit pulse/wave/heartbeat vibration patterns where supported.
5. **Sound Nest** — browser-generated hum, pink noise and brown noise; no microphone/autoplay.
6. **Time Puddle** — a visual chosen-time container with pause/reset and no performance score.

## Next drawer

Priority candidates:

1. **Fluid Glass** — WebGL fluid field.
2. **Star Sand** — falling-sand/cellular material play.
3. **Orb Pile** — Matter.js touch physics.
4. **Silk Loom** — original mirrored generative drawing informed by the interaction pattern, not unlicensed code.
5. **Spin Jewel** — inertial one-gesture fidget.
6. **Sound Bank Nest** — connect the Toybox to Wayglass/STARWELL sound-bank assets with explicit source/licence receipts.

## Accessibility and agency

- no autoplay;
- haptics and audio require explicit activation;
- all sensory output has an immediate stop path;
- reduced-motion preserves interaction while suppressing autonomous motion;
- toys are usable by pointer/touch and controls remain keyboard reachable;
- no camera, microphone, location or hidden telemetry;
- no streaks, achievements, rankings, task debt or shame language;
- sensory profiles belong to the user and never modify participant identity, memory, authority or PREMAQC readings.

**Toybox principle:** pleasure is a valid interface function.
