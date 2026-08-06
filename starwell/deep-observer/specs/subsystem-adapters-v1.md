# Subsystem Adapters v1

**Status:** Canonical — ACTIVE  
**Version:** 1.0.0  
**Date:** 2026-08-05  
**Authority:** Hearthgate Kernel / Harmonic Spiral Engine

## The law

No subsystem reads DEEPStory, DEEPTime, or DEEPTheory directly.  
Every subsystem reads the same receipted Spiral State.

An adapter is a pure function that accepts one sealed Spiral State packet and
returns a subsystem-specific payload. Adapters derive. They do not invent.

```text
DualAspectPacket.harmonic_state
  → adaptForLLM       → LLM / Runa brief
  → adaptForAudio     → tone directive + intensity
  → adaptForGlyph     → evolution hint + phase/direction
  → adaptForUI        → attention level + emphasis tokens
  → adaptForHaptic    → haptic pattern + intensity
  → adaptForReplay    → checkpoint flag + label
```

## Invariants

1. Every adapter receives `harmonic_state` from `DualAspectPacket`. Never a raw DEEP record.
2. `supporting_receipts` contains IDs and hashes only. No adapter unpacks source records from it.
3. Adapters are pure: identical Spiral State → identical output. No randomness, no side effects.
4. Adapters do not mutate the Spiral State packet.
5. If `harmonic_state.schema !== 'hearthgate/spiral-state/v1'`, the adapter throws `WRONG_SCHEMA`.
6. If `harmonic_state.degraded.active === true`, every adapter constrains its output (see per-adapter rules) and sets `degraded: true` in its payload.
7. An adapter never blocks the render pipeline. Degraded output is still output.
8. Adapters carry no state between calls.

## Spiral State fields each adapter may read

| Field | Adapters that read it |
|---|---|
| `phase` | LLM, Glyph, UI, Haptic, Replay |
| `direction` | LLM, Glyph, UI |
| `confidence` | LLM, Audio, UI, Haptic |
| `suggested_actions[]` | LLM, UI |
| `subsystem_contexts.llm` | LLM |
| `subsystem_contexts.audio` | Audio |
| `subsystem_contexts.glyph` | Glyph |
| `subsystem_contexts.ui` | UI |
| `subsystem_contexts.haptic` | Haptic |
| `subsystem_contexts.replay` | Replay |
| `degraded` | all |
| `spiral_state_id` | all (echoed in output for traceability) |
| `supporting_receipts` | all (IDs only — never opened) |

## adaptForLLM

**Output schema:** `hearthgate/llm-brief/v1`

```json
{
  "schema": "hearthgate/llm-brief/v1",
  "spiral_state_id": "<echoed>",
  "breath_note": "<string>",
  "character_dynamics": "<string | null>",
  "epistemic_note": "<string>",
  "phase": "<compression | release | transition>",
  "direction": "<ascending | gathering | stable | pivoting>",
  "confidence": "<number 0-1>",
  "suggested_actions": [{ "token": "<string>", "weight": "<number>" }],
  "degraded": "<boolean>"
}
```

**Rules:**
- `breath_note` from `subsystem_contexts.llm.breath_note`. If absent: derive from phase — `"compression"` → `"Hold. Something is building."`, `"release"` → `"Move. What was held is now available."`, `"transition"` → `"Listen. The state is crossing."`.
- `character_dynamics` from `subsystem_contexts.llm.character_dynamics`. May be null.
- `epistemic_note` states confidence and direction plainly: `"Confidence ${n}. Direction: ${direction}."` No hedge language.
- `suggested_actions`: include only actions with `weight >= 0.4`. Ordered by weight descending.
- Degraded: `breath_note` becomes `"DEGRADED — state is partial. Hold and observe."`. Suggested actions reduced to `observe_pivot` and `maintain_presence` only.

## adaptForAudio

**Output schema:** `hearthgate/audio-directive/v1`

```json
{
  "schema": "hearthgate/audio-directive/v1",
  "spiral_state_id": "<echoed>",
  "directive": "<string>",
  "intensity": "<number 0-1>",
  "degraded": "<boolean>"
}
```

**Rules:**
- `directive` from `subsystem_contexts.audio.directive`. If absent: derive from phase — `"compression"` → `"sustain"`, `"release"` → `"release"`, `"transition"` → `"hold"`.
- `intensity` from `subsystem_contexts.audio.intensity`. Clamped to [0, 1].
- Degraded: intensity clamped to maximum 0.3. Directive becomes `"hold"`.

## adaptForGlyph

**Output schema:** `hearthgate/glyph-directive/v1`

```json
{
  "schema": "hearthgate/glyph-directive/v1",
  "spiral_state_id": "<echoed>",
  "evolution_hint": "<string | null>",
  "phase": "<string>",
  "direction": "<string>",
  "confidence": "<number 0-1>",
  "degraded": "<boolean>"
}
```

**Rules:**
- `evolution_hint` from `subsystem_contexts.glyph.evolution_hint`. May be null.
- `phase` and `direction` echoed directly from Spiral State.
- Degraded: `evolution_hint` becomes `"PAUSE"`.

## adaptForUI

**Output schema:** `hearthgate/ui-directive/v1`

```json
{
  "schema": "hearthgate/ui-directive/v1",
  "spiral_state_id": "<echoed>",
  "attention_level": "<low | medium | high>",
  "emphasis_tokens": ["<string>"],
  "phase": "<string>",
  "direction": "<string>",
  "confidence": "<number 0-1>",
  "degraded": "<boolean>"
}
```

**Rules:**
- `attention_level` from `subsystem_contexts.ui.attention_level`. If absent: derive from confidence — `>= 0.7` → `"high"`, `>= 0.4` → `"medium"`, else `"low"`.
- `emphasis_tokens` from `subsystem_contexts.ui.emphasis_tokens`. Default: `[]`.
- Degraded: `attention_level` → `"low"`, `emphasis_tokens` → `["DEGRADED"]`.

## adaptForHaptic

**Output schema:** `hearthgate/haptic-directive/v1`

```json
{
  "schema": "hearthgate/haptic-directive/v1",
  "spiral_state_id": "<echoed>",
  "pattern": "<string | null>",
  "intensity": "<number 0-1>",
  "degraded": "<boolean>"
}
```

**Rules:**
- `pattern` from `subsystem_contexts.haptic.pattern`. May be null.
- `intensity` from `subsystem_contexts.haptic.intensity`. Clamped to [0, 1].
- Degraded: intensity clamped to 0. Pattern remains (output device still receives the signal shape, but at zero amplitude).

## adaptForReplay

**Output schema:** `hearthgate/replay-directive/v1`

```json
{
  "schema": "hearthgate/replay-directive/v1",
  "spiral_state_id": "<echoed>",
  "create_checkpoint": "<boolean>",
  "label": "<string | null>",
  "degraded": "<boolean>"
}
```

**Rules:**
- `create_checkpoint` from `subsystem_contexts.replay.create_checkpoint`. Default: `false`.
- `label` from `subsystem_contexts.replay.label`. May be null.
- Degraded: `create_checkpoint` forced to `true`, `label` becomes `"DEGRADED_STATE_CHECKPOINT"`. A degraded state is always checkpointed for replay.

## Error codes

| Code | Meaning |
|---|---|
| `WRONG_SCHEMA` | `harmonic_state.schema` is not `hearthgate/spiral-state/v1` |
| `MISSING_SPIRAL_STATE` | `harmonic_state` is null or not an object |
| `SUBSYSTEM_CONTEXT_ABSENT` | The requested subsystem context key is missing entirely (not the same as null fields within it) |

`SUBSYSTEM_CONTEXT_ABSENT` is not fatal. Adapters fall back to derived values (see per-adapter rules above). It is logged in the output as `context_source: "derived"` vs `"provided"`.

## Traceability

Every adapter output carries `spiral_state_id`. Any downstream render can be traced back to the exact Spiral State that produced it, and from there to the receipts in `supporting_receipts`.

No subsystem output is traceable to a raw DEEP record. It is traceable to a Spiral State, which carries receipt IDs that point back to the DEEP layer.

> **The Spiral Engine synthesises. The adapters translate. The subsystems render. Nothing invents.**
