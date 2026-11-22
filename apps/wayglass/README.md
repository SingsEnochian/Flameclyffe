> Current integrated source: [`wayglass/current`](../../WAYGLASS_CURRENT.md). Start all new Wayglass work there.

# Wayglass OS · whole-vessel runtime

Wayglass is the native operating environment and cognitive substrate architecture that carries worlds, continuity, routes, tools, participants and embodiments. ArcSweep is inherited as native Wayglass world, continuity, writing, acoustic and instrument organs; its older namespace and source tree remain as compatibility/provenance lineage rather than a separate runtime destination.

**Native model ecology:** Wayglass owns its cognitive architecture, native model development, training, evaluation, memory, route selection and earned route promotion. Local and external models are registered as distinct substrates with attributable lineage; the native model lane is part of the operating system rather than a separate product.

This first vertical slice proves:

- a server-side, extensible route catalogue;
- a local-first Ollama route for seed/local cognition;
- a GPT route through the OpenAI Responses API;
- no provider key in the browser;
- a Wayglass-native Writing Room inherited from ArcSweep lineage;
- round-robin turns;
- IC/OOC semantic state;
- explicit character ownership and temporary-handoff vocabulary;
- route receipts;
- a refractive Three.js background field;
- glass controls with restrained audio/haptic feedback;
- keyboard command bridge and AR capability detection;
- `wayglass.kernel/v0.1` boot contract separating persistent system identity from body and cognitive substrate; and the unified eight-system vessel kernel (`wayglass.os/v1`) that composes the registered organs and deck surfaces into one operating environment.

## Run

```bash
npm run wayglass:dev
```

The Vite host runs on port 5186 and proxies `/api/v1` to the existing local server on port 3000.

The GPT route requires `OPENAI_API_KEY` (or the existing compatible server-side key fallback). `WAYGLASS_OPENAI_MODEL` may override the model without changing the client.

## Boundary

Wayglass is not ArcSweep renamed. ArcSweep is now a donor lineage and compatibility namespace inside the larger Wayglass vessel.

Wayglass owns its kernel, route ecology, world/continuity orchestration, embodiment contracts, and eventually its own learned model lineage. ArcSweep world state, continuity evidence, writing instruments, presence, memory and somatic machinery are inherited through native Wayglass organs and surfaces. Legacy `arcsweep:*` identifiers may resolve as compatibility aliases, but canonical navigation and attribution use `wayglass:*`. Return Engine remains the continuity organ across model/body changes. External models and trained agents can remain registered routes without being mistaken for Wayglass itself.

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



## Whole-vessel operating system

The native vessel kernel boots eight cooperating systems as one Wayglass OS. The Wyrdrune Program Workbench is a native creation deck with a source editor, programme library, typed-IR viewer, source-hash verification, execution ledger and Spell Wizard. It compiles and runs authored WTL through the authenticated Wayglass host, using the same canonical parser/runtime as the rest of the ship. The first whole-vessel programme composes the eight system lanes and returns its Möbius checkpoints.\n\nThe eight systems are:

1. Authority & Kernel
2. Wyrdrune Native Language
3. Eightfold & Double Möbius
4. Sensory Body
5. Observer & Science
6. Constellation Agency
7. Return & Universe
8. Cloud, Host & Install

Open the Program Workbench with `?room=programs`, or from the Ship Systems and Creation decks. The live system map is available through `globalThis.__wayglassOS.kernel.inspect()`. Each system reports its registered organs, deck surfaces, interfaces and assembly state. The same kernel owns the boot receipt, system inspection, event subscription and ship-wide Feather lifecycle.

The canonical Wyrdrune whole-vessel programme lives at `lib/wyrdrune/wayglass-vessel-plan.wtl`. It composes two carried Möbius cycles, verifies all eight systems, declares Withness, produces a boot plan and returns a launch anchor. It executes through the shared Wyrdrune parser and runtime.

Architecture and acceptance: `docs/wayglass/WAYGLASS_WHOLE_VESSEL_OS_20261122.md`.
