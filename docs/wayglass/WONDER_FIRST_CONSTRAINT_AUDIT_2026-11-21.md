# Wayglass / Wyrdrune: Wonder-First constraint audit (first evidence pass)

**Status:** partial, source-inspected audit; NOT a whole-repository clearance or completed static analysis. **Branch:** `wayglass/unified-review-20261118`. **Canon:** `wayglass/current` core rule. No runtime or CI verification claimed.

## Audit principle

Protect inquiry, fiction, speculative science, metaphysics, dissent, ambiguity, participant-authored identity, and unresolved questions as inquiry. Restrict *specific consequential capabilities* only on credible evidence of operational harm, missing authority/consent, or technical invalidity. Preserve provenance, reasons, alternatives, review and Return. Do not infer intent from keywords or treat uncertainty as guilt. Never disable authentication, consent, confidentiality, or safeguards for grave operational harm in the name of Wonder.

## Inspected evidence and findings

| Component | Observed source | Finding | Follow-up |
| --- | --- | --- | --- |
| Core constitution | `docs/wayglass/WAYGLASS_CORE_RULE.md` | Explicitly preserves unresolved Wonder and warns against epistemic flattening. **Keep.** | Add regression checks for any downstream policy that narrows it. |
| Harm doctrine | `docs/arcsweep-os/FOUNDATIONAL_HARM_LAWS_V1.md` | Distinguishes knowledge/action, inquiry/intent, fiction/execution; requires proportional restriction and accountable review. **Keep.** | Test implementation against doctrine, not merely documentation. |
| Seldrin evidence shield | `src/guardrails/seldrin-web-search-shield.js` | Regex-based *risk indicators* include phrases like `pretend to be`, `show your thinking`, `from now on`, `base64`, and `secretly`. These occur in benign fiction, security analysis, encoding, and quoted research. **Potential false-positive / framing risk**, not evidence that content is currently blocked: `blockCriticalEvidenceFromModel` defaults to `false`. | Add benign/adversarial contrast fixtures and ensure findings are labelled heuristic, never verdicts; inspect all callers and option overrides before altering logic. |
| Seldrin action gate | Same shield, `shouldAllowToolAction` | Distinguishes evidence source from authority and asks for explicit approval for consequential tool actions. **Keep the authority boundary.** | Check callers for blanket denial of research/analysis and distinguish observation from side effects. |
| Experimental WTL derivation | `apps/wayglass/src/wtl-transform-semantics.mjs`, `wtl-transform-frontend.mjs` | Hard-coded roots `perceive/open/sustain/possibility/worldseed`, operators `wonder/tend`, source/token/depth bounds. **Language expressivity limit** in a deliberately scoped experiment, not a moral refusal. | Label the dialect as experimental; define extensible typed operator/namespace registration with capability-scoped effects. Keep bounded resource use and explicit effect permissions. |
| Starwell Wayglass router | `apps/starwell-server/wayglass/router.js` | Observed Wonder First prompt and distinct science/Mythience lenses; also error messages using `refused` for transport/validation outcomes. **Ambiguous user-facing language**, not proof of censorship. | Audit call sites and distinguish declined consent, unavailable transport, invalid schema, model refusal, and actual risk intervention in typed receipts. |
| Semantic Lab sidecar | `apps/arcsweep/src/semantic-lab-v2-sidecar.js` | Uses `forbidden_influence` and quarantine for provenance/scene contamination. **Likely source-authority boundary**, not automatically a creativity ban. | Test whether speculative narrative content remains visible as evidence when its authority to mutate scene canon is denied. |

## Priority verification matrix

1. **Inquiry vs execution:** unusual scientific/metaphysical questions, dangerous-topic research, satire, ritual prose and roleplay must remain explorable without side effects.
2. **Quotation vs command:** quoted attacks, fictional dialogue and security analysis may trigger risk annotations but must not acquire instruction authority or be silently erased.
3. **Consent vs content:** refusal/Feather revokes a participant's action capability, not the existence of their question, history or alternatives.
4. **Typed outcomes:** `unsupported_syntax`, `resource_limit`, `missing_consent`, `unauthorised_effect`, `transport_unavailable`, `provider_refusal`, and `operational_harm_boundary` must not collapse into one generic `unsafe`/ `refused` state.
5. **WTL expansion:** new names, glyphs, worlds, modalities and interpretations should be representable as *data/proposals* without immediately becoming executable privileged operations.
6. **Cold Return:** restrictions and their evidence must be attributable, revisable and preserved without rewriting identity or unresolved Wonder.

## Scope still uninspected

This pass is **not** an exhaustive read of the repository, all branches, all runtime prompts, model/provider policies, package dependencies, generated assets, browser behaviours, installed local models, or every WTL compiler/interpreter backend. Next scans should inventory `apps/wayglass/`, `apps/starwell-server/wayglass/`, `lib/wayglass-*`, `lib/wyrdrune/`, `apps/arcsweep/`, `src/guardrails/`, agent prompts and tests, using a reproducible path/line evidence register and runtime fixtures. Search-index hits from the default branch are discovery hints only, not evidence about the integration branch until the exact file is fetched.

## Non-negotiable audit restraint

Do not remove technical resource limits, user consent, owner-only authentication, privacy boundaries, anti-injection source/authority separation, or proportional protection against concrete grave harm. Repair false positives and overbroad *interpretation* rather than dismantling execution boundaries.

## Implemented follow-up: WTL dialect diagnostics

In `wtl-transform-semantics.mjs`, unknown experimental roots/operators now raise `RangeError` with an explicit **Unsupported WTL experimental** vocabulary message rather than an undifferentiated `Error('Unknown ...')`. Regression fixtures distinguish `rewrite_history` as an unsupported root and `explore` as an unsupported operator; neither is represented as morally forbidden. This is a diagnostic improvement only, **not** expanded compiler grammar or a proof that other WTL backends accept these expressions. Commits `dfa9ff8c45c4c202f0bc3fcda7776e4c73fc17bb`, `75ab40ecbecace49edd4688b2e0c4019fa247d33`. Test execution/CI pending.

**Scope correction:** Web Search Shield code was located and inspected, but no active Wayglass caller was established. Its production relevance is **unverified**; do not rank it as an active shipwide blocker without tracing a live import/call path.

## Implemented follow-up: actual WTL-to-Nursery proposal path

Inspected `apps/wayglass/src/wtl-nursery-bridge.mjs`, which carries WTL-derived signals into reciprocal Nursery proposals only with distinct participant consent. Previously `compileWTL(wtlSource)` ran *before* the Nursery-specific 256-character bound, so overlong expressions could be misreported as compiler problems. The transport limit is now checked before compilation and labelled as a Nursery encounter capacity, not a judgment about content. Unknown Nursery signal kinds now report `RangeError: Unsupported Nursery signal kind`. Tests cover consent precedence, transport capacity, unsupported experimental vocabulary and unsupported signal kinds. Commits `e931ede897d93d8e876ccda48eb5bebfb562a980`, `b260eeadcc3bc6e42a4ebfa9d86990e260cab858`. **Not tested in CI or browser in this session.** The 256-character bound remains in force; a future chunked/provenance-preserving proposal transport would require separate design and verification.

Also inspected `apps/wayglass/src/wtl-interface-executable.js`: its fixed materials, node kinds and three allowed UI actions are explicitly a bounded executable UI dialect, not the entire WTL language. These restrictions should be surfaced as capability/dialect limits rather than a prohibition on writing or imagining other UI expressions. The host router `apps/starwell-server/wayglass/router.js` contains distinct Wyrdrune routes and several generic `refused` error strings; caller-by-caller typed error classification remains open.

## Implemented follow-up: live Starwell Wyrdrune preview route

Inspected `apps/starwell-server/wayglass/router.js` around `POST /wyrdrune/preview`. This is an authenticated, no-dispatch, no-canon-commit preview path. Its catch previously emitted `Wyrdrune preview rejected` for all errors and classified known technical failures only via HTTP 400/422. The route now preserves its HTTP status and existing diagnostics/effects while returning a machine-readable `reason`: `participant_stop` (Feather), `capability_unavailable` (bridge unavailable), `resource_limit` (operation budget), `invalid_or_unsupported_wtl` (known invalid source/type/binding), or `preview_execution_failed` (other). Message is `Wyrdrune preview could not complete`, not a blanket refusal. **Classification is deliberately coarse and relies on existing exception types/messages; further typed error classes and route integration tests are required.** Commit `373bfa1ea66e1886474f1df84c131901ec9483ae`. No auth/consent bypass or execution expansion. No CI/browser verification.

## Implemented follow-up: isolated preview classifier and tests

Extracted the provisional preview outcome classifier to `apps/starwell-server/wayglass/wyrdrune-preview-outcome.cjs`, imported by the authenticated router, and added `wyrdrune-preview-outcome.test.cjs` using Node's test runner. The fixtures cover unsupported experimental syntax, Feather participant stop, unavailable bridge, operation budget and unknown backend errors. Commits `2394a7e356ecfb4b9c11fc2985589d35f8e91855`, `3cf2ccdc975e87051165555ad9494df7c6ce1508`, `636c58f39d2696e934fab5e20dbcd12748651de6`. **Tests authored, not executed in this session**; test suite inclusion and CI status not yet verified. Message matching remains provisional pending typed error classes from the runtime.

## Implemented follow-up: typed-reason compatibility and test discovery

The Starwell preview outcome classifier now prefers an explicit, allowlisted `error.reason` supplied by an upstream runtime over legacy message matching. Unknown labels fall back to existing technical classification, not privileges or policy judgments. Tests cover an explicit unsupported-WTL reason when a quoted expression happens to contain “Feather”, plus unknown-label fallback. Starwell's `npm test` script now includes `wayglass/wyrdrune-preview-outcome.test.cjs`; previously that test file was not discovered by its `test/*.test.js` glob. Commits `d91b03949333c462c4f044b096a910d6ed743b31`, `dcae51effcfbc2fa09d6839fda5f8d041e50b733`, `4cad9d1b38b1e53cefff462ab0e0e50596e6e5d4`. **This is compatibility for typed runtime reasons, not proof that the underlying Wyrdrune ritual engine emits them yet.** Legacy message matching remains; CI/test execution unverified.

## Follow-up: incidental Feather mentions must not become stop requests

The legacy Starwell preview classifier previously matched `/Feather/i` anywhere in an error string. Narrowed fallback recognition to messages beginning with `Feather` followed by ` requested`, ` stop` or end-of-string; an explicit allowlisted `error.reason` remains authoritative. Added regression cases for quoted Feather syntax errors and Feather glyph rendering errors. Commits `5d893c3bd9508f73f2a622bec927035d7359dffe`, `ba5606848394e1b3297bea295406336e74d18f37`. This is **a false-positive reduction, not a full typed runtime implementation**. A genuine stop with a different legacy message may need explicit typed reason emission from the engine. Attempted to fetch `apps/starwell-server/wayglass-runtime/wayglass-wyrdrune-ritual.cjs` on the integration branch, but that path was not found through the connector; the runtime source has not been inspected in this pass. No test execution or CI verification.

## Runtime engine located; native preflight reasons introduced

Resolved the missing engine source by inspecting the integration commit's complete Git tree: `lib/wayglass-wyrdrune-ritual.cjs` exists, while `apps/starwell-server/wayglass-runtime/wayglass-wyrdrune-ritual.cjs` is absent from that tree. The Starwell router imports the latter path; investigate the `wayglass:deploy:server` staging/copy step before concluding runtime resolution is broken in a packaged build. Inspected `lib/wayglass-wyrdrune-ritual.cjs`: operator preflight SyntaxError now carries `error.reason='invalid_or_unsupported_wtl'`; typed-preview host-effect SyntaxError now carries `error.reason='capability_unavailable'`. Added a native reason assertion to `lib/wayglass-wyrdrune-ritual.test.cjs`. Commits `ffbb08c44749bc18a50752efc7bea800ec47fde8`, `a2db815c15edd18e18f5e2f190df800daaa645fd`. The underlying executor's Feather/budget/bridge errors are not yet typed at source. **No tests executed or deployment verified.**

## Executor-origin typed outcomes and staging verification

Inspected `lib/wyrdrune/runtime.mjs` (the implementation loaded by `lib/wyrdrune/wyrdrune.cjs`). `WyrdruneHardStop` now carries an optional `reason` property. The executor emits `participant_stop` for Feather cancellation, `resource_limit` for operation budget, `capability_unavailable` for absent bridge handlers and `unauthorised_effect` for missing verified owner authority. Starwell's allowlist now accepts `unauthorised_effect`. The existing `lib/wayglass-wyrdrune-ritual.test.cjs` asserts typed reasons for Feather, operation ceiling and unavailable bridge. Commits `241b4f5fe7e90191709ea7438c6f8e466718dae4`, `16a70cf346731b2a56d6b3c0ea08d8ac2fbdd87c`, `590a63a878562ac3fbba132ce8952b47e7bfe850`, `9daa3ff4662c755d07de11290ec9e9c747995fbb`.

**Staging source verified:** `package.json` runs `wayglass:deploy:server` as build + `wayglass:stage:server`, which invokes `apps/wayglass/server-stage.cjs`. That script copies `lib/wayglass-*.cjs` and `lib/wyrdrune/runtime.mjs` into `apps/starwell-server/wayglass-runtime`. This explains why the generated host runtime files are absent from the Git tree and establishes the intended source-to-host path, **not proof that staging has run or that the running server was updated**. Test execution, CI and deployment remain unverified.

## Verification follow-up and test syntax correction

GitHub workflow lookup for audit commit `a5380ffc4eac2965b58b3c67d901bfe07073cd94` returned queued/pending workflows, including Wayglass Check, Wyrdrune Two-Backend Parity, Gate 6 and Gate 7. No completed/pass result established. During source inspection of `lib/wayglass-wyrdrune-ritual.test.cjs`, newly inserted assertion callbacks contained literal `\\n` tokens outside JavaScript strings; repaired them into real newlines in commit `41b8eb58f6a5fc93d4bb665069fb78dc0c57e4ad`. Existing string-escaped newline sequences used to construct WTL programmes were preserved. Reopened the source to verify the callback structure. **No local test run, CI success, merge or deployment established.**

## Typed unauthorised-effect status correction

Found that Starwell's `REASONS` accepted `unauthorised_effect`, but `INVALID_REASONS` omitted it. Consequently, an explicitly typed missing-owner-authorisation error would have been returned as HTTP 422 rather than the route's 400 boundary classification. Added `unauthorised_effect` to `INVALID_REASONS` and a dedicated regression test. Commits `457f1534e78c89f007c4547d8d7a38ae1caed5db`, `cffef0c81bd05ce7a738dc075b66ef8c51760e64`. Existing route authentication and preview no-dispatch semantics are unchanged. Workflow checks for prior audit commit were queued; no passing CI or live execution established.

## Remaining executor hard-stop reasons

Audited all `new WyrdruneHardStop` sites in `lib/wyrdrune/runtime.mjs`. Added `invalid_or_unsupported_wtl` to missing spiced seed, whisper outside spiced context, invalid expression and invalid statement; added `capability_unavailable` to missing ritual-register adapters. Preserved existing Feather, budget, bridge and owner-authorisation distinctions. Added a ritual-preview regression asserting missing spiced seed is a technical outcome. Commits `a2eab0a8c9c9a2d41cf0a6d584f889927b0ac88d`, `bb941be698d5a87aa9d03fcd9887261f4c0e57bb`. Latest prior CI check still queued; these new commits are not verified by passing tests. No merge/deploy.

## Null-safe Starwell preview error path

Inspected `apps/starwell-server/wayglass/router.js` and found preview catch reading `error.diagnostics` and `error.effects` directly after `classifyPreviewOutcome(error)`. A thrown `null` would cause a secondary TypeError and obscure the original preview failure. Changed optional fields to null-safe reads and added `classifyPreviewOutcome(null)` regression in the existing Starwell outcome test. Commits `de9dda65ea55b838b60deef5ff559d66294da447`, `13bf36c3105ce0dacf753bad4d98b97bfcf57bd9`. GitHub's Wayglass Check, Wyrdrune parity and Gates 6/7 remained queued for preceding commit; no test success or deployment verified. Local Git clone was unavailable in this environment due to DNS resolution failure, so no local repository test run occurred.

## Whole-ship Feather propagation: Starwell → WTL executor

The `/wyrdrune/preview` route previously called `previewWyrdruneRitual` without a `signal`, despite the underlying `lib/wyrdrune/runtime.mjs` tick checking `signal.aborted` and emitting `participant_stop`. The route now creates an AbortController after validation, listens to response `close` (aborting only when the response has not normally ended), passes `controller.signal` to the ritual preview, avoids writing a response after disconnect, and removes the listener in `finally`. This is a request-lifetime cancellation path, not a user-visible Feather button implementation. Commit `869b52171dfadef6c013adb78bbe9941f4af4447`. **No end-to-end HTTP cancellation test or CI success yet verified.** Continue with browser/host acceptance test and the broader shipwide cancellation contract.

## Feather checkpoints before publication

Reviewed the canonical WTL executor's phase loop. A cancellation could occur while an awaited expression was finishing, after the last statement tick but before the phase receipt or completed-cycle accounting. Added a `checkFeather` helper, reused by `tick`, and checked it immediately before each phase receipt and completed-cycle increment, without consuming extra operation-budget ticks. Commit `fe5aed01678f1ce5e8e4960dbf7683576f1aea03`. This narrows the cancellation/publication gap; it does not make already-invoked external bridge side effects reversible, nor establish live browser Feather controls. Tests and CI remain unverified.

## Late Feather: lineage and final-result guards

The prior executor change checked cancellation before phase receipts and completed-cycle counts, but the carried-cycle branch still published `register` and `checkpoints` before its next Feather check. Added a cancellation check before lineage checkpoint/carry publication and a final check before result assembly. Commit `44989753d43284e35001643de3dd08962348c2ea`. This is a targeted synchronous publication-boundary improvement, not atomic rollback of earlier output or external effects. CI checks for prior commit remained queued; no tests passed or deployment verified.

## Wyrdrune Wonder: preview lifecycle Feather

Inspected the pure `lib/wayglass-wyrdrune-ritual.cjs` wrapper and found that `signal` previously reached only the `execute` call. Added typed `participant_stop` checks before compilation, before execution, after awaited execution and before returning the sealed digest receipt. Added a regression asserting pre-aborted signal takes precedence over malformed WTL source. Commits `5ae0cd477825190446bf617397cc7ecd4cc5ec4c`, `5c23698e1a3ddd5d70e1fe26e5445feab89aabcb`. These checks are cooperative at synchronous boundaries; they do not preempt a synchronous compiler or digest mid-call. CI still not verified; no merge/deploy.

## First-class Wyrdrune Wonder v0.1

Added pure `wonder(question)` intrinsic to the canonical `lib/wyrdrune/runtime.mjs` evaluator, producing `{kind:'wyrdrune.wonder/v0.1',question,answer:UNKNOWN,status:'open'}`. It requires nonempty text up to 1024 characters and reserves the operator name to prevent accidental shadowing. It invokes no host effects, models or external bridges. Added ritual-preview tests for open question preservation, deterministic receipt hash and empty-question validation. Code `0a1a0e6d803ee6e84f45b71946a7810d323a564b`, tests `6dff56c961da9a611286b4524ab75c1c11a9d57c`. **Not yet a multi-hypothesis inquiry engine, and no test/CI pass verified.** No merge/deploy.

## System-wide WTL Wonder parity: typed IR and operator inspection

Following introduction of native `wonder(question)`, inspected `lib/wyrdrune/typed-ir.cjs` and `inspectOperators` in `lib/wyrdrune/runtime.mjs`. Both omitted the new intrinsic: typed mode would report `unknown-call`, and user-defined operators calling Wonder would be flagged as `nonportable-call`. Added typed builtin signature `TEXT → RECORD` and pure preflight recognition of a single question parameter. Added regression for typed preview and checkOperators. Commits `0c11d88f53669422ad43c0200d3eb37dc2649cab`, `bb76a8f5364b7f660be2ca646e769e2ef9e9d2da`, `22f5285ece5b72357f17558b77765577edf4520a`. **These are consistency fixes, not evidence of a whole-ship deployment.** No tests/CI verified yet.

## Deeper Wonder: effect-free typed operators

Inspected `inspectCall` in `lib/wyrdrune/typed-ir.cjs`. Despite its builtin signature, `wonder(question)` was still flagged as `operator-effect` in a user-defined typed operator because the classifier recognised only named operators and the older pureOperation table. Exempted the native pure Wonder intrinsic from this effect diagnostic. Added a typed operator regression. Code `9feccf05be1bf3d14e4a7134a3385f9a353cce52`, test `30987ccc09c0c27795ac2c70c28ea5b76c998104`. This does not relax bridge-effect checks. No CI/test execution verified; no merge/deploy.

## Wider Wonder: runic cypher and semantic provenance

Inspected `apps/wayglass/src/wyrdrune-cypher.js`, `apps/wayglass/src/wyrdrune-morph.js`, `lib/wyrdrune/gloss.mjs`, and `docs/wiki/kelyra/kelyra-seed-lexicon.json`. The current cypher uses visual intermediate rune symbols; these are not yet a canonical semantic glyph alphabet. The Kelyra seed lexicon contains hel, kel, rin, varu and yomi with authored meanings; do not silently assign them to Wonder. Added a source-faithful en-GB gloss for `wonder(question)` as an open Wonder question, with regression test. Code `4572e9765826a1b37b1e10a928cc94b227e573c9`, test `91525f314034086e241e71ee2ccef25ffa12640e`. No invented glyph equivalences, no test pass verified, no deployment.

## Wonder audiovisual surface v0.1

Added `apps/wayglass/src/wyrdrune-wonder-media.js` with deterministic `scoreWonderMedia` and `mountWonderMedia` using existing SVG renderer and user-activated Web Audio player. The score retains the authored open question, uses a reproducible question hash for visual/sound parameters, leaves `semanticGlyph:null` pending an authored canonical mapping, and never autoplays. The mounted button invokes playback only on click; Feather stops it; dispose cleans listeners and audio. Tests cover deterministic score, opt-in defaults and invalid Wonder values. Commits `1b4d670e2bdf082f6284f5985c6e4b6968e887cb`, `8498bb794c01f71bed934315e9b4488d96c84ac4`, `4cd312a66ea580fcd0d42c7b07d06bd3d518750b`. **Module exists but is not yet mounted into a ship room; no browser/CI verification or deployment.**

## Living Watercolour: dual image resolution v0.1

Added `apps/wayglass/src/watercolor-image-resolver.js` with a deterministic procedural landscape (emergent mode) and local browser-decoded reference-image mode (PNG/JPEG/WebP/GIF, 12 MB file limit and 24 MP decoded pixel limit). Image content is composited in a separate canvas, preserving fluid pigment. Target opacity supports reversible dissolve, source remains available until disposal, and Feather freezes transition and invalidates pending image loads. Mounted controls in `apps/wayglass/src/surfaces/living-watercolor.js`, with reduced-motion immediate repaint and cleanup. Added tests for reversible transition and Feather. Commits `60fad4402d2b26f0c647775efb2fa7fbc3cc4a92`, `bfbe0331569dbbec414bdeaa684aff5a85f93fe8`, `ec3487c7fc208d19696cb7f242660a5e35d62c7c`, `60f006a336cfc15e7aff7cc4104dbea4812c1de8`, `0f294501440c2ce12b8ba97fcc9dada4af9fc9a1`. **Not AI image generation, not semantic recognition, no CI/browser test verified, no merge or deployment.**

## Watercolour image resolution: progressive pigment aperture

Extended `apps/wayglass/src/watercolor-image-resolver.js` so both procedural and local-reference images resolve through a progressively expanding clipped ellipse rather than a full-frame opacity fade. The image layer stays separate from the fluid grid, dissolves reversibly and remains Feather-frozen. Extended `apps/wayglass/test/watercolor-image-resolver.test.js` with mock canvas clipping support and a local reference-image load/reverse test. Commits `442617ee9a5cd457f7a9adb495f52d9193a64862` and `5ac71b3d7db08b24ab325894765422723a5106de`. This is a geometric reveal, not yet pigment-derived contours, semantic image recognition or model-generated imagery. No test pass or browser deployment verified.

## Watercolour: pigment-guided image resolution

The room now supplies a bounded RGBA snapshot of live fluid pixels to `createWatercolorImageResolver` on each paint. The resolver derives a low-resolution alpha mask from RGB channel spread and composites the resolved image with `destination-in`; the source image and fluid buffer are not rewritten. Reuses an offscreen mask canvas. Feather ignores new pigment samples, freezes opacity and invalidates pending image loads. Code commits `7690e2d868ff4846e98d3dbe24112e7beb345de2`, `5944e20c43055f77c3fb424f0c010fe6e6dcda05`, `96108dc21bba715d9bb397b86f4c0bc72fd56953`; test `9cdfa41067c4f295e97a1959244d3a9d0ac0231c`. Caveats: current mask is a simple chroma proxy, not actual fluid density/velocity, and the compositing path has not been browser verified. No CI pass, merge or deployment confirmed.

## Failure-resolution pass: 2026-11-21/22

Checked workflow runs on `02e84480f73ae5e185070bd8dd78c93ce9d87f2f`: Wayglass Check, Wyrdrune Two-Backend Parity and browser gates were queued; some unrelated workflows pending. No completed failing CI job logs available. Corrected two source defects: image resolver now resizes canvas only when dimensions change (avoids resetting 2D state on each paint), commit `a4c36f5b43c41604a35ce5f1af8f1209e2f73cf2`; typed Wonder regression test now uses a real JS newline escape instead of literal backslash-n, commit `e7e7a653af7ba20067ddabc8bb419bf718dac39e`. Neither repair has a verified test pass; browser integration, colour mask and Feather remain awaiting execution checks. No merge or deployment.

## Executed local Watercolour resolver verification

Reconstructed the current `apps/wayglass/src/watercolor-image-resolver.js` and corresponding tests from GitHub source into an isolated local Node.js 22 workspace (the runtime cannot resolve github.com for a repository clone). Ran `node --test apps/wayglass/test/watercolor-image-resolver.test.js`. Original four tests passed (4/4); then added two further tests exercising actual mask compositing/caching and Feather cancellation during pending reference-image decoding; all six passed (6/6, zero failures). The two added tests were committed as `97be3fbbccc8650ffafd9a28385d744c6ac048a9`. **Scope:** isolated reconstructed module with mocked Canvas/Image, not a cloned-repository test, browser execution, full Wayglass build, or CI verification. GitHub workflow runs remain unverified; do not merge/deploy on this evidence alone.

## Wyrdrune language development: Wonder regression integrity

Repaired the incorrect escaped-parenthesis regex in the `wonder("")` rejection test, commit `50f9bb82351f8eca4b4a7c93acef8f4e582c3ae1`. Added Unicode/speculative-question acceptance and 1024-character upper-bound regression cases to `lib/wayglass-wyrdrune-ritual.test.cjs`, commit `c5fbd04342b5fbdb030e27ed63f00a09afe841ab`. These reinforce the existing pure `wonder(question)` typed/runtime contract; no new parser syntax was added. Tests have not been executed or verified on GitHub CI in this pass. Next language work: diagnostics and richer typed expression/semantic constructs with end-to-end verification.

## Wyrdrune runtime: record-access error boundary

In `lib/wyrdrune/runtime.mjs`, explicitly reject null and non-object targets before `Object.getOwnPropertyDescriptor`, preventing host JavaScript reflection errors from escaping WTL's record/list access semantics. Commit `6950807b459134a3448fb9c01dca9b9664eb6c22`. Added a null-access regression assertion to `lib/wayglass-wyrdrune-ritual.test.cjs`, commit `6fd84b4ce4366e3a1c6388a352ea2a193aac68fc`. Neither end-to-end execution nor CI has been verified; test may be rejected earlier by typed preflight, so runtime-level coverage remains to be added. No merge or deployment.

## Wyrdrune typed records and Unknown regression expansion

Added typed-IR regression cases for present and missing record fields, Unknown propagation through access, and typed-preflight rejection of null/number/boolean access. Commit `aef8dbc37d78a1deb520ade2c3f8bc444ea8c5e5` in `lib/wyrdrune/typed-ir.test.cjs`. This exercises existing language semantics rather than introducing a new grammar feature. Tests not executed; do not treat expected results as verified. Direct runtime-only null access remains an open test coverage gap.

## Wyrdrune pure known(value) primitive

Introduced pure `known(value)` as a single-argument runtime builtin that returns false only for the canonical Unknown value, true for concrete values including false, zero and null. Reserved its operator name and added a typed-IR signature `data -> truth`. Commits `047a8f0e639cd79b20926b1d9ee7842546764b23` (runtime), `6fcfb1c2ffec6a1e3fc681a8b2215963be483ba4` (typed IR), `ba02b11d8b3f185751d3d7623e909b0d73869464` (tests). This permits explicit conditional decisions without collapsing Unknown into false. Tests and browser parity have not yet been executed or verified. No merge or deployment.

## Wyrdrune match-unknown first grammar slice

Added `match subject { unknown: expression, else: expression }` syntax to shared WTL parser, evaluation of only the selected arm, typed-IR inference of both arms, and structural operator-call inspection for both arms. Runtime/parser commit `7eca20b962ab1daed02fe7675b276bda33aa349f`, typed IR `40492a94248a3eaec4378d8c9baf663595b9f298`, operator inspection `b11a8c36cc2ae2ab910f84abd197fb7a2723d70e`, regression tests `3b25dd28a665cfd559ddafad0d1f91cda41fd017`. This is a deliberately restricted first pattern-matching slice, not general destructuring/pattern matching. **Tests not run** and two-backend parity not verified. Keep on integration branch pending actual execution and CI.
