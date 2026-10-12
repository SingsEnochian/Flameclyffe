# Crow Writing Studio Ingest v0.1

Status: active research ingest  
Scope: The Crow / ArcSweep writing systems / editing / research / multi-agent craft tooling  
Authority: Rowan supplied sources, 2026-10-01

## Sources

- https://github.com/ebfio/hermes-anti-ai-writing
- https://github.com/hanxing-AI/high-quality-writing-skill
- https://github.com/osiveww/writing-studio
- https://github.com/osiveww/writing-studio-knowledge
- https://github.com/vadim-a-yegorov/principle-adopt-fork-build

These sources are study material. Preserve source provenance. Do not silently promote source-specific style preferences into global House law.

## Core synthesis

The Crow should not be a single prompt that says "write better" or "sound human".

Writing support decomposes into distinct operations:

```text
brief
→ source / knowledge retrieval
→ draft or inspect
→ deterministic diagnostics
→ bounded editorial classification
→ semantic craft review
→ author-material boundary check
→ revision candidates
→ writer decision
→ fact / provenance verification
→ re-check
→ receipt
```

The writer remains the authority over voice, meaning, personal material and final acceptance.

## 1. Deterministic craft belongs in deterministic tools

The Hermes anti-AI-writing repository and Writing Studio both implement explicit mechanical checks rather than asking a frontier model to judge every surface feature.

Useful deterministic checks include:

- configured punctuation rules
- configured banned / discouraged phrases
- obvious assistant scaffolding
- repeated phrase detection
- heading shape
- frontmatter / document contract validation
- sentence-length distribution
- paragraph-length distribution
- repeated list or clause shape
- hard-data extraction candidates
- missing source appendix or provenance field

Each diagnostic should return a rule id and evidence span. Avoid opaque quality scores.

A house-style rule must be tagged as a profile rule, not universal truth.

## 2. Diagnose before rewriting

High-Quality Writing Skill usefully frames editing as diagnosis before treatment.

Crow should produce:

```text
symptom
→ evidence
→ contextual effect
→ repair options
```

Examples of diagnostic families:

- nominalisation replacing active verbs
- adjective / adverb inflation
- throat-clearing openings
- vague attribution
- false depth
- filler significance claims
- repetitive syntactic rhythm
- verdict-first paragraph rhythm
- abstract claim without concrete grounding
- register mismatch
- structural-spine failure
- canned conclusion repetition

Do not collapse these into "bad writing".

## 3. The deletion test needs a narrative-aware adaptation

A source heuristic asks whether a word or sentence can be cut without losing meaning.

For Crow, the test becomes:

> If removing a passage loses no semantic, rhythmic, tonal, relational, sensory, comedic, character, world or narrative function, flag it as a filler candidate.

A lyrical sentence can earn its place without carrying a literal fact. Atmosphere, cadence and character texture are real functions.

Flag. Do not auto-delete by default.

## 4. Craft-solvable vs author-material-required

High-Quality Writing Skill makes a useful distinction between language craft an agent can perform and material that depends on the author's actual memories, culture, relationships or lived experience.

### Craft-solvable

Crow may actively draft or revise when the missing work is primarily:

- syntax
- rhythm
- structure
- pacing
- scene pressure
- clarity
- compression / expansion
- dialogue shaping
- transitions
- specificity from already supplied facts
- metaphor mechanics using authorised material

### Author-material-required

Crow should surface a slot when the desired effect depends on unsupplied:

- personal memory
- lived experience
- private relationship history
- autobiographical sensory detail
- culturally specific memory
- specialised firsthand anecdote
- personal symbolic association

The operation is **slot, not counterfeit**.

This extends the existing House doctrine: the system may provide the place, question and provenance; it may not invent the author's answer and call it authentic memory.

## 5. Voice profiles are descriptive, soft and revisable

Writing Studio implements voice extraction from sample texts using measurable features such as first-person density, paragraph length, sentence mean / variance, recurring structures, data density, avoid-words and cultural anchors.

Useful Crow voice-profile fields:

```text
paragraph rhythm
sentence-length distribution
single-sentence paragraph rate
first-person / narrator stance
recurring syntactic structures
lexical preferences and avoidances
data / concrete-detail density
punctuation habits
register / distance
scene-description density
dialogue-to-narration ratio
```

Rules:

- profiles are observations, not identity law
- sample size and confidence remain visible
- a profile may evolve
- intentional deviation is allowed
- genre, narrator and scene state may override the corpus baseline
- recurring patterns are attractors, not cages

Do not equate statistical similarity with authorship proof.

## 6. Progressive skill loading is the right context architecture

High-Quality Writing Skill separates an always-visible index from core decision logic and optional reference packs. Writing Studio similarly keeps the entry skill small and routes into dedicated files.

House adaptation:

```text
Level 0 — capability index
  name, trigger, short description

Level 1 — core decision logic
  routing, invariants, writer authority, diagnostic protocol

Level 2 — triggered references
  genre craft, examples, title craft, language pack,
  character voice, project style, world canon, source library
```

Do not load every writing example into every Crow turn.

A good reference file has a clear trigger.

## 7. One canonical skill, many agent mounts

Writing Studio's multi-agent install pattern uses one shared skill directory and symbolic links into agent-specific skill roots.

The architectural lesson is broader than the exact filesystem layout:

> Maintain one canonical writing capability source and expose adapters / mounts to each agent runtime.

Do not fork independent Claude, Hermes, Codex or Crow copies that silently drift.

Runtime-specific wrappers may differ, but doctrine, version and provenance should resolve to one canonical source revision.

## 8. Separate skill code, writer configuration and knowledge corpus

Writing Studio keeps personal configuration outside the skill repository and keeps its shared book library in a separate repository.

Crow should preserve the same separation:

```text
CRAFT ENGINE
  reusable decision logic / diagnostics / evaluators

WRITER PROFILE
  personal preferences / voice observations / project overrides

KNOWLEDGE LIBRARY
  source indexes / notes / retrieval metadata / citations

STORY + CANON STATE
  project-specific accepted truth
```

None of these should silently overwrite another.

Per-writer usage metadata should remain local or separately scoped rather than being committed into a shared corpus by default.

## 9. Knowledge libraries should be indexed, provenance-bound and rights-aware

`writing-studio-knowledge` provides a catalog that points to per-book indexes and records topical tags and paths.

The reusable idea is **catalog first, load narrow**.

Crow should retrieve:

```text
catalog entry
→ relevant book / source index
→ relevant argument / chapter locator
→ source text only when authorised and necessary
```

Do not dump whole libraries into model context.

Copyright / provenance boundary:

- indexes, bibliographic metadata, user notes and summaries may be stored when rights permit
- source text keeps its own rights status
- external book material does not become training data or House canon merely because it is searchable
- citation lookup and narrative learning are separate operations

## 10. Hard facts need a separate verification lane

Writing Studio separates drafting from fact verification.

Crow should classify claims before publication or durable research use:

```text
fictional canon fact
user-supplied firsthand claim
retrieved source claim
live-world hard datum
model inference
interpretation
prediction / scenario
```

For live-world hard data, verify against current sources rather than trusting model memory or a static book index.

For fiction, verify against the relevant story / world canon rather than the web.

A citation is evidence linkage, not automatic truth.

## 11. Multi-perspective editorial review is useful, but disagreement must not be fabricated

Writing Studio separates editorial roles into structural / argument review, data rigor, and intellectual-history / source-depth review.

That decomposition is useful.

House adaptation:

- independent passes may use different lenses
- each pass cites exact evidence spans
- reviewers may disagree
- disagreement is preserved when genuine
- consensus is allowed when independently reached
- never force a dissent merely to make the review look adversarial

Suggested Crow lenses:

```text
Structure / narrative causality
Evidence / factual rigor
Character / relationship truth
World / canon consistency
Voice / language craft
Reader promise / payoff
```

For non-fiction, swap in domain-specific evidence lenses as needed.

## 12. Revision is a proposal, not silent mutation

Writing Studio preserves originals and creates finals / editorial notes separately. This aligns with ArcSweep's existing proposal and receipt architecture.

Crow should expose:

```text
source revision
→ diagnosis
→ proposed patch
→ rationale / expected effect
→ writer accept / adjust / reject
→ new revision
→ re-check receipt
```

Large rewrites should retain recoverability.

## 13. Search before building

`principle-adopt-fork-build` contributes a useful engineering doctrine for Crow and the wider House:

```text
need identified
→ search existing serious implementations
→ inspect code, not only README claims
→ classify reusable capability
→ adopt / compose / fork / build minimum missing seam
```

Useful retained rules:

- search capability terms, not only project names
- inspect implementation files for serious candidates
- prefer narrow evidence over giant scraped candidate piles
- no exact-name match is not evidence that nothing reusable exists
- reuse problem-specific components when they fit
- write the minimum glue needed to preserve our architecture

House modification:

Do not force a single adopt/fork/build winner when multiple components belong in a composition. The output can be a capability map with provenance and explicit local decisions.

Also do not treat popularity as correctness or architectural fit. Maintenance and adoption are evidence dimensions, not authority.

## Crow writing pipeline v0.1

```text
WRITER INTENT
  ↓
BRIEF
  purpose / reader / experience / project / voice / canon scope
  ↓
CONTEXT ROUTER
  load only needed profile, canon, references and craft packs
  ↓
RETRIEVAL
  source catalog → narrow locators → authorised excerpts / notes
  ↓
DRAFT OR INSPECT
  ↓
DETERMINISTIC LINT
  exact mechanical rules + evidence spans
  ↓
BOUNDED DIAGNOSIS
  classify known craft / structure / provenance failures
  ↓
SEMANTIC REVIEW
  voice, narrative function, subtext, specificity, character, reader promise
  ↓
MATERIAL BOUNDARY
  craft-solvable OR writer-material-required
  ↓
REVISION PROPOSAL
  preserve source and expected effect
  ↓
WRITER DECISION
  accept / adjust / reject / supply missing material
  ↓
VERIFICATION
  canon checks and / or live-source fact checks
  ↓
RECHECK + RECEIPT
```

## Suggested diagnostic object

```json
{
  "rule_id": "prose.vague-attribution",
  "layer": "deterministic",
  "span": { "start": 120, "end": 147 },
  "evidence": "unnamed source claim",
  "profile": "project-active",
  "diagnosis": "vague attribution",
  "suggestions": ["name the source", "mark as inference", "remove unnecessary attribution"],
  "auto_fix_allowed": false,
  "material_boundary": "craft-solvable",
  "provenance": ["ebfio/hermes-anti-ai-writing"]
}
```

## Suggested writer-profile authority model

```text
self-authored preference
> explicit project style decision
> observed corpus pattern
> generic craft heuristic
> source-specific preference
```

Observed corpus patterns never override explicit author choice.

## Failure modes to test

- one source's style ban silently becomes universal law
- generated memory is mistaken for the writer's lived experience
- voice statistics become identity constraints
- forced editorial dissent manufactures criticism
- retrieved book index is treated as verified current fact
- a citation locator is treated as canon promotion
- whole knowledge libraries are loaded into context without need
- different agent runtimes drift into incompatible copies of Crow doctrine
- a rewrite destroys the previous version
- a model rewrites before naming the problem
- deterministic lint is outsourced to expensive open-ended generation
- current-world hard data ships without verification

## Bottom line

The Crow should become a writing **workbench** with separable instruments:

- profile
- source library
- diagnostics
- story / argument state
- editorial lenses
- revision proposals
- verification
- receipts

The model writes where generative judgement helps. Code measures where code is better. The writer supplies the life only the writer owns, and the writer decides what stays.