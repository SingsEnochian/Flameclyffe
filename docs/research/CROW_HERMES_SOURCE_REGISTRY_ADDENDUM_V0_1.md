# Crow + Hermes Source Registry Addendum v0.1

Status: active research registry addendum  
Scope: The Crow / ArcSweep / AI University / Hearthweave  
Authority: Rowan supplied sources, 2026-10-01

## Writing-quality and collaboration sources

- https://github.com/ebfio/hermes-anti-ai-writing
  - deterministic prose tells
  - named diagnostic patterns
  - compact session rule injection
  - regex evidence spans
  - source-specific style rules kept profile-scoped

- https://github.com/hanxing-AI/high-quality-writing-skill
  - diagnosis-before-treatment
  - reader / purpose brief
  - progressive skill loading
  - craft-solvable versus author-material-required
  - reusable decision framework rather than fixed author imitation

- https://github.com/osiveww/writing-studio
  - shared canonical skill across multiple agent runtimes
  - voice-profile extraction as soft statistics
  - separate fact-check lane
  - editorial review with explicit lenses
  - original preservation and revision outputs
  - separate writer config from reusable skill code

- https://github.com/osiveww/writing-studio-knowledge
  - indexed knowledge library
  - catalog-first narrow retrieval
  - source / book locators
  - personal use metadata kept separate from shared catalog
  - rights-aware separation between index structure and source content

- https://github.com/sisiphamus/shakespeare
  - frame before generation
  - generic register versus user voice from actual samples
  - private / authorised specificity over invented pseudo-personal detail
  - mandatory fresh review pass
  - structural tells before lexical cleanup
  - reader-psych audit for short external writing

See:
- `docs/research/CROW_WRITING_STUDIO_INGEST_V0_1.md`
- `docs/research/CROW_SHAKESPEARE_INGEST_V0_1.md`

## Research mentorship source

- https://github.com/xiaoliu202/Hermes-Research-Mentor
  - closed loop: literature → knowledge → gap → hypothesis → experiment → evidence → writing
  - separate hypothesis, experiment, evidence and interpretation state
  - source-bearing learning cards
  - mastery / spaced repetition kept separate from claim authority
  - daily / weekly / long-horizon review loops

Implementation caveat: the inspected main branch contains documentation and sample data but does not expose the `src/` directory described in `PROJECT_STRUCTURE.md`. Treat architecture claims accordingly.

See `docs/research/CROW_RESEARCH_MENTOR_INGEST_V0_1.md`.

## Engineering and ecosystem sources

- https://github.com/vadim-a-yegorov/principle-adopt-fork-build
  - search existing serious solutions before building
  - inspect implementation files rather than README claims alone
  - adopt / compose / fork / build minimum missing seam
  - no exact-name match is not evidence that nothing reusable exists

- https://github.com/0xNyk/awesome-hermes-agent
  - curated ecosystem discovery index
  - maturity labels treated as editorial snapshots
  - explicit trust-boundary checklist
  - useful taxonomy of skills, plugins, memory providers, surfaces, bridges and multi-agent systems

- https://github.com/outsourc-e/hermes-workspace
  - workspace as UI / control plane over agent core
  - capability gates and graceful degraded modes
  - persistent multi-agent worker visibility
  - task board, handoff and human-decision lanes
  - zero-fork upstream integration pattern
  - themes remain presentation state

- https://github.com/abundantbeing/hermes-browser-extension
  - active-page context as the narrow default rather than whole-browser ingestion
  - explicit tab include / exclude controls to prevent context bloat and accidental cross-surface contamination
  - browser page content wrapped and labelled as untrusted context
  - visible `What Hermes saw`-style context receipts
  - explicit approval gates for privileged or consequential browser actions
  - draft / preview / apply / submit kept as distinct authority states
  - capability-aware degraded modes instead of fabricated feature availability
  - session-scoped model/context state instead of silent global mutation
  - sensitive credential-bearing URLs excluded from prompt-facing context

- https://github.com/praveen-ks-2001/hermes-agent-template
  - shareable Hermes deployment shell for Railway
  - authenticated admin/dashboard proxy around loopback Hermes services
  - supervised gateway restarts and live logs
  - persistent volume-backed Hermes home
  - user pairing / revocation surface
  - backup and restore with pre-restore safety snapshot
  - pinned Hermes release as a reproducibility/deployment boundary
  - deployment/runtime claims must be checked against the pinned Hermes version rather than assumed evergreen

- https://github.com/Cranot/super-hermes
  - task-specific analytical lens generation before complex analysis
  - analysis should report blind spots and sacrificed dimensions, not only findings
  - persistent constraint-history loop can steer later analyses toward previously under-examined dimensions
  - useful mechanism: build/compare/invert/simulate to expose structure instead of generic `think harder` prompting
  - source-reported benchmark/depth scores remain source claims, not House-verified performance facts
  - House adaptation keeps the mechanism while writing original Crow training lenses and state formats

See `docs/research/HERMES_ECOSYSTEM_ARCHITECTURE_INGEST_V0_1.md`, `training/crow/CROW_WRITER_TRAINING_PACK_V0_1.md`, and `profiles/crow-trainer/`.

## General rule

Every source remains provenance-bound. External style choices do not silently become universal House law. External capability labels do not establish runtime truth. External sample data do not become verified evidence. Learn mechanisms, verify implementation, preserve boundaries, then build original House seams.