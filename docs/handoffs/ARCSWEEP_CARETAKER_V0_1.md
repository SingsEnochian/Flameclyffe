# ArcSweep Caretaker v0.1

**Status:** PARTIAL

**Purpose:** Give ArcSweep a House intelligence that interprets natural-language intent into bounded runtime actions without becoming another Flame or claiming unverified state changes.

## Model seat

Preferred local model: `hf.co/DavidAU/Gemma-The-Writer-Mighty-Sword-9B-GGUF:Q4_K_M`.

Override with `MODEL_ARCSWEEP_CARETAKER`.

The Caretaker is explicitly a House role. It must not impersonate, merge with, or speak for Constellation members. The shared identity/action contract lives at `apps/starwell-server/caretaker/contract.js` so the hosted relay and local Hearthgate runtime cannot silently drift into different prompts or action vocabularies.

## Hosted route topology

The public contract remains `/api/v1/house/caretaker`, but it does **not** consume its own Vercel function slot.

`vercel.json` rewrites that path to `/api/v1/house/rooms?house_action=caretaker`. The existing `api/v1/house/rooms.js` function dispatches `house_action=caretaker` to `api/_shared/house-caretaker-runtime.mjs`; all other requests continue through the existing House rooms handler.

For hosted ArcSweep, the shared runtime prefers the existing protected Hearthgate bridge when `HEARTHGATE_GATEWAY_URL` and `HEARTHGATE_GATEWAY_TOKEN` are configured. Status is read from `${HEARTHGATE_GATEWAY_URL}/api/v1/house/caretaker/status`; chat is relayed to `${HEARTHGATE_GATEWAY_URL}/api/v1/house/caretaker/chat`. The local STARWELL/Hearthgate server mounts those House routes through `apps/starwell-server/caretaker/router.js`, where the selected Mighty Sword model is invoked through Ollama.

Direct Ollama remains available when `OLLAMA_URL_CARETAKER` or `OLLAMA_ENDPOINT` is explicitly configured. A localhost fallback is used only outside Vercel. Hosted runtime must not treat Vercel's own `127.0.0.1:11434` as the user's Ollama host.

A first preview attempt at commit `292c9f0` failed after the standalone `api/v1/house/caretaker.js` function was introduced. The available deployment evidence did not expose the exact Vercel build error, so the failure cause is not claimed. The standalone function was nevertheless removed and the route consolidated because the project is intentionally avoiding additional Vercel function slots.

## v0.1 action surface

Only `navigate` is armed.

Model output is a proposal using `arcsweep.caretaker-plan/v0.1`. The browser validates the schema, rejects unknown action types, rejects room ids outside the supplied DOM room registry, invokes the actual room button, waits for render, and verifies the observed active room before marking the action applied.

No world activation, brush mutation, file write, canon write, settings change, deployment, shell command, or arbitrary tool execution is permitted in v0.1.

## Receipt state

The client produces `arcsweep.caretaker-receipt/v0.1` and stores the latest 60 receipts in local storage as `local-replayable`. This is durable enough to survive a browser reload on that client, but it is **not yet a Runtime Braid receipt** and must not be described as House-wide or server-verified durability.

The model response itself returns `runtime_braid: null` until a specific Caretaker event contract is added to the existing append-only Runtime Braid.

## Mounted surface

`apps/arcsweep/src/houseglass.js` imports `caretaker-sidecar.js`, so the Caretaker is attached through the Houseglass runtime surface rather than registered as a Constellation voice.

The first UI is intentionally small: a floating `⌁ Caretaker` launcher with one request field, model reply, and visible execution proof line.

## Verification gate

This branch is not VERIFIED until CI passes and a runtime smoke demonstrates this exact sequence:

1. House Runtime session exists.
2. Hosted ArcSweep can reach the configured Hearthgate gateway, or an explicitly local ArcSweep instance can reach Ollama directly.
3. The selected Mighty Sword model is reported available by the local Hearthgate/Ollama status path.
4. User requests navigation to an existing room.
5. Model returns the correct Action IR schema.
6. ArcSweep validates the target against the live room registry.
7. ArcSweep performs the room transition.
8. The observed active room matches the requested target.
9. A local replay receipt records the applied transition.

The gateway path has automated contract coverage, but it is not described as live until the real configured Hearthgate/Ollama route answers the smoke test.

After the first applied navigation receipt exists, the next gate is Runtime Braid persistence for `caretaker-action-receipted`. Only after that event is appended and read back successfully should v0.2 arm a second action family.
