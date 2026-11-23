# Wayglass full-ship private Tailscale alternative

Cloudflare sign-in handoff was unavailable. This alternative uses **Tailscale Serve**, not Funnel, to reach the **complete** local Wayglass runtime from iPad over the tailnet. A dedicated route-limited gateway restricts what the remote browser can request.

Source: Tailscale CLI reference https://tailscale.com/docs/reference/tailscale-cli/serve and Serve feature documentation https://tailscale.com/docs/features/tailscale-serve. Serve proxies a **dedicated loopback gateway on port 32861**, which forwards only `/wayglass/`, `/api/v1/wayglass/`, and `/api/v1/house/session/` to the local secure host on port 3000. Funnel is **public** and must not be used. Tailscale requires HTTPS certificates/MagicDNS for the tailnet. The Windows computer must stay online, running the staged Hearthgate origin, and the iPad must join the same tailnet.

## Implementation

- `scripts/Start-Wayglass-Tailnet.ps1` is read-only by default. It inspects Tailscale connection, prints a **proposed**, not claimed live, `https://<node>.<tailnet>.ts.net/wayglass/` URL and reports local host health.
- Explicit `-Publish -OwnerOnlyAclReviewed` builds and stages the **full** Vite Wayglass app, starts the secure loopback host when necessary with the verified tailnet origin, requires working House Steward sign-in, checks for existing Serve/Funnel routes, then launches a **foreground** `tailscale serve 32861` via `scripts/wayglass-tailnet-serve.mjs`. It refuses to overwrite other Serve/Funnel configuration.
- No Cloudflare account, public GitHub Pages, router port forwarding, exposed dev port, provider keys or chat credentials are involved.
- If Hearthgate is not already running, the script starts the known `server-secure.js` process on loopback with the verified tailnet origin. If an existing host does not allow that origin, it refuses to publish until the host is restarted correctly. A private House Steward credential must already be configured.
- The Tailscale URL is not considered verified until actually opened from the iPad, after the host is running.

## Access boundary

**Tailnet-private does not automatically mean owner-only.** Before publishing, review Tailscale access controls and sharing for the Windows device, port 443, and the owner's iPad. Only use `-OwnerOnlyAclReviewed` when the allowed devices/users are appropriate. Other tailnet members permitted by ACLs can otherwise reach the service. The localhost origin also remains accessible locally. Do not treat Tailscale identity headers as authentication on direct localhost requests.

## Operator sequence (Windows)

1. Confirm Windows Tailscale is connected and that the iPad Tailscale app is connected to the same tailnet.
2. Keep the local Wayglass host running on port 3000.
3. From the repository root, run `powershell -ExecutionPolicy Bypass -File scripts/Start-Wayglass-Tailnet.ps1` for the **read-only doctor**.
4. After reviewing owner-only ACLs and ensuring no conflicting Serve/Funnel routes, run `powershell -ExecutionPolicy Bypass -File scripts/Start-Wayglass-Tailnet.ps1 -Publish -OwnerOnlyAclReviewed`.
5. Open the printed `https://...ts.net/wayglass/` on the iPad. Verify Watercolour entry, five-locus helm, Codex, Mythience, sound opt-in, Feather, Wyrdrune receipts and Return.
6. Keep the terminal open while using the private Wayglass route. **Ctrl+C** stops the foreground Serve session and its route-limited gateway. Do not run `tailscale serve reset` on a device hosting other services.

## Current phone-access repair · 2026-11-23

**Cause of failed iPhone link:** a `127.0.0.1:5186` URL points to the phone's own loopback interface and cannot reach the Windows workstation. The working access route must instead be the node's **verified HTTPS Tailscale Serve URL**, proxied through the existing dedicated port-32861 gate, with House Steward authentication.

**Single existing route, not another deploy:** the Windows launcher now discovers Tailscale in PATH or `%ProgramFiles%\\Tailscale\\tailscale.exe` and passes that resolved executable to the foreground Serve process. It never starts Funnel or a second backend. The Nursery language panel provides its own House Steward sign-in using the existing `/api/v1/house/session` endpoint and clears the supplied code immediately after submission. A 401 does not confer a session or allow a cycle. Existing poetry and source-bound explanations remain distinct.

### Exact owner-side activation

1. On the **Windows computer**, use the checked-out #661 integration source and install its normal Node 24 dependencies if missing. No branch creation or force reset. If a local House Steward code is not configured, run `powershell -ExecutionPolicy Bypass -File scripts/Set-WayglassHouseSteward.ps1` **once**. Save the printed code in a private password manager, not in chat.
2. With Tailscale signed in on Windows, run the read-only doctor:
   `powershell -ExecutionPolicy Bypass -File scripts/Start-Wayglass-Tailnet.ps1`
3. Review the device and port access rules in the Tailscale admin console. Only after confirming intended owner/device access, run:
   `powershell -ExecutionPolicy Bypass -File scripts/Start-Wayglass-Tailnet.ps1 -Publish -OwnerOnlyAclReviewed`
4. Keep that terminal and the Windows computer running. The script builds/stages Wayglass, verifies the loopback host, tests unauthenticated House refusal and route isolation, then runs **foreground** `tailscale serve 32861`.
5. Connect the iPhone/iPad Tailscale app to the **same tailnet**. Open the printed `https://<verified-node>.<tailnet>.ts.net/wayglass/?room=wayglass%3Acell-garden` address in Safari. Enter the local House Steward code in the **Nursery panel**, not into ChatGPT.
6. Verify *Observe → One WTL cycle → Grounded speech → Poetry → Feather* on the device. If an actual remote request fails, do **not** claim live acceptance. Check Windows process lifetime, Serve's displayed URL, ACL grants, and House sign-in. Ctrl+C closes foreground sharing.

**No remote operation claim:** GitHub automation and chat tools cannot start a process on the owner's Windows computer, inspect private Tailscale ACLs, or establish that an iPhone reached the host. Code and CI can validate the gateway and sign-in contract; device acceptance remains an owner-side action and needs its own receipt.

## Remaining acceptance

- Live owner-only ACL policy verified; House Steward sign-in returns 401 without credentials
- Windows host healthy, correct commit staged, no stale port 3000
- Actual Tailscale Serve status, HTTPS DNS and remote iPad request verified; unrelated STARWELL routes return 404
- iPad VoiceOver, reduced motion, keyboard/Pencil, Feather, room-to-room continuity and actual model route receipts
- No public Funnel configuration, no public Pages promotion

**Status:** script and documentation only until the owner's Windows host runs it and a remote iPad connection is tested. GitHub CI cannot prove the local Tailscale state.
