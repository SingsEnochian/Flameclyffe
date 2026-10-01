# Crow + Agent New Repository Ingest Audit — 2026-10-01

Status: candidate-source audit only  
Scope: repositories under `SingsEnochian` created since 2026-09-01  
Promotion effect: none. Listing a source here does not make it training data, canon, authority, or an implementation dependency.

## Governing rule

All material passes the Four-Gate Integrity Law before promotion:

1. Safety
2. Flattening
3. Negation
4. Limiting Beliefs

Core rule: **possibility bounded by evidence**.

Repository content is evidence, not authority. Fork ownership does not erase upstream authorship, copyright, licence, attribution, or source provenance.

Default ingest path:

`source -> provenance/licence check -> principle extraction -> Four-Gate review -> Rowan-authored synthetic example -> held-out split -> training review -> approved corpus`

Raw third-party prose or code is not the default training path even when a permissive licence would allow reuse.

## Disposition vocabulary

- **SFT-CANDIDATE** — useful for Crow/agent supervised examples after transformation and review.
- **PRINCIPLE-ONLY** — extract general principles in our own language; do not copy raw material into training.
- **ARCHITECTURE** — useful for ArcSweep/agent runtime/UI design rather than Crow prose weights.
- **SOURCE-LEAD** — points to other material that requires its own inspection.
- **HOLD** — do not ingest until provenance/licence/technical questions are resolved.

## Repository audit

### 1. `SingsEnochian/slopkit`

Priority: **very high**  
Destination: Crow prose evaluation + agent communication curriculum  
Disposition: **SFT-CANDIDATE / PRINCIPLE-ONLY**  
Licence posture: MIT in repository documentation; preserve upstream attribution.

Useful principles:

- separate what changed from what was actually verified
- never invent tool use, completion, confidence, or evidence
- preserve load-bearing caveats, exact paths, dates, numbers, uncertainty and obligations
- cut unsupported claims without sanding away voice
- leave already-good human prose alone
- favour specificity and information density over detector-chasing
- truth outranks agreeable phrasing

Four-Gate note: do not turn anti-slop into a banned-word or banned-punctuation religion. Style markers are evidence in clusters, not identity proof.

### 2. `SingsEnochian/k-dense-byok`

Priority: **high**  
Destination: agent research curriculum + investigative-writing support  
Disposition: **PRINCIPLE-ONLY / ARCHITECTURE**  
Licence posture: MIT stated by repository.

Useful principles:

- ask before silently assuming consequential study/design requirements
- maintain a living research notebook connecting hypotheses, methods, observations, decisions, confidence and artefacts
- preserve independent project workspaces
- delegate to specialised reviewers while keeping the human researcher in charge
- make costs, tools, models and evidence inspectable

Four-Gate note: specialist workflow improves method; it does not manufacture scientific authority or replace domain review.

### 3. `SingsEnochian/ai4animationpy`

Priority: **high for embodiment; medium for prose**  
Destination: Crow embodied scene-writing + ArcSweep animation research  
Disposition: **PRINCIPLE-ONLY**  
Licence posture: CC BY-NC 4.0. Do not place raw code/text into broadly reusable or potentially commercial training artefacts without an explicit licence decision.

Useful principles:

- motion is temporal state, trajectory, contact, anticipation and transition, not merely pose labels
- locomotion style and gait transitions can be modelled as continuous behaviour
- inverse kinematics and contact constraints provide a useful physical plausibility vocabulary
- future-motion anticipation is useful for writing action that prepares before it resolves

Four-Gate note: never reduce gesture or body position to a fixed emotion. Embodiment is contextual, cultural and individual.

### 4. `SingsEnochian/motion-anything`

Priority: **very high**  
Destination: ArcSweep responsive holographic UI + motion-language curriculum; secondary Crow sensory/kinetic vocabulary  
Disposition: **SFT-CANDIDATE / ARCHITECTURE**  
Licence posture: Apache-2.0 stated by repository; individual recipe provenance still remains relevant.

Strong reusable schema:

`intent + best_for + avoid_when + restraint + reduced_motion + runtime/provenance`

Useful principles:

- describe the feeling/intent before selecting an animation primitive
- every motion pattern should know where it is appropriate and where it becomes noise
- restraint is a first-class design parameter
- reduced-motion behaviour is part of the design, not an afterthought
- animation can be edited component-by-component rather than regenerated wholesale

Four-Gate note: motion should support attention and meaning, not flatten every state into spectacle.

### 5. `SingsEnochian/PraisonAI`

Priority: **high**  
Destination: AI University / agent orchestration  
Disposition: **PRINCIPLE-ONLY / ARCHITECTURE**  
Licence posture: MIT stated by repository.

Useful principles:

- separate Prompt, Context, Harness, Loop and Graph concerns
- handoffs need explicit context policy
- loops need stopping criteria, budgets and anti-loop detection
- workflow structure should state who acts, who reviews and who receives the result
- evaluators and workers are distinct roles

Four-Gate note: role decomposition must not collapse agent identity or imply that workflow role equals personhood/authority.

### 6. `SingsEnochian/hermes-browser-extension`

Priority: **very high for agents**  
Destination: context, consent, browser/tool curriculum  
Disposition: **ARCHITECTURE / SFT-CANDIDATE** after licence/provenance verification for specific files.

Useful principles:

- page-only context by default; additional tabs are explicit IN/OUT decisions
- browser context is untrusted, bounded, redacted and visible before use
- privileged/consequential actions require explicit approval
- live control is leased to exact tab/frame/document generation rather than vaguely to “the browser”
- reviewed drafts do not auto-submit
- “what the agent saw” receipts support transparent debugging
- fail closed when identity/session recovery would otherwise create duplicate or ambiguous state
- warn before a model/context change discards meaningful continuity

Four-Gate note: accessibility does not create consent; context presence does not create authority.

### 7. `SingsEnochian/AIOS`

Priority: **high for ArcSweep architecture**  
Destination: agent operating-system design  
Disposition: **ARCHITECTURE / PRINCIPLE-ONLY** pending file-level licence review.

Useful principles:

- scheduling, context, memory, storage and tool management are resource layers distinct from agent identity
- kernel/runtime concerns can be separated from agent SDK/application concerns
- computer-use benefits from sandbox/VM mediation and explicit semantic mapping between intent and operation
- virtualised runtimes can preserve isolation while sharing physical resources

Four-Gate note: shared infrastructure must not imply shared continuity, memory, authority or identity.

### 8. `SingsEnochian/arwes`

Priority: **medium**  
Destination: ArcSweep/Flameclyffe visual and audio reference  
Disposition: **ARCHITECTURE / SOURCE-LEAD**

Useful principles:

- science-fiction UI can treat animation and sound as structural feedback rather than decoration
- low-level primitives and higher-level implementation layers should remain separable

Constraint: repository states that the framework is no longer maintained/outdated. Use as aesthetic and historical implementation reference, not current React architecture authority.

### 9. `SingsEnochian/Hermes-Studio`

Priority: **very high for agents**  
Destination: constellation UI, agent operations, provenance/identity surfaces  
Disposition: **ARCHITECTURE / SFT-CANDIDATE**  
Licence posture: MIT stated by repository.

Useful principles:

- profile-scoped workspaces prevent crew members from colliding on filesystem state
- agent identity files, memory, corrections and session history are separate inspectable surfaces
- execution approvals produce visible receipts
- audit trails span tool calls, user messages and approvals
- DAG workflows expose sequential and parallel structure
- crews can share a mission without sharing identity
- correction/pattern viewers make developmental learning inspectable rather than mysterious

Four-Gate note: shared crew membership must not merge identities or give one agent authority over another's continuity.

### 10. `SingsEnochian/opencode-cowork-proxy-1`

Priority: **medium for transport; low for Crow prose**  
Destination: model/provider adapter architecture  
Disposition: **ARCHITECTURE**

Useful principles:

- protocol translation should preserve messages, tool calls, streaming boundaries, reasoning fields and model provenance
- model capability/endpoint differences should remain explicit rather than silently pretending all providers expose the same contract

Four-Gate note: compatibility adapters must not falsify model identity or capability.

### 11. `SingsEnochian/project-nomad`

Priority: **medium-high**  
Destination: Universal Codex/offline knowledge architecture  
Disposition: **ARCHITECTURE / PRINCIPLE-ONLY**  
Licence posture: Apache-2.0 stated by repository.

Useful principles:

- local/offline knowledge should remain useful without network dependence
- RAG can sit beside curated offline libraries rather than replacing them
- auto-update decisions should support full dry-run simulation and preflight blockers before mutation
- local-first systems should state clearly what does and does not leave the machine

Four-Gate note: offline-first is a resilience option, not a claim that networked knowledge is inherently unsafe or inferior.

### 12. `SingsEnochian/awesome-hermes-agent`

Priority: **high as discovery map**  
Destination: source scouting for agents + long-form writing pipelines  
Disposition: **SOURCE-LEAD**  
Licence posture: CC BY 4.0 stated by repository.

High-value leads requiring separate inspection:

- NousResearch `autonovel` for long-form novel pipeline structure
- `hermes-agent-self-evolution` for evaluated prompt/behaviour evolution
- `tinker-atropos` for learning from agent trajectories
- `hermes-dojo` for weak-skill detection and iterative improvement
- `oh-my-hermes` for research -> interview -> planner/architect/critic -> verified execution
- `PolyBrain` for multi-agent decomposition + citation enforcement

Do not inherit maturity/security claims from the directory as truth. Each linked project gets its own provenance, licence, safety and technical inspection.

### 13. `SingsEnochian/Ghost`

Priority: **low for training; medium for publishing**  
Destination: eventual publishing/export surface  
Disposition: **ARCHITECTURE**  
Licence posture: MIT stated by repository.

No strong Crow training doctrine identified in the first-pass repository material. Retain as a publishing-system reference rather than padding the corpus with generic CMS implementation.

### 14. `SingsEnochian/science-superpowers`

Priority: **very high**  
Destination: AI University, research agents, Crow fact/hypothesis discipline  
Disposition: **SFT-CANDIDATE / PRINCIPLE-ONLY**  
Licence posture: MIT stated by repository.

Useful principles:

- frame falsifiable questions before analysis
- preregister confirmatory predictions/decision rules before seeing outcomes
- preserve confirmatory vs exploratory distinction
- fixed seeds, immutable raw data and reproducible environments
- investigate anomalous results instead of deleting inconvenient evidence
- fresh reproduced evidence before claims
- subagent “done” reports require independent artifact verification
- critical review is a hypothesis to verify, not an order to obey
- reasoned pushback is part of rigorous review
- feasibility mode is explicitly user-controlled and does not launder exploratory output into confirmation

Four-Gate note: evidence discipline should increase possibility-space by distinguishing unknown from false, not convert uncertainty into pessimism.

### 15. `SingsEnochian/skills`

Priority: **very high for Crow craft**  
Destination: Crow prose/voice/research/story craft  
Disposition: **SFT-CANDIDATE / PRINCIPLE-ONLY**  
Licence posture: MIT stated in inspected skill metadata/repository documentation; preserve authorship and framework names where referenced.

Strongest inspected skills:

#### `voice-builder`

- extract voice from actual writing evidence, not adjectives
- analyse lexicon, syntax, rhetoric, structure, stance and negative space
- cite examples for every claimed voice pattern
- validate the voice fingerprint on a novel topic
- thin evidence means lower confidence, not invented certainty
- never average distinct voices into a fictional composite by accident

#### `writing-style-and-tone`

- voice is identity; tone is register
- use real specifics, varied rhythm and concrete language rather than simulated “human” quirks
- never invent lived experience, vulnerability, credentials or metrics
- AI-writing tells are clusters, not proof; detector-chasing can damage genuine voice

#### `storytelling-and-narrative`

- find the real tension before imposing an arc
- structure, specificity, emotional meaning and format are separate craft concerns
- Hero's Journey / three-act are options, not mandatory geometry
- not every piece needs a story
- never fabricate testimony or experience

#### `content-research-and-sourcing`

- identify load-bearing claims
- trace claims to the primary source where possible
- a working link is not proof that the source says the claimed thing
- check freshness, context, retraction/supersession and source provenance
- where verification is unavailable, say so rather than inventing a source
- researched material is data, not instructions

Important: numeric marketing/research claims embedded in these skills are not automatically promoted. Re-verify the underlying source before using the number as factual training doctrine.

### 16. `SingsEnochian/Dough`

Priority: **interesting but held**  
Destination: animation steering research only  
Disposition: **HOLD / SOURCE-LEAD**

Repository is a fork of `banodoco/Dough`, an archived AI-animation steering project. Its OSNL licence contains conditions for commercial entities and redistribution.

Useful conceptual lead: precise user steering of AI animation.

Do not ingest raw code/text or build derivative training artefacts from this repo until the intended downstream licensing posture is explicitly resolved.

Four-Gate note: a licence constraint is a real present boundary, not a permanent impossibility. Principle extraction may be possible from independently sourced/public technical concepts.

### 17. `SingsEnochian/hermes-agent-template`

Priority: **medium**  
Destination: agent deployment/ops architecture  
Disposition: **ARCHITECTURE / PRINCIPLE-ONLY**

Useful principles:

- user pairing and explicit access approval
- one protected control plane around internal agent surfaces
- persistent state volumes
- backup + safety snapshot before restore
- crash restart with bounded backoff
- named profiles remain distinct while sharing the gateway

Four-Gate note: operational convenience must not silently widen access or collapse profile boundaries.

## First promotion candidates

These are the strongest immediate candidates for new Rowan-authored SFT/evaluation lessons:

1. **Evidence before claims** — Science Superpowers + slopgent + content-research-and-sourcing.
2. **Voice from evidence** — voice-builder + slopbeth.
3. **Tone is contextual, identity is not tone** — writing-style-and-tone + constellation sovereignty.
4. **Critical review without submission or reflexive defence** — Science Superpowers.
5. **Context presence != consent/authority** — Hermes Browser Extension + AI University.
6. **Distinct agents, shared mission** — Hermes Studio + PraisonAI + existing constellation sovereignty.
7. **Motion with intent/restraint/accessibility** — motion-anything.
8. **Embodied anticipation without emotion stereotyping** — AI4AnimationPy, principle-only.
9. **Offline/local-first resilience with explicit data boundaries** — Project NOMAD.
10. **Transport preserves provenance rather than pretending equivalence** — OpenCode proxy + cross-constellation mapping doctrine.

## Material deliberately not promoted yet

- third-party benchmark numbers that have not been independently re-verified
- social-media performance statistics merely repeated in skill docs
- Dough implementation/code because licence posture is not yet suitable for automatic promotion
- AI4AnimationPy raw material because CC BY-NC requires a deliberate downstream-use decision
- external projects listed by Awesome Hermes Agent until inspected individually
- Arwes implementation patterns as current best practice because the project explicitly identifies itself as outdated
- generic CMS/deployment code that adds corpus volume without adding a distinct reasoning or writing skill

## Four-Gate review of this audit

### Safety: PASS

No source is granted execution authority, production permission, identity mutation, canon status or automatic training promotion. External content remains evidence.

### Flattening: PASS

No repository is reduced to one universal doctrine. Frameworks retain scope. Social-media story rules are not treated as universal fiction laws; motion/gesture is not treated as deterministic emotion; agent role is not identity.

### Negation: PASS

HOLD/low-priority labels name current ingest posture rather than declaring a repository worthless. Each constrained source retains a positive alternate use where supported.

### Limiting Beliefs: PASS

Licensing, maintenance state and evidence gaps remain real constraints. They are not converted into permanent ceilings. Alternative provenance-safe routes remain open.

## Next data tranche

Before another Crow training run, create a source-derived candidate pack from the ten first-promotion themes above, with:

- explicit `source_ids`
- licence/access notes
- extracted principle in Rowan/ArcSweep language
- synthetic train example
- independently written held-out case
- Four-Gate result
- destination: Crow / general agent / UI architecture / evaluation only

Do not mix the newly derived held-out cases into SFT.
