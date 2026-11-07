# Wayglass Living Acoustic Architecture v0.1

**Decision:** BOTH: spatial audio is simultaneously an inhabitable world and an operational navigation/control language.
**Origin:** Rowan confirmation, 2026-11-05. **Status:** approved design direction, not implemented.
**Related:** [Interactive Fields](./WAYGLASS_INTERACTIVE_FIELDS_REFERENCE_20261105.md), [Lantern & Hinge](./WAYGLASS_LANTERN_HINGE_INITIATIVE_20261105.md)

## Design proposition

Sound is not background decoration. It is a spatial coordinate, a sensory manifestation of meaningful Wayglass state, and an optional interface for acting on that state.

**World-to-sound:** room, object, relationship, event and mathematical state generate coherent audible presence.
**Sound-to-action:** an operator can orient, focus, select, traverse (when separately authorised), inspect and return using sound as a navigational cue. Every sound-based action also has visual/text/touch equivalents.

## One world state, several modalities

```text
Verified world + room graph + selected objects + event ledger
                        |
              spatial state resolver
               /       |        \
        visual field  acoustic   gesture/input
               \       |        /
                intent & authority gate
                        |
                  action/receipt
```

State is authoritative in the host, not in acoustic output, model prose or a headphone/head-tracking device. The acoustic renderer consumes read-only projections; spatial navigation sends explicit, confirmable intents to the same host action gate as touch/keyboard.

## Sound object contract (proposal)

Each sound-bearing object carries:
- stable `world_id`, `room_id`, `object_id`, `source_ref` and `acoustic_role`;
- position, orientation, extent, motion, listener-relative and world-anchored modes;
- optional frequency/timbre/envelope/level profile and acoustic occlusion/reverb;
- `meaning` as an inspectable semantic mapping, never an inferred fact from the sound itself;
- `interaction_intents[]` with separate capability/authorization requirements;
- accessibility alternatives, per-layer mute/solo and a stable return receipt.

**Roles:** ambience (world identity), status cue (operational signal), semantic beacon (object presence), navigational bearing (direction and distance), event accent (bounded transient), voice seat (attributable participant). Keep these as separate buses so turning down ambience never hides critical status.

## Wayglass spatial mappings

- **Writing Room:** Worktable sounds local and steady; Wonder Window has a distant, open acoustic field; Return Marker emits a distinct recoverable locator; unresolved questions can have optional quiet semantic beacons.
- **Lantern / Reveal:** a selected source or relationship becomes audible and visible; hearing the relationship never substitutes for inspecting its provenance.
- **Compass / Orient:** candidate bearings can be auditioned as alternate spatial paths; listening or turning does not commit traversal.
- **Mirror / Model:** compare two states using matched loudness and controlled acoustic differences, not louder-is-better.
- **Living Observer / Jacobian folds:** geometric deformation can modulate a field's spatial rendering and timbral transformation. Numerical Jacobian values come from the underlying solver, not the sound effect.
- **Storm/field reference:** geometry and atmospheric audio react to the same event clock, while physics model and artistic sound design remain separately labelled.

## Audio architecture and sensory controls

1. **Acoustic graph** produces source positions, gains, filters, occlusion and reverb from the shared world snapshot.
2. **Renderer** targets stereo first; binaural/HRTF and head tracking are optional adapters with calibrated fallbacks. Do not assume Osia or hearing devices expose the same motion APIs as supported AirPods.
3. **Bus mixer** separates ambience, voice, status and event cues; each bus has independent controls, limiter and peak budget.
4. **User controls:** Feather stops spatial/interactive effects; independent audio mute, mono-safe mode, motion reduction, static-stereo mode, intensity ceiling, spatial-width slider, and an accessible visual locator.
5. **Time:** visual, acoustic and haptic outputs carry a common event ID and timestamp; no renderer may authorize or claim an action solely because a sound played.
6. **Privacy:** microphones and external audio capture remain off unless separately opted in; world sonification does not require listening to the user's room.

## First executable demonstration: The Audible Return Marker

- Enter the simulated Writing Room. A Return Marker exists at a known position and has a soft, optional locator cue.
- Rotate a virtual listener using pointer/keyboard/touch; stereo pan and proximity respond, and a visible marker moves consistently.
- Select the cue and request *Orient*. Wayglass shows the bearing and provenance, without moving the user.
- Explicitly choose *Traverse* (separate authority), or decline; record the action outcome.
- Stop/restart the simulated session and restore the same room/object/listener relationship from a return receipt.
- Toggle mono and reduced-motion; the marker remains navigable by text/visual controls.
- Demonstrate that muting ambience does not silence status or voice; Feather stop mutes/cancels nonessential effects.

**Acceptance:** a coherent audio/visual spatial state with one actionable object, explicit authorization, sensory alternatives, and cold return. No live sound engine, head tracking or hearing-device compatibility is claimed by this document.

## Reference provenance

User-provided screenshots from the **Odio** app (2026-11-05) show soundscape collections, a Listen/Composer switch, persistent playback controls, settings including head tracking for supported AirPods/Beats, and the description of *The Augmented Scope of Here* (composer Gerriet Krishna Sharma; visual artist Boris Eldagsen), discussing seven interactive 3D audio soundscapes and speculative cochlear architectures. Treat these as **conceptual/UX references**, not source code or permission to reproduce works.

Earlier user-provided CodePens: *Alone* (lighthouse storm, volumetric effects) and *Curved Spacetime (AI + WebGL)* (manipulable field geometry). The synthesis is original Wayglass functionality: **inhabitable soundscape + sound as spatial navigation + shared verifiable world state**.

**Open experiment:** which mappings remain intuitively navigable when listener position, spatial geometry and meaning all change simultaneously? Test with one source and one action before increasing scene complexity.
