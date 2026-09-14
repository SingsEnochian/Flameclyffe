# Time Room Doorways v0.2

The Time Room now has hinges.

A doorway is not a teleport command and it is not an autonomous routing decision. It is a bounded recommendation derived from the current Time Room reading and mapped onto an existing ArcSweep room. The clocks may name a door; only a human action opens it.

## Runtime path

`Time Room snapshot → doorway recommendation → explicit human confirmation → os.navigate → context capsule → doorway receipt`

The doorway service exposes two capabilities:

- `time-room.doorways` is read-only. It returns ranked doorway candidates for the current universe and readiness state.
- `time-room.enter-doorway` is `operate`, requires confirmation, recomputes the current doorway set before entry, routes only to a doorway present in that set, and returns a receipt containing the observed destination and context capsule id.

The Guide may read doorway recommendations. The Guide is not granted `time-room.enter-doorway`.

## Hold law

Readiness states `resting` and `waiting` keep doorway cards visible but mark them non-enterable. A held door remains information, not permission.

## Context law

Doorway entry uses the ordinary ArcSweep `os.navigate` path. It therefore creates the same context capsule used by other OS navigation rather than inventing a parallel state mechanism. The patch preserves project, scene, and document context while selecting the Time Room universe as the active world, except when the selected profile is the Time Room itself, where the existing active world is retained.

The capsule records that the source was `time-room-doorway`, that human confirmation was required, that autonomous entry is false, and that no canon promotion occurred.

## Universe doors

The initial doorway map is deliberately small and deterministic:

- Terra Aeterna: Worlds, Records, Forge
- The Luna Who Called Down the Moon: Scripts, Records
- Ta’veren Vaen: Scripts, Records
- Star Trek Reboot +160: Scripts, Records
- Bluebird Grove: Records, House Commons
- Hearthweave: House Commons, Worlds
- Observer Chamber: DEEP / Field, Records
- Time Room: Portal, Worlds, Records
- Unregistered worlds: Worlds, Records

This mapping is routing infrastructure, not canon. Future versions can let worlds declare their own doorway topology without changing the human-confirmation law.

## Receipts

Contracts introduced in v0.2:

- `arcsweep.time-room-doorway/v1`
- `arcsweep.time-room-doorway-set/v1`
- `arcsweep.time-room-doorway-receipt/v1`

A successful doorway receipt records the doorway id, universe id, origin room, destination room, human confirmation, nested OS navigation call id, context capsule id, and entry time. It carries no private body or story prose.

## Core law

> The clocks may reveal a door. They do not turn the handle.
