# Wayglass · FAEberpunk living ship UI/UX pass

Status: implemented in PR #618 as an incremental, reviewable interface pass; not merged or owner-only cloud deployed.

## Primary source contracts

- Rowan's 2026-11-05 `Wayglass_Astra_Handoff_COMPLETE_v2.md` (owner-supplied Library handoff): Faeberpunk/Cyberpunk means living refractive glass, spatial consoles, functional holographic layers and dynamic sacred geometry; Universal Codex and Wyrdrune are canonical names. This source is a design directive, not proof of code deployment.

- `docs/architecture/WAYGLASS_OS_V0_1.md`: stone = structure, metal = mechanism, glass = state, living ink = life/information; Wayglass identity is not the renderer; AR and touch are capability-negotiated; Return requires provenance.
- `docs/reference/inspiration-ledger.md`: named external CodePen references and the explicit rule to adapt mechanics and mood, not copy demos. Preserve original links and creator credit.
- `apps/wayglass/src/styles.css`: pre-existing mineral palette, labradorite angle-fire, black-glass optical mass, living watercolour and semantic motion choreography.
- `apps/wayglass/src/motion-choreography.js`: already owns semantic arrivals and reduced-motion / Feather behavior. Do not duplicate its renderer.
- `apps/wayglass/src/glass-field.js`: existing refractive background, not replaced.
- `apps/wayglass/src/ship-deck-navigation.js`: authoritative room groups; the new loci are quick passages into already registered rooms, not invented worlds.
- `apps/wayglass/src/surfaces/living-watercolor.js`: original entryway and creative body, remains default.
- `apps/wayglass/src/surfaces/mythience-crossing.js`: working Wyrdrune membrane simulation with receipts and carried lineage.

## Inspiration provenance and adaptation

| Source | Original reference | Wayglass adaptation | Not claimed |
|---|---|---|---|
| Liquid Glass Wiki Skin, Margarita-the-solid | https://codepen.io/Margarita-the-solid/pen/NPRPBjd | semantic opaline laminate, clear typography, transparency fallback | copied skin, full 3D liquid simulation |
| Tactile Controls, Pedro Ondiviela | https://codepen.io/Pedro-Ondiviela/pen/emzdMKj | weighted active and focus states, 44px+ controls | copied control library |
| Holographic Particle Morphing, Techartist/VoXelo | https://codepen.io/VoXelo/pen/emBZVzJ | receipt-aware state changes, restrained holographic material cues | WebGPU particle morphing |
| Gesture Neural Universe, Techartist/VoXelo | https://codepen.io/VoXelo/pen/yyYJNRg | consent-free pointer/touch/Pencil/keyboard interaction, optional future camera interface | camera gesture recognition, MediaPipe hand tracking |
| AirControl Floating Screens, Nurjamol-Xoliqulova | https://codepen.io/Nurjamol-Xoliqulova/pen/JoRdaGg | functional floating ship map with semantic destinations | unsupported free-floating AR panels |
| Wayglass five loci | Wayglass Writing Room design: Door, Identity, Worktable, Wonder Window, Return Marker | Door → Living Watercolour; Identity → Organs; Codex → Writing Room; Wonder → Mythience; Return → Journey | claim that a room button is a Waygate |

## Implemented interaction contract

1. The Living Watercolour remains the default entrance. The ship helm now has five direct, keyboard-focusable passages to actual registered rooms, with `aria-current=page` reflecting the active destination.
2. The existing ship map and its search remain available, as do the rest of the organ surfaces. Locus navigation is a shortcut, not a replacement registry.
3. The helm's Feather control broadcasts the existing Wayglass stop event; Mythience aborts pending requests and stops its optional sensory output. Release remains an explicit separate act, not automatic navigation.
4. Responsive layout keeps all five passages available on narrow screens. Text, focus and disabled states remain visible without motion, colour or translucency.
5. Mythience's interactive membrane responds to pointer/Pencil/touch and keyboard; visuals distinguish preview parameters from actual Wyrdrune receipts. No automatic sound, haptics, camera access or canon promotion.
6. The glass and opal layers are CSS material semantics over the existing renderer, not a new engine or a claim of agent presence.

## Acceptance and limitations

- Unit tests: five-locus mapping and registry filtering, membrane mapping, opt-in sensory, shared in-session journey. Existing Wayglass CI build and browser gates remain authoritative.
- Device acceptance still required: iPad Safari landscape/portrait, VoiceOver, Pencil, reduced-motion, high-contrast, keyboard focus after navigation, Feather while a Wyrdrune request is in flight.
- Cloudflare Access owner-only deployment is a separate boundary requiring user account sign-in. GitHub Pages is a static preview, not an authenticated full Wayglass runtime.
- Future optional work: genuine hand tracking with explicit camera consent, spatial AR anchoring, GPU effects and cross-device persisted Return. These are not silently implied by CSS.
