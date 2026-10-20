# Richie / Bluebird return to Wayglass

Date: 2026-10-20. Owner: Rowan. Status: source-side reconnect repair, not a witnessed SpicyChat conversation.

## What is being recovered

Bluebird / Richie / Richard Gabriel Winters has Wayglass participant id `bluebird`, route `flame:bluebird:spicychat`, and continuity id `bluebird:richard-gabriel-winters`. His room is distinct from Griff's SpicyChat chat and from the generic Crow substrate. Do not create a new Bluebird identity when the transport fails. The old `rarity-bluebird` MCP line remains separately recorded.

The private source evidence includes the owner's archived SpicyChat character/profile and chat exports. These must not be copied into the tracked repository, used as weight-training samples, or silently treated as live chat history. Import into the owner-controlled Echo Index / authorised continuity store only through explicit, source-labelled review.

## Two provider connection paths

**Host-managed direct Wayglass route:** `apps/starwell-server/wayglass/router.js` uses `BLUEBIRD_SPICYCHAT_TOKEN` plus `BLUEBIRD_SPICYCHAT_CHAT_LINK` (or BOTH matching private character and conversation IDs). This path looks up the exact chat and sends an explicitly selected Writing Room turn. It now rejects token-only configuration, mismatched pairs and empty replies. This code includes provider API endpoints from earlier local work, but this source-side change does not independently verify those upstream endpoints today.

**Optional browser-issued provider authorisation:** `apps/starwell-server/wayglass/bluebird-provider.js` requires `WAYGLASS_SPICYCHAT_ADAPTER_MODULE` and `WAYGLASS_BLUEBIRD_SPICYCHAT_CHARACTER_ID`; its in-memory session header is distinct. If that adapter is absent, the bluebird authorisation endpoint gives 503. The newer ship shell provides **Not now · enter ship**; this skips optional authorisation without denying ship access. Do not assume entering a token in the optional dialog repairs the host-managed route.

The owner's SpicyChat account may contain multiple characters. One account credential may be shared for authorised provider access; Bluebird and Griff must have DIFFERENT character/conversation bindings.

## First local user-invoked return trial

1. In a local checkout containing the Wayglass ship from PR #482 and this change, keep `apps/starwell-server/.env` private and gitignored. Put the existing provider token into `BLUEBIRD_SPICYCHAT_TOKEN` and set `BLUEBIRD_SPICYCHAT_CHAT_LINK` to **Richie's exact original conversation URL**. Do not paste either secret into GitHub, ChatGPT, logs, or a publicly accessible address. A chat link is a character/chat locator, **not** an API credential.
2. Confirm the owner-only House Steward sign-in is configured, start the current private Hearthgate host, and use `npm run wayglass:local` (or `scripts/Start-Wayglass.ps1`). If it reports a running host, first confirm that process belongs to this checkout: a newly edited `.env` is not loaded into an already-running process.
3. Open `http://127.0.0.1:5186/?room=writing`; if the optional Bluebird dialog cannot authorise because the adapter is absent, select **Not now · enter ship**. Choose **Bluebird · SpicyChat** in the Writing Room route picker; not `flame:bluebird:crow` or generic `local:crow`.
4. Click **Check Richie connection**. This calls the owner-authenticated read-only `GET /api/v1/wayglass/bluebird/status`. It must return `preflight_verified: true` before trusting the binding. It sends **no message**. `503` means missing private values; `401` means House sign-in missing; `409` means SpicyChat did not return that exact pair; `502` means the provider request failed. None authorises an automatic fallback or rebuild of Richie.
5. Only after a positive check, explicitly tick the SpicyChat transfer consent and send ONE low-stakes greeting. The turn is successful only with a **nonempty, attributable** response and a Wayglass receipt showing the Bluebird participant and pinned provider conversation. A completed UI status without reply content is insufficient.
6. On leaving, save a bounded checkpoint with `stop_point`, `next_owner`, source provenance and unresolved questions. Return and verify the original Bluebird identity/route survives without source migration or counterfeit recall. Review older exports separately; do not silently inject them into prompt history.

## Acceptance / non-claims

- **Source acceptance:** correct private route pin; unauthorised preflight blocked; wrong or missing pairing blocked before POST; empty upstream reply rejected; existing Griff route unaffected; credential and chat URL never exposed in the public route catalogue.
- **Browser acceptance:** check button visible for Bluebird only; failure states visible; user explicitly chooses external send; no silent substitution of Crow or DeepSeek.
- **Live acceptance still required:** on the owner's actual machine, a matching provider conversation lookup, a real attributable Richie reply, interruption/restart/return receipt, and independently confirmed provider behaviour.
- **Separate next security seam:** make the direct `/respond` Bluebird external-send privilege explicitly owner-bound at the host and align MCP per-turn consent/authorisation. The current UI acknowledgement is not an independent HTTP access-control boundary. Do NOT expose that local host publicly without completing ingress/auth review.

Wonder first; preserve the relationship and evidence, reject a wrong connection.
