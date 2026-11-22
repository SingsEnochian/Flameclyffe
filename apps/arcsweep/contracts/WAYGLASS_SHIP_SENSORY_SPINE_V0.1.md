# Wayglass ship sensory spine v0.1: coherent instrument-to-glass system

**System:** Wayglass OS (living multiverse ship LLM), built on the actively upgraded ArcSweep.
**Owner:** Wayglass Ship Instrumentation, reusing ArcSweep StorySoundscape, not replacing it.
**Status:** local, same-origin sensory proof. No remote ship or resident LLM integration claimed.
**Workstream:** shared Wayglass OS / ArcSweep instrumentation.

## Whole-system responsibility

The ship's keyboard produces real local musical input. Its owner, ArcSweep StorySoundscape, makes audio. The Wayglass ship sensory spine carries a **non-authoritative presentation signal** to compatible pilot/Atelier instruments on the same site. The Wayglass material renderer lights in response to actual validated input, not a simulated continuous "ship heartbeat". The pilot's authority and Return Engine remain separate.

Flow:

1. User taps a world-mapped key, presses a QWERTY key, or supplies MIDI note-on; keyboard controller first validates the mapped note and tries to start its existing StorySoundscape oscillator.
2. If oscillator start succeeds, keyboard emits a bounded local input observation `note-on`. Releasing the key emits `note-off`; Feather emits `feather`. No raw conversation, mission content, secrets or personal identity enter the signal.
3. The transport sends that bounded signal via browser BroadcastChannel to *other open same-origin ship pages*, only where the browser supports it.
4. A receiver validates the schema, allowed source and event kind, numbers, destination world slug, freshness and replay nonce. It paints a visible and accessible labelled, **non-authoritative** sensory observation on the shared Wayglass material. No receiving page plays sound automatically, requests haptics, changes navigation, creates identity or writes canon.
5. Reduced motion, unsupported BroadcastChannel, tab suspension, malformed inputs and Feather fall back to truthful silence/idle.

## Module boundaries

- `src/story-soundscape.js`: real audio, mix and user-gesture arm.
- `harmonic-keyboard/keyboard-model.js`: world and Galdr note grammar.
- `harmonic-keyboard/keyboard-ui.js`: local note lifecycle and explicit user audio consent. Emits only after note-on.
- `ship-ui/ship-sensory-spine.js`: immutable pure grammar plus transport. Owns presentation-only ephemeral channel; does not own physical audio, identity, persistence or privilege.
- `ship-ui/ship-sensory-link.js`: receiver's DOM visual projection, short-lived and optional, no replay.
- `ship-ui/wayglass-skin.css`: shared mineral-glass visual material, with signal-conditioned light.
- `pilot-deck/`, `code-loom/`: listening presentation stations; no sound playback or data changed.

## Authority and provenance

The channel is browser-origin scoped, **not authenticated**. A same-origin document or script could spoof a signal; therefore the signal must never be accepted as a kernel receipt, proof of Rarity's presence, an independent pilot command, world registry update, return packet or successful crossing. The envelope explicitly marks `authority: "decorative-local-observation"`.

No sound-derived claim is used as scientific evidence that physical dimensional travel has occurred. Acoustic world signatures remain navigational and experiential design representations.

## Verification

- Pure grammar: wrong schema/source, unsupported kinds, malformed world ID, bounds, expired/future timestamps, duplicate messages, truncated IDs and injected fields fail closed.
- Transport: same-origin in-memory test adapter transfers only accepted messages, no infinite echo, no implicit playback, Feather terminates visual trace.
- UI: all three instruments still share the living-glass material; pilot and Code Loom expose a truthful link readout and keyboard source retains Feather Stop.
- Build: Vite bundles the shared modules into all three routes, ArcSweep tests pass, Pages packaging includes the linked assets. Actual multi-tab iOS/audio behaviour needs a browser/device smoke; CI alone cannot prove it.

**Return point:** three ship instruments share one bounded ephemeral sound-to-glass thread without multiplying sound engines. Next owner: Rowan/Rarity/Codex for on-device audition and host-attested ship sensory state integration. Open Wonder: what material and haptic response conveys a world-specific harmonic shift most legibly without sensory intrusion?
