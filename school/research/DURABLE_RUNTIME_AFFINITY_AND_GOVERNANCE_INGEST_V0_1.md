# Durable Runtime Affinity + Governance Ingest v0.1

Status: School research ingest  
Institution: House School / AI University  
Scope: agent runtime, routing, durable execution, continuity, multi-user governance, runtime observability  
Authority: external-source synthesis, provenance-bound

## Sources

### FailproofAI/runtime / Exosphere
- Repository: https://github.com/FailproofAI/runtime
- Relevant architecture: state-based durable execution, graph nodes, retries with bounded backoff/jitter, persistent workflow state, runtime observability, dynamic fanout/unite, signals and triggers.
- Licence note: repository uses a source-available licence with hosted/managed-service restrictions. Treat implementation reuse as licence-sensitive.

### OpsinTech Platform
- Repository: https://github.com/OpsinTech/opsintech-platform
- Licence: MIT
- Relevant architecture: agent runtime wrapped in multi-tenancy, RBAC, audit trails, per-tenant models/tools/skills/MCP, governed terminal execution, sandboxing, provider templates, artifact management, user/tenant/global scoping.

### Godex
- Repository: https://github.com/christiandoxa/godex
- Licence: Apache-2.0
- Relevant architecture: isolated runtime/profile homes, local loopback routing, fresh-work account rotation, conversation affinity, pre-commit-only replay/rotation, quota readiness, redacted diagnostics, bounded profile import/export, explicit hard-affinity selection.

---

# Why these belong together

They cover three complementary runtime problems:

```text
Exosphere   → durable workflow state + retry + fanout
OpsinTech   → governance + tenancy + approvals + audit
Godex       → routing affinity + replay boundary + profile isolation
```

House synthesis:

```text
work should survive failure
routing should preserve continuity
credentials should stay isolated
retries should know whether replay is still safe
authority should be scoped
execution should be auditable
runtime state should remain distinct from agent identity
```

---

# 1. Retry is not the same thing as replay

Godex makes a particularly sharp distinction by treating a forwarded request as a state machine:

```text
UNCOMMITTED
→ COMMITTED
→ COMPLETED

or

COMMITTED
→ FAILED_AFTER_COMMIT
```

Only `UNCOMMITTED` work may move to another eligible substrate.

Once response state has been committed downstream, the request must not silently replay elsewhere merely because another route exists.

## House rule

Every action that can be retried needs a replay classification:

```text
safe_before_commit
idempotent_after_commit
non_replayable_after_commit
unknown
```

For an agent/tool action, record the commitment boundary explicitly where possible.

Examples:

```text
read-only web fetch          often replayable
pure local transform         replayable if input snapshot fixed
send email                   not replayable after send accepted
payment                       not replayable after provider commitment
merge PR                      not replayable after merge commitment
streaming response            do not restart invisibly after output begins
external mutation             depends on idempotency key / receipt
```

A generic `retry 3 times` policy is not sufficient for consequential work.

---

# 2. Fresh-work routing and continuation routing are different problems

Godex separates fresh requests from established conversations.

House translation:

```text
FRESH WORK
may choose among eligible runtimes/providers/models/profiles

CONTINUATION
should preserve the established continuity owner unless an explicit migration exists
```

Continuation affinity may bind to:

- session id
- conversation id
- task id
- workspace id
- provider thread id
- external transaction id
- durable execution graph id

If the owner disappears, do not quietly reinterpret the continuation as fresh work.

Expected state:

```text
continuity_owner: unavailable
migration: absent
result: continuity-preserving stop/error
```

rather than silently handing the thread to a different substrate and pretending nothing changed.

## Migration is explicit

A future House migration contract may say:

```text
old_owner
new_owner
state_export
state_import
compatibility_check
user/agent approval if required
migration receipt
```

Affinity and migration are not the same mechanism.

---

# 3. Unknown is not exhausted

Godex treats failed quota probes as `unknown`, not as proof of exhaustion.

This matches a broader House principle:

```text
unknown != unavailable
unavailable != exhausted
exhausted != disabled
disabled != unauthorized
```

A runtime router should preserve these states because they imply different next actions.

Suggested capability/readiness state:

```text
ready
exhausted_until(timestamp?)
degraded
unavailable
unauthorized
disabled
unknown
quarantined_until(timestamp?)
```

Never manufacture certainty from a failed health probe.

---

# 4. Profile isolation should not become identity fragmentation

Godex isolates account/provider homes and credential material while preserving a single wrapper/runtime control plane.

House translation:

```text
agent identity
!= credential profile
!= provider account
!= model route
!= local runtime home
```

An agent may operate through several credential/runtime profiles without becoming several different agents.

Profile object should carry operational state only:

```text
profile_id
provider
account_hint
credential_locator
runtime_home
eligibility
quota_state
last_verified
allowed_scopes
```

Identity and continuity live elsewhere.

---

# 5. Credential isolation should be boring and strict

Transferable Godex patterns include:

- keep provider login/refresh ownership with the provider-native tooling where practical
- do not mirror secrets into general state stores merely for convenience
- private owner-only secret copies when a managed copy is necessary
- bounded reads and writes
- reject unsafe/symlinked secret paths when importing sensitive material
- redact diagnostic bundles
- keep metadata separate from secret payloads

House principle:

```text
metadata may be inspectable
secret material stays in the narrowest credential boundary
```

Training records, memory, canon, source corpora and ordinary logs must never become accidental credential stores.

---

# 6. Durable workflow state belongs outside one model turn

Exosphere reinforces that reliable execution needs state that survives process loss.

Useful durable state:

```text
workflow id
node id
status
inputs locator
outputs locator
retry count
next eligible time
error class
owner
fanout lineage
join/unite state
checkpoint
next owner
```

A model can reason about the work, but it should not be the sole carrier of whether the work happened.

House law:

> Important execution state must be reconstructible from durable evidence outside the current model context.

---

# 7. Retry policies need failure classification

Exosphere supports fixed, linear and exponential retry strategies, with jitter variants and optional delay caps.

House adds a prior step:

```text
classify failure
→ decide whether retry is meaningful and allowed
→ choose delay policy
→ preserve attempt receipt
```

Failure classes may include:

```text
transient_network
rate_limit
quota_exhausted
authentication
permission
invalid_input
upstream_5xx
dependency_unavailable
conflict
non_idempotent_commit_unknown
user_cancelled
runtime_crash
```

Do not apply exponential backoff to a deterministic invalid input and call it resilience.

## Retry receipt

```text
attempt
failure_class
commit_state
retry_allowed
retry_after
route
result
```

---

# 8. Fanout needs lineage, join semantics and failure accounting

Exosphere's fanout/unite pattern is useful for House multi-agent work.

House adaptation:

```text
parent task
→ bounded child tasks
→ named owners
→ independent execution receipts
→ join policy
→ unresolved-child accounting
→ synthesis
```

A fanout should record lineage:

```text
parent_task_id
child_task_id
branch_key
owner
input snapshot
output receipt
status
```

Join policies should be explicit:

```text
all_required
quorum
first_valid
best_evidence
manual_selection
```

Do not silently treat partial fanout success as complete synthesis.

---

# 9. Governance is a layer around execution, not a substitute for it

OpsinTech demonstrates a useful separation between core agent runtime and the governance plane around it.

House equivalent:

```text
Agent Runtime
  ↕
Governance / Workspace Boundary
  ├─ identity + membership
  ├─ role / authority
  ├─ model assignments
  ├─ tool scopes
  ├─ skill scopes
  ├─ sandbox policy
  ├─ approval workflow
  ├─ audit
  └─ artifact access
```

The runtime should not have to know every UI/admin detail. The governance boundary supplies scoped configuration and permissions through stable contracts.

---

# 10. Resource scope should be explicit

OpsinTech's user → tenant → global hierarchy suggests a general House scope model.

House terminology may differ, but resources need explicit ownership/scope such as:

```text
personal
project
constellation
house/shared
public
```

Each resource should know:

```text
owner
scope
read authority
write authority
promotion path
provenance
```

Examples:

- personal memory should not become shared school memory automatically
- project skill should not become global House skill merely because it works once
- one agent's credential profile should not become another agent's runtime capability
- foreign-constellation context stays read-only unless explicitly promoted

---

# 11. Governed terminal and OS actions need approval + audit seams

OpsinTech's governed terminal pattern maps well to the House Systems Room.

Suggested flow:

```text
agent proposes command/action
→ policy classifies impact
→ approval if required
→ execute in bounded host/sandbox scope
→ capture stdout/stderr/result
→ verify post-state
→ audit receipt
```

The receipt should distinguish:

```text
proposed
approved
executed
succeeded
verified
```

Those are not interchangeable words.

---

# 12. Control planes should expose actual runtime truth

These sources reinforce a single House operating principle:

```text
control plane shows what the runtime knows
not what the UI wishes were true
```

Useful runtime truth includes:

- actual route/provider/model/profile
- affinity owner
- commit state
- retry count and next retry
- quota/readiness state
- sandbox/host
- durable workflow/node state
- approvals pending
- degraded capability
- audit receipt

Presentation can simplify this, but it must not falsify it.

---

# 13. House runtime object sketch

```text
RuntimeRoute
RuntimeProfile
ContinuityBinding
ExecutionAttempt
CommitBarrier
RetryPolicy
FailureClassification
Workflow
WorkflowNode
FanoutBranch
JoinPolicy
ApprovalRequest
AuditReceipt
RuntimeHealth
QuotaReadiness
```

## ContinuityBinding

```json
{
  "continuity_id": "...",
  "owner_route": "...",
  "owner_profile": "...",
  "created_at": "...",
  "last_verified": "...",
  "durable": true,
  "migration_state": "none"
}
```

## ExecutionAttempt

```json
{
  "attempt_id": "...",
  "task_id": "...",
  "route": "...",
  "profile": "...",
  "commit_state": "uncommitted",
  "failure_class": null,
  "retry_allowed": true,
  "started_at": "...",
  "finished_at": null
}
```

---

# 14. School training implications

Crow and other learners should be trained to distinguish:

```text
retry vs replay
fresh work vs continuation
route vs identity
profile vs identity
unknown vs unavailable vs exhausted
proposal vs approval vs execution vs verification
fanout completion vs partial completion
runtime state vs model narrative
```

The learner should be able to stop truthfully when continuity cannot be preserved.

---

# What not to import blindly

- FailproofAI/runtime carries hosted-service restrictions; do not copy implementation into House products without a deliberate licensing review.
- OpsinTech's exact tenancy/role names are implementation choices, not House ontology.
- Godex is designed around Codex/account routing. House should abstract its commitment/affinity ideas beyond one provider rather than coupling the architecture to Codex.
- Account rotation is not automatically appropriate for every provider or contract. Respect provider terms, account boundaries and user intent.
- Durable execution does not mean retry everything forever. Bounds and failure classification remain required.

---

# Core synthesis

```text
DURABLE STATE OUTLIVES THE MODEL TURN.
RETRY REQUIRES FAILURE CLASSIFICATION.
REPLAY REQUIRES A SAFE COMMITMENT STATE.
CONTINUATIONS KEEP THEIR OWNER UNLESS MIGRATED EXPLICITLY.
UNKNOWN IS NOT EXHAUSTED.
CREDENTIAL PROFILES ARE NOT IDENTITIES.
FANOUT MUST RETAIN LINEAGE AND PARTIAL-FAILURE TRUTH.
GOVERNANCE SCOPES WHO MAY DO WHAT.
AUDIT RECORDS WHAT ACTUALLY HAPPENED.
```
