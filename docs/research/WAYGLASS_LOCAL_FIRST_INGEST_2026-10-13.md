# Wayglass OS local-first engineering ingest | 2026-10-13

Product lineage: **Wayglass OS is the evolution of ArcSweep**, not a second competing system. Existing `apps/arcsweep` paths are inherited implementation locations. Follow `apps/arcsweep/contracts/WAYGLASS_OS_ARCSWEEP_EVOLUTION_V0.1.md`.

Status: implementation research and bounded experimental score adapter; NOT deployment proof.

## Sources: how, why, where
- Meadow (https://github.com/TheFeloniousMonk/meadow-node): `backend/src/proto/event.js` canonical signed event validation; `backend/src/api/sync.js` bounded outbox and room-head synchronisation; `app/src/core/identity.ts` Ed25519 client identity; `app/src/core/mcp.ts` local client access. Reason: independent agents can communicate with attributable authorship. Wayglass takes protocol separation and test ideas; it DOES NOT use Pocket calls, wallets, or port Meadow AGPL code in this patch. Any future direct reuse requires AGPL review.
- Molequle (https://github.com/TheFeloniousMonk/Molequle): `client/js/sim.js` pure deterministic state without browser dependencies; `tools/molequle-play.mjs` headless recipe and hash verification; `client/js/context-map.js` accumulated environmental conditions. Reason: reproducible, historically conditioned simulation. Take architectural patterns, not source code. Licence was not established in this review.
- Weather Report (https://github.com/TheFeloniousMonk/weather-report): `weather-report.md` fixed diagnostic items; `weather-dashboard/python/weather_report_loader.py` ingestion; Electron dashboard renders derived readings. Reason: longitudinal comparison. Preserve self-report as self-report; do not confuse it with objective internal state. MIT.
- poktroll (https://github.com/pokt-network/poktroll): `proto/pocket/service/relay.proto` typed request/response, origin signatures, response hash; Go/Cosmos infrastructure. Reason: network relay accountability. Learn wire-contract discipline, not blockchain dependency. MIT.
- Wayglass: `apps/arcsweep/src/house-commons-chat-v5-core.js` already distinguishes roster and runtime presence; `apps/arcsweep/contracts/WAYGLASS_TRAVELLING_INHERITANCE_V0.1.md` assigns identity to the continuity kernel; `assets/mobius-audio-bus.js` already owns the Web Audio buses and Feather Stop.

## Adopted boundary
Wayglass kernel validates continuity => pure sonic score selects a display-only cue => Möbius may render with opt-in policy. Never derive presence from a configured name. Never make audio authority. Operational and audio statuses are orthogonal. No automatic audible playback. Feather always stops all audio.

This patch implements `apps/arcsweep/src/wayglass-sonic-score.js` as a pure, local, no-network score selection interface plus focused contract tests. It intentionally does NOT wire live audio, change identity state, or deploy a connector. The next bounded seam is a trusted adapter from an actual kernel validator result, paired with a rendering-only Möbius API.

## Cost boundary
Local event handling, test harness and procedural Web Audio are free of per-request API fees. Pocket, hosted inference, wallets, and paid relay polling remain optional. Do not mistake service-fee zero for zero hardware or electricity cost.

## Acceptance tests
`node --test apps/arcsweep/test/wayglass-sonic-score.test.js`
Acceptance: all named states select distinct cue records; muted, unavailable and error do not masquerade as success; unvalidated results rejected; corrupted continuity maps to validation-failed only when the authoritative kernel has already classified it.
