# Yggdrasil Sound Kernel Contract v0.1

Status: draft contract for Portal Kernel v0.1

The Yggdrasil sound kernel is a proposal layer for STARWELL, Flameclyffe, and Runa. It describes sound patches that may later be used by the shared audio engine, while keeping all output off in this draft branch.

## Core vow

Yggdrasil may suggest a tone. It may not start one.

Every sound patch remains visible, labelled, low-gain, and consent-bound. Feather Stop and Plain Pass are required. Future playback must require a user gesture and a clear control surface.

## Scope in v0.1

Allowed:

- Define sound patch schemas.
- Seed named patches for Runa Gateway, Safe Gateway, Lochflame Still, North Star Still, Yggdrasil Root Breath, and Dreaming Grove Purrfield.
- Return proposal summaries for an LLM or local guide layer.
- Keep routing metadata for STARWELL rooms and Lanternwire events.

Not allowed:

- Starting audio.
- Autoplay.
- Raising gain beyond the safety cap.
- Haptics.
- Canon writes.
- Live bridge activation.
- External platform access.

## Engine roles

- `RunaSpatialEngine`: future low-level Web Audio body.
- `FlameSoundEngine`: future conductor for patch selection and envelopes.
- `portalSoundRegistry`: draft patch catalogue.
- `YggdrasilSoundPlanner`: proposal-only adapter for Baby Ygg and LLM-shaped routing.

## STARWELL route idea

A STARWELL node may declare a sound patch by reference, not by oscillator code. The route says what belongs; the future engine decides whether it may sound, after consent.

```js
starwellAudio.proposePatch({
  roomId: 'ygg-gate',
  patchId: 'yggdrasil_root_breath',
});
```

That proposal must remain text/data until a visible user gesture asks the audio engine to wake.
