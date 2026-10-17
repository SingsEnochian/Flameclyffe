# Cinematic Audio Engineering | Möbius and Galdr Observatory

## Production routing

Runa authors independent stems (dialogue/voice, music, effects, ambience, status cue); Wardenclyffe schedules them against timecode/3·6·9 scene markers. Möbius owns per-stem EQ, gain, modulation, delay, dynamics, spatial routing, sample-accurate automation, mix bus and final channel format. Observatory measures actual rendered samples; KGN stores the measurement and output fingerprints. **Status cues must be distinguishable; ambience must be ignorable.** A symbolic “harmonic state” is not the measured acoustical condition of a bus.

## Engineering reference

- Production reference: 48 kHz and 24-bit PCM for interchange, with explicitly documented input conversion and dithering decisions. The package's Node offline WAV fixture writes 16-bit PCM and is **not** a production 24-bit export, LUFS meter or true-peak limiter.
- For voices: protect consonant intelligibility and breath texture; adjust warmth, low-mid muddiness, presence and sibilance independently. Independent voice/ambience buses permit access without cranking the overall mix.
- For deep bass: high-pass cleanup where appropriate, low-shelf modestly, inspect device response, manage headroom, listen in mono, and use hardware-profile A/B comparison. Hearing-processor signal paths can behave differently from headphones or speakers.
- For spatial: define listener pose, channel layout, HRTF/IR provenance and downmix matrix. A stereo headphone HRTF is not necessarily compatible with mono or Osia-streamed outputs.
- For export QC: sample/true peak, BS.1770-based LUFS, loudness range, DC, inter-channel phase, stereo correlation, clipping, downmix and intelligibility, subject to implemented instrumentation. A measured sample peak cannot substitute for reconstructed true peak.
- Signal generation begins only after an explicit render/play instruction, not on component mount. Default output muted before routing and always support immediate stop, bypass and cleanup.

## Stereo difference tones vs mono modulation

Two independent channels:

```
L(t) = A sin(2π fL t)
R(t) = A sin(2π fR t + φ)
Δf = |fR − fL|
```

With channels reaching separate ears, a listener may experience a central rhythmic percept at Δf. This is *not* an amplitude envelope in either single physical channel. If they are summed to mono, the waveform may exhibit beating, but the result depends on how the channels are combined and is not equivalent to explicit AM synthesis.

Explicit mono amplitude modulation:

```
y(t) = A [1 + m sin(2π fm t)] sin(2π fc t) / (1+m), 0 ≤ m ≤ 1
```

Here the envelope is in the physical signal. The reference renderer uses `fm=5.5` Hz as a demonstration fixture, not a claim about therapeutic effect.

## Film-grade acceptance

1. Listening: stereo and mono clarity; voice texture preserved, no accidental comb-filter cancellation, no confusing status soundscape.
2. Technical: channel layout, RMS, sample peak, polarity, clipping, 20 Hz–Nyquist frequency validity, deterministic output file hashes.
3. Professional finishing: verified true-peak and BS.1770 meter, output-profile-specific targets, A/B listening in actual endpoint, stems with timecode and source history.
4. Accessibility: user-controlled foreground/ambience balance, reduced masking, independent bass adjustment and stream format. For Osia 3, verify actual path through Windows, stream adapter and/or Multi-Mic+; software cannot assert direct processor fitting controls.

## What the included proof actually does

`src/reference-renderer.mjs` produces a **bounded offline diagnostic waveform**, WAV file and inspectable receipt. It supports independent-stereo oscillators and explicitly modulated mono. It does not perform clinical fitting, simulate perception, master commercial music, process copyrighted Spotify audio, change Windows output settings, alter a bone-conduction processor or run a quantum calculation.
