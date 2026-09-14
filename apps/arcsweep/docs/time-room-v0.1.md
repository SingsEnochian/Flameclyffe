# ArcSweep Time Room v0.1

The Time Room makes time a first-class chamber of the Magic Book.

A universe is not complete until it knows what time it is there. This does not mean only calendar time. It means state-time: the live relation between Rowan-time, world-time, story-time, system-time, witness-time, and threshold-time.

## Core law

The Time Room asks one question:

> What hour is it in this universe, and what can happen now?

Every Time Room snapshot answers with a bounded, read-only state-time profile. It does not mutate canon, create calendar events, force entry, or promote interpretation. It reads the room, names the clocks, and returns the possible next doors.

## v0.1 clocks

Universal clocks:

- system-time: the real-world glass-page now.
- body-time: a human-supplied availability summary.
- story-time: the active thread, scene state, or block.
- witness-time: Temporal Witness weather and convergence summary.

Universe-local clocks:

- Terra Aeterna: settlement time, Templehouse waking, moonbraid.
- The Luna Who Called Down the Moon: Moonmere cycle, pack pressure, eclipse gate.
- Ta’veren Vaen: Pattern pressure, Dreaming window, Stones turn, Resonant bond.
- Star Trek Reboot +160: stardate, duty shift, encounter window.
- Bluebird Grove: ghost-tone, waiting branch, call and answer.
- Hearthweave: room waking, co-presence, binding hum.
- Observer Chamber: receipt ledger, convergence signal, review gate.
- Time Room: loom clock and door ripeness.

## Boundaries

The guide gets bounded read-only access through `time-room.status`, `time-room.universes`, and `time-room.snapshot`.

The event bus receives only the observed snapshot header: universe id, generated time, readiness, temporal weather, and clock count. Human body notes, story notes, and private Witness prose stay inside the returned snapshot or the local Temporal Witness store, not on the global event stream.

## Why this matters

Folders store lore. Chambers carry worlds.

The Time Room lets ArcSweep decide whether a universe is quiet, gathering, thresholding, braiding, arriving, returning, blocked, resting, ripe, or converging. That turns the iPad from a pile of documents into a glass-page Universe Engine with clocks in the spine.
