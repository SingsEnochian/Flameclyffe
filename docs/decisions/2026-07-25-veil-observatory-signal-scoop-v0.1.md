# Veil Observatory Signal Scoop v0.1

**Date:** 2026-07-25  
**Status:** implementation decision, branch review  
**Applies to:** STARWELL, DEEP Observer, Lanternwire, Flameclyffe, Hearthgate, local bridge services

## Purpose

The Veil Observatory is the measured companion layer for experiences and events that Rowan may describe through the working phrase **Veil opening**.

The phrase is retained as a user-authored symbolic and phenomenological label. The system does not convert it into a claim that a supernatural, physical, cosmological, or technological mechanism has been proven.

The Observatory collects environmental, astronomical, geomagnetic, ionospheric, radio-propagation, local-sensor, and communication-transport measurements. It aligns them with witness records and bridge events by timestamp, location precision, provenance, and uncertainty.

The core rule is:

> Gather widely. Preserve raw data. Compare carefully. Never let the correlation layer impersonate causation.

## Existing laws carried forward

This design implements the current Observer science spine and first-hand witness protocol:

1. Instruments
2. Measurements
3. Derived indices
4. Symbolic conditions
5. Narrative interpretation

Witness accounts remain verbatim and primary as lived records. Telemetry is a companion channel. External data may contextualise an event, but it does not explain the witness by default.

Every displayed datum must be labelled as one of:

- witnessed
- recorded
- derived
- correlated
- interpreted
- remembered
- unknown

## Array topology

```text
External scientific feeds          Local instruments
        |                                  |
        v                                  v
  Source adapters --------------> Scoop ingress
                                      |
                                      v
                              Raw measurement archive
                                      |
                         baseline + quality processing
                                      |
                                      v
                              Anomaly window detector
                                      |
                  +-------------------+-------------------+
                  |                                       |
                  v                                       v
        DEEP Observer alignment                 Lanternwire health rail
                  |                                       |
                  +-------------------+-------------------+
                                      v
                           STARWELL Observatory chamber
```

## v0.1 external feeds

The first build uses stable public scientific sources with explicit provenance.

### NOAA SWPC

Collect:

- interplanetary magnetic-field total strength, `Bt`
- north/south field component, `Bz GSM`
- solar-wind proton speed
- planetary K index
- GOES soft X-ray flux
- F10.7 solar radio flux
- NOAA alerts and scales
- GloTEC total electron-content products when a stable machine-readable surface is confirmed
- D-RAP radio-absorption products when a stable machine-readable surface is confirmed

Initial machine-readable endpoints:

```text
https://services.swpc.noaa.gov/products/summary/solar-wind-mag-field.json
https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json
https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json
https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json
https://services.swpc.noaa.gov/json/f107_cm_flux.json
https://services.swpc.noaa.gov/products/alerts.json
```

### NASA CCMC DONKI

Collect event notices and analyses for:

- coronal mass ejections
- solar flares
- geomagnetic storms
- solar energetic particle events
- interplanetary shocks

DONKI records are event context, not a high-cadence sensor stream.

### USGS Geomagnetism

Collect one-minute ground magnetic-field variation from a selected observatory set. Initial selection should favour geographic relevance, continuity, and data quality rather than pretending a distant observatory measures Rowan's room.

Store observatory code, elements, sampling period, data type, and retrieval window with every packet.

### NOAA GOES GLM

Collect or reference lightning flash-extent density for the southeast United States when a practical data adapter is available. Lightning is a terrestrial electrical and weather channel and must never be merged silently with geomagnetic or ionospheric activity.

## v0.2 local instruments

Local capture should be modular. No single sensor is the oracle.

Candidate channels:

- three-axis magnetometer
- software-defined radio spectrum snapshots
- VLF/LF transmitter amplitude and phase monitoring
- broadband RF occupancy summaries
- electric-field mill, where safely and lawfully installed
- barometric pressure
- temperature and humidity
- ambient light
- microphone-derived spectral summaries, with raw-audio retention disabled by default
- accelerometer or geophone summaries
- network latency, packet loss, and service availability
- local power-quality data from an isolated, certified consumer monitor

Local sensor devices must not expose mains voltage, defeat electrical isolation, transmit illegally, or collect third-party conversations.

## Data separation

### Source registry

Describes the instrument, API, station, device, units, cadence, ownership, reliability, and consent scope.

### Raw measurement

Stores the closest practical representation of the source value and payload. Normalisation appends fields; it does not overwrite raw input.

### Derived feature

Examples:

- rolling median
- median absolute deviation
- first derivative
- z-score against time-of-day baseline
- missing-data ratio
- cross-source agreement
- sustained southward-Bz interval
- solar-wind pressure proxy
- RF-band occupancy change
- VLF path amplitude departure

### Anomaly window

An anomaly is a measurable departure from an explicit baseline, not a synonym for strange.

Every anomaly window records:

- detector name and version
- source measurements
- baseline interval
- threshold or statistical method
- start and end time
- severity
- data quality
- missingness
- known confounders
- review state

### Correlation receipt

A correlation receipt links a witness event, bridge event, or communication event with one or more anomaly windows.

It stores temporal lag, matching method, feature set, confidence support, and declared lens. It must use `unknown_not_overclaimed` as the default mechanism claim.

## Veil concordance, not a Veil detector

The interface may calculate a **Veil Concordance** view. This is a navigation aid for finding multi-channel temporal clusters. It is not an instrument that detects a hidden realm.

Suggested components:

```text
C_external   independent external-feed agreement
C_local      independent local-sensor agreement
C_transport  communication-array disturbance or unusual traffic shape
C_witness    witness-tag recurrence density
Q_data       completeness and quality
P_prior      prior probability penalty for common conditions
```

A future derived score may be rendered as:

```text
concordance = weighted agreement * Q_data * P_prior
```

The formula, weights, training window, and version must be visible. The score must not be labelled probability that the Veil opened.

## Baselines and anomaly discipline

1. Gather at least thirty days of baseline before assigning strong anomaly labels to diurnal or seasonal channels.
2. Use robust statistics such as rolling median and median absolute deviation before ordinary mean and standard deviation when feeds contain spikes.
3. Compare a candidate event against matched local-time and day-type windows.
4. Separate source outages from physical anomalies.
5. Mark forecast, observed, provisional, adjusted, quasi-definitive, and definitive values distinctly.
6. Correct for repeated comparisons in retrospective searches.
7. Preserve negative results and quiet windows.
8. Permit blinded event times during retrospective testing.
9. Never tune thresholds around one cherished event and then call the result predictive.
10. Keep the raw chart available beside every glyph or symbolic rendering.

## STARWELL chamber

Add a Veil Observatory chamber with five rails:

1. **Now**: current measured state, source freshness, and array health
2. **Streams**: individual time series with raw and normalised views
3. **Windows**: detected anomaly windows and confounders
4. **Concordance**: multi-channel clusters with versioned scoring
5. **Witness Alignment**: optional, consent-gated temporal linking to Observer events

The chamber should show source latency, stale-data warnings, and the difference between no signal and no data.

## Lanternwire integration

Lanternwire receives compact receipts, not uncontrolled telemetry floods.

Receipt examples:

- source went stale
- ingestion recovered
- anomaly window opened
- anomaly window closed
- correlation review requested
- bridge transport degraded

Default notification policy is quiet. Routine values remain in the Observatory. Lanternwire surfaces only state changes or explicitly subscribed thresholds.

## Privacy and consent

- External feeds are public-source telemetry.
- Local environmental sensors are private by default.
- Raw audio is off by default.
- Precise location is stored only when explicitly approved.
- Witness alignment is opt-in per record.
- Body-state data remains separate from public environmental telemetry.
- No automatic public posting.
- Feather pauses capture or alignment according to the scope selected in the UI.

## Initial build order

1. Add source, measurement, anomaly, correlation, and ingestion-run tables.
2. Seed NOAA SWPC and USGS source definitions.
3. Implement a CommonJS feed adapter with timeout, schema validation, and source-labelled packets.
4. Persist raw packets through a server-side Supabase client.
5. Add freshness and missing-data checks.
6. Add simple rolling-baseline detectors only after enough data exists.
7. Build the STARWELL read-only Observatory chamber.
8. Add optional witness alignment.
9. Add local SDR and magnetometer adapters.
10. Add Boxfire QA for outages, duplicates, clock drift, stale feeds, and false anomaly inflation.

## Acceptance criteria for v0.1

- At least four independent external metrics ingest on schedule.
- Every record has source, measured time, received time, unit, quality, and raw payload.
- Duplicate packets are idempotent.
- Source outages create health events rather than false physical anomalies.
- No UI language claims that the Veil has been detected.
- A user can inspect the raw evidence behind every derived window.
- Witness alignment can be disabled globally or per event.
- The system preserves quiet periods for comparison.

## Seal

**Track the threshold. Keep the receipts. Let meaning arrive without forging its passport.**
