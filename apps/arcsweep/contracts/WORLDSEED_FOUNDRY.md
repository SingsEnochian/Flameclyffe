# Arcsweep Worldseed Foundry

Status: foundational contract
Contract family: `arcsweep.worldseed/v1`

## Foundational identity

Arcsweep is a Worldseed Foundry.

Its job is not only to describe, simulate, or archive worlds. Its deeper job is to make a world portable enough to survive distance from its maker while preserving lineage, memory, difference, and the right to become something new.

A Worldseed is the smallest coherent package that can answer five questions:

1. What must survive?
2. What may change?
3. What can be lost?
4. What should descendants inherit?
5. What can this world teach another world?

Worldseed work is additive to Canon, Records, Timeline, Runa, DEEPTime, Requested Transformation, and the House Runtime. It does not silently replace any of them.

## Core invariants

- Canon cannot be silently rewritten by a Worldseed operation.
- A fork preserves ancestry and records its branch point.
- Descendant worlds are allowed to diverge without erasing their parent.
- Portable world packages retain provenance for the records used to compile them.
- A Continuity Genome records what makes a world itself without freezing every detail in amber.
- “Must survive” and “may change” are separate fields, not opposite ends of one slider.
- Export readiness is explicit.
- Worldseed records remain world-scoped.
- A fingerprint changes when seed content changes, but not merely because the package was regenerated at another time.

## Seedhouse

The Seedhouse is the authoring room for Worldseed records. It is the bridge between living world material and later portable packages.

Each Seedhouse record is one of these types:

- World Constitution
- Continuity Genome
- Inheritance Rule
- Culture Seed
- Material World Seed
- Relationship Seed
- Embodied / Runa Seed
- Worldmind Role
- Threshold Rule
- Fork / Lineage
- Ark Export

The intended long-form room order remains:

`Canon Studio → Seedhouse → Replay`

Until Canon Studio and Replay are remounted into the current Arcsweep shell, Seedhouse lives in the world-native applet deck beside Records so the foundation can be authored immediately.

## Compiler contract

`src/worldseed.js` compiles Seedhouse records into `arcsweep.worldseed/v1`.

The compiler:

- filters records to one world;
- normalises supported seed types;
- groups records into typed sections;
- aggregates inheritance answers;
- preserves source and lineage references;
- reports rooted and Ark-export readiness;
- produces a deterministic content fingerprint.

The compiler does not yet write an external archive. It prepares the package that Ark Export will later serialise.

## Worldseed organs

The Foundry grows through the following organs. They are one architecture, not unrelated applets.

### World Constitution

The deep rules of the world: what it protects, permits, refuses, values, considers sacred, how authority works, how conflict is handled, and what cannot be silently overwritten.

### Living Memory

Canon Studio, Records Room, Timeline, Echo Index, continuity receipts, and provenance become one temporal memory architecture. Changes remain attributable and branchable.

### Lineage and Forking

Worlds can produce descendants. A fork records parent world, parent seed, branch point, inherited material, divergence, and descendants.

### Continuity Genome

A compact signature of the world’s irreducible identity: emotional laws, aesthetic grammar, cosmological assumptions, social patterns, characteristic tensions, harmonic identity, and other qualities whose removal would make the world cease to feel like itself.

### Culture Engine

Language, rites, food, clothing, architecture, kinship, humour, taboo, burial, birth, education, music, craft, calendars, law, storytelling, naming, and gesture.

### Material World Engine

Geography, ecology, climate, resources, settlement logic, infrastructure, agriculture, medicine, transport, energy, fabrication, and the physical consequences of world design.

### Relationship Weave

Kinship, friendship, rivalry, mentorship, vows, alliances, obligations, institutions, histories, and changing relational states become first-class world structure.

### Embodied World Layer

Runa, sound, acoustics, haptics, colour, glyphs, environmental rhythm, weather, lighting, and sensory description give the world a body.

### Worldmind / Constellation Layer

A world can define its own ensemble of model roles such as archivist, cultural keeper, continuity guardian, narrator, cartographer, critic, resident voice, or other world-native intelligence.

### Ask the World

Requested Transformation and Waking World Ask become branch-aware world inquiries: what wants to develop, what is missing, what follows from a change, and what futures become plausible.

### Possible Worlds Observatory

An Ask may create inspectable branches. Alternatives can be compared without overwriting one another.

### Threshold Detector

The cusp and Jacobian work becomes an Age-turning instrument capable of marking when accumulated change produces a structural threshold in a world.

### Seed Library

Reusable seeds can move between worlds without dragging entire civilisations behind them. Examples include governance patterns, archive protocols, ritual structures, naming grammars, settlement templates, accessibility principles, musical systems, and memory architectures.

### Ark Export

A world can eventually be packaged with structured data, prose, media references, model configuration, provenance, dependency graph, timelines, continuity fingerprints, and behavioural rules. The target portable object is a `.worldseed` archive.

## Existing-system braid

Worldseed is intentionally braided through current Arcsweep organs:

- Records Room supplies receipted lived material.
- Canon provides committed world truth.
- Timeline provides ordered history and branch points.
- Continuity Gate and future Continuity Genome protect identity across change.
- Requested Transformation supplies intentional change proposals.
- PREMAQ / DEEPTime provide temporal and threshold context.
- Runa carries embodied and harmonic world identity.
- House Runtime supplies world-native model roles and collaboration receipts.
- Replay verifies that compiled structures can be reconstructed from recorded provenance.

## Build sequence

### Foundation, now

- Seedhouse room
- `arcsweep.worldseed/v1` compiler
- deterministic fingerprint
- inheritance questions
- source and lineage references
- tests for scope, grouping, inheritance, and fingerprint stability

### Next braid

- compile-preview UI inside Seedhouse
- Worldseed package inspection
- parent / branch metadata helpers
- Canon Studio and Replay remount around Seedhouse
- Continuity Genome editor
- Seed Library references

### After that

- Possible Worlds branch graph
- Threshold Detector integration
- model-role inheritance
- Runa embodied seed export
- Ark Export archive writer and importer
- descendant-world creation from a selected seed package

## Acceptance sentence

Arcsweep is ready to call itself a Worldseed Foundry when it can take one living world, identify what must survive, fork it without erasing ancestry, reconstruct the branch from provenance, and hand the descendant a portable seed that still knows where it came from.
