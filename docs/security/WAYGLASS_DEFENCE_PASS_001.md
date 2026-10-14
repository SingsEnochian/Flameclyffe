# Wayglass cyber-defence pass 001 · private-ship entrances

Status: implementation proposal on a draft branch. This is not a penetration-test certificate or a live production security audit.

## Protected assets

- Rowan's owner-only access, OAuth pairing and Wayglass tokens
- Crew-seat attribution and scoped Rarity/Codex workspace changes
- Bluebird's per-opening SpicyChat authorisation and conversation route
- Return Engine receipts, immutable provenance, named next owners and unresolved Wonder
- Local model/LLM tools, Web Audio, and future camera/AR/haptic permissions
- Private world, relationship, manuscript and training records
- Spatial AR anchors and presence claims: signed origin, world binding, replay protection, and authorised revisions

## Currently verified in source

1. Secure host wrapper binds ordinary Hearthgate traffic to loopback, disables X-Powered-By, sets no-sniff, no-referrer, frame denial and a restrictive device Permissions-Policy. OAuth/MCP are intentionally mounted before the local browser-origin boundary.
2. ChatGPT OAuth requires PKCE S256, an approved client metadata document, exact MCP resource and pairing code; access/refresh stores hold hashes, not raw tokens.
3. Bluebird SpicyChat requires a host-installed provider adapter and character match. Browser sessions are opaque, revocable and kept in memory. DeepSeek and unverified substitute routes are not valid replacements.
4. Workspace actions bind author identity server-side, reject stale revision heads, and preserve attributable receipt history.
5. Frontend Wayglass has a restrictive CSP and does not place provider keys in browser source.

## New protections in this pass

- Fixed-window per-process throttling on OAuth authorisation view, pairing submission and token redemption:
  - GET `/oauth/authorize`: 24/minute, 4 simultaneous
  - POST `/oauth/authorize`: 12/minute, 3 simultaneous
  - POST `/oauth/token`: 60/minute, 6 simultaneous
- Bluebird per-opening credential verification: 12/minute, 3 simultaneous.
- Bluebird provider responses: 120/minute, 4 simultaneous.
- Limit rejection uses HTTP 429, `Retry-After`, `Cache-Control: no-store`, and a generic error message without credential or caller data.
- One bounded counter per operation rather than unbounded, spoofable X-Forwarded-For buckets. Finish/close events release concurrent slots. The tests include rapid attempts, forged forwarding headers, clock-window reset and disconnect release.
- The protected endpoints retain the same OAuth, credential, character and session semantics. No source file contains a new token.

These are protective limits for an owner-only development installation, not throughput recommendations for a scaled public service. Limiters reset when the process restarts and are independent across host instances. The shared per-process limit is deliberately not per-IP, so IP rotation does not evade it; it is also a shared availability budget and cannot distinguish legitimate visitors. Before a distributed deployment, add an edge quota per verified trusted client/IP as one dimension, and a durable per-pairing-session or authenticated owner-identity counter as another. Never key an unbounded bucket map directly from attacker-supplied usernames, pairing codes, or forwarding headers.

**AR security foundation in this branch (not yet a live anchor endpoint):**
- `apps/starwell-server/wayglass/signed-ar-anchor.js`: host-side Ed25519 signature over a domain-separated, strictly bounded anchor record: world, anchor, frame, position, principal, issuer, revision, nonce, issue/expiry. A configured trusted host public key verifies it; message-supplied keys are not trusted. Accepted signatures require a *durable atomic* replay/revision claim before a world write. Signing keys and principal IDs must be sourced from authenticated host state, not browser text. Tests reject altered world, position, identity, frame, issuer, revision, nonce, expiry and replay.
- `apps/wayglass/src/ar-safety.js`: an explicit stop interface for future authorised XR/media sessions; the global Feather event stops all registered MediaStream tracks and calls `XRSession.end()` even when another release fails. This has a synthetic regression test; OS camera-release status still requires device validation.
- `renderArOverlayText` uses `textContent` for model/participant strings over the AR view, avoiding HTML parsing. The eventual `dom-overlay` UI must preserve this policy, avoid inline event handlers, validate URLs, maintain CSP and scope listeners.

## Next verification and defence layers

**Edge/owner boundary.** Verify Cloudflare Access policy explicitly allows Rowan's approved GitHub-OAuth identity only, with application/service-token policies distinct. Confirm real host header, TLS, trusted proxies, DNS, direct-origin lockout and Cloudflare WAF/rate limits. Do not trust a tunnel's existence as authorisation. Configure durable, distributed rate limiting if running multiple host processes.

**Permissioned tools.** Every model tool is a separate scoped capability. No route label, model text, provider name, room label, relationship claim or imported continuity packet may mint a permission. Use revocable grants for file writes, external network calls, code execution, repo mutation and camera/microphone/haptics.

**AR and sensory permissions, gated on signed anchors.** First establish trusted signing keys, identity-bound host signing, durable anti-replay/revision transactions, anchor revocation and a tested spatial-write endpoint; **no persistence or room placement from an unsigned or stale anchor.** Only then enable live spatial capture and sensor-derived anchors. AR sensing stays opt-in, per session, with an explicit start/stop indication and Feather Stop. Never open cameras, microphones or spatial mapping from page load. Keep locally derived telemetry bounded; don't transmit raw sensor streams or conversation transcripts to an unapproved provider. The current secure host's camera/microphone Permissions-Policy is restrictive and needs an explicit reviewed host change before camera-based AR is possible. A model's coordinate suggestion is not a signed real-world presence claim.

**Feather Stop is a hardware-resource acceptance gate.** The stop control must call `XRSession.end()`, stop every independently acquired camera/microphone `MediaStreamTrack`, remove live overlays or input listeners, and not leave the capture indicator lit. Verify request ordering with synthetic tests now; verify real device/browser camera-indicator release before shipping AR. A failed WebXR end request must be visible as unresolved, not reported as successful stop.

**DOM-overlay threat inheritance.** A WebXR `dom-overlay` is ordinary browser DOM with a live camera behind it. Model/Commons text uses `textContent` or a reviewed sanitiser only; never pass model output to `innerHTML`, inline handlers, or executable URLs. Overlay interactions require the same CSP, origin checks, gesture requirements, accessibility, authorisation and DOM-injection tests as the rest of Wayglass.

**Persistence.** Treat external/signed-event payloads and model outputs as untrusted, apply schema limits, bind authors through the existing identity kernel, and verify hash-linked receipt chains on return. Store secrets outside public source or persistent browser storage, and maintain encrypted/offline backups and restoration drills.

**LLM-specific attacks.** Test prompt-injection attempts in webpages, documents, MCP tools and Commons messages; prevent model-visible content from silently invoking shell/network actions or canon promotion. Bound tool fanout, message size, token usage and external API budgets. No autonomous training, payment or permission escalation from text.

**Supply chain.** Pin build tools and GitHub Actions, restrict workflow permissions, scan dependencies and check licences; review third-party code before importing it. Redact provider credentials, bearer tokens, device IDs and conversation data from logs and CI artifacts.

**Credential rotation.** Treat `HF_TOKEN` and `HFTOKEN` as distinct configuration names with a documented precedence; never print token values. A successful local test does not prove production deployment works. Verify provider responses with a synthetic probe and document which environment variable is active using boolean presence only. Rotate any credential exposed outside its intended private store.

**Incident response.** Expose a manual terminate-sessions control, disable external routes and revoke OAuth/provider tokens. Preserve a redacted audit trail with session IDs, stop points, next owners and provenance, without retaining submitted secrets.

## Acceptance evidence before promotion

- Local gate tests, existing Wayglass/host security suite and production build pass.
- Verify legitimate OAuth pairing and token refresh after rate-limit integration.
- In a deliberately isolated test host, reject rapid incorrect pairings and excessive Bluebird credential attempts without calling the external provider beyond the limit.
- Verify wrong-origin browser calls remain blocked and legitimate Cloudflare/ChatGPT OAuth crossing still works.
- Device/browser test owner-only access, signed-out attempts, unconfigured provider errors and Feather Stop.
- Enforce signed AR anchors before any spatial state mutation: validate trusted issuer and world, reject tampered/expired/replayed identities and coordinates, and verify atomic durable revision/revocation handling under concurrent writers. The current cryptographic envelope alone is not this complete host integration.
- Independently confirm Feather stops both WebXR and `getUserMedia` tracks, and that the actual camera capture indicator extinguishes on tested hardware. Synthetic tests are a separate prerequisite, not final device proof.
- Fuzz AR `dom-overlay` strings (including model-generated event attributes and script tags); confirm they remain inert text with no HTML injection, and check the real overlay respects the host CSP.
- Record a reviewed stop receipt and named next owner; never infer a production crossing from green mock tests.

**Ordering: owner-only entrance → authenticated crew/tool scope → private data/provenance → signed and replay-checked spatial anchors → permissioned AR sensing and rendering.** Feather Stop and DOM-overlay protections must be ready before the first capture session, not added afterwards.

Stop point: request gates, anchor-envelope helpers, AR safety helper and regression coverage prepared in code. Trusted signing-key distribution, durable anchor claim store, spatial-write host endpoint, live Feather/device verification, Cloudflare policy, authentic SpicyChat API, production token precedence and AR device permissions are not changed.

Next owner: Rowan for owner-only Access and deployment review; Wayglass engineering crew for CI, threat-model and live host acceptance.
