# Wayglass N-016 · Liquid Optical OS and LLM integration

Implementation location: draft [PR #502](https://github.com/SingsEnochian/Flameclyffe/pull/502), local Hearthgate deployment. No Vercel dependency or extra NPM package.

## Intent and visual provenance

The owner supplied a liquid-glass material study (thick beveled edge, cyan/violet/rose iridescence, internal reflection), then approved a cinematic **Wayglass Living Observer cockpit mockup**. The image is a **design reference, not implemented application behavior**. Its example values, status labels, synthetic feeds, charts, fictional toggles, and version information are **NOT** treated as actual sensor, model, or OS capabilities. The project now implements the visual language in native CSS and locally modeled Three.js, leaving the original application services authoritative.

## What was changed

1. **OS-wide materials:** `apps/wayglass/src/liquid-optical-materials.css` is imported after the base, authorization and shared-hull styles in `apps/wayglass/src/main.js`. Source-bound eight-room navigation gets layered deep-blue frosted glass, bright bevels, subtle iridescent edges, legible focus and restrained actuation. The styles apply to already mounted Wayglass surfaces, not a standalone design preview.
2. **LLM Writing Room:** Actual model route controls, IC/OOC/wonder controls, thread, composer, status and session/continuity receipt panels receive the same liquid optical materials. No fake assistant message, claimed connection, or unconsented transfer.
3. **Living Observer physical optic:** `apps/wayglass/src/surfaces/liquid-optics-geometry.js` authors one transparent, bevel-extruded crystal plate with `MeshPhysicalMaterial` refraction/clearcoat/iridescence settings plus six intentionally synthetic closed filament paths. These are inserted into the existing Three.js HUD, inheriting the Observer's animation loop, pause, low-stim and reduced-motion lifecycle. Failure to construct ornamentation cannot prevent original 2D Observer or model routing.
4. **Three functional mission cards:** `apps/wayglass/src/surfaces/observer-mission-dock.js` mounts beneath the Observer. Research Studio selects its existing **Invariant Trial** lens, Dream Sandbox scrolls and focuses its private hypothesis instrument, and Provenance scrolls and focuses the evidence-trace region. Explicit clicks only; the cards don't trigger remote models, proofs, canon updates or external messages.
5. **Stale-release prevention:** an independent N-016 HTML stamp is required by the Windows `Start-Wayglass.ps1` Hearthgate build staging gate.

## Boundaries

- This is not an import of pixel-perfect mockup code, and no image-to-canvas fake UI is layered over working controls. The image's apparent "Live" data are not a real observation feed.
- Pointer and keyboard actions stay associated with actual controls. The WebGL canvas remains `aria-hidden` and non-interactive.
- User setting Low Stim, Feather or reduced motion must leave the optical model static. Offscreen or unavailable WebGL should not block 2D fallback.
- Privacy/authentication, SpicyChat character pins, Wayglass identity authority and explicit outbound consent are not changed by a visual redesign.
- Physical GPU rendering, mobile readability, material preference and Windows/browser frame times require an owner-side visual signoff. GitHub CI alone cannot prove it.

## Verification

Run `npm run wayglass:test`, `npm run wayglass:build`, and `npm run wayglass:stage:server` (CI executes these and the N-016 gate). Then locally restart Hearthgate with `powershell -ExecutionPolicy Bypass -File .\scripts\Start-Wayglass.ps1` from the repository root and inspect `http://127.0.0.1:3841/wayglass/?room=observer`.

Check: actual 3D bevel and internal filaments, Research button selects Invariant Trial, Sandbox/Provenance actions focus correct sections without side effects, Writing Room route picker still carries exact selected provider, Feather and Low Stim stop the synthetic filaments, 2D fallback works. Inspect GPU and readability against the reference image; don't assume web materials create true ray-traced optics.
