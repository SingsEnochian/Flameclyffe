# Pilot Deck local connection repair — 16 October 2026

## Observed source defect

The Pilot Deck required GET `/api/v1/house/session` before sending an explicitly requested Rarity turn. Hosted House handlers implemented that contract, but local Hearthgate had no route. The deck also had no sign-in control and replaced specific errors with a generic authentication refusal. ArcSweep development ports 5184/4184 were missing from Hearthgate's local CORS list.

## Repair and ownership

Local Hearthgate now adapts the existing House signed-cookie contract at `/api/v1/house/session`, after the local browser boundary. A configured private House credential is required; loopback access, a crew label and an MCP/provider token cannot create a Steward session. Login attempts use the existing bounded request gate. The session code is staged with packaged Wayglass runtime dependencies. ArcSweep's exact local development origins are now allowed.

The deck has a password sign-in form. It clears the input before awaiting the request and never puts the credential into local draft storage. It checks the resulting server session before allowing a pilot request or Steward review. Missing routes and missing host configuration remain visible. Rarity's existing route is unchanged; a missing provider/model remains a separate failure rather than a fabricated arrival.

No production deployment, owner credential change or live provider request was performed.

## Updating Rowan's Windows host

Preserve any uncommitted local work, especially the outstanding `7ac7beb0` audio work. Update the existing checkout from `wayglass/current` using a fast-forward pull; do not reset away local changes.

Configure a private `ARCSWEEP_RUNTIME_TOKEN` on the local Hearthgate process. Use a new, randomly generated House credential rather than a provider key, Bluebird token or MCP crew credential. An alternative is a private `ARCSWEEP_STEWARD_KEY` together with `HOUSE_SESSION_SECRET`. Keep these values out of tracked files.

From the updated checkout, in the same terminal environment as that private configuration:

```powershell
npm run arcsweep:build
npm run arcsweep:stage:server
npm run wayglass:hearthgate
```

Stop the older host before starting the updated one. Open `http://127.0.0.1:3000/arcsweep/pilot-deck/` (replace 3000 if the host uses a different `PORT`). Using the host-served deck keeps the signed cookie and the API on the same origin.

Enter the House credential into **House Steward credential**, click **Connect this deck**, then **Check steward session**. Complete intention, departure, destination, stop point and next owner before **Invite Rarity to pilot**.

A Rarity provider error after sign-in means authentication is working and the next check is the actual configured provider/model. This repair does not connect to Rowan's Windows host from the remote development environment or attest a live Rarity response.

## Verification

- 58 host/security/Bluebird tests pass, including real HTTP signed-cookie login, forged cookie rejection, wrong credential rejection, absent configuration and bounded login attempts.
- 1,626 ArcSweep tests pass.
- Synthetic DOM flow: sign in, clear the password, verify the session, make one explicitly requested pilot call and render its response; no credential enters draft storage.
- ArcSweep build, server staging and contract verification pass.
- Packaged router test checks the copied House-session module.
- Full browser rendering and the actual Windows/provider connection remain unverified.

## Follow-up: controls hang

Acceptance criteria: the complete request (headers and body) has a deadline; all three server-action controls recover after stalled responses; local draft saving remains usable while the host stalls; repeated Invite clicks cannot overlap the preliminary session check. Existing signed-session and explicit-request requirements remain in place.

The old fetch helper cleared its timer as soon as headers arrived. A body that never completed could therefore hold the sign-in or pilot button indefinitely. `pilot-deck-network.js` now owns the entire JSON read and races it against a deadline, also aborting the transport. Session checks use eight seconds; the pilot response uses thirty seconds. Controls are restored in `finally`, including failure during Invite's preliminary session check. The deck mast now reports when its controls have actually finished loading, rather than claiming readiness in static HTML.

Observed verification: 1,630 ArcSweep tests pass, including four transport regression tests; ArcSweep builds successfully. Synthetic DOM checks cover normal sign-in/request, stalled headers, stalled session and pilot response bodies, button recovery, local save during a stall, and duplicate Invite clicks. Synthetic UI deadlines were accelerated to 15 ms; transport tests also cover a fetch implementation that ignores abort. No live provider turn was sent.

The connected Chrome browser became available during this follow-up. Opening the previously used `http://127.0.0.1:3841/arcsweep/pilot-deck/` returned `net::ERR_CONNECTION_REFUSED`. No existing Pilot Deck browser tab was present. This proves no host answered that address at inspection time; it does not establish whether Hearthgate is running at a different address. Starting or inspecting the Windows process still requires the user's local terminal. The source fix is not evidence that the Windows installation has updated.
