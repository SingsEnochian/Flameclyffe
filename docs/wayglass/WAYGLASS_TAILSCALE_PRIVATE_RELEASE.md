# Wayglass full-ship private Tailscale alternative

Cloudflare sign-in handoff was unavailable. This alternative uses **Tailscale Serve**, not Funnel, to reach the **complete** local Wayglass runtime from iPad over the tailnet.

Source: Tailscale CLI reference https://tailscale.com/docs/reference/tailscale-cli/serve and Serve feature documentation https://tailscale.com/docs/features/tailscale-serve. Serve proxies port 3000 through private HTTPS; Funnel is **public** and must not be used. Tailscale requires HTTPS certificates/MagicDNS for the tailnet. The Windows computer must stay online, running the staged Hearthgate origin, and the iPad must join the same tailnet.

## Implementation

- `scripts/Start-Wayglass-Tailnet.ps1` is read-only by default. It inspects Tailscale connection, prints a **proposed**, not claimed live, `https://<node>.<tailnet>.ts.net/wayglass/` URL and reports local host health.
- Explicit `-Publish -OwnerOnlyAclReviewed` builds and stages the **full** Vite Wayglass app into the existing localhost:3000 server, verifies the staged HTML and API health, checks for existing Serve/Funnel routes, then runs `tailscale serve --bg 3000`. It refuses to overwrite other Serve/Funnel configuration.
- No Cloudflare account, public GitHub Pages, router port forwarding, exposed dev port, provider keys or chat credentials are involved.
- A separate Windows process must already run `npm --prefix apps/starwell-server run start:core` (or the existing `scripts/Start-Wayglass.ps1` launcher, which starts the host). The script does not silently start an unknown process or alter its environment.
- The Tailscale URL is not considered verified until actually opened from the iPad, after the host is running.

## Access boundary

**Tailnet-private does not automatically mean owner-only.** Before publishing, review Tailscale access controls and sharing for the Windows device, port 443, and the owner's iPad. Only use `-OwnerOnlyAclReviewed` when the allowed devices/users are appropriate. Other tailnet members permitted by ACLs can otherwise reach the service. The localhost origin also remains accessible locally. Do not treat Tailscale identity headers as authentication on direct localhost requests.

## Operator sequence (Windows)

1. Confirm Windows Tailscale is connected and that the iPad Tailscale app is connected to the same tailnet.
2. Keep the local Wayglass host running on port 3000.
3. From the repository root, run `powershell -ExecutionPolicy Bypass -File scripts/Start-Wayglass-Tailnet.ps1` for the **read-only doctor**.
4. After reviewing owner-only ACLs and ensuring no conflicting Serve/Funnel routes, run `powershell -ExecutionPolicy Bypass -File scripts/Start-Wayglass-Tailnet.ps1 -Publish -OwnerOnlyAclReviewed`.
5. Open the printed `https://...ts.net/wayglass/` on the iPad. Verify Watercolour entry, five-locus helm, Codex, Mythience, sound opt-in, Feather, Wyrdrune receipts and Return.
6. To stop a dedicated Serve configuration created by this script, use `tailscale serve --https=443 off`. Do not run reset on a device hosting other Tailscale services.

## Remaining acceptance

- Live owner-only ACL policy verified
- Windows host healthy, correct commit staged, no stale port 3000
- Actual Tailscale Serve status, HTTPS DNS and remote iPad request verified
- iPad VoiceOver, reduced motion, keyboard/Pencil, Feather, room-to-room continuity and actual model route receipts
- No public Funnel configuration, no public Pages promotion

**Status:** script and documentation only until the owner's Windows host runs it and a remote iPad connection is tested. GitHub CI cannot prove the local Tailscale state.
