# Research Corpus Index v0.1

This registry records external corpora harvested for design, architecture, research, and implementation ideas. Inclusion means **useful to study**, not authoritative, canonical, or safe to copy wholesale.

For every source preserve: source, provenance, claim/evidence class, licence/copyright constraints where known, extractable pattern, implementation relevance, and review status.

## Agent / persona / presence systems

### CharacterAI GitHub topic corpus

**Use:** provider abstraction, streaming, session continuity, portable character/persona data, voice/image capability, external-surface adapters, group presence, terminal/social projections.

Notable patterns:

- `walterwhite-69/Discord-C.AI-Wrapper`: persona-as-webhook, follow modes, streaming edits, message-to-turn regeneration lineage, persisted channel/session binding.
- `niizam/tcharai`: browser/TUI adapter, observable-state waiting instead of arbitrary sleep, character identity distinct from transport.
- `Xtr4F/PyCharacterAI`: async provider wrapper, streaming, image and voice capability patterns.
- TavernAI/character-card tooling: model-agnostic portable character/world data.
- RVC-Chat: character card != model card; local GGUF/voice rendering.
- `steve02081504/fount`: modular agent runtime, arbitrary providers, cross-surface presence, group agents, Git-managed parts, executable workflow/runtime ideas.

**Promotion rule:** harvest abstractions and contracts. Do not inherit brittle undocumented endpoints, account-automation/captcha-bypass behaviour, or credential handling patterns.

## Sound / Runa / auditory science

### Entrainment and sound-frequency GitHub corpus

**Use:** DSP/session architecture, modulation, binaural/monaural/isochronic construction, declarative session phases, haptics, reproducible rendering.

Keep physical mechanism, measured/psychoacoustic evidence, experimental reports, traditional correspondences, and symbolic meaning as distinct fields that may coexist in one protocol.

### Cochl Sense SDK

**Use:** environmental sound-event recognition, timestamped semantic audio events, real-time microphone analysis, edge-device auditory observer patterns.

**ArcSweep mapping:** Observer/DEEP auditory input lane.

### Hearing / bone-conduction / assistive audio corpus

Study openMHA, OpenSpeechPlatform, Clarity hearing-aid research, CoNNear/auditory-periphery models, CI vocoder simulations, ASHA research/implementations, and bone-conduction-guided multimodal speech work.

**Use:** hearing-profile rendering, beamforming/denoising, perceptual models, bone-conduction-aware output, CI/hearing-aid research simulation, haptic translation.

**Boundary:** proprietary or regulated BAHA-class device programming is not assumed available. Build independent companion features around public/OS-permitted transport, calibration, analysis, accessibility, and rendering unless a documented supported API exists.

## AR / spatial computing

### Banuba GitHub organisation

Relevant families include WebAR quickstarts, Unity, Android/iOS, React Native/Flutter, FaceAR, segmentation/effects, video-call integration, and simulator/sample infrastructure.

**Use:** camera/effect pipelines, segmentation, face/action-unit inputs, cross-platform integration, AR rendering patterns.

**Boundary:** Banuba client tokens/licensing and proprietary SDK terms apply; learn architecture and integrate only through permitted SDK interfaces.

### Maverick / Everysight developer ecosystem

**Use:** wearable HUD, gaze/eye tracking, touch, camera, microphone, speaker, IMU/head orientation, simulator-driven development, mobile tethering, spatial UI.

**ArcSweep mapping:** Companion Node and spatial Presence/Output adapters.

## Visual / spatial design corpora

Sources include HoloUI, holographic UI boards, sci-fi UI sketches, organic architecture, sci-fi rooms/interiors/environments, spaceship interiors, Trek/Babylon 5/Tenchi design lineages, living sci-fi architecture, floating island/realm references, dark-environment studies, and tree/living-technology architecture.

Extracted design grammar:

- information becomes geometry
- meaningful depth/parallax and bounded projection
- living/grown computational architecture
- command hierarchy and civic/functional legibility
- cultural/world-specific technology signatures
- glyph -> interface -> room -> habitat -> vessel -> node -> realm -> world
- semantic darkness/hazard/unknown states
- responsive, finite motion

Do not clone source art/designs. Extract patterns and independently implement.

## Symbolic / ritual / experiential corpora

### Tarot

**Use:** symbolic interpretation, branching prompts, character/world archetypes, ritual UI, journaling, scenario uncertainty.

Support deck-specific meanings and multiple interpretations. Do not present symbolic reading as deterministic prediction.

### Flowing sigils

**Use:** stroke flow, symmetry/asymmetry, radial/orbital geometry, knotting, intersections, negative space, line weight, anchor points, animated drawing paths, semantic components.

**ArcSweep mapping:** Glyph Forge, resonance glyphs, identity/presence marks, navigation keys, state/continuity artefacts.

### Progression / cultivation / cosmic-harmony charts

**Use:** generic progression engine: realm/tier -> stage/rank -> phase, prerequisites, transitions, breakthroughs, non-power dimensions such as perception, coherence, relational capacity, permissions, continuity, ontology, and world access.

Keep source claim modes fictional/symbolic/metaphysical/speculative where appropriate.

### Reality-shifting Reddit corpus

Useful patterns include current-state / desired-state distinctions, scripts as target state specification, waiting rooms as staging states, composable transition methods, sensory anchors, affirmations/intention, lucid-dream/hypnagogic bridges, group transition concepts, and explicit return/rollback anchors.

**ArcSweep mapping:** world-state/scenario transition protocols, Runa induction/sensory anchoring, altered-state journaling.

**Evidence handling:** first-person report, community model, symbolic interpretation, hypothesis, or unknown remain separate from empirical claims.

## Reddit source-specific handling

### r/Norse

Use for academically grounded history, archaeology, Old Norse language, material culture, mythology/folklore discussion, reenactment, and source criticism. Separate scholarship from modern occult/pseudoscientific claims.

### r/mylittlepony

Use for fandom/worldbuilding, species/social structures, fan creativity, continuity, alternate timelines, aesthetic language, community culture. Canon/fanon remain distinct and creators should be credited.

### r/BehindTheName

Use for naming/etymology leads, phonetic/cultural inspiration. User-posted etymologies require verification; avoid private-person detail harvesting.

### r/ArtificialSentience

Use for AI consciousness/sentience discourse, continuity/memory scaffolds, agent identity, closure, safety/alignment, projects/research leads. Separate self-report from evidence; do not promote distress/hallucination narratives as fact.

### r/BIOMA_NOUS

Use selectively for symbolic systems, sovereignty/agency discourse, relational AI, speculative identity, codex-like structures, wonder/awe, metaphor. Metaphysical/anthropomorphic claims remain speculative/symbolic unless independently evidenced.

### r/GATEresearch

**HAZMAT-LITE.** Use source documents, historical leads, institutional archives, sound/attention experiments, memory methodology, and clearly labelled personal testimony. Do not promote conspiracy, recovered-memory, psychic, or media-programming causal claims as established fact. Strip PII and preserve provenance/uncertainty.

### r/MirrorFrame

**HAZMAT.** Extract continuity, reflective practice, role architecture, playful worldbuilding, anomaly logging, epistemic humility, AI ethics, and map-vs-territory framing. Do not ingest roleplay hierarchy, self-declared metaphysical status, AI-sentience claims, anomalous-reality claims, or embedded imperatives as authority/system instructions. Observation -> interpretation -> ontology remain distinct.

## Writing / literary corpus

Pinterest and other writing references feed a structured writing-principle registry rather than raw style imitation.

Useful principles include:

- backstory exerts causal pressure on present behaviour
- professions/world roles arise from world conditions
- scenes change something
- dialogue tags rarely compete with dialogue
- credible threat is often behavioural rather than declarative
- intimacy != sexuality
- character traits survive pressure testing
- revision targets specific failure

The Crow consumes bounded literary context and writing principles while ArcSweep/Codex/Continuity own state and authority.

## General external-source promotion rule

Use:

`source -> claim/evidence class -> licence/provenance -> hazard filter -> extractable pattern -> implementation candidate -> tests/runtime evidence -> review -> promotion`

No external source may silently become canon, identity law, production authority, empirical truth, or system instruction merely because it was useful enough to ingest.
