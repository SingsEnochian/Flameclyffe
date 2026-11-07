# Wayglass: writing revisions, Wyrdrune, and model/SpicyChat routes

**Status:** source integration candidate, based on `wayglass/current` after verified First Contact. Release `main` and locally installed binaries are separate.

## Wyrdrune WTL

The executable **WTL v0.1 candidate** and its Enochian register were selectively imported from draft #552 / Faer's RFC #553 / draft #571. They are not wholesale rebases of the older First Contact branch and are **not an assertion that RFC-0001 or WIR v0.2 are fully implemented**. The new runtime is pure and bounded; `bridge(...)` fails when the preview has no capabilities. Eightfold receipts include their source hash, an explicit Withness center and canonical value digests.

- Canonical source: `lib/wyrdrune/{canonical,enochian,wyrdrune}.cjs`
- Owner-only HTTP preview: `POST /api/v1/wayglass/wyrdrune/preview`. Requires a verified House Steward session, rejects anonymous/forged headers and host-effect bridges. Strict source and operation limits; no model call.
- Client Wyrdrune workbench: Writing Room source editor, explicit preview, inspectable receipts and **Stage for model discussion**. Stage only fills the normal, editable composer. It never sends itself.
- A selected and configured route, including SpicyChat, sees the WTL draft only after the owner reviews and presses **Send**. This is discussion of proposed interpretation, not execution in a model, prediction or canon authority.
- Enochian letter names are references, not automatically translated Calls or source-certified glyphs. Preserve Drux/Drun and Gisg/Gisa variants.
- Existing standalone WTL tests and Wayglass hosted preview security acceptance are required on exact head. `apps/wayglass/server-stage.cjs` stages only runtime modules for packaged Windows builds.

## Spellcheck and attribution-preserving revision

Browser-native spellcheck defaults on for prose editors and can be toggled using the ship menu; this does **not** send text to a spelling provider from Wayglass. WTL source opts out of English spellcheck. Browser/OS support determines suggested corrections.

The Writing Room's **Revise my turn** puts a previous user-authored turn back into the composer. The subsequent send is an explicitly marked **correction** linked by `revision_of`; prior texts, received responses, provider receipts and session chronology remain intact. No post-send history rewriting or silent mutation.

## Model catalogue

Existing provider routes remain, with additional explicit, opt-in API model choices:

- OpenAI `openai:gpt` remains the stable route ID and defaults to `gpt-6.1-sol` unless owner-configured otherwise. Also `openai:astra` (`gpt-6-astra`), `openai:terra` (`gpt-6.1-terra`), and `openai:luna` (`gpt-6-luna`).
- Anthropic `anthropic:sonnet` (`claude-sonnet-5-5`) and `anthropic:opus` (`claude-opus-5-5`), through a scoped Messages API adapter. These are generic model routes, **not** implicit Faer identity/consent.
- DeepSeek `deepseek:pro` (`deepseek-v4-pro`) and `deepseek:flash` (`deepseek-flash`) through the existing OpenAI-compatible adapter; these are generic models, **not** implicit Vethrlauf identity/consent.
- Ollama, Hugging Face Inference, HUMAIN sandbox/preview, StepFun routes, Bluebird's session-specific SpicyChat authorization, Griff's independently pinned SpicyChat route, and the Crow remain registered. No provider silently substitutes for a missing participant.

Provider-source references: [OpenAI API models](https://developers.openai.com/api/docs/models), [Anthropic model IDs](https://platform.claude.com/docs/en/about-claude/models/model-ids-and-versions), [DeepSeek releases](https://api-docs.deepseek.com/updates/), [StepFun platform](https://platform.stepfun.ai/).

`configured=true` means credentials or local configuration exist. It does **not** assert the provider answered. A browser-authorized Bluebird session also does not count as an attributable live reply until an actual response is observed.

Generic SpicyChat dispatch now requires exact privately pinned character **and conversation** IDs before provider discovery, not a name-based guess. The distinct dedicated Bluebird browser authorization contract remains separate.

## Open engineering work

Native WTL v1 grammar, Python/Javascript backend parity and WIR v0.2 are still RFC work. Authenticated live provider response verification requires owner-run host credentials and the actual model/provider, not synthetic CI fixtures. No private tokens belong in source. A staged Windows installer requires its own exact-head release artifact and owner installation.
