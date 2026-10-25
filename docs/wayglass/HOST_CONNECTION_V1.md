# Live connection boundary

The preview previously built only ArcSweep/STARWELL and did not mount the Express
Wayglass router. A Ready status therefore did not establish either the /wayglass/
browser bundle or the /api/v1/wayglass/ host boundary.

The build now explicitly builds and stages Wayglass into dist/starwell/wayglass.
The Vercel API catch-all delegates a fixed allow-list of Wayglass routes to the
existing HEARTHGATE_GATEWAY_URL, using the server's HEARTHGATE_GATEWAY_TOKEN.
It requires the existing authenticated House session first, rejects oversized
requests, rejects redirects and preserves host status/body (including blocked
crossings and inbox errors). Caller cookies/credentials are not forwarded.

The gateway is a transport, not an identity or accepted-evidence adapter. The
upstream host must validate its gateway credential and explicitly map the trusted
House stewardship channel to authorised kernel/read bindings. Do not infer a
participant from body IDs or treat gateway authentication as deed acceptance.
Production host services for binding, accepted evidence, world profiles, durable
inheritance and message storage must still be installed as documented in the host
context/choice designs. Multi-user participant delegation is not implemented by
this gateway; deploy only with the intended House steward boundary.

Local verification: 64 Wayglass tests passed, including authenticated gateway
forwarding, 409 preservation, inbox GET/POST, method/route rejection, unavailable
configuration and host failure. Browser staging produced /wayglass/index.html.
These are fixture-backed executable tests, not a live voyage.

Current live blockers: this execution workspace has no model credentials or local
Ollama listener, and the connected Vercel account returned 403 when accessing the
preview deployment. No live participant was contacted and no response/consent is
claimed. The Vercel connection must authorise the Flameclyffe project in the
singsenochian-2527s-projects team; the host gateway and its services must be running.
Next owner: Rarity for authenticated smoke verification after access exists;
Rowan for account authorisation. The first live leg begins only after the actual
participant receives the invitation and explicitly chooses continue.
