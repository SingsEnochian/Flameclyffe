# Agent Workspace Control-Plane Ingest v0.1

Status: research / architecture source ingest  
Scope: House Workspace OS / ArcSweep / Hermes / Crow Trainer  
Sources supplied by Rowan, 2026-10-01

## Source set

- https://github.com/SingsEnochian/cc-switch
- https://github.com/SingsEnochian/mindshub

External implementations remain provenance-bound. This document extracts transferable product and architecture patterns rather than silently importing external code, identity semantics, or provider claims.

---

## Why these two sources matter together

CC Switch and MindsHub attack adjacent halves of the same problem.

CC Switch is a **local control plane across AI tools**. Its current public documentation covers provider switching, MCP configuration, prompts, skills, cross-tool sessions, local routing, health checks, usage visibility, failover, and circuit breaking across Claude Code, Codex, Gemini CLI, Hermes and other agent runtimes.

MindsHub is an **agent workspace platform**. Its public superproject description separates the web/desktop workspace, API/backend, agent harness, and data vault. It exposes a model router, swappable open agent harnesses, connected-data vault, artifacts, cross-session memory, reusable skills, and scheduling.

The useful synthesis for House Workspace is not to clone either application. It is to make the already-established House sovereignty model into a stronger control-plane grammar:

```text
PERSON / AGENT IDENTITY
        ↓ uses
EXECUTION SUBSTRATE
        ↓ exposes
CAPABILITIES + DATA CONNECTIONS
        ↓ produces
SESSIONS + WORK + ARTIFACTS
        ↓ observed by
WORKSPACE CONTROL PLANE
```

The arrows do not reverse automatically.

A provider change does not redefine an agent.
A harness change does not rewrite identity.
A skill install does not grant authority.
A connected data source does not become canon.
A session transcript does not become memory merely because it exists.

---

# 1. Identity and execution substrate must be separate

MindsHub explicitly treats agent harnesses as interchangeable and models/providers as routable choices. CC Switch separately manages configuration for multiple coding/agent applications.

House rule:

```text
agent identity != harness
agent identity != provider
agent identity != model
agent identity != process
agent identity != UI card
```

Recommended runtime descriptor:

```json
{
  "agent_id": "boxfire",
  "identity_authority": "house-constellation",
  "harness": "house-runtime",
  "provider": "resolved-at-runtime",
  "model": "attested-at-runtime",
  "execution_location": "cloud|local|hybrid|unknown",
  "session_id": "...",
  "capability_profile": "...",
  "status": "ready|degraded|offline|unknown"
}
```

Provider/model attestation belongs on each response/receipt rather than becoming an identity field.

---

# 2. Workspace OS should expose a substrate panel per agent

Each agent desk should eventually have five visible planes:

```text
Talk
Work
Substrate
Capabilities
History / Artifacts
```

### Talk
Current living conversation thread.

### Work
Owned tasks, open handoffs, stop points, next owner, acknowledgement.

### Substrate
Current harness, provider/model attestation, execution location, route health, fallback state.

### Capabilities
Skills, MCP/tool connections, browser/computer-use surfaces, project-specific permissions.

### History / Artifacts
Separate conversation sessions, receipts, produced files/apps/docs, and promoted durable memory where applicable.

The UI may show all five together, but they remain separate state owners.

---

# 3. Skills should have one canonical source and explicit distribution

CC Switch's strongest transferable skill pattern is a master skill store distributed to multiple runtimes through symlink or copy, with source repository, content hash, update detection, install status, and backup before removal.

House adaptation:

```text
canonical House skill source
        ↓
version/hash/provenance
        ↓
explicit runtime binding
        ↓
Hermes / Codex / other compatible harness
```

Do not maintain divergent hand-edited copies of the same Crow or House skill unless divergence is intentional and receipted.

Useful future skill record:

```json
{
  "skill_id": "crow-writing-studio",
  "source": "house",
  "version": "0.1",
  "content_hash": "sha256:...",
  "bindings": ["hermes", "codex"],
  "authority": "capability-only",
  "update_state": "current|available|held|conflict",
  "provenance": []
}
```

Install/update does not equal permission to use a consequential capability.

---

# 4. MCP/tool connections belong in a capability registry

CC Switch uses one MCP management surface with per-application bindings. That maps cleanly to House Workspace if we generalise it beyond MCP.

Capability registry layers:

```text
capability definition
→ connection / transport
→ runtime bindings
→ authority level
→ current health
→ last verified use
```

Possible capability kinds:

- MCP server
- browser
- computer use
- GitHub
- filesystem
- database
- connected app
- image/video generation
- research/search
- local model
- artifact publisher

A capability card should say both **available** and **authorised** separately.

```text
installed != authorised
reachable != authorised
configured != healthy
healthy != currently in scope
```

---

# 5. Session history should be cross-runtime but not flattened

CC Switch's Session Manager treats sessions from different tools as browsable in one place while retaining source application and project directory. MindsHub provides cross-session memory as a separate feature.

House adaptation:

A workspace may search all sessions, but each record keeps:

```text
source harness
agent identity
provider/model attestation if available
world/project
thread id
created/updated time
resume capability
memory promotion state
```

Important distinction:

```text
session history != durable memory
```

A session may be resumable without any part of it becoming stable identity/canon/knowledge.

---

# 6. Routing health and failover should be visible infrastructure

CC Switch exposes provider health, routing state, failover queues, and circuit-breaker states such as closed/open/half-open. House already has runtime/fallback concepts; the transferable idea is the **operator visibility**, not necessarily CC Switch's exact thresholds.

House Workspace Systems view should eventually expose:

```text
route
primary substrate
fallback substrates
health
last attributable success
recent failures
circuit state
next retry / recovery state
```

Failover must preserve identity and response provenance.

```text
provider A failed
→ provider B answered
```

must never become:

```text
agent identity changed
```

The response receipt names the actual path.

---

# 7. Connected data should use a vault boundary

MindsHub's public architecture describes a secure connected-data vault whose credentials remain scoped to a connection rather than being exposed directly to agents.

House adaptation:

```text
agent request
→ capability broker
→ scoped connection
→ external system
→ bounded result
```

Secrets remain outside prompts, ordinary receipts, exported workspace state, and local chat history.

The workspace should display a connection's scope and health without displaying secret material.

---

# 8. Artifacts deserve their own first-class surface

MindsHub treats agent outputs as artifacts that can become documents, dashboards, apps, code, or publishable live URLs.

This maps directly to House work.

A House artifact record should keep:

```json
{
  "artifact_id": "...",
  "kind": "document|code|app|image|dataset|report|worldseed|other",
  "created_by": "agent-or-human-id",
  "source_thread": "...",
  "project": "...",
  "status": "draft|review|accepted|published|archived",
  "location": "...",
  "provenance": [],
  "canon_effect": "none|proposal|explicitly-promoted"
}
```

Artifact publication and canon promotion remain independent decisions.

---

# 9. Superproject composition is preferable to architecture soup

MindsHub's superproject pins separate frontend, API, agent, and vault modules. This is a useful reminder for ArcSweep/House Workspace:

- compose stable owners
- pin versions/commits
- define contracts between them
- keep module internals sovereign
- move pins deliberately

Do not merge every subsystem into one giant workspace state object merely because one UI can display them.

House Workspace is a view/control plane over systems that retain their own owners.

---

# 10. Adopt / compose / adapt decisions

## Adopt as principles now

- identity/substrate separation
- unified capability registry
- canonical skill source with explicit runtime bindings
- cross-runtime session browser with source provenance
- visible routing/fallback health
- connection vault boundary
- first-class artifacts
- modular superproject ownership

## Compose with existing House systems

- House Runtime route/status contracts
- Crow Trainer skills and history
- Runtime Braid receipts
- named-owner handoffs
- ArcSweep worlds/canon/continuity
- browser/computer-use capability boundaries
- living-glass workspace shell

## Do not silently import

- provider marketing claims
- third-party relay defaults
- exact failover thresholds
- external identity semantics
- external memory promotion behavior
- raw credential/config material

---

# 11. Next House Workspace UI tranche

Recommended next interactive increment:

### Agent desk drawer
Add tabs:

```text
Chat | Work | Runtime | Skills | Sessions | Artifacts
```

### Systems room
Add cards for:

```text
House routes
Harnesses
Providers/models
Capabilities/MCP
Connected data
Skill bindings
Fallback health
```

### Runtime binding model
A desk can change harness/provider/model only when the underlying system supports it. The UI must never pretend a switch occurred because a selector changed locally.

Every actual switch returns a runtime receipt.

### Mobile rule
On phones, these become a single bottom-sheet stack rather than a multi-column admin dashboard.

---

# Core synthesis

CC Switch shows how to make heterogeneous agent tooling manageable.
MindsHub shows how to make heterogeneous agents/models/data/artifacts inhabitable as one workspace.

House Workspace should combine the useful grammar while preserving stronger sovereignty boundaries:

```text
ONE WORKSPACE
MANY AGENTS
MANY HARNESSES
MANY MODELS
MANY CAPABILITIES
MANY PROJECTS

one control plane
not one identity
```
