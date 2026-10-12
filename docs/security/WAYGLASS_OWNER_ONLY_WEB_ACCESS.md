# Wayglass private web access: owner-only OAuth deployment gate

Status: DEPLOYMENT BLOCKED until an owner identity, hostname, and live Access policy have been verified. This file is not an access policy and does not by itself restrict traffic.

## Security invariant

No unverified Internet user may access Wayglass UI, its assets that contain private data, WebSocket endpoints, or backend APIs. OAuth authentication alone is insufficient: authorization must require an exact owner identity issued by a trusted identity provider. Never infer ownership from display names, unverified email metadata, profile nicknames, URLs, or pairing-code possession.

## Deployment topology

1. Give the private browser UI a dedicated hostname on a Cloudflare-controlled domain, routed to the local origin through Cloudflare Tunnel. Do not use a public GitHub Pages site for private UI or private state; repository Pages deploys may remain public for nonprivate marketing/demo assets only.
2. Create a Cloudflare Access self-hosted application matching the entire private UI hostname and all paths. Use a trusted OAuth/OIDC login provider (for example Google), then allow **one specific verified account**, configured privately in Cloudflare, with MFA. No domain-wide, Everyone, Bypass, or unauthenticated policy.
3. Protect the origin from direct access: keep the server bound to loopback/private network and configure Cloudflare Tunnel's Protect with Access token validation, or verify JWT signature/issuer/audience/expiry at origin. Reject missing/invalid tokens; do not trust forwarded identity headers by themselves.
4. Existing ChatGPT `/mcp` OAuth 2.1 (PR #450) is a *different* flow. Give it a separate host and separately reviewed exposure policy; never Bypass Access on the private UI hostname to make MCP OAuth work. Narrowly expose metadata and OAuth endpoints only for the MCP host. Pairing remains a separate explicit authorization step.
5. No public alias, quick tunnel, DNS route, Pages path, preview deployment, or direct origin port may expose the private UI/API. Inspect all alternate origins before declaring private access complete.
6. Keep owner allow-list and provider credentials in private Access/host configuration, not git. Do not hardcode personal email addresses in repository files.

## Required deployment tests

- Owner with the approved OAuth/OIDC identity and MFA can open the private UI on desktop and phone and use protected API routes.
- Logged-out browser gets a login challenge and cannot fetch API data, private assets or WebSocket payloads.
- A different authenticated account gets HTTP denial on the full private hostname, including API and alternate paths.
- Invalid, expired, wrong-audience or forged Access JWT never reaches the origin.
- Requests directly to the local origin from the public Internet fail.
- MCP connection succeeds separately only after its own authenticated OAuth + pairing flow; public UI remains blocked to that client unless it holds the owner's browser credentials.
- Revocation ends access; verify logout and session expiry.
- Enumerate active Pages and preview deployments and deny private data there.

## Evidence required to mark DONE

Verified owner-only Access policy; MFA enabled; origin validation configured; DNS/tunnel configuration; positive and negative live browser checks; blocked direct origin; all alternate public routes audited; results recorded without tokens, personal account identifiers or sensitive response bodies.

Until that evidence exists, label Wayglass **not confirmed private**. Do not advertise the web UI as owner-only.


## Selected owner sign-in: GitHub OAuth (October 2026)

**Selected provider:** GitHub, through Cloudflare Access. **Selected allow policy:** a single exact verified email supplied privately by the owner at deployment. The email MUST NOT be recorded in this repository. Confirm that GitHub exposes the selected email as a verified email to the Cloudflare Access GitHub identity provider; a GitHub profile's public email field is not enough. GitHub account 2FA should be enabled. Do not confuse GitHub repository write access with permission to enter the Wayglass web app.

### Operator runbook (Cloudflare account access required)

1. In GitHub Settings > Developer settings > OAuth Apps, register an OAuth app called `Wayglass Private Access`. Set Homepage to `https://<team>.cloudflareaccess.com`; callback to `https://<team>.cloudflareaccess.com/cdn-cgi/access/callback`.
2. Store Client ID and Client Secret only in Cloudflare Zero Trust > Integrations > Identity providers > GitHub. Do not place either secret in git, browser bundles, or issue discussions. Test the IdP connection.
3. In Zero Trust > Access controls > Applications, create a **Self-hosted and private** app covering the entire dedicated private hostname. Select **GitHub as the sole enabled identity provider**; optionally enable instant authentication.
4. Create exactly one **Allow** policy with Include selector **Emails** matching the owner's verified GitHub-linked email (provided through Cloudflare's private dashboard). Require the GitHub login method if multiple IdPs exist at account level. Add no Everyone, email domain, Bypass, or service-token policy granting UI entry.
5. Require GitHub account 2FA; note that Cloudflare's IdP-reported MFA selector does not support GitHub as an enforced MFA signal. If an independent Cloudflare Access second factor is available in the account, require it too. Do not claim MFA enforcement until checked.
6. Bind the UI hostname to a Cloudflare Tunnel serving only loopback/private origins. Enforce Cloudflare Access JWT validation at the origin or Access token validation by the tunnel, and make sure no other public hostname, port, Pages path, or preview copies expose Wayglass state.
7. Keep `/mcp` and the self-hosted Wayglass OAuth 2.1 protocol on a separate hostname. Do not put Cloudflare Managed OAuth in front of that self-hosted OAuth protocol unless the two flows are deliberately redesigned and tested.
8. Verify: owner's real GitHub OAuth sign-in succeeds; an unrelated GitHub account is denied; anonymous/API/WebSocket/asset requests are denied; direct-origin access fails; revoked sessions are denied; live MCP on its separate host still works.

**Not provisioned:** This document is an implementation/deployment plan, NOT evidence that Cloudflare Access, DNS, or tunnel configuration has been changed. Never report owner-only private web access until live negative tests pass.
