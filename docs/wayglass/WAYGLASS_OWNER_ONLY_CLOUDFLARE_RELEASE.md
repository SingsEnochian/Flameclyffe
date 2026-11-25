# Wayglass owner-only Cloudflare release

Run this command in elevated Windows PowerShell from the existing Flameclyffe checkout at the published head of PR #661.

```powershell
.\scripts\Deploy-WayglassWorld.ps1
```

The launcher checks the exact commit’s GitHub Actions results before prompting for the Cloudflare API token with masked input. It reuses the existing Hearthgate host on loopback port 3000 and the same restricted Wayglass gateway used by Tailscale Serve on port 32861.

## First-run prerequisites

- Keep the existing House Steward secret and Wayglass data configuration available to Hearthgate. Install Git and Node.js 24 or newer. The launcher builds and stages the existing app if it starts Hearthgate itself. An already running Hearthgate or gateway is reused only if its local checks pass. If an older process occupies either port, stop it through the launcher that started it and rerun. The deployment launcher never kills an existing origin or rewrites Tailscale configuration.
- The Cloudflare account needs the active `wayglass.world` zone, a Zero Trust team domain, and one configured GitHub Access identity provider. Use the verified GitHub email of the owner account with 2FA enabled. The launcher asks for the exact email on first setup unless `WAYGLASS_ACCESS_OWNER_EMAIL` is configured. GitHub manages the account’s 2FA.
- Use a Cloudflare user API token scoped to the zone and account, with zone read, DNS edit, Cloudflare Tunnel edit, Access apps and policies edit, identity-provider read, and Zero Trust organization read. The launcher verifies the token status, checks resource access through API reads, and verifies write access through the required mutations and readback.
- An administrator can install Cloudflared through Windows Package Manager. If the local package install cannot provide a machine-wide copy under Program Files, install Cloudflared there before rerunning. The service uses a connector credential in a Windows ACL-protected directory under ProgramData. The separate API token stays in memory.

## Publication and checks

The launcher refuses conflicting DNS, Access, tunnel, and service configurations. It verifies that the Access application covers the entire hostname with a single GitHub provider and an exact-email Allow policy. It configures Protect with Access using the application audience and team name. The tunnel sends only `wayglass.world` traffic to port 32861 and returns 404 for unmatched requests. The gateway independently verifies the owner’s Access JWT and passes it to the existing House Steward exchange. The Tailscale path still uses its existing House authentication.

After readback of those controls, the launcher can publish the proxied apex CNAME. It checks public DNS, trusted HTTPS, and the existing anonymous Access probe. Complete the GitHub sign-in in the browser opened by Cloudflared. The launcher uses that session to verify the full UI, runtime health, unrelated route rejection, and a House Steward cookie round trip. Cloudflared manages the CLI login cache outside the repository.

A successful run prints `https://wayglass.world/wayglass/`. Keep the Windows host online with Hearthgate and the gateway running. Cloudflared itself is registered for automatic Windows startup. On a phone or iPad, test browser sign-in, room navigation, touch controls, and a real Return operation. Local tests and the automated HTTP checks do not verify physical-device behavior, non-owner GitHub sign-in, or model-provider response attribution.

## Rollback

```powershell
.\scripts\Deploy-WayglassWorld.ps1 -Rollback
```

Rollback removes only the DNS record created by this launcher, checks its ID and destination, and verifies removal. A failed run also attempts rollback of a record it created. The Access app, restricted tunnel, and connector stay staged for a later retry. An existing DNS record adopted by the launcher needs separate operator rollback. Record verification and mobile receipts in the existing deployment records after running on the Windows host.
