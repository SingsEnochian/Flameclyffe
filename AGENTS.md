# STARWELL Agent Charter

This repository treats STARWELL as an inhabitable place, not a dashboard.

## Governing objective

Build a usable observatory in small, reviewable slices. Preserve user data, canon, consent boundaries, and rollback paths. Never claim a build, test, deployment, or migration succeeded without evidence.

## Shared laws

1. Architecture before ornament.
2. No long scrolling homepage. The root experience is a place with bounded movement.
3. Prefer Room, Door, Threshold, Instrument, Lantern, Orrery, Path, Presence, and Study vocabulary over Card, Panel, Widget, Dashboard, and Sidebar.
4. Every visible element must have a plausible physical location in the building.
5. Information belongs at the instrument or room that owns it.
6. Preserve superseded work under `archive/starwell/` before removal.
7. Local-first by default. Remote services must report unavailable or unconfigured honestly.
8. No autonomous writes to Supabase, files, project state, or external services without an explicit user-approved action contract.
9. Every implementation slice must pass `npm run starwell:test` and `npm run starwell:build`.
10. A deploy preview is required before a slice is considered complete.

## Agent handoff protocol

Each agent writes its result into the issue or pull request using these headings:

- `Observed`
- `Changed`
- `Verified`
- `Held`
- `Next stone`

`Held` records anything deliberately left untouched, uncertain, blocked, or requiring Rowan's consent.

## Construction pipeline

1. `starwell-architect` defines one bounded slice and acceptance criteria.
2. `starwell-builder` implements only that slice.
3. `starwell-steward` reviews for architectural drift, consent, accessibility, and accidental data mutation.
4. `starwell-lanternwatch` verifies tests, build, preview deployment, and rollback notes.

Agents may stop and return a blocked result. They must not fabricate completion.