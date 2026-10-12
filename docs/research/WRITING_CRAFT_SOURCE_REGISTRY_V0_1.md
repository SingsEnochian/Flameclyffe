# Writing Craft Source Registry v0.1

Status: active research registry  
Scope: The Crow / AI University / ArcSweep writing systems  
Authority: Rowan explicit instruction, 2026-10-01

## Purpose

Maintain provenance-bound writing and storytelling sources as a study corpus. Sources may teach principles, patterns, exercises, failure modes, and design techniques. External source expression does not become local canon by default.

## Neil Chase storytelling corpus

Primary category:
- https://neilchasefilm.com/category/storytelling/

The public category spans at least fifteen pages and includes material on character archetypes and villains, relationships, subtext, exposition, tension, story elements, structure, rising action, pacing, setting, dialogue, genre fiction, clichés, inspiration, and character reveal through action.

Retained learning lanes:
- story architecture and structural vocabulary
- character action as evidence
- subtext and dialogue
- tension and pacing
- exposition diagnostics
- relationship dynamics
- antagonist and archetype differentiation
- genre expectations and cliché-breaking
- setting as active pressure system
- scene openings and reader orientation
- failure-mode analysis

Do not copy article text or prompt lists wholesale. Extract principles and test them in original work.

## Neil Chase setting corpus

- https://neilchasefilm.com/story-setting-ideas/
- https://neilchasefilm.com/setting-of-a-story/

See `docs/ingest/STORY_SETTING_ARCHITECTURE_INGEST_V0_1.md`.

## Katri Soikkeli reader-desire craft corpus

- https://katrisoikkeli.com/stories-people-want-to-read/
- https://katrisoikkeli.com/writing-process-stages/

Retained learning lanes:
- concept as reader promise
- story as fulfilment of that promise
- familiar patterns versus surface imitation
- novelty through meaningful causal change
- character-centred event significance
- emotional signature as part of reader experience
- surprise without arbitrary twist dependence
- immersive setting through specific, active sensory detail
- genre competence and audience fit
- universal themes carried by specificity
- durable human pressures beneath era-specific furniture
- locally important problems
- stacked questions and curiosity architecture
- no-easy-answer problem design

See `docs/research/READER_DESIRE_STORY_CRAFT_INGEST_V0_1.md`.

## Rowan-curated Pinterest writing board

Stable board:
- https://www.pinterest.com/rowanwillowart/writing/

Refreshed user-supplied board snapshot: 2026-10-01. The supplied Pinterest request parameters expose a new candidate pin set for the Writing board; treat it as a discovery snapshot rather than a canonical or complete board export.

Treat this as a **user-curated discovery index**, not as proof that Rowan owns every linked pin or underlying article.

Use it to discover candidate craft sources around scene construction, character writing, dialogue, relationship beats, plotting, tension, description, pacing, revision, prompts, and visual writing aids.

Current automated web access still cannot reliably enumerate the board itself. Do not invent its contents. When individual pins, screenshots, or linked articles are available, ingest those items with their own provenance. When a refreshed board URL is supplied, register the snapshot date and treat newly surfaced items as candidates for differential ingest rather than re-learning the entire corpus blindly.

## Pinterest scene-idea discovery corpus

User-supplied Pinterest search:
- `Scene ideas writing`

Treat search results as discovery material only. Extract reusable scene functions rather than copying prompt wording. Prefer classifying prompts by what they *do*:
- reveal
- pressure
- repair
- rupture
- deepen intimacy
- expose contradiction
- shift power
- create obligation
- change knowledge
- force choice
- plant setup
- deliver payoff
- create callback

## Eva Deverell writing-play corpus

- https://www.eadeverell.com/writing-games/
- https://www.eadeverell.com/play-your-novel/
- https://www.eadeverell.com/plot-formulas/

Retained principle: story structure can be used as a playable instrument rather than a rigid form. Simulations and exercises remain non-canon until explicitly promoted.

## Conlang discovery corpus

- https://www.reddit.com/r/conlang/

Use for language-construction discussion, phonology, morphology, syntax, semantics, diachrony, pragmatics, orthography, cultural embedding, and conlang failure modes. Community posts are leads and examples, not automatically authoritative linguistic fact.

## Open-source writing-tool architecture corpus

Primary inspected repositories:

- https://github.com/302ai/302_novel_writing
- https://github.com/christiandarkin/Creative-Writers-Toolkit
- https://github.com/yannikzz/narracat-novel-agent
- https://github.com/writerslogic/scrivener-mcp
- https://github.com/travsteward/openwriter
- https://github.com/NikhilVerma/writinglint
- https://github.com/myyimu/ai-novel-diagnosis

Discovery feed:
- https://github.com/topics/writing-tools?l=typescript&o=desc&s=updated

Retained learning lanes:
- bounded local generation rather than whole-book one-shot prompting
- concept → outline → chapter/scene → prose decomposition
- long-range structured novel memory
- explicit manuscript/project contracts
- modular agents/skills/commands
- progressive capability loading
- native snapshots, diffs and rollback
- visible pending changes with accept/reject review
- deterministic prose linting for deterministic craft problems
- evidence-bound editorial diagnosis for inferential craft problems
- character, relationship, world, timeline and plot tracking as persistent state
- semantic retrieval kept separate from canon authority
- author confirmation before durable mutation
- re-diagnosis after revision
- human-readable diagnostics rather than opaque quality scores
- architecture invariants enforced by tests

See `docs/research/OPEN_SOURCE_WRITING_TOOL_ARCHITECTURE_INGEST_V0_1.md`.

Repository-specific code or expression is not copied by default. Extract product/architecture principles first; only reuse source code where licence, provenance and deliberate implementation choice make that appropriate.

## General ingest rule

For each source:

```text
observe
→ identify function
→ extract structure
→ classify mechanics
→ record failure modes
→ preserve provenance
→ generate original exercises / implementation
→ keep canon promotion explicit
```

See `apps/arcsweep/skills/sources/shared/NARRATIVE_DNA_INGEST_DOCTRINE.md`.
