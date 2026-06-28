# Möbius Audio Bus v0.1 — First Run Protocol

Status: implementation protocol for the STARWELL Möbius Audio Lab.

Purpose: test the audio architecture before using the experience as subjective data. Feather first. Channel truth before the twist.

## Claim labels

- Established audio architecture: Web Audio buses, channel merger/splitter, phase inversion, RMS meters, mono collapse.
- Subjective experiment: body sensation, perception, consciousness quality, Völva-sense, after-effects, recovery time.
- Speculative theory: the Möbius universe frame, inversion-of-inversion model, STARWELL cosmological interpretation.
- Implementation task: bugs, routing changes, UI changes, logging upgrades.

## Before running

1. Use headphones or Shokz only when Rowan chooses them.
2. Start with master level at 0.12 or lower.
3. Set duration to 2 seconds for the first pass.
4. Keep Feather Stop visible.
5. Water nearby. Notes open. No heroic nonsense.

## Channel truth pass

Run in this order:

1. Wake Bus.
2. L only. Confirm sound is left-side dominant and the left meter rises.
3. R only. Confirm sound is right-side dominant and the right meter rises.
4. Centre. Confirm both sides receive balanced signal.
5. Return. Confirm the selected return side receives signal.
6. Feather Stop. Confirm audio fades and sources release.

If any channel behaves incorrectly, stop and log it as an implementation task. Do not proceed to Möbius tests.

## Möbius pass

Run only after channel truth passes.

1. Phase-invert return bus: on.
2. Mono safety: off for stereo test, on only for collapse comparison.
3. Return side: right ear return for the baseline.
4. Run Möbius return.
5. Log body, perception, consciousness quality, and after-effects as subjective experiment.
6. Feather Stop.

Optional next passes:

- Gateway offset: 369 Hz left, 363.5 Hz right, 108 Hz centre.
- Full twist: centre floor, left/right offset, inverted return split, low centre noise bed.
- Mono safety comparison: repeat with mono safety on and label the difference.

## Stop conditions

Stop immediately on pain spike, migraine warning, nausea, dizziness, panic, dissociation, sharp tinnitus change, body alarm, or Rowan saying Feather, Icarus, stop, enough, nope, or any equivalent.

Stopping is success. It means the gate works.

## Minimum observation note

```text
Date/time:
Mode:
Master level:
Duration:
Return side:
Phase inversion:
Mono safety:
Device/headphones:
Body:
Perception:
Consciousness quality:
After-effects:
Völva-sense:
Label:
Next change:
```

## Current next build tasks

- Add export for local observation notes.
- Add calibration tones at lower levels.
- Add per-ear gain controls.
- Add a visible countdown and post-run quiet timer.
- Add STARWELL/DEEP feed input once the bus passes basic checks.
