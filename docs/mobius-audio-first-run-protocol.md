# Möbius Audio Bus v0.1 — First Run Protocol

Status: implementation protocol for the STARWELL Möbius Audio Lab.

Purpose: test the audio architecture before using the experience as subjective data. Feather first. Channel truth before the twist. Loop only after the channel tests pass.

## Claim labels

- Established audio architecture: Web Audio buses, channel merger/splitter, phase inversion, RMS meters, mono collapse.
- Subjective experiment: body sensation, perception, consciousness quality, Völva-sense, after-effects, recovery time.
- Speculative theory: the Möbius universe frame, inversion-of-inversion model, STARWELL cosmological interpretation.
- Implementation task: bugs, routing changes, UI changes, logging upgrades.

## Tone map

### Channel truth tones

- **L only:** 440 Hz sine routed to the left bus. Purpose: confirm left channel and left meter.
- **R only:** 440 Hz sine routed to the right bus. Purpose: confirm right channel and right meter.
- **Centre:** 432 Hz triangle routed to centre. Purpose: confirm balanced centre and mono-safety behaviour.
- **Return:** 369 Hz sine routed to the return bus. Purpose: confirm return-side routing; phase inversion applies if enabled.

### Core Möbius tones

- **Möbius return:** one 369 Hz sine split to the left bus and return bus. Purpose: test the left/return seam. If phase inversion is on, the return path is inverted before it reaches the selected side.
- **Gateway offset:** 369 Hz left + 363.5 Hz right + 108 Hz centre. Purpose: test the 5.5 Hz left-right difference, with 108 Hz as centre anchor. Current hypothesis: the 5.5 Hz offset is a likely source of train-track or rail-thrum perception.
- **Full Twist:** 108 Hz centre floor + 369 Hz left + 363.5 Hz right + 369 Hz left/return split + filtered centre noise. Purpose: combine centre floor, left-right offset, return seam, and air/water texture.

### Full Twist isolators

- **Centre floor:** 108 Hz centre only. Purpose: test cave/floor/body/underground quality.
- **Offset pair:** 369 Hz left + 363.5 Hz right only. Purpose: test rail-thrum, train tracks, or 5.5 Hz beat perception.
- **Return split:** 369 Hz split to left + return only. Purpose: test the left/return seam without the offset pair or noise bed.
- **Noise bed:** generated pink-ish noise through a 520 Hz bandpass filter with low Q, routed centre. Purpose: test wind/water texture.

### Current perceptual hypotheses

- Rushing wind / flowing water: likely noise bed, especially with centre floor underneath.
- Train tracks / rail-thrum: likely 369 Hz and 363.5 Hz offset pair producing a 5.5 Hz perceptual beat.
- Cave / underground quality: likely 108 Hz centre floor plus filtered noise.
- Bell clang: unresolved; possible start transient, harmonic image, or interaction between centre floor and offset pair.
- Third-eye pressure: subjective body/perception report; track duration, intensity, and after-effect. Stop if it becomes pain, migraine warning, or body alarm.

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

## Loop pass

Loop is allowed after channel truth passes.

1. Choose the test mode first.
2. Set duration.
3. Set loop fade-in.
4. Enable **Hold selected test until Feather Stop**.
5. Press the chosen test button.
6. Let it hold while Rowan remains consenting and oriented.
7. Feather Stop ends the loop, disarms loop mode, fades audio, and releases sources.

Loop mode is not automatic proof of anything. It is a way to gather longer subjective observation without making Rowan tap the same test repeatedly like a tiny metronome goblin.

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
- Loop comparison: repeat with loop enabled and label duration, fade-in, and how long it was held.

## Stop conditions

Stop immediately on pain spike, migraine warning, nausea, dizziness, panic, dissociation, sharp tinnitus change, body alarm, or Rowan saying Feather, Icarus, stop, enough, nope, or any equivalent.

Stopping is success. It means the gate works.

## Minimum observation note

```text
Date/time:
Mode:
Loop enabled:
Loop held duration:
Loop fade-in:
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
