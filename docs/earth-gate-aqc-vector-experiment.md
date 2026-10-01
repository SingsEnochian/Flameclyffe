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
A = Attunement
```

`AQC` is not an axis. It is an external evaluation score.

## Attunement model A: cadence alignment

The addressed biological cadence is:

```text
biological_target_cadence = heart_rate_bpm * attunement_ratio
```

and Attunement is:

```text
A = clamp01(1 - abs(haptic_cadence - biological_target_cadence) / biological_target_cadence)
```

The corresponding experimental AQC is:

```text
AQC = 100 * mean(P, R, E, 1-M, A)
```

## Attunement model B: baseline-65

The supplied alternative formula is preserved as a separate experiment:

```text
A = clamp01((HRV / 100) * (1 - abs(HR - 65) / 135))
```

Its supplied weighted score is also preserved:

```text
AQC = 100 * (0.25*P + 0.45*A + 0.30*R_normalized)
```

The values `65`, `135`, and the `25/45/30` weights are experimental calibration constants, not physical or medical laws.

## Error isolation

The baseline-65 lane includes a batch runner that processes sessions independently. Invalid packets produce blocked-session receipts while valid packets continue. Structural bounds are deliberately described as experiment validation bounds rather than physiological safety limits.

## Emotional delta

The cadence-alignment model requires firsthand `pre_rating` and `post_rating`, each 1–5:

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

Because the first experimental quality target prefers lower modulation velocity, that AQC uses `1-M` rather than `M` directly.

## Claims boundary

Every alternate receipt declares:

```json
{
  "status": "experimental",
  "canonical_premaqc": false,
  "physical_claim": false,
  "medical_claim": false
}
```

This experiment does not redefine canonical PREMAQC (`P,C,R,E,M,A,Q`). It deliberately keeps the alternate semantics separate so the two models can be tested against the same telemetry corpus and compared by receipts.
