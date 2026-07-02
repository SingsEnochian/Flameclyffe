# Hearthfire Surface Census — Pass 01

Status: initial census
Gate: `targeted_receipt_allowed`
Date: 2026-07-01

This file starts the Hearthfire census for Flameclyffe. It records what the repo appears to contain before any larger visual overhaul.

## Census sources checked

- Root README lists the main repo surfaces: `apps/starwell`, `apps/project-zero-companion`, `apps/sigil-activator`, and `sandbox/everos`.
- Root `package.json` lists Vite scripts for STARWELL, Project Zero Companion, Sigil Activator, Pocket Concordance Lens, and Everos helper scripts.
- `PROJECT_MAP.md` identifies `apps/starwell/` and `apps/starwell/src/main.jsx` as source-of-truth locations for the active STARWELL / Terra Aeterna observatory shell.
- The Pages workflow builds STARWELL and Pocket Concordance Lens, then rsyncs root static files into `_site` while excluding `apps`, `dist`, `node_modules`, and `sandbox`.
- Search results show multiple root/static HTML surfaces and a static DEEP Observer path.

## Current surface inventory

| Surface | Path / route evidence | Initial label | Notes |
| --- | --- | --- | --- |
| Hearthfire pilot | `/hearthfire/` | `built_partial` | New read-only pilot. Declares gate and visual receipts. Does not affect existing app surfaces. |
| STARWELL React Observatory | `apps/starwell/` and `starwell-react-lab` build route | `built_partial` | Active Vite/React surface. Source-of-truth map calls it the active observatory shell. Needs visual-state contract review before lightfield adoption. |
| DEEP Observer static surface | `starwell/deep-observer/` | `built_aligned_candidate` | Reference surface for truth-lit instrumentation. Now has a first visual-state receipt at `starwell/deep-observer/deep-observer.visual-state.json`. Still needs Pass 02 dependency orbit and Pass 04 observability review. |
| Project Zero Companion | `apps/project-zero-companion/` and `project-zero-companion.html` | `built_partial` | Bridge-bus / local-first companion surface. Should receive diagnostic-first lightfield treatment later. |
| Sigil Activator | `apps/sigil-activator/` and `sigil-activator-v2.html` | `built_partial` | Runa/Flameclyffe sigil surface. Needs contract review before any sound or activation changes. |
| Pocket Concordance Lens | `apps/pocket-concordance-lens/` and Pages aliases `concordance`, `pocket-lens`, `pocket-concordance`, `pocket` | `built_partial` | Built in Pages workflow. Needs route and cache/service-worker review. |
| Root static pages | `studio.html`, `shrine.html`, `drift.html`, `observer.html`, `atelier.html`, `rowan-backstage.html`, and related files | `legacy_active_candidate` | Likely live through Pages rsync. Each needs route ownership, active-caller, and archaeology review. |
| Everos sandbox | `sandbox/everos` | `restoration_scaffold_candidate` | Helper scripts excluded from Pages deployment. Needs runtime role review before any promotion. |

## First risk labels

- `legacy_active_candidate`: root static pages may still be publicly reachable after Pages assembly.
- `duplicate_visual_language_candidate`: standalone pages may contain their own palettes and motion rules.
- `contract_gap`: most current surfaces do not yet declare `surface_visual_state` or `surface_visual_receipt` records.
- `accessibility_gap_unknown`: reduced-motion and low-stim support must be checked per surface.

## First completed receipt

DEEP Observer now has a receipt, not a rewrite:

- `starwell/deep-observer/deep-observer.visual-state.json`
- `docs/hearthfire/05-deep-observer-visual-state-receipt.md`
- `contracts/surface_visual_receipt_v0_1.schema.json`

The DEEP Observer page also links to the receipt from its navigation.

## Next passes

1. Pass 02: Dependency orbit for DEEP Observer modules and STARWELL React Observatory.
2. Pass 03: Spine neighbours for root static pages and Pages aliases.
3. Pass 04: Observability review for each surface. How does each fail, and can Rowan see the failure?
4. Pass 05: Pollution review for duplicate HTML/CSS/backup/static experiments.
5. Pass 06: Role map for root static pages: live surface, legacy active, deprecated archaeology, or compost.
6. Pass 07: Readiness, not authorization.

## Recommendation

Do DEEP Observer Pass 02 next. Name its script/CSS dependency orbit and mark which modules are visual, sensory, packet/export, browser fallback, dev-console, and Resonance Bus layers.
