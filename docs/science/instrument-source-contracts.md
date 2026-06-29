# Instrument Source Contracts

Status: implementation note
Category: established science, active research, implementation task
Scope: STARWELL, DEEP / Observer, Flameclyffe instrumentation
Related: `docs/science/observer-science-spine.md`, issue #22

This document turns the Observer science spine into concrete source contracts. It defines what an instrumented record must preserve before any symbolic, narrative, or DEEP interpretation is attached.

## Contract rule

Every instrument source must preserve:

```text
source_name
source_url
retrieved_at_utc
observed_at_utc
raw_payload_ref
raw_value
normalized_value
unit
uncertainty_or_quality_flag
transformation_chain
license_or_terms_note
confidence_level
```

Interpretive fields may reference instrument records, but they should not replace them.

## Layer placement

```text
Layer 0: source contract
Layer 1: raw measurement
Layer 2: normalized measurement
Layer 3: derived Observer index
Layer 4: symbolic condition
Layer 5: narrative / DEEP interpretation
```

## Source: CODATA constants

Category: established science / implementation task

Purpose:

CODATA constants provide stable reference values for measurement context and calibration notes. They are not evidence for symbolic claims.

Minimum fields:

```text
constant_id
constant_name
symbol
value
unit
standard_uncertainty
relative_standard_uncertainty
codata_adjustment_year
source_name
source_url
retrieved_at_utc
notes
```

Recommended first constants:

```text
Planck constant h
reduced Planck constant hbar
speed of light in vacuum c
Boltzmann constant k
Newtonian constant of gravitation G
elementary charge e
Avogadro constant NA
vacuum electric permittivity epsilon_0
vacuum magnetic permeability mu_0
```

Guardrail:

Physical constants are reference anchors. Symbolic correspondences must be labelled symbolic or speculative.

## Source: UTC and Julian date

Category: established science / implementation task

Purpose:

UTC and Julian date anchor Observer records to consistent timekeeping.

Minimum fields:

```text
utc_timestamp
julian_date
local_timestamp_optional
timezone_optional
source_name
source_url_or_library
retrieved_at_utc
precision
```

Privacy note:

Local time and location should respect user privacy settings.

## Source: lunar phase and illumination

Category: established science / implementation task

Purpose:

Lunar phase and illumination provide repeatable sky-context metadata for Observer events.

Minimum fields:

```text
observed_at_utc
lunar_phase_name
lunar_illumination_fraction
moon_age_days_optional
source_name
source_url_or_library
retrieved_at_utc
calculation_method
```

Guardrail:

Moon data may support timing and recurrence analysis. It does not certify causal claims.

## Source: NOAA / SWPC Kp index

Category: established science / implementation task

Purpose:

Kp provides a geomagnetic disturbance context layer for timestamped Observer events.

Minimum fields:

```text
observed_at_utc
kp_value
kp_scale_label_optional
noaa_g_scale_optional
source_name
source_url
retrieved_at_utc
observed_or_forecast
quality_flag_optional
```

Guardrail:

Kp is an environmental context signal. It should not be treated as proof of metaphysical causation.

## Source: solar flux F10.7

Category: established science / implementation task

Purpose:

F10.7 provides solar radio flux context for space-weather-aware Observer records.

Minimum fields:

```text
observed_at_utc
f107_value
unit
source_name
source_url
retrieved_at_utc
observed_or_adjusted_flag_optional
forecast_flag_optional
quality_flag_optional
```

## Source: sunspot number

Category: established science / implementation task

Purpose:

Sunspot number provides solar activity context for recurrence analysis.

Minimum fields:

```text
observed_at_utc
sunspot_number
source_name
source_url
retrieved_at_utc
observed_or_forecast
quality_flag_optional
```

## Source: weather

Category: established science / implementation task

Purpose:

Weather provides local environmental context where location sharing is permitted.

Minimum fields:

```text
observed_at_utc
location_precision
weather_source
weather_source_url
temperature
humidity_optional
pressure_optional
wind_speed_optional
cloud_cover_optional
precipitation_optional
retrieved_at_utc
unit_system
```

Privacy note:

Store coarse location by default unless the user explicitly chooses finer precision.

## Confidence mapping

```text
L0 Anecdotal: manual note only
L1 Witnessed: human watcher confirms
L2 Documented: timestamped artifact exists
L3 Instrumented: source contract record exists
L4 Replicated: repeated comparable records exist
L5 Independently verified: independent source confirms record or method
```

## Implementation checklist

- Add database tables or schema docs for source contracts.
- Add ingestion adapters one source at a time.
- Store raw payload references before normalization.
- Store retrieval timestamps separately from observation timestamps.
- Keep symbolic interpretation in a separate linked record.
- Add tests for required fields and confidence mapping.

## Reader safety rail

Observer may use instruments to anchor context and recurrence analysis. It does not publish instrument values as proof of speculative, supernatural, or cosmological claims.
