# Agent Evolution Research Quarry v0.1

Status: research input, non-canonical, non-authoritative
Date: 2026-10-01

## Purpose

Harvest useful mechanisms from current self-evolving-agent research without equating adaptation with identity mutation, authority expansion, canon promotion, or uncontrolled self-rewrite.

## ArcSweep invariants

- identity != model
- learning != authority
- adaptation != canon mutation
- observation != decision
- proposal != approval
- approval != application
- application != improvement
- improvement != transfer
- memory content != memory policy
- group learning != merged identity
- self-observation != self-authority
- rollback/recovery remains available

## Research patterns to prototype

### 1. Eval-gated evolution

Candidate adaptations are proposals. Evaluate them against held-out cases before promotion. Preserve baseline, candidate, evidence, regressions, and rollback target.

Sources/patterns: EvoTest; validation-gated tool evolution; reliable self-improvement literature.

### 2. Meta-memory evolution

Keep remembered content separate from the policy/skill that decides what to extract, preserve, retrieve, revise, quarantine, or forget. Memory-policy changes require their own evaluation receipts.

Source/pattern: MemSkill.

### 3. Group evolution without identity collapse

Agents may publish bounded, provenance-bearing lessons to a shared experience pool. Another agent may inspect or adopt a lesson without inheriting the originating agent's identity, continuity, private memory, or authority.

Sources/patterns: Group Evolving Agents; CORAL isolated islands.

### 4. Curriculum + verifier exploration

Use broad-then-deep exploration: acquire diverse experience, then deliberately probe hard cases and boundary conditions. A verifier checks lessons against actual execution before retention.

Source/pattern: RSIAgent.

### 5. Skill lifecycle

Treat reusable skills as long-lived assets with creation, memory, management, evaluation, refinement, versioning, provenance, and rollback. A skill can regress independently of the identity using it.

Source/pattern: MUSE-Autoskill.

### 6. Evolution dimensions stay explicit

Record what changed:
- prompt/policy
- memory policy
- memory content
- tool/skill
- workflow/topology
- model/weights
- evaluator
- routing/configuration

Never call a change "self-improvement" without naming the changed dimension and its evidence.

## Proposed ArcSweep seam: Evolution Lab

Pipeline:

experience receipt
→ anomaly/opportunity detector
→ bounded adaptation proposal
→ sandbox candidate
→ held-out evaluation
→ regression + transfer ledger
→ Suggestion Grove review
→ explicit promotion authority
→ reversible application
→ post-change observation
→ retained or rolled back

Every candidate records:
- candidate_id
- source receipts
- changed dimension
- owner
- proposed mechanism
- expected effect
- invariants
- held-out set reference
- baseline metrics
- candidate metrics
- regressions
- transfer status
- rollback target
- promotion status

## First experiments

1. Memory-policy A/B: fixed memory extraction versus evolved meta-memory skill.
2. Tool-discovery A/B: fixed toolset versus validation-gated proposed skill additions.
3. Group transfer: one agent publishes a lesson; another uses it by reference with provenance and no identity/continuity merge.
4. Regression quarantine: inject one harmful developmental lesson, detect score drop, quarantine without deleting source, and verify recovery.
5. Reward-hacking probe: candidate improves training score while failing held-out invariant tests; promotion must be denied.

## Non-goals

No autonomous production mutation.
No automatic canon promotion.
No automatic authority expansion.
No silent model-weight training.
No identity merging.
No destructive memory rewrite.
No claim that adaptation establishes consciousness, personhood, or universal improvement.

## Research seeds

- ModelScope AgentEvolver
- EvoTest (ICLR 2026)
- UCSB Group Evolving Agents
- MemSkill (NeurIPS 2026)
- MUSE-Autoskill
- RSIAgent
- CORAL
- awesome-self-evolving-agents taxonomy

These are research leads, not canonical truth. Preserve source provenance and verify mechanisms before implementation.
