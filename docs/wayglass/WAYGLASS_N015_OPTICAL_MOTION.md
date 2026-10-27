# Wayglass N-015 · Three.js optical-motion pass

Scope: Working code committed in PR #502, pending owner Windows/WebGL visual verification. Local Hearthgate staging only, **not** Vercel. No new npm dependency; the existing `three` package supplies every imported rendering primitive.

## Actual GitHub animation sources and provenance

Source project: [mrdoob/three.js](https://github.com/mrdoob/three.js), MIT-licensed. The following are upstream source components imported from the installed version, not copied or modified in this repo:

- [CatmullRomCurve3](https://github.com/mrdoob/three.js/blob/master/src/extras/curves/CatmullRomCurve3.js): the three closed, smooth procedural beacon paths.
- [MathUtils](https://github.com/mrdoob/three.js/blob/master/src/math/MathUtils.js): bounded delta-time heading damping.
- [EffectComposer](https://github.com/mrdoob/three.js/blob/master/examples/jsm/postprocessing/EffectComposer.js), [RenderPass](https://github.com/mrdoob/three.js/blob/master/examples/jsm/postprocessing/RenderPass.js), [UnrealBloomPass](https://github.com/mrdoob/three.js/blob/master/examples/jsm/postprocessing/UnrealBloomPass.js), and [OutputPass](https://github.com/mrdoob/three.js/blob/master/examples/jsm/postprocessing/OutputPass.js): strictly optional GPU glow after a direct user click.

We use the official primitives to author an original Wayglass composition, rather than silently copying unlicensed website animations. The historical Fold Harbour names in prior chats inform the motif, not a claimed import of those source files, which are not attached here.

## Interaction behaviour

- Spatial mode now includes **three local optical beacons** travelling independent closed paths, lit against physical clearcoat glass and gold rings. They are synthetic visualisations, not physical orbital detection, live docking evidence, or actual Bluebird/Vethrlauf/Griff transport.
- **Glow · Off** by default. Enabling it uses a lazy dynamic import of Three.js postprocessing. Only WebGL2-capable clients without reduced-motion preference can opt in. On unsupported clients the normal Three/2D fallback remains available.
- The existing Observer animation frame owns the docking rig. No separate animation loop or external texture request. Frame delta is clamped and main optics rendering remains capped near 35 FPS.
- **Feather** cancels both the Observer animation and the background Wayglass glass-field shader/pointer choreography. **Low Stim** pauses the rig and CSS scan. Reduced motion prevents automatic rig movement. A held Observer resets the background-only global stop on room teardown but cannot automatically re-enable sound/haptics.
- **Optics · Classic** still provides the original 2D instrument and all its direct-reading controls. No provider turn occurs from changing visual settings.
- Keyboard users can traverse the deck navigation with ArrowLeft/ArrowRight/Home/End; only Enter/Space activates a route. Crew remains a separate explicit menu with distinct pinned rooms.
- HUD improvements increase legibility and space for the instrument, with responsive layout on smaller screens and a non-interactive optical overlay.

## Evidence boundary / acceptance checks

CI must pass `wayglass:test`, host-route synthetic smoke, `wayglass:build`, `wayglass:stage:server`, and verify the N-015 stage marker. These do not prove a Windows GPU/browser visual result.

Browser signoff on owner's Windows laptop:
1. Open `http://127.0.0.1:3841/wayglass/?room=observer` from Hearthgate after stopping old port-3841 process and running the checked launcher.
2. See three moving optical points and N-015's `Glow · Off` control. Click Glow to assess optional bloom and watch CPU/GPU load. It must be reversible and should not conceal sensor labels.
3. Activate **Low Stim** and verify zero movement in the docking scene and CSS scan. Disable only when wanted.
4. Activate **Feather** and verify the entire glass field stops, including background shader. It must not send a model message, restart audio or silently grant a route.
5. Switch **Optics · Classic**, check node hit targets and labels, return to Spatial, change rooms via keyboard and return without stale WebGL contexts.
6. Verify absence of console errors, UI overlap, contradictory receipts, and excessive GPU use. If bloom's compositing breaks transparency, turn it off and preserve the direct renderer. Capture screenshots before making any browser-runtime claims.

The probe remains synthetic geometry. The Observer's P/C/R/E/M/A/Q/H are explicitly named UI mapping variables, never measured AI interiority. Live Crew replies and Wayglass host connection remain separate proof boundaries.
