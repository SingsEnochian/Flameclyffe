# Wayglass full-ship Cloudflare Access deployment gate

**State:** owner-only release procedure, not a deployed host. This is a reviewable plan and executable unauthenticated edge probe. The full Wayglass interface is served by the existing Hearthgate / STARWELL origin, not a public static copy.

## Architecture

```
iPad Safari / Pencil / keyboard / VoiceOver
       |
       v
HTTPS hostname (owner-only Cloudflare Access self-hosted application)
       |
       v
Cloudflare Tunnel, authenticated connector on the owner's Windows machine
       |
       v
127.0.0.1:3000 (server-secure.js; Wayglass at /wayglass/; APIs same origin)
       |
       +--> Wyrdrune runtime, receipts, local model routes and other organs
```

Cloudflare Access controls remote entry. The origin is loopback-only, but local access still exists and is not Cloudflare-authenticated. Do not claim an Access edge policy authenticates direct localhost clients. No public GitHub Pages, Vercel or Netlify publication of the owner-only runtime.

## Owner-controlled account steps

1. Sign in to the **Cloudflare dashboard** using the connected browser profile. Select the correct account and domain. The owner chooses and approves the hostname; do not guess a domain.
2. In **Zero Trust / Access**, create a **Self-hosted** application for the exact full hostname, including all paths. Apply an **Allow** policy for only the owner's verified identity. Do not use a public Bypass policy, an allow-all rule, or a shared service token as the owner's browser identity. Check identity provider MFA if available.
3. In **Networks / Tunnels**, create or select a named Cloudflare Tunnel. Install its connector on the owner's machine using the dashboard's authenticated installation instructions. Keep the connector credential on that machine, never in GitHub, logs, screenshots, or chat.
4. Route the selected hostname to **HTTP `127.0.0.1:3000`** through that tunnel. Do not open router ports or change Hearthgate to `0.0.0.0`. Do not use unauthenticated Quick Tunnels or publish the dev Vite port.
5. Locally, with Node dependencies already installed, run `npm run wayglass:deploy:server` from the repo root to build and stage `dist/wayglass` into `apps/starwell-server/public/wayglass`, then `npm --prefix apps/starwell-server run start:core`. Confirm `http://127.0.0.1:3000/wayglass/` is the staged UI. Keep the origin running for the remote session. Local model providers are separately configured and must be checked with attributable route receipts.
6. From an **unauthenticated** network context, run `npm run wayglass:cloudflare:preflight -- --url https://YOUR-OWNER-HOSTNAME`. It must report **PASS** for `/`, `/wayglass/`, `/api/v1/wayglass/healthz`, and `/api/v1/wayglass/respond`. The probe refuses to count a 200 response, a generic 403 or an unrelated redirect as proof of Access.
7. Sign in as the owner on iPad Safari, open `https://YOUR-OWNER-HOSTNAME/wayglass/`, and complete a real device smoke test. Check Living Watercolour entry, five-locus helm, Codex, Mythience, Observer, Toybox, Feather, reduced motion, touch/Pencil, keyboard, VoiceOver, session continuity, Wyrdrune results and **actual provider route attribution**. Test the protected API paths as the owner. Capture a redacted deployment receipt and any failures before declaring live acceptance.

## Preflight is not deployment

`scripts/wayglass-cloudflare-preflight.mjs` deliberately does not sign in, send credentials, upload files, configure DNS, modify Access policies, launch a tunnel or declare production readiness. Its success establishes only that unauthenticated requests encountered a Cloudflare Access login challenge on all tested paths. It is a fail-closed first gate; **authenticated browser and model-route verification remain mandatory**.

Do not copy the full host into `_site` or merge a draft PR merely to create a live URL. The existing public `/wayglass-play/` is an older, separate preview.

## Release receipt checklist

- [ ] Owner-approved hostname and Cloudflare account selected
- [ ] Cloudflare Access policy limited to owner, MFA reviewed
- [ ] Named tunnel connected to loopback `127.0.0.1:3000`
- [ ] All four unauthenticated boundary probes PASS
- [ ] Staged full-ship UI opens after owner authentication
- [ ] Real route/model response receipt observed and attributed
- [ ] Feather interrupts an in-flight request and optional audio
- [ ] iPad portrait/landscape, touch/Pencil, VoiceOver, keyboard and reduced-motion checked
- [ ] Return receipt survives the intended stop/restart scope, or limitation documented
- [ ] Final deployment URL and tested commit recorded privately without secrets
