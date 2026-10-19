# ArcSweep ↔ Wayglass Passage · 2026-10-19

## Status
Implemented on `rarity/arcsweep-wayglass-passage-20261019` as a reviewable change against `wayglass/current`. This is source work, **not** proof of deployment, authentication, live model/provider contact, desktop/mobile browser approval, or a continuation deed being transferred.

## User journey
1. Open ArcSweep. A labelled **Enter Wayglass** link appears beside the room navigation and selected active portal; the mobile **More** sheet exposes the same entrance.
2. The link resolves to the sibling Wayglass host when staged by Hearthgate (`/arcsweep/` → `/wayglass/?room=writing`). Separate local dev ports 5184/5186 and preview ports 4184/4186 are paired explicitly.
3. Wayglass opens its existing Writing Room, including its existing route picker, character controls, world selector, private Observer boundary and provider approval gates. An **ArcSweep Passage** dock shows the offered source-world *ID* and a reversible **Return to ArcSweep** link.
4. A world seat is **never silently created or selected** from an ArcSweep hint. If an exact Wayglass world seat already exists, a user-invoked button can select it using the existing world-change event. If not, the dock states that no mapping exists.
5. The expandable **Latest source & verification notes** panel is a dated index of the consolidated source and currently proposed work, linked to immutable review entry points. It is intentionally **not** represented as a live feed or a deployment health check.

## Boundaries
- A URL carries `from=arcsweep`, `room=writing`, and an optional validated, bounded `world` ID, nothing more.
- No memory, PREMAQC values, credentials, identity assertions, relationship state, signed receipts, canon decisions, authorisations, or private archives cross through URL parameters.
- No alternate return URL is accepted. The reverse link is derived from the current host and known sibling app path, preventing open redirects.
- Existing Wayglass authentication and provider consent remain unchanged. Source information and open PRs do not grant runtime authority.
- Newest-info index in `lib/arcsweep-wayglass-passage.js` is as-of **2026-10-19**. Update its date and citations as work is reviewed or merged. Do not silently display aged notes as live runtime evidence.
- `main` does not yet include all Wayglass surfaces. Deploy both apps from a compatible reviewed ref or deliberately promote Wayglass first; cross-app URLs may be absent on older independent releases.

## Evidence and acceptance
Read-only test command:

```bash
node --test apps/wayglass/test/arcsweep-passage.test.js
```

Expected: paired dev/preview and staged routing, bounded world ID and non-authoritative arrival parsing, hostile-query open-redirect resistance, accurate source links, and both UI entrance wires.

Browser signoff remains a distinct step:
- Run ArcSweep 5184 and Wayglass 5186, check keyboard and 375px mobile More sheet.
- Select a world in ArcSweep, click **Enter Wayglass**, inspect the offered world ID without imported memories.
- Verify matching seat requires an explicit click; unrecognised seat makes no selection.
- Switch Wayglass surfaces, return to Writing Room, and click **Return to ArcSweep**.
- Stage the two built apps under Hearthgate and verify sibling routes and host authorisation (on-device).
- Recheck live source freshness, deploy target, and user-approved continuation separately.

## Follow-on
A real continuation packet should be an authenticated, user-approved **host handoff**, independent of this navigation contract, with strict actor/source custody, stop-point, next-owner, provenance, revocation and explicit return receipts. Do not add packet data to URL parameters or treat source-world label equivalence as verified identity.
