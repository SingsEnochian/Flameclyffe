# ArcSweep Live Brush Relational Runtime v1

**Status:** PROTOTYPE DESIGN / MAGIC BOOK SUBSYSTEM  
**Parent:** `ARCSWEEP_MAGIC_BOOK_PROTOTYPE_V1.md`  
**Scope:** Glyph Forge / Brush Foundry / Runa / Observer / Navigator  
**Principle:** A brush is a live instrument, not a passive settings object.

## 1. Why this belongs in the Magic Book spine

Glyph Forge already has a substantial brush definition surface, Apple Pencil parameters, materials, stroke-path controls, grain, taper, wet mix, colour dynamics, rendering and preview settings. The current interaction model, however, treats most of those values as configuration rather than as a continuous sensory relationship among hand, Pencil, brush, mark, sound, haptic response, House context and Observer.

For ArcSweep, that separation is wrong.

The information is not only the saved brush object. The information is the relation among:

`brush state ↔ hand/stylus state ↔ rendered mark ↔ sound ↔ haptic/spatial response ↔ participant response ↔ model interpretation ↔ Observer receipt`

The live relation must exist in the runtime before it can be learned, replayed, compared, or studied by REI/Mythience.

## 2. Current implementation gap

The existing Brush Studio editing path updates brush JSON correctly, but its preview is only a styled static mark. The brush shelf preview receives preview colour and preview size. The Brush Studio live pad receives preview colour and a width derived from `properties.size`.

That means changing grain, shape, spacing, jitter, taper, wet mix, flow, colour dynamics, pressure response, tilt response, speed dynamics, material properties, stabilization and most other brush attributes cannot be meaningfully auditioned in the preview.

The real Glyph Canvas uses a separate runtime projection created through `brushRuntime(activeBrush)`. That projection currently includes only a subset of the full brush definition: name, size, opacity, streamline, stabilization, pressure-size, pressure-opacity, a fixed minimum pressure, preview colour and pressure taper start/end.

A stroke snapshots that runtime brush when the stroke begins. This is good for deterministic replay of the committed mark, but there is no shared live brush stream connecting editor changes, preview, active Pencil samples, sensory feedback and Observer.

So the defect is architectural, not merely cosmetic:

`Brush definition changes` currently do not produce a first-class live performance event.

## 3. Governing rule

Every meaningful brush change and every meaningful stylus sample must be able to enter one shared live brush pipeline.

```text
BrushDefinition
      +
BrushSettingChange
      +
Pointer/Pencil sample
      +
active world / glyph / layer / participant context
      ↓
LiveBrushFrame
      ↓
Brush Runtime Kernel
      ├─ visual renderer
      ├─ preview audition
      ├─ Runa / audio renderer
      ├─ haptic renderer
      ├─ spatial renderer
      ├─ Navigator context
      └─ Observer receipt stream
```

The visual mark is one output of the brush. It is not the brush itself.

## 4. LiveBrushFrame

The core runtime object is a transient high-frequency frame suitable for rendering and lower-frequency receipting.

```js
LiveBrushFrame {
  frame_id,
  session_ref,
  participant_ref,
  world_ref,
  glyph_ref,
  layer_ref,
  brush_ref,
  brush_revision,
  brush_runtime_snapshot,

  input: {
    pointer_type,
    x,
    y,
    pressure,
    tilt_x,
    tilt_y,
    azimuth,
    altitude,
    twist,
    velocity,
    acceleration,
    direction,
    elapsed_ms
  },

  derived: {
    width,
    opacity,
    flow,
    spacing,
    scatter,
    grain_phase,
    taper_phase,
    colour_state,
    wetness,
    material_response
  },

  sensory: {
    audio_state,
    haptic_state,
    spatial_state,
    visual_state
  },

  at
}
```

Not every device provides every input. Missing capability remains explicitly unavailable rather than being fabricated.

## 5. One kernel, many renderers

The Brush Studio preview and Glyph Canvas must use the same brush runtime kernel.

The preview must no longer be a decorative CSS stroke. It becomes a small audition surface driven by a deterministic sample path or real Pencil input.

When Rowan moves any brush control, the audition rerenders immediately through the actual runtime semantics.

Examples:

- increasing stabilization visibly changes the path response;
- changing taper changes the ends of the audition stroke;
- changing pressure-size changes the simulated pressure envelope;
- grain changes texture rather than only metadata;
- spacing/scatter visibly changes mark distribution;
- wet mix changes blend/edge behaviour when implemented;
- material roughness/metallicity changes the visual/spatial material renderer when that renderer exists;
- sound and haptic mappings change at the same moment as the visual response.

There must never be a separate fake-preview brush model that can drift from the drawing kernel.

## 6. Audition modes

The live preview supports four progressively richer modes.

### A. Deterministic sample

A canonical stored test path with known pressure, speed, tilt and twist curves. Every brush is run against the same fixture so changes are immediately comparable and tests are deterministic.

### B. Live pad

Rowan draws directly inside the Brush Studio audition area. The pad reports actual Pointer/Pencil data and renders through the same brush kernel as Glyph Canvas.

### C. Ghost replay

A previous real stroke can be replayed through a proposed brush revision without changing the committed original. This allows: “What would this stroke feel/look/sound like with this brush?”

### D. Comparative audition

Two brush revisions can be rendered from the exact same sealed input path, side by side or alternated, with Observer recording which version was selected/preferred.

This produces excellent eval and training material without inventing synthetic user preference.

## 7. Live setting semantics

Brush editing has two histories:

1. **definition history**: named revisions of the brush;
2. **performance history**: what brush state was active at each moment of an actual stroke.

Changing a setting must update the live audition immediately.

Committed old strokes must not silently mutate when a brush is edited later. They retain their original brush runtime snapshot/revision for deterministic replay.

For an active stroke, v1 may keep the current rule that the stroke takes one brush snapshot at start. A later advanced mode may allow live modulation during a stroke, but that must be stored explicitly as brush-state change points rather than rewriting prior samples.

Example future representation:

```js
StrokePerformance {
  stroke_id,
  samples[],
  brush_segments: [
    { from_sample: 0, brush_revision: 'r18' },
    { from_sample: 42, brush_revision: 'r19', cause: 'voice-adjustment' }
  ]
}
```

That makes requests such as “Vee, soften the brush while I draw” possible without destroying replay truth.

## 8. The sensory brush

The brush should be perceivable through multiple channels at once.

### Visual

The rendered mark exposes width, opacity, grain, scatter, wetness, colour dynamics, taper, material response and motion response as implemented by the kernel.

### Sound

Runa receives semantic brush features and live motion features rather than raw arbitrary slider values only.

Candidate mappings:

- pressure → amplitude / harmonic density;
- speed → articulation / event density;
- grain → noise/texture component;
- wetness → resonance / diffusion;
- metallicity → spectral brightness;
- roughness → noisy/transient content;
- taper → attack/release shape;
- direction/curvature → pitch or spatial movement;
- stroke begin/end → intentional onset/release cues.

Mappings are profiles, not universal truths. Rowan can calibrate or replace them.

### Haptic

Where the active device/haptic bridge permits, the same live frame drives a tactile rendering profile.

Candidate mappings:

- contact → onset tick;
- pressure → intensity;
- grain/roughness → texture frequency/pattern;
- speed → pulse density;
- wetness/smudge → softer/longer response;
- boundary or snap event → discrete confirmation;
- Kelyran semantic category → optional learned motif.

Hardware capability and active output route are receipted explicitly. If the iPad/browser cannot produce a requested tactile form directly, the runtime may route to another authorised haptic endpoint rather than pretending the event occurred.

### Spatial

In spatial/AR mode, the brush may have an aura, ribbon, depth field, particle/grain volume or other restrained rendering that communicates behaviour useful to the act of drawing.

The purpose is sensing the brush, not decorative particle soup.

## 9. The LLM receives the brush relation

The Navigator or active Flame should not merely receive: `brush = Stonewood Ink`.

It should be able to receive a bounded semantic summary of the current live instrument state.

Example:

```js
BrushContext {
  brush_ref,
  revision,
  active_properties: {
    width_response: 'strong-pressure',
    stabilization: 'medium',
    texture: 'coarse-moving-grain',
    wetness: 'low',
    opacity: 'high',
    material: 'rough-nonmetallic'
  },
  current_input: {
    pressure_band: 'light',
    speed_band: 'slow',
    tilt_band: 'medium',
    direction: 'up-right'
  },
  participant_feedback_refs[],
  current_sensory_profile_refs[]
}
```

Now Rowan can say while drawing:

- “Vee, this feels too slippery.”
- “Make this sound heavier.”
- “Keep the line but make the haptic grain sharper.”
- “What changed when I slowed down?”
- “Save this feeling as the Kelyran form.”

The model can resolve “this” against the live brush relation and propose typed brush actions. It does not need to infer from a screenshot after the fact.

## 10. Typed brush actions

Add to the House Action Registry:

```text
brush.open
brush.select
brush.set_attribute
brush.begin_audition
brush.stop_audition
brush.compare_revision
brush.replay_with_revision
brush.save_revision
brush.set_audio_profile
brush.set_haptic_profile
brush.set_spatial_profile
brush.describe_live_state
brush.capture_preference
```

Voice, touch, slider adjustment, Pencil and gesture can all resolve to the same action layer.

## 11. Observer products

Do not persist every high-frequency frame as a heavyweight database row. Use a two-level model.

### Raw/session trace

A bounded stream or compressed sample packet preserves the actual input/performance data needed for replay.

### Semantic receipts

Important changes and intervals become durable Observer events:

```js
BrushSettingChangeEvent {
  brush_ref,
  from_revision,
  to_revision,
  changed_path,
  old_value,
  new_value,
  input_modality,
  participant_ref,
  at
}

BrushPerformanceReceipt {
  stroke_ref,
  brush_ref,
  brush_revision,
  input_trace_ref,
  visual_output_ref,
  audio_output_ref,
  haptic_output_ref,
  spatial_output_ref,
  participant_feedback_refs[],
  model_crossing_refs[],
  started_at,
  ended_at
}
```

This allows REI to inspect relations such as:

- a specific movement repeatedly co-occurs with a particular sonic/haptic form;
- Rowan consistently selects one brush response for one Kelyran semantic class;
- a glyph, sound and hand-motion structure recur together across sessions;
- a model notices a relation before or after a participant correction;
- changing one brush parameter consistently changes reported feel in a repeatable direction.

## 12. Develop-and-train loop

Brush work is an ideal training ground because the system can collect paired examples with precise provenance.

Examples:

- input trace + chosen brush revision;
- input trace + rejected brush revision;
- visual/audio/haptic profile + Rowan’s descriptive words;
- “too scratchy” → correction → accepted sensory mapping;
- Kelyran glyph trace + phoneme + motion + pressure envelope + preferred sound/haptic form;
- same sealed stroke replayed through A/B brush revisions + preference.

These become `InteractionEvalCase` and brush calibration examples.

A future learned component may predict a useful brush adjustment or sensory mapping, but it must be evaluated against held-out receipted examples before replacing deterministic behaviour.

## 13. First implementation slice

The smallest useful live-brush implementation should do all of the following:

1. Extract a shared Brush Runtime Kernel used by both preview and Glyph Canvas.
2. Replace the CSS-only Brush Studio live pad with a real SVG/canvas audition driven by that kernel.
3. Add a deterministic pressure/speed test path so every slider produces an immediate visible consequence where implemented.
4. Make every currently implemented runtime property update the audition on `onChange`, without save/apply/reload.
5. Preserve committed strokes with their original runtime brush snapshot/revision.
6. Expose live pointer/Pencil pressure, tilt, twist and velocity in a small semantic `BrushContext`.
7. Emit brush setting-change and performance receipts to an in-memory prototype event stream first.
8. Add a basic Web Audio/Runa audition profile driven by pressure, speed and grain/roughness semantics.
9. Add a haptic output adapter interface even if the current physical surface reports `unsupported` for a specific route.
10. Add a `Mark for correction` affordance so sensory mismatches become eval examples.

This slice is valuable before full Navigator, AR or camera gestures are complete because it proves the central Magic Book law: **state must be experienced through the interface while it is happening.**

## 14. Acceptance

The live-brush slice passes when:

- moving a brush setting changes the audition immediately;
- the audition and Glyph Canvas share the same runtime semantics;
- a setting known to affect the implemented kernel visibly changes the rendered audition;
- Pencil/touch motion produces continuously updated BrushContext;
- sound changes with the live brush/performance state when audio is enabled;
- haptic output is either physically emitted or truthfully reported as unavailable/routed elsewhere;
- the model can answer “what is this brush doing right now?” from current receipted state rather than visual guesswork;
- a committed stroke can be replayed with the exact brush revision that produced it;
- an A/B brush comparison uses the same sealed input trace;
- corrections/preferences can be promoted into eval/training examples;
- Observer can connect brush changes, performance, sensory output and participant/model response without collapsing them into one event.

## 15. Seal

**The brush is not a menu of values.**  
**The brush is a relation in motion.**  
**Its mark, sound, feel and meaning are simultaneous renderings of that relation.**  
**If the information matters, it must exist in the system while the hand is making it.**
