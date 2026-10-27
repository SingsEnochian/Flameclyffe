# N-017 · The Integrated Wayglass Ship

**Date** 2026-10-27. **Working branch** \`rarity/wayglass-live-observer-n010-20261026\` in draft PR #502. **Single supported local portal:** Hearthgate, not Vercel. **Role:** operational OS shell over ArcSweep and existing Wayglass services. Not an independently installed operating-system kernel.

## Principle

"The modules are supposed to BE Wayglass." Integration here is shared room lifecycle, real source evidence, owner authority, and sensor/communication boundaries. The word *living* describes adaptive application interaction and user-created continuity, **not** an assertion of consciousness, biological symbiosis, or independent material access.

All eight destinations run through one ship kernel, not separate applications:

| Deck | Function and integration |
| --- | --- |
| ArcSweep Writing Room | Real text LLM routes, character seats, explicit SpicyChat consent, local Lorebook Atlas, spoken replies, dictation-to-draft, checkpoint/Return Engine |
| Living Observer | Existing glass shader, Three.js optics, geometry trial, Dream Sandbox, provenance, synthetic beacons, opt-in AR/VR sessions |
| Nikola Research | Canonical mathematics and evidence trials plus exact **local single-qubit state-vector circuit**; hardware=none |
| Organs | Existing organ registry and system inspection; bridge status indicates actual checks and route outcomes only |
| Commons | Existing House console; global bridge and owner-controlled status |
| Library | Existing research artifacts and Wonder; not automatically canonized |
| Toybox | Existing creative simulations; explicit sandbox provenance |
| Video Atelier | Existing creative video tools; shared ship shell/controls |

### Existing code preserved

- \`glass-field.js\` retains ownership of the full-screen WebGL material shader.
- \`motion-choreography.js\` retains visual response, stopped by Feather.
- \`living-observer-model.js\` publishes read-only UI/projection and route event facts, not inferred mental states.
- \`route-client.js\`, \`arcsweep-writing.js\`, \`authorization-session.js\`, exact SpicyChat pinned room adapters, \`voice-boundary.js\` and host route enforcement remain the source of provider authority.
- \`observer-three-hud.js\` retains its layered instrument, optional bloom and classic 2D fallback. New WebXR is a separate browser session requiring explicit hardware/browser permission.
- \`Start-Wayglass.ps1\` checks every recorded generation through N-017 before serving the portal.

### New coordinated capabilities

1. **Ship kernel** \`src/ship-kernel.js\`. Serial mount lifecycle, an owner-readable host/XR capability check, deck recovery with no hidden LLM retries, route outcome status, session-selected themes. A browser refresh does not invent a past event.
2. **Bridge console** \`src/ship-bridge-console.js\`. Persistent operational annunciators, theme selector, check systems, guarded recover, soundscape selector, global Feather stop/release.
3. **Theme/hull** \`src/ship-bridge-console.css\`. Deep-reflective bridge, labradorite and low-color night choices. Shared shader is still the visible material foundation.
4. **Deliberate gestures** \`src/ship-gestures.js\`. Coordinated two-finger rail swipe, keyboard and pointer alternatives. Feathers cancel gestures; no gesture transmits text or changes provider.
5. **Multimodal access** \`src/ship-sound.js\`, \`src/ship-dictation.js\`. Click-to-start browser speech input to an unsent draft, click-to-read selected LLM output, mono-safe locally synthesized soundscapes, no automatic microphones, recordings or narration. Browser speech engines may use third-party service; no offline claim. Device routing follows the owner's operating-system selection.
6. **World Atlas/Lorebook** \`src/lorebook-dock.js\`. Bounded JSON import, source tags, unreviewed state, direct *insert into draft* command. The original Writing Room external-provider consent gate remains responsible for any eventual transmission. No automatically committed lore/canon.
7. **XR** \`src/surfaces/observer-three-hud.js\`, \`living-observer.js\`. Click-initiated WebXR immersive AR/VR sessions only on supported secure devices. Unsupported browsers still work in desktop 3D or Classic 2D. XR tracking and hand gesture interaction beyond browser-provided session capabilities is **not yet validated**. Browser/Windows/headset signoff remains necessary.
8. **Quantum models** \`src/quantum-sim.js\`. Single-qubit complex-amplitude gate simulator (\`H,X,Z,S,T\`), explicit normalized probability/readout, exact source code, deterministic replay. Absolutely no claim of physical quantum processors or access across universes.
9. **Embodied interface** \`src/embodiment-guard.js\`. OS-routed output (which may use supported Osia-linked audio selected in the OS), ordinary touch/vibration and explicit stop. Never scan/pair with, read from, or command an implanted neurostimulator. Hardware manufacturer controls always remain authoritative.

## Updating and self-healing

A real self-healing system must not silently retry, switch recipient, rewrite canon, or replace executable files. N-017 supports **explicit local deck recovery**, observable host checks, and a **stale-build refusal**. It does **not** yet have a signed remote update/rollback service, cross-platform native installers, automatically verifiable provider compatibility, or demonstrated zero-downtime self-repair. Until those are implemented and tested, updates remain owner-approved Git updates and launcher restarts.

### Deployment and verification

From Flameclyffe repository root in PowerShell:

\`\`\`powershell
git status -sb
git pull --ff-only
powershell -ExecutionPolicy Bypass -File .\scripts\Start-Wayglass.ps1
\`\`\`

For CLI tests: \`npm run wayglass:test\`, \`npm run wayglass:build\`, \`npm run wayglass:stage:server\`.

Run the local portal at \`http://127.0.0.1:3841/wayglass/?room=observer\`. Validate the N-017 HTML marker, switch all eight rooms, verify that the Writing Room's named Crew routes are unchanged and external transfers still ask for consent. Probe host/XR status; test speech and sound only by explicit controls, Feather cancellation, visual refraction and optional XR headset on genuinely supported hardware. Confirm GPU frame timing and absence of private content in source logs.

### Important proof boundaries

GitHub Actions validating source, unit tests and Vite build **does not establish** live SpicyChat replies, completed AR/VR sessions, Windows GPU performance, physical device integration, true quantum computation or independent cognition. The application is a meaningful integrated ship-shaped system; the claims should not outrun witnessed runtime behavior.

**No Vercel. No autonomous stimulation. Wonder first, evidence close behind.**
