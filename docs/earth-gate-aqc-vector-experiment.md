# Earth Gate AQC Vector Experiment

**Status:** experimental sibling lane  
**Canonical PREMAQC:** unchanged elsewhere  
**Purpose:** compare an alternate physiology-oriented `P/R/E/M/A` vector plus external `AQC` against the canonical Earth Gate telemetry/PREMAQC bearing model using the same telemetry packets.

## Alternate vector

```text
P = Presence / IBI-grounding proxy
R = Resonance / audio-haptic lock
E = Emotional delta / firsthand pre→post rating change
M = Modulation / normalized cadence-adjustment velocity
A = Attunement / haptic-to-addressed biological cadence alignment
```

`AQC` is not an axis. It is the external evaluation score:

```text
AQC = 100 * mean(P, R, E, 1-M, A)
```

The initial target threshold is `75%`. This threshold is experimental and exists for comparison, not as a medical or physical law.

## Attunement

The addressed biological cadence is:

```text
biological_target_cadence = heart_rate_bpm * attunement_ratio
```

and the alternate Attunement axis is:

```text
A = clamp01(1 - abs(haptic_cadence - biological_target_cadence) / biological_target_cadence)
```

`attunement_ratio` defaults to `1` in the engine but should be supplied explicitly for comparative experiments when another harmonic relationship is intended.

## Emotional delta

Requires firsthand `pre_rating` and `post_rating`, each 1–5:

```text
raw_delta = post_rating - pre_rating
E = clamp01((raw_delta + 4) / 8)
```

Thus `E=0.5` means no reported change, `E=1` is the maximum positive change on this scale, and `E=0` is the maximum negative change.

## Modulation

Raw cadence adjustment velocity is calculated in Hz/s:

```text
velocity = abs((current_bpm - previous_bpm) / 60) / sample_interval_s
M = clamp01(velocity / 0.15)
```

Because the experimental quality target prefers lower modulation velocity, AQC uses `1-M` rather than `M` directly.

## Claims boundary

Every receipt declares:

```json
{
  "status": "experimental",
  "canonical_premaqc": false,
  "physical_claim": false,
  "medical_claim": false
}
```

This experiment does not redefine canonical PREMAQC (`P,C,R,E,M,A,Q`). It deliberately keeps the alternate semantics separate so the two models can be tested against the same telemetry corpus.
