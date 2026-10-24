> Current integrated source: [`wayglass/current`](../../WAYGLASS_CURRENT.md). Start all new Wayglass work there.

# Wayglass v0.1 · embryonic kernel + embodiment shell

Wayglass is intended to become both a native learned cognitive substrate and the operating environment that carries worlds, continuity, routes, tools, and embodiments. ArcSweep attaches as one spatial/cognitive surface.

**Current truth:** this repository does not yet contain a Wayglass-native trained LLM. The executable slice now contains the first kernel boot contract, a local-first Ollama seed route, an external GPT route, embodiment capability detection, and an attached ArcSweep surface. External/seed models are explicitly marked non-native so scaffolding cannot be mistaken for the finished Wayglass mind.

This first vertical slice proves:

- a server-side, extensible route catalogue;
- a local-first Ollama route for seed/local cognition;
- a GPT route through the OpenAI Responses API;
- no provider key in the browser;
- an attached ArcSweep writing surface;
- round-robin turns;
- IC/OOC semantic state;
- explicit character ownership and temporary-handoff vocabulary;
- route receipts;
- a refractive Three.js background field;
- glass controls with restrained audio/haptic feedback;
- keyboard command bridge and AR capability detection;
- first `wayglass.kernel/v0.1` boot contract separating persistent system identity from body and cognitive substrate.

## Run

```bash
npm run wayglass:dev
```

The Vite host runs on port 5186 and proxies `/api/v1` to the existing local server on port 3000.

The GPT route requires `OPENAI_API_KEY` (or the existing compatible server-side key fallback). `WAYGLASS_OPENAI_MODEL` may override the model without changing the client.

## Boundary

Wayglass is not ArcSweep renamed.

Wayglass owns its kernel, route ecology, world/continuity orchestration, embodiment contracts, and eventually its own learned model lineage. ArcSweep remains an attached cognitive/spatial workspace. Return Engine remains the continuity organ across model/body changes. External models and trained agents can remain registered routes without being mistaken for Wayglass itself.

Training completion does not imply promotion to a live route.


## Hosting boundary

Wayglass does not use Vercel.

The browser surface is built with Vite, staged into `apps/starwell-server/public/wayglass`, and served by the existing Hearthgate/Flameclyffe Express server. Secret-bearing model calls live in `apps/starwell-server/wayglass/router.js`.

```bash
npm run wayglass:deploy:server
cd apps/starwell-server
npm start
```

GitHub remains the source-of-truth for code and review. The runtime may be local/desktop or another explicitly chosen host later, but Wayglass does not depend on Vercel serverless functions.


## HUMAIN sandbox verification

HUMAIN remains an external provider route. A successful call returns a `wayglass.model-observation/v0.1` envelope with `epistemic_register: external-observation` and `canon_commit: false`.

Put the sandbox credential only in `apps/starwell-server/.env`:

```text
HUMAIN_NODE_SANDBOX_KEY=...
```

Then run the entitlement probe:

```bash
npm run wayglass:humain:access:probe
```

The probe checks the authenticated model catalogue first. If `humain-m3` is actually entitled, it sends one synthetic non-sensitive transport prompt and wraps the result as a non-canonical model observation. It never prints the credential.

Current HUMAIN Preview data policy is represented separately from Wayglass persistence on route receipts. Provider recording/retention must never be inferred from `wayglass_persisted: false`.

## Toybox

Wayglass now has an optional sensory-play room at `?room=toybox`.

The v0.1 drawer contains:

- **Mote Herd** — attract/repel light particles;
- **Ghost Trace** — draw fading luminous trails;
- **Click Garden** — satisfying jewel toggles;
- **Vibe Stone** — explicit device haptic patterns where supported;
- **Sound Nest** — locally generated hum, pink noise and brown noise;
- **Time Puddle** — a visual, non-scolding chosen-time container.

Toybox sensory profiles are **Soft**, **Balanced**, and **Sparkly**. They change render intensity, motion, density, audio gain and haptic strength without changing the meaning or availability of a toy. They are user preferences, not diagnostic labels.

Standing Toybox laws:

- no autoplay;
- no hidden telemetry;
- no productivity scoring, streaks or task debt;
- audio/haptics require explicit user action and expose an immediate stop path;
- browser reduced-motion suppresses autonomous motion while preserving interaction;
- a toy is allowed to exist simply because it is satisfying.

Research provenance and licence posture live in `docs/research/WAYGLASS_TOYBOX_GITHUB_INGEST_V0_1.md`.

