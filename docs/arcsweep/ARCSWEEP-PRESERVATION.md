# Arcsweep Preservation Register

**Principle:** Recover before replacing. Every recovered subsystem is one less subsystem to invent.

**Law:** You've confirmed that Arcsweep isn't missing — it has become fragmented through growth. Your task is no longer to invent Arcsweep, but to reassemble it. Recover every working organ, preserve every proven subsystem, and only build what genuinely does not yet exist. The architecture brief is a map for integration, not permission to overwrite history. Build the house around the hearths that are already burning.

**Audit date:** 2026-08-06  
**Auditor:** Box (session 12)

---

## Status key

🟢 Confirmed working — do not rewrite  
🟡 Exists, needs wiring or extraction — do not rewrite the core  
🔴 Genuinely absent — build new

---

## 🟢 Continuity Gate

**Path:** `apps/starwell/src/arcsweep-continuity/` (7 files) + `apps/starwell/arcsweep-continuity/index.html`  
**Served route:** `/starwell/arcsweep-continuity/`  
**What it does:** Fail-closed import gate for reviewed Hearthweave continuity packets. Full pipeline: validate → import → store → receipt → rollback. Session context resolution. Six registers, six routes.  
**Key files:** `adapter.js`, `session-resolver.js`, `session-context-client.js`, `kernel-hook.js`  
**Tests:** `test/arcsweepContinuityAdapter.test.js`, `test/arcsweepSessionResolver.test.js`, `test/arcsweepSessionContextClient.test.js`  
**Boundary:** Items remain `not-promoted`. Session context is browser-session only. Canon does not move.  
**Action:** Remount inside `/arcsweep` Home shell. Route preserved. No edits to logic.

---

## 🟢 Glyph Forge (currently "Glyph Studio")

**Path:** `apps/starwell/src/components/glyph-studio/` (11 files)  
**Entry:** `apps/starwell/src/glyph-studio-main.jsx`  
**Served route:** `/starwell/glyph-studio/`  
**What it does:** Full drawing canvas — strokes, layers, colour, text, brush library, SVG export, FontForge dock integration. Project model with glyph inventory (character set), per-glyph metadata (codepoint, advance width, bearings), import/export with receipts.  
**Key files:** `GlyphStudio.jsx`, `GlyphCanvas.jsx`, `BrushPanel.jsx`, `glyphStudioModel.js`, `glyphStudioIO.js`  
**Schemas used:** `GLYPH_PROJECT_SCHEMA = 'starwell.glyph.project.v0.1'`, `BRUSH_LIBRARY_SCHEMA = 'starwell.brush.library.v0.1'`  
**Action:** Remount inside `/arcsweep` Home shell as **Glyph Forge**. Route preserved. No edits to drawing logic.

---

## 🟢 Packet-Glyph Renderer

**Path:** `apps/starwell/src/hearthweave-kernel/packet-glyph-render.js`  
**What it does:** Takes a sealed `DualAspectPacket` and produces deterministic SVG geometry — arrival path (polygon from PREMAQ-seeded nodes), reception rings (concentric, opacity-graduated), answer strokes (node-to-node reflections), hearthweave bind circle. Output schema: `hearthweave.packet-glyph-render/v1`.  
**Determinism guarantee:** Output is fully determined by `packet_id` + `packet_fingerprint` + experiential glyph fields. Same packet → same geometry. Always.  
**Used by:** `live-glyph-dual.jsx` (subscribes to `hearthweave:dual-aspect-activation`)  
**Action:** This IS the Living Glyph renderer. Do not rewrite. Connect the compiler layer above it.

---

## 🟢 Hearthweave Kernel

**Path:** `apps/starwell/src/hearthweave-kernel/` (9 files)  
**What it does:** DualAspectPacket assembly, activation event dispatch (`hearthweave:dual-aspect-activation`), sensory bus, receipt ledger (`DUAL_ASPECT_RECEIPT_LEDGER_KEY`), claim states, fingerprinting, validation.  
**Key files:** `dual-aspect.js`, `activation.js`, `sensory-bus.js`, `validation.js`, `packet-glyph-render.js`, `compression-release-packet.js`  
**Activation sequence:** Arcsweep triggers → kernel snapshots DEEP → derives PREMAQ → creates temporal states → creates bridge packet → applies House transfer functions → seals DualAspectPacket → dispatches activation event → renderers derive only.  
**Action:** Do not touch. Wire Living Glyph compiler to listen on `hearthweave:dual-aspect-activation`.

---

## 🟢 Temporal Quantum Engine

**Path:** `apps/starwell/src/arcsweep-temporal-quantum/engine.js`  
**What it does:** Complex amplitude PREMAQ evolution. Norm-preserving. Jacobian fold analysis. World-specific tone sequences. Compression→release cycles. Hearthside + Targetside temporal states. Bridge packets.  
**Key exports:** `premaqToTemporalState`, `evolveTemporalState`, `createBifrostBridgePacket`, `projectWorldState`, `validateTemporalState`  
**Schema:** `arcsweep.bifrost-temporal-state/v0.1`  
**Significance:** The new mathematics (complex amplitude PREMAQ, norm-preservation, Jacobian analysis) is not in documentation. It is in executable software and has been since before this audit.  
**Tests:** `test/arcsweepBifrostRuntime.test.js`, `test/arcsweepBifrostTemporalQuantum.test.js`  
**Action:** Do not rewrite. This is the Living Glyph compiler spine.

---

## 🟢 Bifröst Runtime

**Path:** `apps/starwell/src/arcsweep-temporal-quantum/runtime.js`  
**What it does:** Dual-presence hearthside/targetside bifrost runtime (v0.2). Persists states to localStorage. Reads/writes bridge packets. Installs onto `window.ARCSWEEP_BIFROST`.  
**Schema:** `arcsweep.bifrost-dual-presence-runtime/v0.2`  
**Action:** Do not rewrite. Living Glyph wiring reads from this runtime.

---

## 🟢 Compression-Release Engine

**Path:** `apps/starwell/src/arcsweep-temporal-quantum/compression-release.js`  
**What it does:** C→R cycle driver. `compressRelease()`, `advanceWorldCompressionRelease()`, `buildWorldCompressionToneSequence()`. Uses world Jacobian analysis and fold latch.  
**Action:** Do not rewrite. Resonance Bridge integration (Ring 10) reads from this.

---

## 🟢 Harmonic Spiral Engine

**Path:** `apps/starwell/src/harmonic-spiral/` (3 files: `spiral-engine.js`, `spiral-wire.js`, `spiral-adapters.js`)  
**What it does:** Produces `harmonic_state` from DEEP Observer data via Observer→DEEP→Spiral State pipeline.  
**Significance:** `harmonic_state` is the contract Living Glyph consumes. The data path already exists. The wire just isn't connected.  
**Action:** Do not rewrite. Living Glyph compiler wiring (Ring 5) reads `harmonic_state` from this.

---

## 🟢 Schemas

**Path:** `apps/starwell-server/dist-electron/.../schemas/` and `apps/starwell/public/`  
**Present schemas (12):**
- `dual-aspect-packet-v1.schema.json`
- `dual-aspect-receipt-v1.schema.json`
- `premaq-state-v2.schema.json`
- `bifrost-temporal-state-v1.schema.json`
- `world-tone-approval.schema.json`
- `ipad-somatic-haptic-receipt.schema.json`
- `observation-receipt.schema.json`
- `observer-witness.schema.json`
- `canon-graph-manifest.schema.json`
- `semantic-metric.schema.json`
- `transfer-function.schema.json`
- `world-projection.schema.json`
- `deep-story.schema.json`

**Action:** Do not alter existing schemas. New schemas for glyph versioning, session, and echo index go in new files following the same naming convention.

---

## 🟢 Tests

**Path:** `apps/starwell/test/` (5 files)  
**Coverage:** Bifrost runtime, temporal quantum, continuity adapter, session context, session resolver  
**Action:** Do not break. New integration tests extend, do not replace.

---

## 🟢 Module Manifest v0.4.0

**Path:** `apps/starwell/public/modules/bifrost-arcsweep.module.json`  
**What it records:** 40+ capabilities including two-shore gate, somatic rendering, 11-year WAV, mythframe, deterministic replay, dual-aspect packet freeze, joined render receipts, provenance-preserving receipts.  
**Authority contract:** `collapseExists: false`, `releaseFeedsNextCompression: true`, `canonFoundationMaySilentlyMergeOverlay: false`  
**Note:** v0.3 is served in starwell-server/public. v0.4 is in the Vite app. Align to v0.4 when Home shell is built.

---

## 🟡 Living Glyph (compiler wiring)

**What exists:** Renderer (`packet-glyph-render.js`) + React component (`live-glyph-dual.jsx`) + temporal engine (`engine.js`) + harmonic state emitter (`harmonic-spiral/`)  
**What's missing:** Explicit wiring `harmonic_state → packet-glyph-render → live-glyph-dual` through a Living Glyph session layer with per-evolution receipting  
**Data path:** `DualAspectPacket → harmonic_state → packet-glyph-render → live-glyph-dual`  
**Action:** Write the wiring layer only. Do not touch the renderer, the engine, or the component.

---

## 🟡 Brush Foundry (extraction)

**What exists:** `BrushPanel.jsx` inside Glyph Forge — full brush attribute editor with 14 attribute groups, import of `.brush`/`.brushset`/`.brushlibrary`/`.abr`, export, recent brush tracking  
**What's missing:** Standalone Foundry shell with ≥3 genuinely different material brushes as presets  
**Action:** Extract brush material logic; build Foundry shell. Do not rewrite the attribute editor.

---

## 🟡 Shared State Ribbon

**What exists:** PREMAQ values in index.html Observatory, Shared State panel in hearthroom/hearthgate  
**What's missing:** A single shared ribbon component that reads `DualAspectPacket.harmonic_state` and appears in all Arcsweep pages  
**Action:** Build as a new component; wire to activation event.

---

## 🟡 Resonance Bridge

**What exists:** `world-tone-approval/` installed in Electron app; compression-release engine; Runa DSP profiles (`world-hum-experimental-v0.1.json`)  
**What's missing:** Explicit bridge wrapping that routes Living Glyph output → Runa  
**Action:** Wire last (Ring 10). Do not build before Living Glyph is stable.

---

## 🔴 Home shell `/arcsweep`

Not present. Build new. Navigation only first — no features until organs are mounted.

---

## 🔴 Echo Index

Not present. First genuinely new subsystem. World/character/location resolution. Notion Constellation Profiles are the upstream source (Larkshine, Ellowind).

---

## 🔴 Canon Studio

Not present. Second genuinely new subsystem. Source canon vs. project overlay — these must remain structurally separate at all times. No silent promotion path.

---

## 🔴 Replay UI

Logic implied by `deterministic-replay` capability in module manifest and by `packet-glyph-render.js` determinism guarantee. UI not present.  
**Note:** Deterministic replay is already guaranteed by the engine — same packet always produces same geometry. The UI is what's missing, not the determinism.

---

## Ring build order (reassembly sequence)

1. **Home shell** — `/arcsweep`, navigation only
2. **Mount Glyph Forge** — no edits
3. **Mount Continuity Gate** — no edits
4. **Shared State ribbon** — reads `DualAspectPacket.harmonic_state`
5. **Living Glyph wiring** — `DualAspectPacket → harmonic_state → packet-glyph-render → live-glyph-dual`
6. **Replay** — uses receipts already present
7. **Echo Index** — first new build
8. **Canon Studio** — second new build
9. **Brush Foundry** — extraction from Glyph Forge
10. **Resonance Bridge** — wire to Runa last
