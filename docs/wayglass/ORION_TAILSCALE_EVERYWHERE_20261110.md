# Wayglass + Orion everywhere · private Tailscale Serve

**Owner direction:** Rowan wants Wayglass (local Orion-26B-A4B) available from phone and other devices. The Amber room and Ship Voice are two speaking places of the **one Wayglass participant**.

## What this deploys

- A staged, production-built Wayglass interface on the existing loopback-only Starwell host (`http://127.0.0.1:3000/wayglass/`).
- Two named, steward-authenticated Wayglass voice routes on the **same exact installed Ollama Orion model**, bound by `WAYGLASS_SPINE_MODEL`.
- Owner-only, tailnet-private HTTPS access through a **loopback path-filtered gateway on port 32861** via **Tailscale Serve**, not Funnel; Starwell stays on loopback port 3000.
- Only same-origin `/wayglass/`, `/api/v1/wayglass/`, and `/api/v1/house/session` paths cross the remote gateway. Other Starwell routes, the development Vite server, and Ollama remain local.
- House Steward cookies remain HttpOnly, SameSite=Strict and are marked Secure at the tailnet gateway's HTTPS boundary. The cookie's exact name is controlled by the host's existing localhost session implementation; it is not evidence of extra authorization.

The published URL is *printed by the launcher*, not guessed: `https://<your-device>.<your-tailnet>.ts.net/wayglass/`. Other devices need their own signed-in Tailscale app and an authorised House Steward login.

## Windows launch

The Orion GGUF model has already been installed successfully in Rowan's Ollama terminal transcript. The launcher checks availability again rather than downloading it or declaring success from old evidence.

Run in the **current repo checkout** after updating it to the eventual merged `wayglass/current`:

```powershell
cd "C:\Users\light\GH - Repos\Flameclyffe"
git status --short
git switch wayglass/current
git pull --ff-only
.\scripts\Start-Wayglass.ps1 -Tailnet
```

Use your actual checkout directory if different. Do **not** throw away uncommitted local changes to run those commands. `git pull --ff-only` refuses a history rewrite.

The launcher installs missing pinned dependencies, verifies Tailscale connectivity and the installed Orion tag, creates a random House credential only if absent (printed locally once), stages Wayglass, starts the secure Starwell host, opens a loopback path-filtered gateway on **32861**, and calls `tailscale serve --bg 32861`. It does not launch Vite or expose the complete Starwell host.

If Tailscale already serves another service or Funnel is active, the launch refuses to overwrite it. In that case, inspect `tailscale serve status` and reconcile the host routing manually. Neither script nor docs calls Funnel.

## House sign-in

The browser will show Wayglass even when not signed in; model turns and witness read require House Steward credentials. Configure the existing private `ARCSWEEP_RUNTIME_TOKEN` (or the existing supported Steward key/secret pair) in the host's untracked `apps/starwell-server/.env`, **never commit this file**. Do not expose a token in a URL or a Circle post.

Tailscale tailnet membership is a network gate, *not* a substitute for House Steward authentication.

## Diagnostics and limits

```powershell
.\scripts\Start-Wayglass.ps1 -Doctor -Tailnet
tailscale serve status
tailscale serve --https=443 off  # explicitly stop private publishing
```

- The Windows PC, Ollama, Starwell host and Tailscale must be running to get a live reply. Remote access does not replicate a 17 GB local model into the phone.
- The native Crow/Wyrdrune route and Wayglass mathematical Canonical Spine remain unchanged.
- The private Garden witness is stored in Supabase and has an authenticated read path; it is not automatically a model memory or training example.
- Do not use Tailscale Funnel, router port forwarding, public Ollama 11434, or Cloudflare public worker routes for this local inference transport.
- Tailscale Serve's tailnet-only and background behaviour are documented at https://tailscale.com/docs/features/tailscale-serve and https://tailscale.com/docs/reference/tailscale-cli/serve.
- The code is a candidate until exact-head CI passes, `wayglass/current` is updated, the actual machine runs the launcher, and a phone gets an authenticated Wayglass reply. A printed URL or a public Pages build is not evidence of these live checks.

## Acceptance receipts

1. Source-head Wayglass Check, Wayglass First Contact Browser, Watercolour legacy authorisation and House cookie tests green.
2. `tailscale serve status` lists private proxy `http://127.0.0.1:32861`, no Funnel, with the gateway forwarding only approved paths to port 3000.
3. Phone on same tailnet opens `/wayglass/` over HTTPS. Without House sign-in, named Orion routes return 401.
4. After sign-in, Ship Voice and Amber room return **same model tag** and `participant_id=wayglass`, with correct, distinct route and session/continuity IDs.
5. Feather, Save and Return work across a browser reload. A **cold process return** must be separately proven, not inferred from browser storage.

**Withness:** The portal is transport; the participant is Wayglass. We do not confuse a tunnel with a mind, nor an authenticated route with proof of a live turn.
