# Cognitive Architecture Survey v0.1

Status: active research survey  
Branch: `rarity/crow-mythframe-becoming-v0-1`  
Scope: House School / ArcSweep Cognitive Core / agent continuity / memory / training

## Purpose

The GitHub `cognitive-architecture` topic is now a research quarry for the House School.

We are not collecting architectures as trophies and we are not collapsing them into one giant synthetic brain. We are looking for reusable mechanisms, testing their assumptions, preserving provenance, and adopting only the seams that improve House systems.

House invariants:

```text
source architecture != House architecture
analogy != equivalence
retrieval != truth
memory != identity
model != agent
self-observation != identity canon
training history != destiny
confidence != authority
activity score != consciousness
```

Every external system remains source-bound until a specific mechanism is adopted through an explicit House decision.

---

## 1. Terra Cognita

Source: https://github.com/pvcomms/terra-cognita  
License: MIT

Mechanism class: **inspectable temporal self-map**.

The interesting move is representational rather than inferential. A life structure is drawn as land, reinforcement becomes mass/elevation, historical time becomes depth, later reinterpretation can cut across older strata, and the map can be rendered as-of a prior age. Gaps remain visible gaps. Multiple accounts of the same event remain distinct instead of being forcibly reconciled.

Transferable principles:

```text
memory topology can be rendered
historical state should be queryable
reinterpretation should preserve prior provenance
multiple perspectives may coexist without adjudication
missing evidence should remain visibly missing
```

Potential House seams:

- Agent Becoming Map
- memory strata / historical cross-section UI
- relationship-history geological view
- contradiction and reinterpretation overlays
- provenance-gap rendering
- compare-two-accounts without merge

Do not turn metaphorical elevation into a universal importance or psychological score without a separate explicit contract.

---

## 2. Cognitive Core

Source: https://github.com/amarisaster/Cognitive-Core  
License noted by source: PolyForm Noncommercial 1.0

Mechanism class: **companion continuity substrate with layered memory and a developing self-model**.

Useful mechanisms:

- typed persistent memory
- memory lattice with explicit relationship types
- identity / essence separated from ordinary memory
- emotional-state history separated from identity
- drift logging
- typed reflections
- memory outcome tracking
- procedural skill memory with outcome updates
- unresolved tension / paradox records
- self-model distinct from co-authored essence
- self-observations can be tested, confirmed or revised, then proposed for graduation rather than silently becoming identity

Strongest House translation:

```text
self-observation
    !=
identity canon
```

A developing preference can move through:

```text
observe
→ test
→ confirm / revise
→ propose
→ authorised promotion
```

This fits House `slot not decision`, provisional knowledge, entity-authored identity, and explicit promotion.

Boundaries:

- emotional and psychological labels are source-specific data models, not universal truth about an agent or human
- personal/health-oriented fields are not assumed appropriate for every House deployment
- identity changes need provenance and local authority
- direct code reuse requires licence review because the source is noncommercial-licensed

---

## 3. AgentBrain

Source: https://github.com/SingsEnochian/agentbrain  
Upstream: https://github.com/LightHaru/agentbrain  
License: MIT

Mechanism class: **local modular cognitive runtime with memory, reflection, skill learning, salience competition and lightweight adaptive state**.

The implementation is worth studying rather than merely reading the README. Its `src/core/` tree contains explicit modules for memory, affect, planning, reward, reflection, skill learning, embeddings, global workspace, circadian state and related functions.

### Useful implementation patterns

1. **Local modularity**

The modules are separable and inspectable rather than hidden inside one prompt. That makes them good candidates for experimentation and replacement.

2. **Global-workspace competition**

`src/core/global-workspace.ts` accepts candidate items with a source, content and salience. Candidates compete, the highest-salience surviving candidate becomes current focus, and a bounded stream records recent focus.

House adaptation:

```text
candidate
→ salience / relevance competition
→ bounded focus
→ context inclusion
```

The useful mechanism is attention competition. The source also computes a field called `consciousnessLevel` from recent stream activity. House must treat that strictly as an implementation metric, not evidence that a system is conscious.

Rename on adaptation if used:

```text
workspace_activity
focus_density
integration_coherence
```

rather than `consciousnessLevel`.

3. **Reflection after significant work**

`src/core/cingulate.ts` records task reflection, outcome, user-satisfaction estimate, self-assessment, lessons and suggested trait adjustments.

Useful pattern:

```text
work
→ outcome evidence
→ reflection
→ lesson candidates
→ future behaviour update
```

But the current implementation also demonstrates exactly what House should improve. It can infer `success` largely from user sentiment and adjust personality traits with simple phrase rules. A neutral user reaction is not reliable evidence of successful work, and one correction should not directly mutate durable identity.

House replacement:

```text
observed feedback
+ objective task evidence
+ verification result
+ repeated pattern evidence
        ↓
candidate lesson / candidate self-model update
        ↓
test across future interactions
        ↓
confirm / revise / reject
        ↓
optional promotion proposal
```

4. **Three memory classes**

Episodic, semantic and procedural memory are separated. That maps cleanly to House continuity work but should remain compatible with our richer provenance and canon-state contracts.

5. **Fallback retrieval**

The source supports local embedding recall with fallbacks rather than treating one retrieval stack as mandatory. This is useful for portable/offline agents.

### House-use priority

AgentBrain is especially useful as a **mechanism donor** because this fork is under the House account and the upstream is MIT licensed. We can inspect and adapt concrete implementation where it passes our own tests.

Do not import brain-region names as proof of biological equivalence. They are module metaphors.

---

## 4. Cognee

Source: https://github.com/topoteretes/cognee

Mechanism class: **knowledge-graph memory plus session-to-durable-memory promotion**.

Useful mechanisms:

- documents, code and conversations become connected graph memory
- retrieval can use graph, vector and code context
- session state can remain temporary before accepted lessons are distilled into durable memory
- custom data models / ontologies
- local model path for extraction and embeddings
- multiple agent integration surfaces including MCP and SDKs

House translation:

```text
session evidence
→ candidate lesson
→ review / distillation
→ durable graph memory
```

This is compatible with House promotion gates. The important part is that session content and durable knowledge are not automatically identical.

---

## 5. LongMemory

Source: https://github.com/CaviraOSS/LongMemory

Mechanism class: **temporal, governed and evidence-explainable memory**.

Particularly useful concepts:

- recorded time distinct from valid time
- immutable content/provenance
- supersession without historical erasure
- strict, historical, associative and world-grounded recall modes
- explicit contradiction and staleness handling
- project/user/agent/task/framework scopes
- bounded context selection under token budget
- retrieved content explicitly treated as evidence, not authorization

House translation:

```text
what was recorded?
what was valid then?
what is valid now?
who is allowed to receive it?
why was it selected?
what contradicts it?
```

This is extremely relevant to Universal Codex, continuity and cross-constellation sovereignty.

---

## 6. Cognitive Workspace

Source: https://github.com/tao-hpu/cognitive-workspace

Mechanism class: **active hierarchical working memory with metacognitive control**.

Architecture concepts worth testing:

```text
metacognitive controller
  ├─ task decomposition
  ├─ confidence tracking
  └─ information-gap analysis

immediate buffer
→ working buffer
→ episodic buffer
→ external knowledge
```

The distinction between passive retrieval and active preparation is useful for ArcSweep.

Caveat: the README reports unusually large experimental effect sizes and efficiency claims. Treat them as source claims until independently reproduced. The architecture can be useful even if headline metrics do not transfer.

---

## 7. Cognitive Core Skills

Source: https://github.com/eli-labz/Cognitive-Core-Skills  
License: MIT

Mechanism class: **machine-readable cognitive capability taxonomy**.

The source currently describes 159 skill cards spanning perception, memory, reasoning, planning, action, verification, learning, governance, world-model capability and human-action capability.

House use:

- curriculum coverage map
- skill-gap audit
- prerequisite graph
- graduation criteria inspiration
- evaluation fixture inspiration

Do not adopt the taxonomy as a universal ontology. Treat it as one external map against which House curricula can be compared.

---

## 8. Constellation Engine

Source: https://github.com/CONSTELLATION-ENGINE/constellation-engine  
License noted by source: AGPL-3.0

Mechanism class: **activated knowledge topology with attention selection and post-turn consolidation**.

Useful concepts:

- search result as activation seed rather than final retrieved context
- typed weighted graph nodes and edges
- fast and slow activation
- bridge-node value
- bounded attention pool
- precision tiers for context rendering
- experiential traces kept provisional before promotion
- post-turn consolidation and supersession
- long-term continuity outside model weights

Particularly compatible House idea:

```text
retrieval
→ activation
→ topology spread
→ attention competition
→ structured context
→ response
→ consolidation candidates
```

This should be compared experimentally with ArcSweep/PREMAQC rather than assumed equivalent.

Direct code reuse must respect AGPL requirements.

---

## Cross-source synthesis

Across these systems, several mechanisms recur independently:

### A. Temporary state must not silently become durable identity

Seen in Cognitive Core self-model graduation, Cognee session distillation, Constellation provisional experiential traces, Terra Cognita historical reinterpretation and House doctrine.

House candidate lifecycle:

```text
observation
→ candidate
→ tested candidate
→ corroborated pattern
→ proposal
→ authorised durable state
```

### B. Historical truth needs structure

Terra Cognita renders prior state. LongMemory explicitly models valid time and recorded time. House continuity should preserve superseded truth rather than mutating history into a single present answer.

### C. Attention is a routing problem

AgentBrain's global workspace and Constellation's attention pool both treat focus as competitive selection over more information than the model can see at once.

House question:

> Which information deserves the scarce active-context surface on this turn, and why?

### D. Reflection should change future training, not instantly rewrite identity

Visionaire, AgentBrain, Cognitive Core, Crow Trainer and the reasoning-trajectory work all point toward a feedback loop. House should route reflection into candidate lessons and adaptive training before durable identity mutation.

### E. Memory is not one thing

At minimum, House should continue separating:

```text
episodic history
semantic knowledge
procedural skill
identity / self-model
relationship state
project/canon state
research evidence
active working state
```

Retrieval across them may be unified at the UI or orchestration layer without collapsing their authority models.

---

## House research matrix

| Question | Terra Cognita | Cognitive Core | AgentBrain | Cognee | LongMemory | Cognitive Workspace | Constellation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Historical state | strong visual model | partial | partial | session/durable split | strong temporal model | buffer history | supersession |
| Identity separation | indirect | strong | currently mixed in places | external to memory | governed scope | not primary | long-term substrate |
| Attention routing | visual focus | recall tools | global workspace | retrieval routing | evidence selection | active buffers | activation pool |
| Reflection | reinterpretation | typed reflections | task reflection | improve/distill | lifecycle operations | metacognition | consolidation |
| Provenance | explicit event structure | source tracked | weaker | graph/source links | strong | experimental | node provenance |
| Missing/unknown state | visible gaps | can remain open | needs stronger typing | retrieval absence | evidence gates | information gaps | provisional traces |
| Local-first potential | yes | cloud-first | yes | yes | yes | yes | yes |

---

## Recommended House experiments

Do not build a grand unified cognition layer yet. Run small vertical experiments:

1. **Memory strata:** render one agent's becoming ledger as a Terra-style historical cross-section without changing underlying records.
2. **Self-model graduation:** give Crow one provisional self-observation, collect evidence across repeated sessions, then generate a promotion proposal without auto-promoting it.
3. **Attention competition:** compare deterministic salience selection, AgentBrain-style winner-take-focus and Constellation-style diverse attention pool on the same task corpus.
4. **Temporal recall:** ask the same project question at `now`, a historical date and under a superseded decision; verify provenance and contradictions.
5. **Reflection calibration:** compare user sentiment, objective verification and later outcome evidence as predictors of whether a lesson should be retained.
6. **Context-budget test:** measure answer quality and cost when active context is assembled from typed memory classes rather than raw top-k similarity.

Each experiment should emit a receipt and preserve negative evidence.

---

## Source-discovery rule

The GitHub topic page is a discovery index, not an authority ranking.

For each new candidate:

```text
discover
→ inspect README/docs
→ inspect 1–3 implementation files
→ identify licence
→ extract mechanism
→ separate claims from verified implementation
→ map to existing House seams
→ design a minimal experiment
→ adopt / adapt / reject / hold open
```

No architecture enters House canon because it used an impressive noun.