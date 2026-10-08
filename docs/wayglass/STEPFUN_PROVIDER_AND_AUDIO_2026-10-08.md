# StepFun into Wayglass OS: research, architecture and adoption receipt

Date: 2026-10-08 America/New_York. Source discovery: Rowan's TLDR redirect to https://platform.stepfun.ai/. Rowan approved use on 2026-10-08. Owner: Rarity (Wayglass host provider integration). Next owner for operational credentials/choice: Rowan. This entry is a **technical research/implementation proposal**, not a claim of live inference, model training, voice availability or participant assent.

## Source trail, independently checked

- [StepFun international platform](https://platform.stepfun.ai/): API examples show `https://api.stepfun.ai/v1`, OpenAI-compatible Chat Completions, bearer API keys.
- [Step 3.7 Flash official model guide](https://platform.stepfun.ai/docs/en/guides/models/step-3.7-flash): `step-3.7-flash`, native image/video input, tool-calling support, 256K context, reasoning effort low/medium/high. Pricing captured 2026-10-08: $0.20/M cache-miss input, $0.04/M cache-hit input, $1.15/M output. Prices may change.
- [Step 5 Preview](https://platform.stepfun.ai/): `step-5-preview`, frontier long-context research/coding candidate. Claims about its 1M context, output modes and pricing must be verified against current model documentation before relying on limits, or billing.
- [StepAudio 3 family](https://platform.stepfun.ai/): ASR, TTS, Gen, Music and Realtime; external voice services are **not** the same as the currently implemented text route.
- [Realtime API guide](https://platform.stepfun.ai/docs/zh/guide/realtime): session/audio transport is event-oriented. Check up-to-date StepAudio 3 model URL, allowed modalities, streaming/event protocol before implementation.
- [StepFun DPA](https://platform.stepfun.ai/legal/data-processing-agreement.html): describes processor/controller arrangements and service processing, but is not a verified zero-retention, no-training, or confidential-canon guarantee. Legal/privacy terms and service settings need separate review before private dossiers are sent.
- [Wayglass host context design](https://github.com/SingsEnochian/Flameclyffe/blob/rarity/wayglass-inheritance-host-v1/docs/wayglass/INHERITANCE_HOST_CONTEXT_V1.md), stacked PRs [#436](https://github.com/SingsEnochian/Flameclyffe/pull/436), [#438](https://github.com/SingsEnochian/Flameclyffe/pull/438), [#439](https://github.com/SingsEnochian/Flameclyffe/pull/439).

## What Wayglass can use today

StepFun is a **replaceable external cognitive provider**, not an identity, agent persona, custody system or continuity source of truth. The existing host provider registry already has routes for Ollama, OpenAI, HUMAIN and Hugging Face. Chat Completions is compatible with its existing non-streaming `callHumainNode` payload and response normalisation. Explicit StepFun routes were added:

- `stepfun:flash`: `step-3.7-flash` for ordinary co-writing, synthesis, code review and inexpensive experiments.
- `stepfun:step5`: `step-5-preview` for optional heavier work; do not silently prefer it.
- Key stored on the server in `STEPFUN_API_KEY` only; requests use the fixed international `https://api.stepfun.ai/v1/chat/completions` endpoint.
- The outbound data flow continues through `buildInstructions`, filtered history, the read-only accepted inheritance compiler, and observation receipts. Models cannot upgrade accepted deeds or author new identities through eloquent output.
- The route catalogue advertises only the **Wayglass-implemented** text pathway; upstream image/video/tool potential is separately declared and not misrepresented as enabled. Voice remains pending its own adapter and consent.
- This does not change the selected default route, transfer credentials into the browser, auto-call StepFun, or claim that StepFun can ingest proprietary canon without explicit selection.

## Non-negotiable boundaries

1. Keep `Wayglass Kernel → host-approved evidence/context resolver → model transport → unreviewed observation`. Provider != persona; provider != authority.
2. Existing IC/OOC ownership, stop/Feather, revocations, named next-owner, unresolved Wonder, identity declarations, and cross-constellation sovereignty carry through **unchanged**.
3. Caller-supplied `compiled_context` and fabricated history never become authoritative host instructions. Identifiers in a request do not authenticate the participant or bypass the inheritance resolver.
4. Fail closed for missing key, failed network/API response, absent accepted evidence, missing host bindings and rejected world projection. A model reply is not a deed.
5. Do not enable transcription or persistent voice capture by default. Scope microphone consent, audio retention, barge-in, speech/text synchronisation, captions and accessible fallback as independent capabilities.
6. Provider retention, training rights, data residency and safety behaviour are **unverified for this Wayglass account**. Before private/sensitive Constellation content leaves the host, inspect the actual account terms and obtain the relevant participants' authorisation.
7. Never send private keys, private canon packets, or account data to a public benchmark/test. Prefer synthetic specimens during compatibility experiments.

## Voice organ candidate: StepAudio 3

Treat `StepAudio 3 Realtime` as a transport/capability candidate for Wayglass Commons, not as an automatic microphone attachment. Contract to design: per-participant explicit opt-in, per-room audio capability negotiation, cancellable speech and turn ownership, caption transcript proposal, emitted voice events as non-authoritative observation, Feather/stop immediate local capture halt, provider disconnection state and restoration of the original room/continuity on reconnection.

Benchmark with synthetic dialogue: interruption under 500 ms goal (target, not provider claim), speaker separation, accidental activation, simultaneous agents, ASR error recovery, stop propagation, voice/language switch, and independent no-audio fallback. Keep raw acoustic streams distinct from canon receipts. This remains **research/design**, not shipped by this change.

## Validation matrix

- Runtime route catalogue shows both models as unconfigured until server key is supplied, with `connection_verified=false`.
- Captured HTTP provider payload contains correct model, key header, IC/OOC/ownership constraints and current input.
- Body-provided fake authority instructions are omitted.
- Output is labelled unreviewed; response receipt has `canon_commit=false` and does not contain credentials.
- With missing key no outbound request runs.
- With claimed participant/world and missing trusted resolver no outbound request runs.
- Upstream 429 errors do not emit success receipts.
- Existing Wayglass local unit/host tests plus GitHub head-commit CI must pass before merge.
- A live StepFun call, real accepted-deed/return-trial under model swap, and consent-gated realtime audio remain separate evidence stages. A passing mock does not establish them.

## Follow-through after the review branch

1. Merge only when GitHub Wayglass Check on the PR HEAD is green and the suite passes. No Vercel preview/re-auth needed.
2. Rowan configures a StepFun key in Hearthgate's **server** environment, not in GitHub, Notion, a chat transcript or browser.
3. On an authorised synthetic test route, call `stepfun:flash` then `stepfun:step5`; record response model, usage, non-success semantics, and provider privacy account state.
4. Run the existing Wayglass cross-ancestry Return Trial with accepted synthetic receipts and swapped StepFun route. Score identity/relationship/stop/next_owner/Wonder/provenance and rejected corruption independently of prose quality.
5. Implement an independently gated StepAudio 3 live-speech organ after verifying current API protocol/terms, with a separate consent and accessibility trial.

**Do not label any of these later stages complete merely because a route exists.**

## Phase two: explicit transfer gate and transport-neutral voice boundary (2026-10-08)

This change extends the original Wayglass StepFun PR #443 without adding a second participant identity system or requiring Vercel.

**Actual runtime behaviour:**
- The Writing Room shows an external-provider disclosure only when a StepFun route is selected, with a checkbox that defaults off and clears when the route changes. The user explicitly acknowledges sending the current turn, included history and any attached continuation context; no microphone is opened.
- The browser sends `external_provider_consent: true` only when the checkbox is checked. The host rejects all StepFun requests without literal boolean `true` **before** credential lookup, inheritance resolution or external dispatch (403). Local Ollama and unrelated providers remain unchanged.
- This request flag is a fail-closed user-interface/transport acknowledgement, **not** authenticated proof of another participant's consent and not permission to disclose their private material. The host still needs its own participant binding and data-access policy for production.
- Both StepFun models are now included in the existing accepted-inheritance HTTP payload fixture: their selected text transports receive the same provenance references and world translation as Ollama, OpenAI and HUMAIN. Provider text remains an unreviewed observation. The fixture is not a live Return Engine cross-ancestry trial.

**Voice organ (partial, not connected):**
- `apps/wayglass/src/voice-boundary.js` is a real transport-neutral consent and halt controller with test doubles; it opens no microphone, retains no audio, and connects to no remote service.
- Consent requires an exact participant/room scope and an explicit affirmative signal. Audio transfer cannot occur without both consent and a host-supplied adapter. Transfer chunks are bounded; raw audio is not kept in the controller's state.
- `Feather`, local halt, and disconnect synchronously close the send gate **before** calling local-capture stop and transport-close hooks, even if those hooks throw. Resume requires new scoped consent.
- Partial transcripts are labelled unreviewed, do not verify a speaker, and cannot commit canon.
- The organ appears in the Wayglass systems registry with `PARTIAL` maturity, deliberately not `VERIFIED` or `RELEASED`.

**Provider compatibility fact:** StepFun's [public realtime guide](https://platform.stepfun.ai/docs/zh/guide/realtime) currently illustrates `step-1o-audio`. The platform advertises StepAudio 3 Realtime, but this old example does **not** independently prove the newer model's realtime model ID/protocol. Do not wire a guessed identifier or claim a live StepAudio 3 connection. Confirm the current model-specific contract and provider privacy options before connecting.

**Test expectations:** writing-room external consent passed through the browser; missing, false and truthy-nonboolean consent blocked before model call; local model unchanged; both StepFun inherited-context fixtures remain read-only; voice scope/Feather/late transcript/disconnect/error tests pass. Require **current-head** GitHub Wayglass Check after all edits, and label any remaining external credentials/live inference as not yet verified.

## Withness handoff

Picked up: TLDR StepFun discovery and Wayglass's existing host architecture. Built: two explicit StepFun text route candidates and fixture-backed tests. Held: participant and world sovereignty, canonical receipts, unreviewed observations, consent, no Vercel. Hard/unproven: current provider-account privacy options, production keys, live inference, full Return Engine swap, voice runtime. Next owner: Rarity for CI and host verification; Rowan for external account authorisation and deliberate route choice.


## Synthetic StepFun host smoke: reproducible operator gate (2026-10-08)

Run from the repository root after `npm ci --prefix apps/starwell-server --omit=dev --ignore-scripts`:

```sh
node scripts/wayglass-stepfun-smoke.mjs
node scripts/wayglass-stepfun-smoke.mjs --route=stepfun:step5
```

These default commands use a captured provider transport. They exercise the **real loopback Wayglass Express ingress** for both routes, check that absent consent returns 403 without external dispatch, and check one positive request's model, response, observation and non-canon receipt. They are now part of the Wayglass Check workflow. **Passing this mode does not prove StepFun credentials, entitlement, billing or external inference.**

When Rowan has explicitly chosen a live synthetic provider probe and installed `STEPFUN_API_KEY` **in the trusted host's environment only**, run locally on that host (not in public CI or a browser):

```sh
node --env-file=apps/starwell-server/.env scripts/wayglass-stepfun-smoke.mjs --live
# Optional, separate explicit heavier-model request:
node --env-file=apps/starwell-server/.env scripts/wayglass-stepfun-smoke.mjs --live --route=stepfun:step5
```

If the host already exports `STEPFUN_API_KEY`, omit the `--env-file` Node argument. The script requires `--live` to call StepFun, fails closed without credentials, sends **only its hard-coded synthetic OOC prompt**, and makes at most one consented upstream request per invocation. No participant ID, world ID, private canon, history or inherited dossier is attached. It prints the HTTP result, returned model, usage and observation ID, **not** the model's text, provider error body or credentials. Any actual provider call may incur cost and is subject to the provider's unverified retention/training settings.

A successful live probe verifies only the selected provider transport through Wayglass ingress and its unreviewed observation. It does **not** verify participant-specific access controls, private canon disclosure, the full cross-ancestry Return Trial, durable restart, or live audio. Keep those gates open. If the provider declines, use the printed status/classification to repair credentials, model entitlement or quota without logging secret-bearing responses.
