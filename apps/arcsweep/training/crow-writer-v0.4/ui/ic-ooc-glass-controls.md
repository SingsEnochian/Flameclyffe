# IC / OOC Glass State Controls v0.1

Purpose: make round-robin fiction state visible without turning the writing surface into a dashboard.

## Semantic state

### IC
- In-character / in-fiction.
- Advance the scene.
- Respect declared character ownership.
- Do not narrate another owned character's private thoughts, irreversible choices, or unoffered outcomes.
- End turns with playable hooks rather than closing the scene for the other writer.

### OOC
- Out-of-character / writer-room.
- Discuss intent, canon, pacing, tone, boundaries, continuity, handoffs, and craft.
- Nothing said OOC becomes in-world fact by default.
- OOC can explicitly grant temporary character handoff or shared ownership.

The UI state MUST be passed into the model turn payload. It is not a cosmetic tag.

## Visual treatment

Two compact transparent glass chips:
- `IC`
- `OOC`

Only one is active at a time.

Default rest state:
- nearly transparent;
- thin refractive rim;
- very low internal haze;
- no opaque background plate.

Active state:
- slightly thicker optical depth;
- subtle internal parallax/refraction;
- tiny brightness lift on the engraved letters;
- 1–2 px apparent edge displacement under pointer/touch movement.

Interaction:
- tap/click switches state;
- short haptic tick where supported;
- keyboard-accessible segmented control semantics;
- clear non-colour active affordance for accessibility;
- prefers-reduced-motion disables parallax/refraction animation.

## Rendering path

Preferred:
1. existing ArcSweep/Flameclyffe glass shader primitives;
2. CSS/WebGL fallback using backdrop blur + border + specular pseudo-element;
3. static transparent SVG/PNG treatment from Gobby if GPU/shader path is unavailable.

Do not use a flat filled pill unless accessibility fallback requires it.

## Round-robin affordance

Near the IC/OOC state, optionally show:
- current turn owner;
- owned character initials/avatar;
- temporary handoff indicator.

These should remain secondary to the writing surface.

## State payload example

```json
{
  "channel": "IC",
  "turn_owner": "Crow",
  "character_ownership": [
    {"character": "Eilidh", "owner": "Rowan", "permission": "owned"},
    {"character": "Izar", "owner": "Crow", "permission": "owned"}
  ]
}
```

OOC handoff example:

```json
{
  "channel": "OOC",
  "turn_owner": "Rowan",
  "character_ownership": [
    {"character": "Eilidh", "owner": "Crow", "permission": "temporary-handoff"}
  ]
}
```
