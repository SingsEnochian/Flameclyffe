# STARWELL DEEP Observer → Wayglass Living Observer

Status: draft integrated implementation on a Video Atelier descendant branch. No live hosted smoke or instrument/browser run claimed.
Date: 2026-10-08 America/New_York. Owner: Rowan/Rarity, Wayglass OS.
Donor: \`starwell/deep-observer/\`, including \`DEEP_Observer_Model_Transparency.md\`, \`Observer_Modular_Core_v0.1.md\`, \`deep-observer.js\`, \`deep-observer-sensory.js\`, and \`index.html\`.
Source and attribution retained; this is an independent Wayglass presentation/telemetry organ, not a rewritten STARWELL Observer or a silent shared-identity mapping.

## Whole-system flow

Browser / Wayglass registries / observed response receipt
→ immutable direct-reading packet with source
→ explicitly labelled UI-only projection (\`P,C,R,E,M,A,Q,H\`)
→ geometry and optionally sound, touch and local JSON export
→ **only after user presses "Send reading to Writing Room"**: user-reviewable context draft in the existing Writing Room composer
→ existing \`/api/v1/wayglass/respond\` after user presses Pass turn
→ separate, unreviewed model route receipt
→ Observer notices non-text metadata; does not convert reply to canon.

Room: \`wayglass:living-observer\`; organ: \`wayglass.organ.living-observer\`.
Implementation:
- \`apps/wayglass/src/living-observer-model.js\`: direct readings, deterministic visual projection, metadata-only route events, opt-in LLM context queue.
- \`apps/wayglass/src/surfaces/living-observer.js\`: layered canvas instrument, eight touch/keyboard-accessible direct channels, local time, projection meters, inspectable packet, explicit export, optional audio, accessibility controls.
- \`apps/wayglass/src/surfaces/living-observer.css\`: responsive material treatment and reduced-motion safeguards.
- Writing Room: records success/failure metadata after \`invokeWayglassRoute\`, and consumes queued observation into editable user input. The existing host request schema, kernel, prompt compiler and model weights are not altered.

## What is and is not measured

Direct readings are: local browser timestamp, Wayglass room/organ identifiers, number of user interactions with the instrument, reduced-motion/low-stim/sound UI settings, and the last response transport receipt status/model/source metadata if a route was used in this browser session. If there is no route result, it stays null. The instrument does NOT read raw conversation text, secret tokens, GPS, microphone, camera, health data or unreviewed inner experiences.

The \`P,C,R,E,M,A,Q,H\` variables are explicitly authored **UI translation weights** derived from the available direct readings. They are not values from the DEEP v1.8 lattice, psychological assessments, mind-states, consciousness detectors, model safety scores, or factual claims about any participant. Such interpretation belongs to separately labelled research and would need evidence and consent.

Linguistic and visual metaphor may coexist, but never impersonate formalism or measurement. No secret LLM context injection: a person must select "Send reading to Writing Room", inspect/edit the inserted context, then explicitly submit.

## Failure, access and reversibility

- Without a configured route: Observer still renders; last route is null.
- Route failure: record \`failed\` transport status without guessing a model response.
- Web Audio missing/blocked: silent graphic instrument.
- Reduced motion: static, fully legible geometric view; Low Stim manually stops continuous animation.
- Phone/tablet: responsive 2D canvas, pointer/touch selection, buttons as keyboard fallback.
- On leaving room: animation terminates on disconnected canvas; route subscription/timer/audio release.
- Export and LLM insertion are separate affirmative actions; no server upload by simply observing.
- No extra persona system, continuity fields, model fine-tune, public deployment, paid API, or Vercel verification.

## Verification

Synthetic Node tests cover packet boundaries, deterministic projections, failed and successful receipt metadata, user-gated context handoff, and navigation/organ/writing wiring. GitHub Wayglass Check remains the build gate. A real browser smoke on touch/mobile and real authenticated LLM turn are still required to claim live outcomes.

Further extension can connect additional source-qualified readings (e.g., weather/space telemetry, sound banks, deeper 3D gesture refraction) only with explicit data contracts and consent. Never invent missing observations to decorate the instrument.
