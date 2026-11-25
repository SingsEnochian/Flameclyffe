# Return Trial 004 · One Ship verified-work return · 2026-11-24

## Focus Router

- **State:** NOW
- **Mission / train:** issue #583 / PR #661
- **Source candidate:** PR #648 at `e3463d7511fac4919ba7a6f096242bdc63584730`
- **Duplicate review:** #504 and #603 already prove cold persistence; #658 carries acoustic Return; #648 proposes model task selection but depends on an Amber route not present on #661. This port reuses the existing Return evaluator and authenticated host instead of adding a second ledger, route registry, room or raw-provider path.
- **Finish line:** exact-head selection and host-transport tests pass; a corrupt packet causes zero host requests; fixture transport cannot claim a live model.
- **Return marker:** Built / verified locally / live route held pending an attributable host response.

## Ship-native crossing

The first integration-train trial uses two existing Wayglass routes:

- departure: `wayglass:ship`
- return: `wayglass:crow`
- participant: `wayglass`

The returning route receives only the verified request derived from the stop receipt and continuation packet. It must echo identity declarations, the stop point, named `next_owner`, unresolved Wonder questions and provenance, then select exactly one non-revoked task already held in `active_work`.

The host runner reads only the authenticated Wayglass route catalogue and `/respond` boundary. Optional House bearer/cookie values come from process environment and are never written to receipts. There is no raw Ollama/provider bypass.

## Rejection gates

- continuity corruption, identity merge or false closure stops before any host request;
- absent, unconfigured or differently owned return routes stop before a model call;
- returned route, participant or model drift rejects the response;
- invented or revoked work cannot be selected;
- a host fixture may verify transport shape but cannot set `live_model_verified`;
- missing provider-native identifiers use an explicitly labelled content-addressed host-turn digest, never an invented upstream ID.

## Observed live boundary

On 24 November 2026, `https://wayglass.world/api/v1/wayglass/routes` returned HTTP 503 with an upstream connection failure before House authentication. This executor also has no Wayglass House session or private loopback route. No returning model reply was requested, inferred or fabricated.

The next independent action is mechanical when the already-authorised host is reachable: run `scripts/wayglass-return-trial-004.mjs` with a verified stop/continuation input and environment-provided House authentication. The runner writes an atomic receipt and exits successfully only after one attributable returning model selects verified work without altering continuity.

## Provenance and rollback

- source selection contract and transport design: PR #648;
- cold Return / corruption lineage: PR #504, #603 and canonical Return modules;
- One Ship integration authority: #583, #661 and `docs/wayglass/ONE_SHIP_DIRECTIVE.md`.

Rollback is the single scoped removal of the selection contract, host runner, CLI, tests, this record and matching register entries. Existing stop/return stores, routes and host behaviour remain unchanged.
