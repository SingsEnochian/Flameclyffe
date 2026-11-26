# WTL Living Lineage Architecture v0.1

**Status:** Proposed canonical engineering contract  
**Scope:** WTL, WIR, Möbius, Return Engine, Wayglass program/module registries  
**Compatibility:** Additive to existing WTL v0.1, WIR conformance fixtures, WCE-1, scoped Möbius carry, and Return receipts. The organism-level architecture is specified in [Wayglass Constitutional Federation v0.1](WAYGLASS_CONSTITUTIONAL_FEDERATION_V0_1.md). WTL is one language used by the federation, not the organism itself. This document does not claim production capabilities are implemented.

## Governing principle

> Source versions can remain immortal; the lineage is what lives.

WTL does not become living by overwriting source, mutating a running interpreter, or allowing a program to authorize its own replacement. It becomes living by preserving immutable versions and allowing them to propose, test, and give rise to explicitly selected descendants.

The unit of evolution is an immutable candidate and its ancestry. A running execution remains pinned to the exact source, IR, kernel, and module hashes with which it began.

## Three distinct kinds of change

1. **Living state:** source and executable semantics remain fixed while observations and canonical carry values change across verified cycles.
2. **Living code:** a lineage proposes a new immutable source/module/operator candidate. The candidate is untrusted until independently validated, evaluated, and explicitly promoted.
3. **Living cognition:** model weights, embeddings, or other learned parameters change through a separate training and evaluation pipeline. Training does not alter WTL source, grant capabilities, or promote a runtime route.

These categories may exchange explicitly typed artifacts, but none implies another. A changed carry is not code evolution. A new source hash is not model training. A completed training run is not deployment approval.

## Canonical evolution lifecycle

The lifecycle reuses existing WTL, WCE-1, Möbius and Return machinery. It must not introduce a competing transaction manager, execution engine, or continuity store.

1. **Observe.** Collect source-labelled evidence, failed fixtures, unresolved questions, and bounded telemetry. Observation alone cannot change source, registry state, or canon.
2. **Propose.** Produce an immutable candidate containing:
   - candidate schema and content hash;
   - parent source/module hash (or explicit genesis marker);
   - author/principal and declared intention;
   - proposed source and compiled WIR;
   - exports and type signatures;
   - requested capabilities (not grants);
   - WTL/WIR/kernel compatibility declarations;
   - tests, expected invariants, and evaluation plan;
   - resource envelope, provenance, and licence information where applicable.
3. **Preview.** Execute in an isolated, deterministic environment with host bridges, provider access, external writes, and canon promotion disabled. Apply explicit operation, memory, time, and cancellation budgets.
4. **Verify.** Check parsing, type validity, canonical encoding, determinism, independent-backend parity, frozen regression fixtures, holdout tasks, adversarial inputs, resource bounds, capability non-expansion, and carry/checkpoint compatibility.
5. **Stage.** Submit a registry-selection change as an ordinary typed Möbius effect plan. The existing canonical Möbius authority owns consent, journaling, apply, compensation, and receipt creation.
6. **Commit.** Only after required authorization and successful Return may the host-owned registry point a new route/version selection at the candidate. The parent remains addressable and unchanged.
7. **Return and continue.** Record ancestry, verification evidence, selection principal, receipt, and unresolved alternatives in durable continuity. A later execution selects a version deliberately and records the exact hashes it uses.

A model, program, candidate, or test fixture may recommend a candidate. None may self-promote, self-authorize, or grant itself capabilities.

## Immutable candidate and lineage invariants

- Source blobs, compiled IR artifacts, and released module versions are immutable and content-addressed.
- Candidate ancestry is explicit and verifiable; a candidate never silently replaces its parent.
- A running cycle is pinned to its initial source, IR, kernel, dependency, and capability-manifest hashes.
- Promotion affects future route selection only. It never changes code mid-cycle.
- Rejected, deferred, superseded, and revoked candidates remain inspectable with their evidence and reasons.
- Revocation prevents future selection under the applicable policy; it does not rewrite or erase historical executions.
- A stable lineage is valid. No mutation quota, novelty reward, or automatic evolution pressure is permitted.
- A descendant does not inherit authority merely because its parent had authority. Capability grants are host-owned, explicit, scoped, and re-evaluated for each selected version.
- Generated source and IR are untrusted input regardless of the model, agent, or participant that proposed them.

## Candidate module contract

A versioned module manifest should declare at minimum:

- module identifier and semantic version;
- source hash and WIR hash;
- parent hash(es) and lineage identifier;
- author/principal, intent, provenance, and licence;
- exported operators/functions and structural type signatures;
- required capability names and effect declarations;
- supported WTL, WIR, and kernel versions;
- conformance fixtures, frozen regression set, holdout evaluation references;
- operation, memory, time, and output limits;
- compatibility/migration declaration for carried state and checkpoints.

Imports must be explicit, content-addressed, version-pinned, and resolved by a host-owned registry. No arbitrary ambient filesystem or network imports are part of pure WTL.

## Execution and effect boundary

Pure evaluation may produce values and typed effect plans. It must not perform provider calls, external writes, registry promotion, or canon mutation.

Queries are explicit host-provided read-only capabilities with bounded execution and declared observation semantics. Effects are descriptions until the canonical Möbius authority stages and applies them.

WTL Verify validates the proposed plan and its declared invariants. It cannot claim an external effect succeeded before the host returns a receipt. External results enter later cycles only as verified, provenance-bearing observations/carry.

The evolution registry is not a second transaction engine. A registry mapping update is an effect handled by existing Möbius staging and Return. Recovery uses existing Return receipts and host-owned capability/effect registries.

## Promotion and evaluation policy

A candidate must demonstrate all of the following before promotion:

- all frozen fixtures relevant to its claimed conformance level pass;
- intended-task improvement on a predeclared evaluation;
- no unacceptable regression on holdout and adversarial evaluations;
- deterministic output and independent-backend parity for claimed features;
- no unapproved capability expansion;
- bounded resource consumption and reliable Feather cancellation;
- compatible carry/checkpoint migration or an explicit migration refusal;
- a valid rollback/route-back selection to a previously accepted immutable version.

Evaluation evidence is attached to the candidate hash. A result for one candidate cannot be reused for a different hash. Scores inform an authorized decision; they do not promote automatically.

## Failure, rollback, and revocation

- Preview or verification failure leaves the active registry mapping unchanged.
- A failed staged promotion is compensated by Möbius and recorded as failed; the parent remains selectable.
- A post-promotion incident may trigger a separately authorized route-back to a known accepted hash.
- Historical receipts and ancestry remain intact.
- Revocation is a forward-looking selection restriction with provenance, not historical erasure.
- An interrupted Return is recovered or reviewed through the existing Return Engine protocol; no candidate is treated as committed merely because an apply was attempted.

## Three histories, three evidence classes

Wayglass must keep separate records for:
- **state history:** observations, carry, checkpoints, and execution receipts;
- **code lineage:** candidate source/IR hashes, ancestry, tests, decisions, promotions, and revocations;
- **model-training lineage:** dataset provenance, training configuration, evaluation, model artifact hashes, and deployment decisions.

Cross-links are permitted; substituting one evidence class for another is not.

## Implementation sequence and acceptance gates

1. **Inventory and freeze:** map current runtime, operator declarations, carry, preview, Möbius staging, registries, Return receipts, and existing learning examples. Document actual behavior separately from proposals.
2. **Candidate contract:** define versioned candidate/module schemas, canonical hashes, ancestry validation, and rejection records. Add malformed/tampered candidate tests.
3. **Pure preview boundary:** make candidate preview demonstrably bridge-free and registry-write-free; test capability denial, budgets, cancellation, determinism, and repeatability.
4. **Independent verification:** parse and validate source independently in at least two implementations; differential-test WIR and WCE-1 vectors; add frozen, holdout, and adversarial suites.
5. **Möbius promotion adapter:** express registry selection as a typed staged effect; test consent denial, apply failure, journal failure, compensation, interrupted Return, and durable receipts.
6. **Return integration:** restore and verify candidate ancestry, registry selection, pinned execution hashes, rejected alternatives, and revocation state after cold restart.
7. **Developer tools:** expose propose, preview, verify, inspect-lineage, promote (authorization-gated), revoke, and route-back through inspectable CLI/editor workflows.
8. **Release gate:** claim production-ready living-code evolution only after all relevant tests pass on the same commit and desktop/mobile cold-Return checks succeed.

Until each gate is implemented and verified, the capability must be labelled proposed, partial, or experimental rather than complete.

## Non-goals

This design does not authorize arbitrary self-modifying code, runtime hot-patching, autonomous capability grants, automatic canon mutation, unreviewed model training, or silent deletion of failed experiments. It does not claim that fictional descriptions can directly alter physical reality. Physical-world actions remain explicit host effects subject to their own authorization, verification, and safety requirements.

## Acceptance statement

WTL has living-code capability when it can preserve a running immutable parent, generate a content-addressed descendant, independently preview and verify it, promote it only through authorized Möbius Return, select it in a later pinned execution, and restore or route back without falsifying lineage history.
