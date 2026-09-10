# ArcSweep OS alpha.7 integration evidence

## Fault and change

The OS `os.navigate` capability previously advanced context without moving the visible room. The conversational Caretaker had a separate DOM-click adapter. Both now use the bounded Guide capability path: model plan → Caretaker adapter → Guide allowlist and firewall → OS navigation → enabled room button → observed active room → context capsule → workspace readback → capability receipt persistence.

Navigation only advances context after the requested room is observed. Active workspace world identity takes precedence over a model-supplied world ID. Feather is checked again after asynchronous workspace loading. Ordinary room clicks are recorded only after observing their result.

OS sessions, bounded context capsules, and bounded capability/repair receipts use the existing Hearthfire workspace extension and local/desktop storage path. Readback uses persisted state without in-memory extension overlays. Existing authenticated workspace mirroring can carry this extension; this change does not claim a verified cloud write. An unreadable or invalid saved context blocks automatic workspace overwrite until restart and successful loading.

Caretaker now supervises the actual session context cache. It detects divergence from the active session, performs a bounded repair, and validates the result. Repairs require a rollback callback and independent restoration verification before mutation. Failed checkpoint capture is contained without applying a repair. Failed restoration is escalated, never labelled rolled back.

## Executed checks

- `npm run arcsweep:test`: **1,059 passed, 0 failed**.
- `npm run arcsweep:build`: **passed**.
- Integration tests drive the real room-navigation adapter against controlled DOM fixtures and the real workspace adapter against a persistence fixture.
- Guide navigation selects the requested fixture room; preserves project and goal; binds the actual workspace world; leaves an unrelated drawings field untouched; stores the observed call receipt; restores room, context, and receipt in a fresh OS instance without its session cache.
- Unknown and ineffective room controls do not advance context.
- Feather prevents cache repair and interrupts navigation while workspace context is loading.
- Corrupt session cache is repaired once; recurrence exhausts the automatic repair budget and is escalated.
- Failed repair validation restores the captured state; missing rollback contracts and capture failure do not mutate; unverified or throwing rollback escalates.
- A silently dropped workspace write fails readback. An unreadable workspace is not overwritten by later capability receipts.

## Remaining verification and scope

The local Vite app started successfully at `http://127.0.0.1:5184/`. Cloud browser navigation was blocked with `net::ERR_BLOCKED_BY_CLIENT`. No live browser interaction is counted as passed for this branch. DOM fixtures are not hardware or production evidence.

Still required before promotion: authenticated conversational navigation in the deployed app, full browser restart restoration, Supabase readback of the context/receipt, and real iPad touch/Pencil checks. Preservation of an unrelated drawings field is not proof of canvas strokes surviving browser interaction.

Checkpoints and repair budgets remain in memory. This milestone supervises one derived-state service; it does not implement general source repair or swarm execution. `clearPersistedContext()` retains its session-cache-only behaviour; durable workspace context is retained and can recover that cache. The legacy model conversation receipt remains explicitly local-replayable; it is not represented as a verified Runtime Braid receipt.
