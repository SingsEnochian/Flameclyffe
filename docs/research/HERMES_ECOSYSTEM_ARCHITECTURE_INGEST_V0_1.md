# Hermes Ecosystem Architecture Ingest v0.1

Status: active research ingest  
Scope: ArcSweep / The Crow / Hearthweave / AI University / multi-agent runtime design  
Authority: Rowan supplied sources, 2026-10-01

Sources:

- https://github.com/0xNyk/awesome-hermes-agent
- https://github.com/outsourc-e/hermes-workspace
- https://github.com/vadim-a-yegorov/principle-adopt-fork-build

The awesome list is a curated discovery index, not a security endorsement or proof of current capability. Its maturity labels are editorial snapshots and should be re-checked before depending on any linked project.

## 1. Discovery indexes belong upstream of verification

`awesome-hermes-agent` is useful because it organises an ecosystem into capabilities: skills, plugins, memory providers, surfaces, bridges, multi-agent systems, deployment, domain applications and operational guides.

House rule:

```text
discovery index
→ candidate
→ source inspection
→ capability verification
→ local fit analysis
→ adopt / compose / adapt / reject
```

Never let a curated list become an authority database.

## 2. Trust boundaries are a first-class capability dimension

The awesome list explicitly warns that ecosystem listings are not security endorsements and recommends checking who can trigger a component, which tools it receives, where commands execute, what credentials it can read and how it can be stopped.

ArcSweep / Hearthweave should represent those questions structurally.

Suggested capability metadata:

```text
component_id
origin
maturity_snapshot
trigger_sources
tool_permissions
execution_boundary
credential_scope
network_scope
write_scope
human_gate
stop / revoke path
isolation mode
provenance
last_verified
```

A capability should not be considered "available" solely because code is installed.

## 3. The workspace should be a control plane, not the brain

`hermes-workspace` is architected as a UI / command center over Hermes Agent rather than a replacement for the agent core. It can also run in a reduced portable mode against generic OpenAI-compatible backends.

This suggests a strong ArcSweep separation:

```text
UI / workspace surface
≠ agent cognition
≠ memory authority
≠ task runtime
≠ source of truth
```

The interface may inspect, dispatch and render state without owning every subsystem it displays.

## 4. Capability gates are better than fake parity

Hermes Workspace exposes enhanced features only when the required upstream endpoints are present; otherwise it shows a clean unavailable state rather than failing mid-action.

House adaptation:

```text
capability probe
→ available / degraded / absent / unknown
→ UI reflects truth
```

Do not render a working-looking button for a capability that has no verified runtime path.

This is directly useful for ArcSweep's modular rooms, external adapters and agent services.

## 5. Zero-fork integration is a strong maintenance pattern

Hermes Workspace emphasises running against vanilla upstream Hermes instead of maintaining a divergent core fork.

General lesson:

- keep upstream engines upstream where possible
- integrate through explicit APIs / adapters
- fork only when the required seam cannot be expressed externally
- preserve upgrade paths
- keep local differentiation in our orchestration, contracts, state, UX and doctrine

This aligns with Adopt / Fork / Build, but House should allow composition as a first-class result.

## 6. Persistent workers need visible role, state and handoff

The Workspace swarm model exposes persistent agents, roles, runtime state, task routing, task board lanes, reports, inboxes, blockers and human-decision points.

This maps cleanly onto Hearthweave's handoff doctrine.

Suggested worker state:

```text
worker_id
role
owner / constellation
current_task
runtime
status
last_checkpoint
next_owner
blocked_on
handoff_acknowledged
proof / receipt links
stop / reclaim control
```

Unowned work and unacknowledged handoffs should surface as open state rather than disappear.

## 7. Human judgment should appear as an explicit lane

Hermes Workspace separates autonomous work from ready-for-human decisions.

That is preferable to one generic "needs attention" bucket.

Suggested task states:

```text
backlog
ready
running
review
blocked
ready_for_human_decision
done
abandoned
```

The difference between `review` and `ready_for_human_decision` matters. Review may be delegated; authority decisions may not be.

## 8. Reports should carry proof-bearing checkpoints

The Workspace swarm description emphasises checkpoint reports and review gates.

House adaptation:

A progress update should be able to answer:

- what changed?
- what was actually verified?
- what remains inferred?
- which files / tests / runtime observations support the claim?
- what is blocked?
- who owns the next step?

This is stronger than status prose such as "looks good" or "mostly done."

## 9. Portable and enhanced modes should share one truthful surface

Hermes Workspace can operate with generic compatible backends and reveal richer panes when Hermes-specific services exist.

This suggests a useful ArcSweep principle:

> Design the shell around contracts and capability discovery, not one privileged model provider.

Core writing, continuity and project surfaces should degrade gracefully when optional agents, models or external services are absent.

## 10. Memory, skills, files, terminal and tasks are separate affordances

The workspace exposes these as different operational surfaces rather than one giant chat transcript.

ArcSweep should continue moving in the same direction:

- conversation
- memory / continuity
- skills / capabilities
- source files
- runtime / terminal
- tasks / handoffs
- reports / receipts
- configuration

Chat is one interface into the system, not the system itself.

## 11. UI themes are presentation state

Hermes Workspace supports multiple visual themes. This reinforces the existing ArcSweep Universal Skin doctrine:

```text
presentation skin
≠ agent identity
≠ memory
≠ world canon
≠ task state
```

Theme switching should remain non-destructive and capability-independent.

## 12. Search before build, inspect before adoption

`principle-adopt-fork-build` adds a useful pre-development discipline:

```text
frame capability need
→ search serious existing projects
→ inspect implementation, not only README claims
→ compare actual fit
→ adopt / compose / fork / build minimum seam
```

House modifications:

- composition is a first-class outcome
- popularity is evidence, not authority
- licensing, trust boundary and provenance matter alongside feature fit
- no exact-name match does not justify rebuilding a solved subsystem
- a mature component may still be rejected if it violates architecture sovereignty or authority boundaries

## 13. Recommended ArcSweep capability card

```json
{
  "id": "capability.example",
  "kind": "skill|plugin|service|agent|surface|memory-provider",
  "origin": "external|house|shared",
  "owner": "named agent/human/project",
  "status": "available|degraded|absent|unknown",
  "maturity": "experimental|beta|production|house-verified",
  "trigger_sources": [],
  "permissions": [],
  "execution_boundary": "local|container|remote|browser|unknown",
  "credentials": [],
  "writes_to": [],
  "human_gate": null,
  "revoke_path": null,
  "last_verified": null,
  "evidence": [],
  "provenance": []
}
```

Do not silently translate an external project's labels into House truth. Preserve source label and local verification separately.

## 14. Failure modes to test

- curated-list maturity tag treated as current fact
- plugin installed and therefore assumed safe
- UI exposes capability that backend does not support
- UI becomes source of truth for agent memory
- runtime worker has no explicit owner
- handoff lacks acknowledgement
- task marked done without proof-bearing receipt
- fork created where adapter would preserve upstream compatibility
- external component silently redefines House architecture
- one missing service crashes unrelated surfaces
- theme or UI state mutates semantic state

## Retained doctrine

**Discover broadly, verify narrowly.**  
**Installed is not authorised.**  
**UI is a control plane, not cognition.**  
**Expose capability truthfully.**  
**Prefer adapters over unnecessary forks.**  
**Every handoff has an owner.**  
**Every meaningful completion can point to evidence.**  
**Chat is a surface, not the whole system.**