# Remote Agent Control Surfaces Ingest v0.1

Status: research ingest  
Institution: House School / AI University  
Branch: `rarity/crow-mythframe-becoming-v0-1`  
Authority: external-source synthesis, provenance-bound

## Sources

### cc-connect
- Repository: https://github.com/chenhg5/cc-connect
- Licence: MIT
- Relevant architecture: agent/platform bridge with a platform-agnostic core, registries for agent and messaging adapters, bidirectional sessions, permission responses, capability interfaces, structured logging, cancellation propagation, user-journey tests, and multiple chat surfaces including Telegram, Discord, Slack, LINE and cloud web.

### CodeHelm
- Repository: https://github.com/humeo/code-helm
- Licence: MIT
- Relevant architecture: local daemon + loopback Codex App Server + Discord remote-control surface, durable mapping between a managed thread and a Codex session, workdir selection, session create/resume/close/sync, approval controls, interrupts, transcript rendering, SQLite persistence, approval state reduction and degraded-session reconciliation.

## Why these belong together

They show two compatible remote-control shapes:

```text
cc-connect
agent adapters <-> neutral core <-> platform adapters

CodeHelm
local coding runtime <-> durable session broker <-> remote conversational surface
```

House should combine the principles without making Discord, Slack, Telegram, Codex, Claude Code or any other transport the architecture itself.

## 1. The control plane must be transport-neutral

House contract:

```text
Agent Runtime Adapter
        <->
House Session Core
        <->
Surface Adapter
```

Possible surface adapters:

```text
House Web/PWA
mobile web
Discord
Slack
Telegram
future native clients
```

Possible runtime adapters:

```text
Crow
Hermes
Codex
Claude Code
Gemini CLI
OpenCode
local custom agents
remote hosted agents
```

Core must not contain transport-specific branching. Surface and runtime implementations expose capabilities through interfaces/registries.

## 2. A conversation surface is not the agent

```text
thread != agent
chat platform != runtime
runtime != model
model != identity
```

A Discord thread, browser tab or mobile conversation is a control surface attached to a durable session identity. Switching surfaces should not silently create a new agent or lose session ownership.

## 3. Durable session affinity

CodeHelm's managed thread stays attached to one Codex session. House translation:

```text
surface_thread_id
session_id
agent_id
runtime_binding
workspace_id
owner/control authority
last_known_state
sync_state
```

A returning phone/browser should be able to reconnect to the same session rather than reconstructing context from rendered chat text.

## 4. Approval is first-class state

Approval is not a transient button event.

Useful state model:

```text
pending
resolved
approved
declined
canceled
```

Terminal decisions should not regress if delayed events arrive out of order.

An approval record may preserve:

```text
request_id
kind
command/file/permission preview
cwd or affected scope
justification
available decisions
consequence text
resolved decision
resolved surface
resolved actor
timestamp
```

House UI should distinguish:

```text
approve this turn
approve for this session/scope
decline and continue
cancel and redirect
```

Never flatten these into one generic Yes/No when the runtime exposes materially different consequences.

## 5. Session reconciliation is bounded

A remote surface can disconnect while work continues locally.

House recovery:

```text
reconnect
-> inspect durable session state
-> fetch bounded recent authoritative events/turns
-> reconcile local rendered state
-> surface gaps
-> resume control
```

Do not replay an entire transcript merely because the UI lost connection. Do not infer successful work from stale rendered messages.

## 6. Degraded sessions are a real state

CodeHelm exposes explicit session sync/recovery. House should model:

```text
healthy
connecting
running
waiting_approval
interrupted
degraded
reconciling
offline
closed
```

`degraded` must not look identical to healthy. Mobile users need to know whether they are seeing live state or a stale projection.

## 7. Control ownership

Only a surface/user with control authority should receive active approval or interruption controls.

View access and control access are separate:

```text
observe
converse
propose
approve
interrupt
mutate workspace
administer session
```

House capability UI should render only actions actually granted to that participant and current session.

## 8. Mobile control must be designed as a primary surface

The House Web/PWA should support the remote-control verbs directly:

```text
resume session
send message
see live transcript
inspect tool/action request
approve/decline
interrupt
view artifacts
see runtime state
recover/sync degraded session
```

This is not a shrunken desktop dashboard. The phone surface is the cockpit for an agent already working elsewhere.

## 9. User-journey tests matter

cc-connect explicitly tests critical multi-step journeys because isolated unit tests can pass while session switching or history retention fails for the user.

House release gates should include mobile/web journeys such as:

```text
open Crow on desktop
-> continue from phone
-> receive approval request
-> approve on phone
-> observe execution result on desktop
-> disconnect/reconnect
-> same session remains authoritative
```

and:

```text
agent running
-> surface disconnects
-> runtime completes or waits for approval
-> surface reconnects
-> reconcile without duplicate action
```

## 10. House-native first vertical slice

```text
/agents
  choose Crow

/agents/crow/session/:id
  transcript
  composer
  status
  approval cards
  interrupt
  artifacts
  runtime receipt
```

Backend contract:

```text
SessionCore
RuntimeAdapter
SurfaceConnection
ApprovalStore
EventLog
ArtifactStore
```

Start with House Web/PWA. Discord/Slack/Telegram become optional adapters rather than primary architecture.

## Core synthesis

```text
THE PHONE IS A CONTROL SURFACE, NOT A SECOND AGENT.
SESSIONS MUST SURVIVE SURFACE CHANGES.
APPROVALS ARE DURABLE STATE.
REMOTE CONTROL REQUIRES RECONCILIATION, NOT TRANSCRIPT GUESSING.
PLATFORMS AND AGENTS SHOULD PLUG INTO A NEUTRAL CORE.
MOBILE MUST EXPOSE REAL SESSION STATE, INCLUDING DEGRADED STATE.
AUTHORITY CONTROLS WHAT CAN BE DONE, NOT WHAT BUTTONS HAPPEN TO BE VISIBLE.
```
