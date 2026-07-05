# STARWELL Agency Switchboard v0.1

The Agency Switchboard turns the dream-practice lesson of "Nope" and "please change channel" into a shared STARWELL lab contract.

It exists because a lab should never require full exposure, full analysis, full narrative completion, or forced endurance before a user can redirect the field.

```text
Agency first. Intensity second. Meaning only with consent.
```

## Core channels

| Channel | Invocation | Purpose | Lab behaviour |
|---|---|---|---|
| Nope Lever | `nope` | Stop active inquiry without requiring a reason. | Suppress sound, minimise motion, allow optional log-only save. |
| Change Channel | `please change channel` | Redirect scene, tone, frame, or protocol while preserving continuity. | Step down or swap sound, reduce complexity, keep the thread without expanding it. |
| Soft Landing | `soft landing` | Return to quiet orientation when sensory or body load is high. | Low light, silence or brown noise only, reduced motion, no proving. |
| Log Only Basket | `log only` | Record the signal without analysing, canonising, escalating, or requiring action. | Local-only non-canon holding. Held, not opened. |
| Standard Exploration | `continue` | Continue ordinary read-only exploration when capacity and consent are present. | Normal accessible read-only lab behaviour. |

## Selection rules

The first implementation lives in `apps/starwell/src/scfe/agency-switchboard.js` and reads the existing SCFE `deep`, `somatic`, and `terra_aeterna` packet state.

Initial priority order:

1. `body_no` or paused interface safety mode -> Nope Lever.
2. Migraine or low-light silent mode -> Soft Landing.
3. High activation plus high fatigue, or DEEP pressure/entropy spikes -> Change Channel.
4. High fatigue, high pain, or low agency bandwidth -> Log Only Basket.
5. Otherwise -> Standard Exploration.

These rules are intentionally conservative. The switchboard is not a diagnosis system, therapy system, or prophecy engine. It is a read-only regulation contract for how STARWELL labs should behave when intensity changes.

## Lab application map

### SCFE Lab

SCFE snapshots now include `agency_switchboard` beside `agency`. The existing JSON export carries the active channel, recommended command, reasons, and lab behaviours.

### DEEP Observer

DEEP should treat spikes as weather first, not commands. A pressure or entropy spike can recommend Change Channel or Log Only instead of asking for deeper interpretation.

### Tone Lab

Audio protocols should honour switchboard output before selecting or playing sound:

- Nope Lever: stop/suppress sound.
- Soft Landing: silence or brown noise only.
- Change Channel: step down complexity or swap to a safer protocol.
- Log Only: do not require replay or interpretation.

### Dreaming Grove / imaginal rooms

Dreamlike rooms should make exits and transformations visible: lantern, door, water, path, remote, fox trail, or other room-native cue. No one is trapped in a scene for narrative completion.

### Writing labs

Trauma-adjacent or high-intensity drafting should support:

- skip scene
- fade to black
- symbolic only
- not today
- continue elsewhere
- log without processing

The craft answer may be a closed door with light under it.

## Implementation notes

- The switchboard is additive and local-first.
- It does not write to Supabase.
- It should not canonise anything automatically.
- It should be visible in exports so future UI panels can render it without changing the snapshot contract again.
- Future UI work should add tactile buttons for each channel, with keyboard access and reduced-motion styles.
