# ArcSweep Caretaker v0.1

**Status:** LIVE MODEL PATH / bounded action surface

**Purpose:** Give ArcSweep a House intelligence that can converse naturally, interpret intent, and propose bounded runtime actions without becoming another Flame or claiming unverified state changes.

## Model seat

Preferred installed/local model: `hf.co/DavidAU/Gemma-The-Writer-Mighty-Sword-9B-GGUF:Q4_K_M`.

Local override: `MODEL_ARCSWEEP_CARETAKER`.

Hosted model default: `z-ai/glm-5.3-flash` through the existing OpenRouter service plane. Hosted override: `ARCSWEEP_CARETAKER_OPENROUTER_MODEL`.

The Caretaker is explicitly a House role. It must not impersonate, merge with, or speak for Constellation members. Its plan schema and action law remain ArcSweep-owned. Transport does not grant authority.

## Runtime topology

Hosted ArcSweep no longer depends on a Vercel rewrite for Caretaker chat. Live production probing proved that the old `/api/v1/house/caretaker` to `/api/v1/house/rooms?house_action=caretaker` rewrite reached the ordinary House rooms function without a usable Caretaker dispatch marker. Browser preflight therefore received a `401 House Runtime session required` response instead of Caretaker CORS.

The broken Vercel rewrite is retired.

On the two canonical hosted surfaces, the Caretaker client now calls the dedicated Supabase Edge function directly:

`https://rufrmjyusalnifpegllj.supabase.co/functions/v1/arcsweep-caretaker`

Hosted surfaces:
- `https://singsenochian.github.io`
- `https://flameclyffe.vercel.app`

The browser reuses the already signed-in ArcSweep/Kelyran Supabase session. The short-lived Supabase access token is sent as a bearer token to the Edge function. The Edge function validates the actual Supabase user and Steward identity before any model call. No House master credential is sent cross-origin.

The Edge function handles CORS preflight before authentication and admits only the two canonical browser origins. It invokes the existing OpenRouter service plane and returns the same Caretaker model-response contract expected by ArcSweep.

Installed/local ArcSweep keeps the House/Hearthgate/Ollama lane. `api/_shared/house-caretaker-runtime.mjs` and `apps/starwell-server/caretaker/router.js` remain the local/shared adapter path for Mighty Sword and explicit local runtime configurations.

## v0.1 action surface

Only `navigate` is armed.

Model output is a proposal using `arcsweep.caretaker-plan/v0.1`. The browser validates the schema, rejects unknown action types, rejects room ids outside the supplied live room registry, invokes the actual room button, waits for render, and verifies the observed active room before marking the action applied.

The Caretaker reads World identity from the existing `runtime-world-context.js` state path rather than guessing from DOM order or decorative labels. If that authoritative read fails, World context remains unavailable.

No world activation, brush mutation, file write, canon write, settings change, deployment, shell command, or arbitrary tool execution is permitted in v0.1.

## Conversation surface

`caretaker-sidecar.js` provides a threaded chat rather than a one-shot command box. It retains a bounded local conversation history, sends the most recent turns as context, supports Enter to send and Shift+Enter for line breaks, and displays the actual transport/model path after a successful turn.

The intended hosted experience is one sign-in to ArcSweep, then ordinary conversation. There is no second Caretaker-specific login or runtime sealing ritual.

## Receipt state

The client produces `arcsweep.caretaker-receipt/v0.1` and attempts to store the latest 60 receipts in local storage as `local-replayable`. This survives a browser reload on that client, but it is not yet a Runtime Braid receipt and must not be described as House-wide durability.

If local storage is blocked, full, or unavailable after an action has already executed, the completed receipt remains visible with `persistence: not-yet-durable` and a storage error. Persistence failure must never erase execution proof.

Hosted responses record `execution_path: supabase-edge-to-openrouter` and `auth_mode: supabase-bearer`. Local responses preserve their actual provider and execution path.

## Mounted surface

`caretaker-sidecar.js` is a registered global sidecar in `sidecar-bootstrap.js`. It is deliberately not imported by the core `houseglass.js` adapter. `main-bootstrap.js` skips sidecar bootstrap during Safe Boot, so Caretaker failure cannot compromise the recovery path.

## Verification gate

Current automated proof requires:

1. Hosted transport selects Caretaker Edge on GitHub Pages and canonical Vercel.
2. Hosted transport never forwards a stored House master credential cross-origin.
3. Edge preflight returns 204 with the narrow allowed-origin CORS boundary.
4. Unauthenticated Edge requests return a readable 401 rather than a browser network failure.
5. Edge source preserves the House-intelligence identity and `navigate`-only action law.
6. Local ArcSweep retains the existing House/Hearthgate/Ollama lane.
7. The complete ArcSweep test suite and production build pass.
8. A signed-in browser receives an actual model reply and, for a navigation request, produces an applied navigation receipt.

After the first applied hosted navigation receipt exists, the next Caretaker durability gate is Runtime Braid persistence for `caretaker-action-receipted`. Only after that event is appended and read back successfully should a second action family be considered.
