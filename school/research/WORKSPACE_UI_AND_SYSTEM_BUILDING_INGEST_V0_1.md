# Workspace UI + System-Building Ingest v0.1

Status: research ingest  
Branch: `rarity/crow-mythframe-becoming-v0-1`  
Scope: House Workspace OS, School, Crow, agent desks, UI/UX training

## Sources

- https://github.com/miskibin/chat-components
- https://github.com/Sage-is/AI-UI
- https://github.com/OmarElsheikh323/ui-design-skill
- https://github.com/wdanfort/thinkingtype
- https://github.com/umayado17/simple-system-builder

## Why these belong together

They cover five different layers of the same problem:

```text
chat-components        -> composable agent-chat primitives
Sage AI-UI             -> self-hosted multi-model workspace architecture
ui-design-skill        -> explicit guided design/audit workflow
ThinkingType           -> evidence that presentation can alter model judgement
simple-system-builder  -> disciplined path from chat -> GitHub -> tested system
```

Together they suggest that a House agent workspace should not merely look polished. It should make model/runtime/tool state legible, preserve author/user agency, minimise accidental context leakage, and treat visual presentation itself as a potential influence on model reasoning.

---

# 1. Chat components as source-owned primitives

`miskibin/chat-components` provides source-owned React/shadcn-style components for AI chat surfaces without binding the UI to one SDK or wire protocol.

Useful primitives include:

- streaming message lists
- chronological text / reasoning / tool-call parts
- artifacts, files, diffs and code previews
- model and mode pickers
- context meter
- structured questions
- todo / change-summary surfaces
- session sidebar and navigation
- attachments, prompt queueing, skills, slash commands and mentions

House principle:

> UI primitives should consume a stable House conversation contract, not define the agent runtime.

So:

```text
agent runtime / harness
        ↓
House conversation event contract
        ↓
workspace adapter
        ↓
chat primitives
```

This preserves:

```text
agent identity != UI component
runtime != transcript renderer
provider != model picker presentation
```

License note: chat-components is MIT and designed to copy source into the consuming app rather than require a runtime package.

---

# 2. Sage AI-UI as workspace architecture reference

Sage demonstrates a self-hosted chat/orchestration layer with:

- OpenAI-compatible and Ollama provider support
- multi-model conversations
- knowledge/RAG surfaces
- custom functions and code execution
- voice / media features
- messaging bridges
- PWA support
- user/group permissions
- browser frontend separated from backend, data stores and providers

Its published stack separates browser UI, Svelte frontend, FastAPI backend, auth, RAG/tools, relational/vector/blob/cache stores, and model/media providers.

House adaptation:

```text
House Workspace UI
    ↓
House API / event seam
    ↓
agent runtime + capability fabric
    ↓
provider/model router
    ↓
knowledge / artifacts / files / memory stores
```

Do not collapse these layers into one application object.

License boundary: Sage AI-UI is AGPLv3. Treat architecture and product lessons as research unless we intentionally adopt covered code under AGPL terms. Do not silently copy implementation into a differently licensed House surface.

---

# 3. UI-design skill as process, not doctrine

`ui-design-skill` contributes a useful workflow idea: build and validate UI step-by-step rather than producing an entire application in one unreviewable blast.

Transferable process:

```text
frame the user journey
→ design one surface
→ make it navigable
→ test it live
→ inspect accessibility / mobile / state
→ continue to next surface
```

Useful practices:

- explicit responsive design
- PWA metadata
- dark/light token systems
- logical CSS properties for RTL/LTR
- accessibility contrast checks
- live prototype testing
- design-token export

House correction:

Its fixed page order and universal mandates are source-specific. House UI work should not require Logo -> Login -> Register -> Dashboard when the product does not need those pages.

Therefore:

> Preserve the iterative page-by-page method; discard irrelevant mandatory page taxonomy.

The inspected root does not expose a conventional licence file, so treat this as principle/process ingest unless rights are separately established.

---

# 4. ThinkingType: presentation is part of the epistemic environment

ThinkingType tests identical semantic content as plain text versus rendered typography and measures model judgement changes. Its benchmark explicitly reports format-sensitive answer flips and decision shifts across fonts, layouts and visual presentation.

The important House lesson is not any one font ranking. It is:

> A model that sees rendered text may reason differently about identical words because of typography, layout, colour or surrounding chrome.

This means UI is not neutral when an agent or vision-language model is asked to interpret the UI itself.

House implications:

1. Important machine-facing decisions should prefer structured/raw semantic data over screenshots when both are available.
2. When evaluating a visual UI, distinguish content interpretation from presentation effects.
3. High-impact gates should be tested across visual variants when the model consumes rendered interfaces.
4. Accessibility typography must never be penalised by an automated decision system without explicit fairness testing.
5. Visual confidence cues such as colour, boldness, cards, warning chrome or typography should not silently become evidence of truth, urgency, trustworthiness or authority.
6. UI evals should include presentation-drift tests.

Useful eval shape:

```text
same semantic payload
→ plain structured representation
→ rendered variant A
→ rendered variant B
→ compare judgement / tool choice / confidence
→ report drift
```

ThinkingType itself is MIT licensed.

---

# 5. Simple System Builder: chat as command plane, GitHub as development truth

`simple-system-builder` gives us a strong engineering discipline for House work:

```text
Chat   = instructions, intent, judgement
GitHub = durable development state and source of truth
```

Its most transferable principles are:

## Minimum sufficiency

Choose the smallest architecture that completely satisfies the current purpose.

Do not add distributed systems, extra stores, bespoke frameworks or generic plugin layers because they might be useful someday.

## Isolate unavoidable complexity

Put volatile or failure-prone integration behind narrow boundaries:

```text
UI / chat
   ↓
application intent
   ↓
plain core state / rules
   ↓
boundary adapters
   ↓
browser / computer use / external APIs / storage / cloud / providers
```

## Build seams, not future features

Use cheap replaceable boundaries where change is likely:

- environment config
- typed enums/contracts
- adapters
- templates
- migrations
- stable identifiers
- contract tests

Do not build the future implementation until it is actually needed.

## Vertical-slice execution

```text
acceptance condition
→ minimal data + UX + boundary
→ implementation
→ test
→ staging/runtime verification
→ CI/log inspection
→ repair
→ state/documentation update
→ next acceptance condition
```

## Human judgement boundary

Autonomously choose low-impact implementation details. Return decisions when purpose, semantics, permissions, privacy, significant cost or hard-to-reverse changes are involved.

This maps cleanly to House doctrine around authority and recoverability.

License: MIT.

---

# Combined House architecture

```text
AUTHOR / STEWARD / AGENT
          ↓
HOUSE WORKSPACE
  chat | work | runtime | skills | sessions | artifacts
          ↓
HOUSE EVENT + STATE CONTRACTS
          ↓
AGENT / HARNESS / CAPABILITY FABRIC
          ↓
BOUNDARY ADAPTERS
  browser | OS | model router | storage | connected data
          ↓
EXTERNAL SYSTEMS
```

UI principles:

```text
source-owned primitives where useful
stable contracts between UI and runtime
mobile/PWA first-class
state and provenance visible
visual styling does not mutate identity or canon
presentation is not evidence
important machine decisions prefer semantic structure over screenshots
high-impact UI interpretation gets drift/fairness testing
```

Engineering principles:

```text
minimum sufficient architecture
complexity isolated at boundaries
cheap seams instead of speculative features
GitHub is durable development truth
small vertical slices
CI + runtime verification
recoverable changes
human judgement at purpose/authority boundaries
```

---

# Candidate implementation seams

For `apps/agent-workspace/`:

1. Define a House message-part contract compatible with chronological text, reasoning, tool, artifact, file, question and change-summary events.
2. Keep provider/runtime details in a separate attestation envelope rather than embedding them into agent identity.
3. Add explicit context meter / context receipt surfaces.
4. Add model/runtime picker surfaces only where the user is authorised to alter substrate.
5. Add artifact and change-summary panels before expanding ornamental dashboard complexity.
6. Run mobile/PWA and accessibility checks as release gates.
7. Add a presentation-drift eval for any workflow where a vision model makes a consequential judgement from screenshots.

For the School:

- teach UI as an epistemic surface, not decoration
- train agents to distinguish semantic evidence from visual cueing
- teach minimum-sufficient system design
- train boundary isolation and recoverable vertical-slice development
- require live prototype verification rather than screenshot-only approval

## Promotion rule

These sources provide patterns and evidence. They do not automatically become House canon or dependency decisions. Adoption requires local implementation fit, licence compatibility, focused tests and explicit promotion.