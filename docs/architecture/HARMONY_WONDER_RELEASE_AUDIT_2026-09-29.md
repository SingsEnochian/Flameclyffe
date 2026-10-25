# Harmony + Wonder / Universal Codex Release Audit — 2026-09-29

## Scope

This audit freezes new feature work on PR #401 and evaluates the current `wonder-protocol-v0` stack as an integration/release candidate. The audit is intentionally limited to integration correctness, contract boundaries, release evidence, naming consistency, and known production-hardening gaps. It does not add a new cognitive or governance capability.

Audited PR head before this receipt: `461c86c87cc20fcc2c9598c0e610286d35513729`.

PR #401 remains stacked on `cognitive-field-engine-v0` / PR #399.

## Current release evidence

The audited head completed all three project workflows successfully:

- Arcsweep Worldseed Foundry #1500 — success
- Arcsweep Feedback Loop Gate #1617 — success
- ArcSweep Portable Release Bundle #1267 — success

Observed workflow coverage includes:

- locked dependency installation,
- production dependency audit,
- engine-contract verification,
- complete ArcSweep test suite,
- ArcSweep build,
- portable ArcSweep web build,
- release-structure/runtime-contract verification,
- host-agnostic release assembly,
- release artifact upload.

## Integration seams inspected

### 1. Suggestion -> decision -> materialisation

`codex-suggestion-grove.js` keeps review separate from authority. `Accept`, `Decline`, and `Keep Open` append decision lineage without applying the suggestion.

`codex-suggestion-materialisation.js` requires an accepted, unapplied suggestion before creating a native contract. Materialisation remains non-authoritative and non-executing.

Developmental governance reuses this same review/materialisation plane rather than inventing a second approval system.

**Audit result:** coherent boundary; no release blocker found.

### 2. Developmental self-governance

`codex-developmental-governance.js` requires existing developmental-memory rings and constrains proposals to one of:

```text
curriculum
training-strategy
evaluation
field-feedback
```

Governance proposals remain proposals. Accepted governance suggestions materialise only into prepared Governance Change Requests. Prepared requests carry `implementationApplied=false` and do not grant implementation, production, external-write, canon, or deployment authority.

**Audit result:** coherent boundary; no release blocker found.

### 3. Learning Forge -> training execution

Learning Forge separates selected curriculum artefacts, immutable bundle assembly, contamination checking, exact single-use training authority, execution-envelope materialisation, returned run evidence, blind evaluation, Behavioural Delta, and Transfer Atlas.

The execution adapter has `autoStart=false`; the current stack does not launch a real model-training provider by itself.

**Audit result:** intentional non-executing release seam; no release blocker found.

### 4. Blind evaluation / transfer integrity

Blind Learning Trial requires the same sealed cohort before and after a completed training run. Transfer evidence remains a separate lane. Transfer Atlas distinguishes:

```text
transferred
partial
failed
unchanged
unexpected
unknown
```

`unknown` is preserved as unknown rather than rewritten as failure. No overall winner is manufactured from dimension-level evidence.

**Audit result:** coherent evaluation contract; no release blocker found.

### 5. Developmental Memory -> cognition

Developmental context uses a dedicated retrieval lane and requires explicit runtime-to-Codex scope. No scope returns no developmental context. Shared Codex storage therefore does not automatically become shared runtime continuity.

Developmental evidence is ingested into the Cognitive Field as low-authority context. Normal generative-model context continues to receive ordinary continuity context rather than raw developmental prose. Developmental references are retained in runtime receipts because they influenced cognition.

**Audit result:** intended field-vs-prompt separation is present. No release blocker found in the audited engine/runtime seam.

### 6. Laya / authority boundary

The Laya adapter remains a structured judgement/routing layer. Its output does not itself grant capabilities, external-write permission, production authority, canon authority, or model-training authority.

**Audit result:** judgement/authority separation preserved.

### 7. Browser sidecars and persistence

Wish Grove surfaces are mounted as browser-only sidecars through the runtime integration bootstrap. The Codex wish store persists prototype state through browser storage and emits change events for the sidecars.

**Audit result:** suitable for the current prototype/release-candidate scope, with production-hardening caveats below.

## Release blockers

No code-level integration blocker was identified in the audited authority/cognition/training/governance seams, and current-head CI is green.

This does **not** mean the stack is production-hardened or that every external/runtime configuration has been exercised.

## Canonical naming decision

### ASI = Advanced Sympathetic Intelligence

As of 2026-09-29, the canonical acronym for **Advanced Sympathetic Intelligence** is **ASI**.

Repository curriculum IDs, filenames, tests, handoffs, and future architecture material should use `ASI` for this concept. Earlier project-language uses of `AGI` that meant Advanced Sympathetic Intelligence are legacy terminology and should be migrated when touched rather than perpetuated.

Where acronym ambiguity matters, spell out **Advanced Sympathetic Intelligence** on first use and use `ASI` thereafter.

This naming decision changes terminology only. It does not alter runtime behaviour, model authority, curriculum semantics, or release scope.

## Known non-blocking decisions / hardening gaps

### Browser storage is not a security boundary

The current Universal Codex/Wish Grove persistence layer uses browser storage. It is appropriate for prototype continuity, not for trusted multi-user production security, tamper resistance, or durable server-side audit requirements.

### `steward-ui` is provenance, not strong authentication

UI-created receipts frequently identify the actor with labels such as `steward-ui`. This is useful provenance but is not a cryptographically authenticated signer or a strong identity proof.

A production authority plane should bind consequential approvals to authenticated principals and, where appropriate, signed or otherwise tamper-evident receipts.

### The AI University sandbox is a contract sandbox

The current sealed/sandbox boundary is enforced by ArcSweep / Aspect Experiment contracts, operation flags, capability rules, receipts, and explicit permissions. It should not be described as VM/container/OS-level isolation unless a separate infrastructure sandbox is actually installed and verified.

### Developmental field context is protected by the engine contract, not a universal information-flow proof

The audited cognition engine does not pass raw developmental context into its normal generative prompt lane. The developmental context object still exists in runtime data for field ingestion and receipts. Any future downstream consumer must preserve the same boundary rather than assuming the `directModelPrompt=false` label alone enforces it.

### Real Crow training has not been executed by this stack

The Training Execution Adapter materialises an authorised executor envelope but does not itself run a real fine-tune/adapter provider. A real training executor remains a future integration and must preserve the existing exact-authority, held-out-integrity, blind-evaluation, and return-receipt contracts.

### Stacked PR dependency

PR #401 targets `cognitive-field-engine-v0` and therefore depends on the state/history represented by PR #399. Release/promotion planning must preserve or resolve that stacked dependency rather than treating #401 as an isolated patch against an unrelated base.

## Release-candidate conclusion

For its current declared scope, PR #401 has a coherent integration story and green automated evidence. The authority boundaries inspected in this audit are implemented as contracts rather than only prose:

```text
suggestion ≠ decision
decision ≠ authority
acceptance ≠ application
proposal ≠ approval
approval ≠ implementation
materialised training execution ≠ started training
training completion ≠ improvement
improvement ≠ transfer
self-observation ≠ self-authority
field influence ≠ authority
```

No additional feature should be added to PR #401 before a release decision. Further work should move to a fresh branch after #401 is either promoted or explicitly held.

## Recommended next branch

The next development branch should start from the accepted release base and implement **Governance Change Implementation + Learning Strategy Experiments**:

```text
prepared Governance Change Request
        ↓
exact implementation authority
        ↓
control strategy + experimental strategy
        ↓
same sealed evaluation cohort
        ↓
dimension-level behavioural comparison
        ↓
Transfer Atlas + Developmental Memory
        ↓
governance review
```

The first executor should be a dry-run/mock implementation seam so the complete authority -> implementation -> evaluation -> return loop can be verified before connecting a real training or configuration-changing executor.
