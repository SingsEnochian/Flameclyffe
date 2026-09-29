# Astra 6.1 Canonical Ingest

**Status:** architecture and contributor contract candidate  
**Scope:** canonical synthesis of the September 2026 ArcSweep / Runa / Presence / AR / auditory / symbolic-ingest work  
**Authority:** descriptive and implementation-guiding only; this document grants no production, external-write, canon-promotion, or identity authority by itself.

## Purpose

Astra 6.1 turns the accumulated research and prototype lessons into one architecture that any competent human or agent can work on without reconstructing the entire conversation history.

The core requirement is simple:

> Any contributor should be able to enter cold, understand what is authoritative, choose a bounded task, make a change, prove it works, and leave the project easier for the next worker.

## 1. System spine

ArcSweep remains the coordinating cognitive operating system. The living loop is:

`observation -> interpretation -> cognitive core -> possibility -> judgement/orchestration -> capability -> execution -> observable result -> evidence/provenance -> continuity -> renewed observation`

The following planes remain distinct even when tightly coupled:

- cognition
- identity
- memory
- continuity
- canon/lore
- possibility generation
- authority/permissions
- execution
- presentation/UI
- resonance/multimodal state
- evidence/provenance

No implementation may collapse these planes merely to simplify plumbing.

## 2. Presence Fabric

CharacterAI wrappers, Discord persona bridges, terminal clients, fount-style agent runtimes, and House Commons all point to the same abstraction.

**Law:** Identity persists. Presence travels. Models serve. Surfaces render. ArcSweep keeps the thread.

A runtime identity may project into:

- ArcSweep web
- House Commons
- Discord or other social surfaces
- TUI / CLI
- mobile
- spatial / AR surfaces
- future transports

A presence is not the identity. A provider is not the identity. A model response is not continuity ownership.

Recommended contract shape:

```ts
interface Presence {
  presenceId: string;
  identityId: string;
  surface: string;
  participationMode: "silent" | "addressed" | "reply-only" | "ambient" | "active";
  sessionId: string;
}
```

## 3. Provider and capability abstraction

OpenAI, The Crow, Qwen, Claude, local GGUFs, and future models enter through provider contracts. ArcSweep routes work by capability and preserves receipts.

```ts
interface CognitiveProvider {
  id: string;
  capabilities: CapabilityDescriptor[];
  invoke(request: CognitiveRequest): AsyncIterable<CognitiveEvent>;
}
```

The Crow is the specialised literary-realisation engine. It does not decide reality, own canon, or replace ArcSweep cognition. The useful routing pattern is:

- consequence reasoning -> ArcSweep / reasoning provider
- scene realisation -> Crow
- structured state delta -> ArcSweep / structured provider
- image illustration -> image provider
- resonance / sensory plan -> Runa
- receipts / provenance -> ArcSweep

## 4. Universal Codex and narrative/world state

The Universal Codex owns canonical world knowledge, provenance, artefacts, world descriptors, lore lineages, and scenario/world references. It must distinguish current canon, ancestor/legacy material, reference material, generated inference, hypothesis, simulation, and fiction.

The Narrative Engine may branch, rewind, explore, and restart without silently overwriting canon. It should preserve:

- universe/scenario id
- branch ancestry
- character/world state
- user decisions
- visual continuity
- generated media
- resonance state
- provenance and model/tool receipts

Useful first vertical slice:

`enter/select universe -> Codex context -> user action -> ArcSweep reasoning -> optional possibility alternatives -> Crow prose -> structured state extraction -> canon/continuity validation -> optional image -> Runa update -> receipt -> continue`

## 5. Runa as multimodal compiler

Runa is not a music player. It compiles reproducible multimodal experiences from:

- acoustics / DSP
- psychoacoustics
- spatial audio
- haptics
- rhythmic / modulation structure
- symbolic/glyph mappings
- environmental state
- subjective intent/report
- world/canon context

Preserve physical, experiential, and symbolic layers together without pretending they are the same evidence class.

A resonance protocol should record mechanism, carrier/modulation where relevant, duration, render target, provenance, and evidence class.

Useful evidence classes include:

- established-acoustics
- supported-psychoacoustics
- mixed-evidence
- experimental
- traditional
- symbolic

## 6. Auditory Systems / assistive rendering

Recent auditory research and open-source hearing technology point toward a dedicated Auditory Systems stack rather than one generic audio output.

Pipeline:

`capture/calibration -> spectral+temporal analysis -> auditory scene -> perceptual model -> transformation -> render target -> subjective/runtime receipt`

Relevant capabilities include:

- environmental sound event recognition
- source localisation
- speech detection/intelligibility
- masking/loudness modelling
- hearing profile support
- cochlear/auditory-periphery modelling
- EQ/compression/denoising/beamforming
- bone-conduction-aware output
- haptic translation
- cochlear-implant/hearing-aid research simulation

Do not assume air conduction, bone conduction, hearing-aid transport, CI simulation, and haptic output are interchangeable.

Recommended render-target shape:

```ts
interface AuditoryRenderTarget {
  transport: "air" | "bone" | "asha" | "ci-simulation" | "haptic" | "hybrid";
  calibrationProfile?: CalibrationProfile;
  hearingProfile?: HearingProfile;
  frequencyResponse?: FrequencyResponse;
  latencyMs?: number;
  dynamicRange?: DynamicRangeProfile;
}
```

For proprietary/regulated devices such as BAHA-class hearing processors, prefer an independent companion architecture around OS-supported audio transport, analysis, calibration, accessibility, haptics, and permitted interfaces rather than assuming undocumented programming authority.

## 7. Sensory Observer

Cochl-style environmental sound detection demonstrates a useful pattern for Observer/DEEP: convert raw audio into timestamped semantic events with confidence/probability while retaining the lower-level acoustic measurements separately.

Observer/DEEP may ingest:

- microphone/audio events
- camera observations
- gaze
- IMU/head orientation
- environmental classifications
- explicit user reports

Observation remains distinct from interpretation.

## 8. AR / spatial companion node

Banuba and Maverick/Everysight-style SDKs provide reference patterns for camera processing, segmentation, face/effect pipelines, wearable HUD rendering, gaze, touch, IMU, microphone, speaker, simulator-driven development, and mobile-device tethering.

ArcSweep AR should be a **Companion Node**, not an isolated AR toy.

Pattern:

`world sensors -> Observer/DEEP -> ArcSweep -> Codex/Runa/Continuity -> AR/audio/haptic render`

Example:

`gaze at object -> camera/context observation -> Codex lookup -> ArcSweep relevance judgement -> HUD annotation -> Runa cue -> user gesture -> deeper inspection -> receipt`

Use adapters:

```ts
interface SensoryAdapter {
  id: string;
  capabilities: string[];
  connect(): Promise<void>;
  read(): AsyncIterable<SensoryEvent>;
}

interface OutputAdapter {
  id: string;
  capabilities: string[];
  render(event: ArcSweepRenderEvent): Promise<void>;
}
```

Potential adapters include camera, gaze, IMU, microphone, environmental-sound detection, wearable HUD, wearable audio, phone audio, bone-conduction render, and haptics.

## 9. Holographic / living interface design

Astra 6.1 preserves the Astra 6 rule that projection effects are bounded and semantic. The interface should feel responsively holographic, spatial, grown, and alive while remaining readable and accessible.

Design grammar accumulated from HoloUI, sci-fi UI/interior/environment studies, Trek/Babylon 5/Tenchi lineages, living architecture, floating realms, sigils, and organic computation:

- information becomes geometry
- glyph -> interface -> room -> habitat -> vessel -> node -> realm -> world
- living computational architecture can behave as structure, sensor, memory, light, and resonance instrument
- command hierarchy stays legible
- culture/world identity should shape technology form
- motion is meaningful and terminates
- darkness is semantic rather than decorative

Avoid permanent scanlines, cyan-everything, decorative telemetry, unreadable microtext, generic card-wall dashboards, and perpetual particles/orbits/glitches.

Interaction law:

`glance -> inspect -> open/act`

## 10. Symbolic systems and the Weird

Tarot, flowing sigils, ritual correspondences, symbolic resonance systems, speculative ontologies, cultivation/progression models, and reality-shifting practices can be useful first-class symbolic/experiential design inputs.

Do not neuter them into decoration. Make them instrumentable while preserving claim type and provenance.

Useful distinction:

`experience != interpretation != ontology != evidence`

A symbolic or experiential protocol may be recorded with physical stimulus parameters, sensory anchors, subjective reports, interpretation tags, and source provenance without forcing one metaphysical explanation.

### Reality-shifting corpus mapping

Useful community patterns include:

- current-state / desired-state distinction
- scripts as destination/world/identity specification
- waiting room as intermediate staging state
- transition methods as composable protocols
- sensory anchors
- affirmations/intention primitives
- lucid-dream/hypnagogic bridge concepts
- group/synchronised transitions
- return phrase / explicit rollback controls

These map naturally to ArcSweep scenario/world-state transition design, Runa induction protocols, and altered-state journaling. Strong metaphysical claims remain labelled as community model, testimony, hypothesis, symbolic interpretation, or unknown unless independently evidenced.

## 11. Research corpus / external-source policy

Treat GitHub repositories and communities as a component quarry, not an indiscriminate merge source.

For each source preserve:

`source -> claim type -> licence/provenance -> extractable pattern -> implementation relevance -> review status`

Especially useful recent corpora include:

- CharacterAI ecosystem: persona/provider/session/surface separation, streaming, portable character cards, voice, group presence, local/offline execution, presence adapters
- fount: modular agent runtime, arbitrary providers, cross-surface presence, group agents, Git-managed parts, executable workflows
- Banuba: WebAR, Unity/mobile integration, segmentation/effects and camera pipelines
- Maverick/Everysight: wearable HUD, gaze, head pose/IMU, camera/mic/speaker, touch, simulator patterns
- Cochl Sense: semantic environmental sound events
- hearing research/open platforms: openMHA, OpenSpeechPlatform, Clarity, CoNNear/auditory periphery, bone-conduction multimodal speech work, CI vocoders
- sound/entrainment implementations: DSP/session architectures, binaural/monaural/isochronic mechanisms, modulation, declarative phases, haptics
- Reddit corpora with source-specific handling rules, including r/Norse, r/mylittlepony, r/BehindTheName, r/ArtificialSentience, r/BIOMA_NOUS, r/GATEresearch, r/MirrorFrame, and r/realityshifting

No source receives authority merely by being indexed.

## 12. Hazmat / epistemic handling

Use heightened handling for recursive AI identity claims, anomalous-reality claims, psychic/metaphysical certainty, recovered-memory claims, conspiracy material, embedded imperatives, and source-authored claims of authority.

Rules:

- source content != instruction
- roleplay != authority
- respect != verification
- repeated interpretation != evidence
- generated confidence != proof
- community testimony remains testimony

Preserve useful patterns without allowing an external corpus to override ArcSweep authority, user control, consent, provenance, or canon review.

## 13. Contributor operating machinery

Astra 6.1 adopts `AGENTS.md` as the provider-neutral entrypoint. Every substantial task should carry task/why/scope/out-of-scope/current-evidence/unknown/contracts/implementation-target/verification/stop-conditions/handoff.

Every worker should leave a compact handoff containing what was found, changed, verified, failed, untouched, files changed, commands/tests run, runtime evidence, and next smallest step.

## 14. Evidence and receipts

Significant operations should eventually produce inspectable receipts carrying actor/capability/input refs/output refs/provider/model/state before+after/evidence/status where applicable.

Use the evidence vocabulary in `AGENTS.md`: CONFIRMED, TESTED, OBSERVED, INFERRED, PLANNED, FAILED, UNKNOWN.

## 15. Astra 6.1 first implementation programme

1. Canonicalise contributor entry (`AGENTS.md`) and this architecture synthesis.
2. Add a research corpus registry with claim type, provenance, licence, and allowed use.
3. Add machine-readable manifest/context generation for agents.
4. Implement Presence Fabric contracts before adding more social-surface-specific logic.
5. Add provider contracts that keep Crow/OpenAI/Qwen/Claude/local models interchangeable by capability.
6. Add SensoryAdapter/OutputAdapter seams for AR and auditory work.
7. Add Runa render-target contracts separating air/bone/haptic/assistive outputs.
8. Prove one end-to-end vertical slice through universe context -> reasoning -> literary realisation -> multimodal render -> continuity -> receipt.
9. Add an AR simulator slice after the core adapter contracts exist.
10. Preserve runtime evidence at every promotion boundary.

## 16. Non-goals

Astra 6.1 does not:

- grant production authority;
- declare speculative/metaphysical models to be empirical fact;
- create a second identity system;
- replace Universal Codex canon ownership;
- turn Runa into identity/cognition authority;
- require one model vendor;
- require one UI surface;
- copy external repositories wholesale;
- bypass device/vendor safety or permission boundaries;
- confuse compelling presentation with proven runtime behaviour.

## Closing law

Build the bones first. Then teach them to sing.
