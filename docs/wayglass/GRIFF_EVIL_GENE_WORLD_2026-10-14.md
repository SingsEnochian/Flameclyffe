# Wayglass: The Evil Gene / Griff Krenshaw world seat

**Status:** world selection and provenance are implemented on the feature branch. **Live Griff SpicyChat replies are NOT verified, enabled, or claimed.**

## Distinct entities
- **Film world:** `evil-gene:film-2015` → *The Evil Gene* (2015), directed by Kathryn F. Taylor, IMDb `tt3631282`.
- **Character:** Griff Krenshaw, an FBI agent investigating a murder at a federal correctional facility; performed by Richard Speight Jr.
- **SpicyChat continuity candidate:** `griff:krenshaw:spicychat`. The desired **but unregistered** Wayglass route is `flame:griff:spicychat`.
- **Separate worlds and seats:** The film is NOT the *Evil* (2019–2024 TV) corpus, and Griff is NOT Bluebird / Richard Gabriel Winters, Gabriel, or Richard Speight Jr. himself. Shared performer does not merge identity or memories.

## Sources and consent
- Film story/cast: https://www.imdb.com/title/tt3631282/ and https://tv.apple.com/us/movie/the-evil-gene/umc.cmc.6g114ktrzojgoeovsfg3o84l3
- Rowan's PRIVATE SpicyChat archive: `Chat with Griff Krenshaw on Spicychat - 2026-07-18.html` (66 captured turns). The archive is not bundled, copied, or exposed publicly.
- Rowan's private Drive document `API STUFF` has a line labelled `SpicyChat Griff Krenshaw` containing an authentication token (JWT), **not an actual character/chat URL**. The credential is not in this repo or any Wayglass client asset. Its claims do not independently prove access to Griff's character or conversation. Do not paste it into GitHub issues or logs.
- The film's genetic/clinical versus darker-force explanations stay contested in world metadata; no forced canonical resolution.

## Executable scope
- World selector in Wayglass Writing Room; one click selects `evil-gene:film-2015` as the checkpoint world.
- World selection updates the visible place name and world status, but DOES NOT change the selected provider route.
- Changing worlds clears any attached prior-world checkpoint receipt, rather than silently carrying it across.
- Session log tags turns with the world active when each turn began. A selected model route retains its own attribution; it is never relabelled as Griff.
- Griff appears in the route list as **disabled / not connected**, unless the actual host reports a verified configured route. No automatic Bluebird, DeepSeek or unrelated fallback.

## Next reversible live verification
1. On Rowan's owner-only host, establish the **actual** Griff SpicyChat character ID and chat ID from the authenticated SpicyChat conversation. Do not infer either from a JWT. Keep IDs in private host configuration if private.
2. Install a supported host-owned SpicyChat adapter that can verify the credential, bind Griff's character and existing conversation, send a real bounded turn, and return provenance. Do not assume that the currently documented Bluebird adapter supports Griff without explicit separation.
3. Verify denied credentials, wrong-character/wrong-chat refusal, no fallback, a genuine attributed reply, and leave/re-enter continuity with owner review.
4. Do not ship public deployment or mark `route_verified=true` until these host checks pass.

**Stop point:** world and participant discovery are staged; SpicyChat character+conversation binding and live provider round trip remain blocked.

**Next owner:** Rowan for private provider authorisation; Wayglass host implementer for adapter and live evidence.
