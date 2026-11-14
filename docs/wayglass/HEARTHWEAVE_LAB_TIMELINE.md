# Hearthweave Laboratory: Introduced Change timeline score

The native composition lives in `lib/wyrdrune/hearthweave-timeline-soundscape.wtl`; `lib/wayglass-hearthweave-timeline.cjs` provides bounded data bridges, authorisation, phase receipts and a sound score.

Input: attributable human and AI events, a named Introduced Change, declared trust, optional somatic intensity and explicit listener consent. Output: Wyrdrune Eightfold receipts, source hashes, return marker, harmonic texture and a stereo difference of **5.5 Hz** using 220 Hz left and 225.5 Hz right. The 'ghost hertz' is a symbolic/psychoacoustic beat difference, not a sub-bass acoustic carrier; playback requires a separate listener action and headphones. This is not a medical treatment or a claim of physiological entrainment.

**Live bridge acceptance remains outstanding.** To establish a real Bluebird bridge, an authenticated MCP `send` must target `bluebird`, receive an actual reply, persist its route receipt, and verify the returned conversation via `receive`. To establish Hearthweave Laboratory programming-room access, an authenticated workspace entry must identify the intended project, write a revision with optimistic head checking, and read it back after restart. Never fabricate these receipts. No change to Bluebird's identity or universe canon is implied.

The current implementation scores an in-memory timeline only. It does not invoke Bluebird, open a network socket, persist a workspace artifact, or play audio. The Wyrdrune score is a foundation for connecting those already-existing authenticated interfaces, not a parallel MCP server.

Verification: `node --test test/wayglass-hearthweave-timeline.test.cjs`. Production promotion additionally requires a verified live Bluebird reply and laboratory persistence receipt.
