# House Runtime Observation Live Read v1

**Status:** released and verified on 2026-08-14; write-side Braid v1 included

## Purpose

Field, Relational Feedback, DEEP Observer, and House Commons must not build separate interpretations of the same observation. The House Runtime therefore exposes one read-only canonical snapshot from the persisted observation, human-review, and DEEPTime ledgers.

The contract follows the Observer Charter: source evidence remains source evidence, interpretation stays labelled, Qualia remains firsthand, review is explicit, and nothing advances into DEEPTime without a human acceptance receipt.

## Canonical snapshot

`hearthgate.runtime-observation-snapshot/v1` carries six visible faces:

1. `observation` — source, mode, timestamp, work, PREMAQC coordinates, voices, and ledger status;
2. `review` — pending, accepted, archived, or discarded, with the human review receipt when one exists;
3. `evidence` — Field, relational observation, or relational feedback classification plus the original evidence schemas;
4. `provenance` — cycle, Math Spine, replay, review, DEEPTime, and source receipt identifiers;
5. `continuity` — awaiting review, accepted awaiting DEEPTime, entered DEEPTime, archived, or discarded;
6. `latest_receipt` — the most recent explicit receipt in that chain.

An old observation row whose legacy status is `accepted` does not count as a human review. Only a matching review receipt may set `review.status` to `accepted`.

## Live endpoint

`GET /api/v1/house/observations?world_id=<world-id>`

- requires the sealed House Runtime session or the native bearer compatibility path;
- reads the private Supabase observation, review, and DEEPTime ledgers with the server-held service role;
- returns `hearthgate.runtime-observation-live-read/v1`;
- accepts an optional world filter and a bounded result limit;
- sets `Cache-Control: no-store`;
- performs no review, acceptance, canon, model, or world-state mutation.

## Consumers

- Relational Feedback renders the current shared snapshot beside the local review queue.
- DEEP Observer renders the same current shared snapshot before ambient channels.
- House Commons renders the same snapshots as an accessible live observation log while retaining its separately attributed conversation log.

Consumers render the broker classification directly. They may format it, but may not reclassify evidence, infer review, or manufacture continuity.

## Persistence

The migration adds private, RLS-enabled ledgers:

- `arcsweep_feedback_reviews`
- `arcsweep_deep_time_records`

Both are readable through the sealed broker only. The observation mode constraint is expanded to the already-supported `writing`, `roleplay`, `observation`, and `reflection` modes.

## Write-side continuation

House Runtime Braid v1 mounts explicit review and DEEPTime commands plus a brokered Supabase Realtime stream without relaxing the human gate. See `HOUSE_RUNTIME_BRAID_V1.md` for its packet, event-spine, command, and release contracts.
