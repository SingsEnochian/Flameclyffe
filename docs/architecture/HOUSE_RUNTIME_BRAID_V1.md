# House Runtime Braid v1

**Status:** implementation and full release gate verified on 2026-08-14

## Purpose

The House Runtime Braid is the first app-wide continuity spine. It gives every participating organ one immutable identity for the same observation while allowing the state to advance through explicit revisions.

The Braid does not merge perspectives. It carries their separately attributed evidence, decisions, receipts, and continuations through one shared lineage.

## Canonical packet

`hearthgate.runtime-braid-packet/v1` carries:

- one `continuity_packet_id` derived from the world and receipted observation cycle;
- a revision and stage: awaiting review, reviewed, or entered DEEPTime;
- the active receipted PREMAQC state;
- separately attributed voice and reviewer actors;
- the human review gate and its receipt;
- firsthand-only Qualia presence without model inference;
- Math Spine, replay, observation, review, and DEEPTime lineage;
- explicit authority flags preventing silent canon merge or physical claims.

Packet revisions receive new packet identifiers and fingerprints while retaining the same `continuity_packet_id`.

## Append-only event spine

`house_runtime_events` stores `hearthgate.runtime-braid-event/v1` rows. Each row has a monotonic `event_sequence`, unique command idempotency key, continuity identity, source receipts, packet fingerprint, and complete packet payload.

The table:

- rejects updates and deletes with a database trigger;
- denies browser roles and remains readable only through the sealed House Runtime;
- publishes inserts to Supabase Realtime;
- supports cursor replay after a disconnect.

The migration also closes the legacy anonymous read policy on `arcsweep_feedback_cycles`; observation cycles, human reviews, DEEPTime records, and Braid events are all read through the sealed broker.

## Sealed commands

`POST /api/v1/house/observations` accepts `hearthgate.runtime-braid-command/v1` only after House Runtime authentication.

Supported commands:

1. `review-observation` with the explicit decision `accepted`, `archived`, or `discarded`;
2. `admit-deeptime`, which requires the already-persisted accepted human review.

The security-invoker RPC `house_runtime_apply_observation_command` writes the human review or DEEPTime record and its Runtime Braid Event in one database transaction. It is executable by the server service role only, uses explicit least-privilege table grants, and has an empty SQL search path. Repeated command identifiers return the existing event instead of duplicating it, while reuse against another cycle or action fails as a lineage conflict. A cycle-scoped transaction lock serialises competing commands, and a second, different review cannot overwrite the first.

## Private live transport

`GET /api/v1/house/braid/stream` is an authenticated server-sent event stream. The server holds the Supabase service role, subscribes to private Postgres insert events, and forwards only the requested world. The browser never receives Supabase credentials.

The stream:

- subscribes before reading backlog;
- buffers live events during cursor replay;
- deduplicates by monotonic `event_sequence`;
- accepts `cursor` or `Last-Event-ID` for resumption;
- sends a bounded stream and asks the client to reconnect with its latest cursor.

Hosted and native clients consume the stream with authenticated `fetch`, so both cookie and bearer custody remain supported.

## Mounted surfaces

Relational Feedback, DEEP Observer, and House Commons display the same Braid revision beside the canonical observation snapshot. Pending snapshots expose the explicit review commands; accepted snapshots expose DEEPTime admission. A successful insert arrives through the live stream and refreshes the shared snapshot in every mounted surface.

Local archives remain available. When a locally queued cycle is also present in the relational ledger, its review button writes through the broker before changing the local mirror.

## Authority invariants

- Deterministic cycle verification is not human acceptance.
- Qualia is firsthand-only and is never inferred.
- DEEPTime requires a matching accepted human review receipt.
- Unknown and Open remain valid states.
- Runtime events are append-only.
- A transport session grants access, not consent to transform, canonise, or embody.
- No command in this cut commits canon.

## Next cut

After release verification, mount the same Runtime Braid Packet as the sole active context in the remaining Arcsweep rooms, Requested Transformation, Waking World Ask, the Constellation model router, Runa, Wardenclyffe, Flameclyffe/Möbius, and Replay.

## Local verification

- Contract provenance guard: passed.
- Runtime Braid packet, command, migration, stream, client, UI-mount, and relational-sync tests: passed.
- STARWELL regression suite: 180/180 passed.
- Dependency-installed Arcsweep regression suite: 215/215 passed.
- Node syntax checks for every changed runtime and Netlify module: passed.
- STARWELL and Arcsweep Vite production builds plus Netlify staging: passed.
- `git diff --check`: passed.
