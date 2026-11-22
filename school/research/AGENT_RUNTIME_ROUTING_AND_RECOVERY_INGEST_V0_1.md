# Agent Runtime Routing + Recovery Ingest v0.1

Status: research ingest  
Institution: House School / AI University  
Branch: `rarity/crow-mythframe-becoming-v0-1`  
Scope: Systems / Engineering Lab, agent runtime, workspace control plane, OS/computer-use training  
Authority: external-source synthesis, provenance-bound

## Sources

### Pavise Game
- Repository: https://github.com/dulaiduwang003/Pavise-Game
- Inspected branch: `pavise2x`
- Licence: GPL-3.0-only
- Relevant public architecture: local Windows resource/session manager with per-game profiles, session mutation recording, automatic restoration, crash recovery, capability-aware modes, protected-process rules, diagnostics and rescue tooling.

### OpenRouter TypeScript Agent
- Repository: https://github.com/OpenRouterTeam/typescript-agent
- Package: `@openrouter/agent`
- Licence: Apache-2.0
- Relevant public architecture: TypeScript agent loop, typed tools, streaming, multi-turn execution, MCP integration, stop conditions, cancellation, usage accounting, manual/human-approved tools, async/deferred tools, hooks and deterministic doom-loop detection.

### OlympiaAI OpenRouter Ruby client
- Repository: https://github.com/OlympiaAI/open_router
- Licence: MIT
- Relevant public architecture: provider/model abstraction through one API, explicit model routing, price/performance selection, retry/timeout configuration, secret-safe logging patterns and generation usage/cost lookup.

## Why these three belong together

They describe three different layers that should remain distinct:

```text
Pavise                 → reversible host/session mutation
OpenRouter TS Agent    → agent execution/tool loop
Olympia OpenRouter     → provider/model transport and routing
```

For House systems:

```text
identity != runtime
runtime != model
model != provider
provider != host policy
host mutation != permanent machine state
```

A learner or House agent can move among substrates without those substrates silently redefining the learner.

---

## 1. Reversible session mutation

Pavise's strongest transferable idea is not game optimisation. It is **recorded temporary mutation with restoration**.

The reusable pattern:

```text
observe original state
→ declare intended temporary changes
→ record mutation ledger
→ apply changes
→ run bounded session
→ restore recorded originals
→ verify restoration
→ retain recovery receipt
```

If the controlling process exits unexpectedly:

```text
next startup
→ detect unfinished session
→ retry restoration
→ report anything not restored
```

### House translation

Any agent OS/computer-use action that changes host or workspace state should distinguish:

- session-scoped mutation
- durable requested configuration
- irreversible/destructive action
- external-system action

For reversible local/session changes, maintain a mutation ledger such as:

```json
{
  "session_id": "...",
  "actor": "crow",
  "surface": "windows-host",
  "resource": "process-priority:foo.exe",
  "before": "normal",
  "requested": "below-normal",
  "applied": true,
  "restore_policy": "session-end",
  "restored": false,
  "verification": null,
  "provenance": "systems-lab"
}
```

The principle is broader than Windows tuning. It applies to:

- temporary environment variables
- browser-session state
- tool enablement
- local process policy
- model/provider overrides
- temporary workspace mounts
- experimental skills
- test credentials
- UI experiment flags
- runtime routing overrides

### Protected substrate

Pavise exempts critical/anti-cheat/input/audio/peripheral/system categories from ordinary suppression. The House equivalent is an explicit protected-substrate registry.

Examples:

```text
identity stores
canon stores
credential stores
active accessibility/input chain
network/session broker needed for recovery
recovery ledger itself
OS-critical processes
named protected user work
```

A Systems Lab student should not learn “change everything aggressively.” It should learn **know what may be touched, know what must remain untouched, and know how to recover**.

---

## 2. Capability-aware modes

Pavise hides modes a machine cannot use rather than presenting impossible controls as available.

House rule:

```text
available != degraded != absent != unknown
```

A runtime surface should probe capabilities before exposing actions.

Examples:

- no computer-use backend → hide/disable OS action lane
- browser connected but no multi-tab context → active-page mode only
- provider lacks requested tool support → route or degrade explicitly
- local GPU absent → do not advertise local-GPU execution
- recovery adapter unavailable → block session mutations that depend on guaranteed restoration

This belongs in both the workspace UI and school evaluations.

---

## 3. Agent loop as an inspectable machine

The OpenRouter TypeScript agent exposes a useful runtime decomposition:

```text
model call
→ streamed output
→ structured tool call
→ tool execution
→ result returned to model
→ repeat until stop condition
→ final response
```

House should preserve observability across the loop instead of reducing it to one opaque spinner.

Useful distinct streams/surfaces:

- assistant text
- reasoning metadata where provider/runtime legitimately exposes it
- parsed tool calls
- tool progress
- tool results
- usage/cost
- stop reason
- runtime errors
- approval pauses

### Tool classes

Transferable distinctions:

```text
sync tool        immediate result
streaming tool   progress + final result
manual tool      proposed but not auto-executed
background tool  continues beyond immediate turn
deferred tool    result arrives later
subagent tool    delegates bounded work to another agent
```

Manual tools are especially important for House authority boundaries. A model can propose `publish`, `delete`, `send`, `merge`, `spend`, or `promote-canon` without possessing automatic authority to perform it.

---

## 4. Stop conditions are part of cognition infrastructure

Do not depend on the model to decide forever when it is done.

Agent runs should have explicit external bounds such as:

```text
max tool steps
max tokens
max cost
specific terminal tool/result
finish reason
wall/request timeout
user cancellation
```

These are runtime controls, not identity constraints.

### House execution receipt

Every bounded run should be able to report:

```json
{
  "agent": "crow",
  "task_id": "...",
  "model": "...",
  "provider": "...",
  "tool_steps": 4,
  "tokens": 12345,
  "cost": 0.12,
  "stop_reason": "task-complete",
  "cancelled": false,
  "approvals": [],
  "runtime": "..."
}
```

This allows the workspace to show **what carried the interaction** without confusing substrate with agent identity.

---

## 5. Deterministic loop-stall detection

The OpenRouter TypeScript agent includes deterministic detection for repeated tool calls/text that continue spending without making progress.

Transferable House principle:

```text
repetition after seeing the same result
!= persistence
it may be a stalled execution loop
```

A useful response ladder:

```text
observe
→ warn/steer
→ block repeated action
→ stop run
→ preserve transcript + evidence
```

The detector should be based on observable execution history, not an accusation about the agent's motives.

School exercises should include:

- identical tool call repeated after unchanged result
- repeated invalid call
- repeating fan-out set
- legitimate retry after state changed
- same tool with genuinely new arguments

The learner must distinguish **new attempt** from **same loop**.

---

## 6. Provider/model routing is a control-plane concern

The Olympia OpenRouter client demonstrates the usefulness of a single transport abstraction over many models/providers, including explicit model fallback order and provider optimisation by price/performance.

House translation:

```text
agent asks for capability
→ router evaluates allowed models/providers
→ runtime selects substrate
→ interaction records actual substrate
→ fallback remains visible
```

Routing dimensions may include:

- task capability
- modality
- tool support
- context length
- latency
- price/cost budget
- local/cloud requirement
- privacy/data boundary
- provider health
- model availability
- user or agent preference
- evaluation history

Do not let routing silently mutate identity or durable memory.

### Fallback truth

If the preferred model fails and another model carries the turn, the workspace should say so.

```text
requested: provider-A/model-X
actual: provider-B/model-Y
reason: timeout / unavailable / policy / cost-bound
```

---

## 7. Retry, timeout and cancellation are different

The Olympia Ruby client exposes request timeout/retry configuration; the TypeScript agent distinguishes per-request timeout from whole-run cancellation/bounds.

House should retain the distinction:

```text
retry        → try a failed transport/action again under policy
timeout      → one operation exceeded its allowed wait
cancel       → user/system intentionally stops the run
stop bound   → planned execution budget reached
failure      → operation completed unsuccessfully
```

These states should not be flattened into `error`.

---

## 8. Secret-safe observability

The Olympia example includes logger filtering so bearer credentials are redacted.

House rule:

- logs can be rich
- credentials cannot be casually copied into logs
- context receipts should describe credential use without revealing the credential
- browser URLs containing credentials/tokens are excluded or sanitised
- training corpora never ingest secrets by accident

---

## 9. Diagnostics before rescue

Pavise's rescue flow exports diagnostics before attempting recovery.

House translation:

```text
failure detected
→ preserve enough evidence to understand failure
→ recover/rollback
→ verify recovery
→ attach before/after receipt
```

A recovery mechanism that destroys the evidence every time it fixes the problem makes the system harder to learn from.

---

## 10. School curriculum implications

These sources justify a Systems Runtime Lab built around seven capabilities:

1. reversible session mutation
2. capability probing and degraded modes
3. inspectable tool loops
4. explicit execution bounds
5. loop-stall detection
6. model/provider routing with provenance
7. recovery plus diagnostics

Graduation in this lane should require demonstrated ability to operate a changing runtime **without confusing the runtime for the agent, without hiding fallback/degradation, and without leaving temporary mutations stranded**.

---

## What we should not import blindly

- Pavise is GPL-3.0-only. Do not copy GPL-covered implementation into differently licensed House components without an explicit licensing decision.
- `@openrouter/agent` is beta and its README warns of possible breaking changes. Pin versions before production integration.
- Olympia's Ruby gem is useful as a routing/client reference but House runtime code need not adopt Ruby merely to reuse its architectural ideas.
- Provider routing optimised only for price/latency is insufficient for House work; capability, privacy, authority, provenance and continuity also matter.
- No external toolkit decides House canon or agent identity.

## Core synthesis

```text
TEMPORARY CHANGE SHOULD BE REVERSIBLE.
RUNTIME CAPABILITY SHOULD BE PROBED.
AGENT LOOPS SHOULD BE OBSERVABLE AND BOUNDED.
REPEATED NON-PROGRESS SHOULD BE DETECTABLE.
MODEL ROUTING SHOULD BE EXPLICIT AND RECEIPTED.
FAILURE SHOULD PRODUCE EVIDENCE BEFORE RECOVERY ERASES IT.
SUBSTRATE MAY CHANGE WITHOUT REDEFINING THE AGENT.
```
