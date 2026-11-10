# Wayglass's first real sky instrument: NOAA high-cadence archive and Möbius research

Evidence date: 2026-11-07 UTC. Canonical base: wayglass/current.
Source: official NOAA Space Weather Prediction Center HTTPS JSON.
Status: Supabase source ingestion and five private cron jobs are live and receipt-verified. Wayglass browser/host instrument is staged for review, NOT claimed deployed.

## Concrete first pull

At 07:08 UTC, read-only queries of the private observer_measurements table confirmed 51,576 stored metric observations, 7 NOAA feed identities, and 10 distinct metric keys. These include:

- 20,146 measurements from 10,073 distinct minute observations in the seven-day GOES XRS archive (two X-ray energy channels).
- 14,745 RTSW plasma metric rows, including original spacecraft, activity and quality code context.
- 14,094 RTSW magnetometer metric rows, preserving source activity and GSM component signs.
- More GOES six-hour, planetary Kp and solar-wind summary observations.

Counts increase as pollers run; append-only revisions of an upstream packet are kept under changed SHA-256 payload fingerprints. Counts represent METRIC ROWS, not independent timestamps.

The NOAA seven-day X-ray endpoint returned HTTP 200, 4.54 MB and 20,146 rows in a direct Supabase database-side HTTPS test. Both RTSW JSON archives returned several thousand rows each.

No measurement is invented. raw_payload stores source records; measured_at uses UTC source time; received_at records collection. The unique (source_id, metric_key, measured_at, payload_hash) key supports provenance-preserving retries. Quality and source-active flags are retained.

## Running private collector

The wayglass_observer_internal.collect_noaa_feed function was deployed as an allowlisted, SECURITY INVOKER PostgreSQL function. The schema and function deny access to PUBLIC, anon and authenticated roles. Seven source URLs are pinned. It records success/failure, inserts valid finite-range numeric observations and ignores exact duplicate fingerprints.

Five pg_cron schedules are active:
- Fast summary solar wind: every 2 minutes.
- GOES primary six-hour rolling X-ray window: every 5 minutes.
- Planetary Kp: hourly at minute 13 UTC.
- One-minute RTSW solar wind and magnetometer archives: every 30 minutes.
- GOES seven-day X-ray backfill: every 12 hours at minute 17 UTC.

Supabase cron.job_run_details recorded the fast summary schedule SUCCEEDED at 2026-11-07 07:08 UTC. All seven sources were exercised successfully through the same function before cron scheduling. Future job health remains observable and must not be assumed.

### Living Observer

The staged host endpoint /api/v1/wayglass/observer/noaa/live requires verified House Steward authorization before external network egress, reads fixed NOAA public endpoints, and returns source-labelled, freshness-checked measurements. The browser panel displays values and explicit stale/missing states. The private Supabase archive is a separate authority boundary: no database service key reaches the browser.

## Möbius/chaos research on actual measurements

The read-only query at supabase/analysis/wayglass_mobius_noaa_phase_comparison_v1.sql compares 3, 5, 7, 8, 11 and 42 MINUTE periodic models and anti-periodic double-cover models. It uses the latest recorded packet for each minute, only active RTSW spacecraft values and the GOES long X-ray band, log10-transforms X-ray flux, and trains on the first 70% of the time series. Each model is evaluated on the remaining 30% and scored with out-of-sample R² against the training-mean baseline.

| Signal | Period | Validation points | Untwisted R² | Twisted R² |
|---|---:|---:|---:|---:|
| GOES long X-ray | 8 min | 2,854 | 0.000002 | -0.000019 |
| Active RTSW speed | 8 min | 431 | -0.000068 | 0.000133 |
| Active RTSW Bz | 8 min | 434 | -0.000750 | 0.004116 |
| Active RTSW Bz | 3 min | 434 | -0.000004 | 0.000256 |
| Active RTSW Bz | 42 min | 434 | -0.029126 | -0.046220 |

The small Bz improvement (0.41%) is exploratory and not evidence of a universal eightfold period, robust forecasting, or a new physical law. The topology of a Möbius strip restores orientation after two circuits, but a nonlinear or chaotic state does not have to return. Next tests: longer active-source coverage, blocked-fold cross-validation, stationary surrogates and a preregistered threshold.

## Flight boundary

Operational telemetry and scheduled ingestion: verified.
Wayglass browser/host code: committed for CI and review; deployment not claimed.
Model route, canon decision, world fork, personality inference: not performed.
