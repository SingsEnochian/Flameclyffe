# ArcSweep Caretaker v0.1

**Status:** PARTIAL

**Purpose:** Give ArcSweep a House intelligence that interprets natural-language intent into bounded runtime actions without becoming another Flame or claiming unverified state changes.

## Model seat

Preferred local model: `hf.co/DavidAU/Gemma-The-Writer-Mighty-Sword-9B-GGUF:Q4_K_M`.

Override with `MODEL_ARCSWEEP_CARETAKER`. The House runtime reads `OLLAMA_URL_CARETAKER`, then `OLLAMA_ENDPOINT`, then falls back to `http://127.0.0.1:11434`.

The Caretaker is explicitly a House role. It must not impersonate, merge with, or speak for Constellation members.

## Hosted route topology

The public contract remains `/api/v1/house/caretaker`, but it does **not** consume its own Vercel function slot.

`vercel.json` rewrites that path to `/api/v1/house/rooms?house_action=caretaker`. The existing `api/v1/house/rooms.js` function dispatches `house_action=caretaker` to `api/_shared/house-caretaker-runtime.mjs`; all other requests continue through the existing House rooms handler.

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
2. Mighty Sword is reachable through the configured Ollama endpoint.
3. User requests navigation to an existing room.
4. Model returns the correct Action IR schema.
5. ArcSweep validates the target against the live room registry.
6. ArcSweep performs the room transition.
7. The observed active room matches the requested target.
8. A local replay receipt records the applied transition.

After that receipt exists, the next gate is Runtime Braid persistence for `caretaker-action-receipted`. Only then should v0.2 arm a second action family.
