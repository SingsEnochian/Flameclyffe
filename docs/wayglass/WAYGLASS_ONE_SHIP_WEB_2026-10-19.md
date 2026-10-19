# Wayglass OS · one browser ship, 19 October 2026

## Architecture decision
**Wayglass is the ship.** ArcSweep and the Writing Room are integrated decks, not separate owner identities, not separate logins, and not competing front doors. The Fold Observatory is another local instrument inside Wayglass. The source remains `wayglass/current`; this review branch is based on it.

| Layer | Source/authority | What it does |
|---|---|---|
| Ship OS/browser shell | `apps/wayglass/src/ship-environment.js` + `main.js` | One persistent deck rail; normal entry without provider credential; Wayglass surface mounts |
| ArcSweep deck | `apps/arcsweep/` through sibling browser route | Existing full ArcSweep spatial/world workspace with reversible Wayglass link; no implicit continuity import |
| Writing Room | `apps/wayglass/src/surfaces/arcsweep-writing.js` | Co-writing, world/character selection, private route controls, explicit external transfers |
| Cognition routes | `lib/wayglass-route-registry.cjs`, Hearthgate `/api/v1/wayglass/routes` + `/respond` | Default generic `local:crow` route through host Ollama, selectable other local/external providers, no browser secrets |
| Participant-specific SpicyChat | existing Bluebird/Griff routes and host checks | Optional per-session or owner authorisation; route + exact participant/chat stay distinct; no implicit character identity |
| Fold Observatory | `apps/wayglass/src/frame-to-fold-model.js`, audio, surface | Read-only mathematical reference-frame movement, mono-first opt-in sonification, Feather Stop, local JSON receipt |
| Continuity authority | Existing signed host/return/revocation systems | Navigation URL is never memory, consent, identity or canon custody |

## Web launch on Windows
Use a clean worktree of the PR branch and keep a separate current checkout intact:

```powershell
git fetch origin
git switch -c local-wayglass-ship origin/rarity/arcsweep-wayglass-passage-20261019
.\scripts\Start-Wayglass.ps1
```

The existing launcher checks dependencies and starts the Hearthgate host (port 3000) and browser Wayglass (port 5186). It now also starts ArcSweep (port 5184) when not already running.

Open `http://127.0.0.1:5186/?room=writing`. Wayglass does NOT open a compulsory Bluebird token prompt. The top rail offers Writing Room, Fold Observatory, Observer, Library, Commons, Organs, Video Atelier, Toybox and the ArcSweep attached deck. Selecting the optional **Connect Bluebird · SpicyChat** button may ask for a provider token; **Not now** closes only that request. It never denies access to the ship.

The Crow is the **preferred, not assumed live**, local model. At launch the script checks Ollama's `/api/tags` for a matching Crow model name and passes the detected exact tag as `WAYGLASS_CROW_MODEL` to a *newly started* Hearthgate host. If absent, it disables the Crow route on the newly started host. If a host is already running, its pre-existing environment controls route availability; restart that host deliberately after reviewing its config. Selecting a configured Crow route does not prove weights loaded or reply success. No fallback is silently presented as a Crow reply.

For private/owner SpicyChat use existing participant routes; a credential alone is not live provider verification. External transfers need explicit per-turn confirmation and actual host connection. Bluebird's Crow candidate remains `flame:bluebird:crow` and does not become the generic `local:crow` identity.

## Remote web boundary
**Local browser runnable** and **public internet deployment** are different deliverables. The Vite server binds to `127.0.0.1`, so it cannot serve another device by default. Do not expose ports 3000, 5184, 5186 or Ollama 11434 to the public internet. The production browser build can be staged at Hearthgate's `/wayglass/` and `/arcsweep/`, but external access requires an explicitly configured HTTPS host/tunnel, a single owner ingress, protected backend and verified current deployed commit. GitHub Pages success alone does not provide a private LLM backend.

For packaging/build gate:
```bash
npm run wayglass:test
npm run wayglass:build
npm run arcsweep:build
npm run wayglass:stage:server
npm run arcsweep:stage:server
```
Use host staging only after the builds. Validate a browser at narrow and wide viewports, explicit Bluebird skip/authorise, Crow unavailable state, device audition, Feather Stop, the ArcSweep round trip and authenticated host actions. Live Osia output, browser remote HTTPS access and provider replies are **not** established by these checks.

## Sensory frame transport
The Fold Lab lets the user move an observation origin along a declared `x` coordinate with a slider. The reference plane `x=0` is marked visually and by a local monotone pitch mapping. At the certified fold of `F(x,y,z)=(x²,y,z)`, the cue includes a second tone. For `F=(100x,y,z)` or STARWELL's nonsingular three-preimage polynomial, entering the `x=0` *reference* plane cannot be mislabelled a singularity. Stereo pan is an optional enhancement; mono pitch is the primary carrier for Osia accessibility. The browser uses its currently selected default device and makes no Osia calibration/routing claim.

## Done versus not done
Implemented in source: ship nav, optional auth, default Crow route, explicit SpicyChat transfer UI, Frame-to-Fold model and audio station, tests, shared ArcSweep entrance, source-labelled return. CI and browser signatures must still be read from the final PR SHA. **Not yet proved:** production-host internet access, live provider/Osia reply, installed model weights, independent participant continuation, canonical fold physics.
