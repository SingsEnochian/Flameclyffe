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
