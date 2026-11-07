# Wayglass Möbius + chaos, real NOAA observational preflight (2026-11-07)

## Actual source acquisition

NOAA SWPC public datasets were pulled directly, not invented, during the 7 November research session:

- GOES Primary X-ray 7-day archive: `https://services.swpc.noaa.gov/json/goes/primary/xrays-7-day.json` (20,146 records at observed snapshot).
- Realtime Solar Wind 1-minute plasma: `https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json` (approximately 4,212 records at database ingest).
- Realtime Solar Wind 1-minute magnetic: `https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json` (approximately 4,261 records at database ingest).
- Plus three-hour planetary Kp and shorter solar summaries from official NOAA SWPC products.

## Supabase observed-data coverage (not a simulated payload)

Verified read-only query to the Flameclyffe `public.observer_measurements` table: **46,100 stored measurement rows** across seven completed NOAA ingestion runs, no recorded errors. These include 20,146 X-ray samples, 12,636 plasma metric rows, 12,783 magnetic metric rows, 174 Kp-family rows, 358 short X-ray history samples, and three summary metrics.

Measurements remain private (RLS enabled); the existing project has **no anonymous/authenticated read policies** for those tables. No browser or live model access to private rows is inferred from successful ingestion. The loaded archive is real; continuous ingestion and owner-authenticated Wayglass reader must be verified separately.

All raw NOAA records are attributed with instrument/channel, observation timestamps, unit, original endpoint, quality state and provenance, as queryable database fields. Magnetic and plasma streams retain both active and inactive spacecraft sources: a single time can have multiple physical instrument records. Analysis filters to `active === true` for one selected time series; do not pretend all 12k metric rows represent 12k independent minutes.

## Initial exploratory lag benchmark, independently executed against raw NOAA observations

A first-difference autoregressive ridge pilot compared 3,4,5,6,7,8,9,10,11,12,16 one-minute memory windows over chronological validation folds. This first pilot did not always use identical gap-free holdout support for every candidate, so ranks are exploratory and are not used for promotion:

| NOAA signal | First-pilot best lag | Eight's rank out of 11 |
| --- | ---: | ---: |
| GOES long 0.1–0.8nm | 16 | 6 |
| GOES short 0.05–0.4nm | 12 | 7 |
| Plasma proton speed | 3 | 7 |
| Plasma proton density | 16 | 7 |
| Plasma temperature | 6 | 5 |
| Magnetic total Bt | 5 | 6 |
| Magnetic Bz GSM | 7 | 2 |
| Magnetic By GSM | 5 | 6 |

The versioned instrument in `apps/arcsweep/src/noaa-mobius-chaos-benchmark.js` improves comparison validity by using one common gap-free validation support, training-only standardization, identical chronological folds and a no-change baseline. `scripts/wayglass-noaa-mobius-chaos.mjs --live` fetches *real* NOAA raw JSON from a fixed HTTPS allowlist, refuses empty/invalid records, and writes reproducible per-channel derived metric receipts. Test fixtures never appear as live science.

## Discovery separation

A mathematical Möbius traverse reverses local orientation after one circuit and restores it after two. This topological fact does not imply an eight-minute oscillation in the solar wind. Eight *Wayglass organizational folds* are different from eight lags of an autoregressive predictor. The archive tests prediction-window utility, not an ontological claim that a physical solar event is Möbius-shaped or that deterministic chaos has been established.

The next direct eightfold architectural test should measure **orientation-sensitive holonomy, invariant survival, continuity under controlled re-entry, and parity with an untwisted control**, using actual Wayglass Return Engine receipts. No canon promotion, automatic branching, live participant impersonation, or user-specific private data disclosure is authorized by this instrument.

## CI / live operations

`node --test apps/arcsweep/test/noaa-mobius-chaos-benchmark.test.js` is the offline deterministic gate. The GitHub workflow runs tests on PRs; a non-PR run fetches and benchmarks public NOAA observations and uploads a JSON receipt. GitHub cron scheduling is only active when the workflow is present on the repository's **default branch**, currently not guaranteed by landing a draft PR in `wayglass/current`. A green PR cannot be described as proof of recurring scheduled collection or authenticated in-app visualization.
