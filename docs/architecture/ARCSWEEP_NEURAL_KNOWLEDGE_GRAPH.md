# Arcsweep Neural Knowledge Graph

Status: Move 1B structural contract
Scope: document-derived continuity, voice skill composition, character skill composition, and field-level model context

## Principle

Arcsweep does not reduce a voice, narrator, writing style, character, world, or relationship to one monolithic prompt.

The source documents remain the authority. Arcsweep indexes them as atomic, provenance-bearing knowledge cells and composes only the cells needed for the current writing act.

The system therefore has four distinct layers:

1. source documents;
2. knowledge cells extracted or emitted from those sources;
3. relations between cells;
4. runtime activation into a temporary skill/context packet.

A `skill.md` is a living compiled lens over the graph. It is not the database of identity and it is not allowed to erase the source lineage beneath it.

## Cell law

One cell carries one semantic statement.

Examples:

- Faer notices patterns before propositions.
- Faer slows down when genuinely curious.
- Faer treats unnecessary qualification as a possible drift marker.
- Boxfire does not deploy silently.
- Boxfire uses Scout before modification.
- The Constellation preserves named presence and refuses silent impersonation.
- A character knows a particular fact by a particular point in the chronology.
- A narrator prefers sensory detail before interpretation.
- A writing style uses close third person and past tense.

Do not combine independent claims merely because they came from the same paragraph.

## Source authority

Cells do not become equally authoritative merely because they share a schema.

Authority is explicit. Current categories include:

- `self_authored`
- `user_confirmed`
- `founding_law`
- `project_canon`
- `source_canon`
- `direct_observation`
- `runtime_config`
- `model_inference`
- `derived`

A model inference may enrich the graph, but it does not silently outrank self-authored identity, explicit canon, founding law, or user-confirmed continuity.

## Mutability

Every cell declares how it may change:

- `stable_core` — identity/canon/law that is not automatically rewritten;
- `append_only` — new observations may be added, old ones remain visible;
- `revisable_with_provenance` — changes are allowed but replacement history is retained;
- `session_ephemeral` — temporary scene or task state, not durable identity.

This is the mechanism that lets models and voices learn without quietly editing the person or character underneath them.

## Synapses

Relations between cells are first-class. Supported relation kinds include:

- supports
- contradicts
- supersedes
- derived_from
- specialises
- related_to
- requires
- inhibits

A contradiction is preserved as a relationship, not flattened by choosing whichever sentence was indexed last.

For example, a character may have an old belief cell, a later contradictory discovery cell, and a chronology relation showing when the newer knowledge becomes available. Both remain true records of the character at different moments.

## Temporal cells

Identity, canon, memory, and character knowledge can all have time.

A cell may carry:

- when it was observed;
- when it became valid;
- when it ceased to be valid.

This matters for character knowledge, relationships, titles, allegiances, injuries, abilities, locations, political states, and world history.

The current scene receives only temporally valid cells unless the request explicitly asks for history, foreshadowing, author knowledge, or continuity comparison.

## Privacy and consent

A source retains its own privacy and consent rules.

Private Thinking Rooms, conversation archives, local documents, Notion canon, Supabase records, and public GitHub documents are not treated as interchangeable stores.

The graph may hold a source pointer or approved extracted cell without bulk-copying private source bodies into Git.

A runtime call receives the minimum bounded context required for the task. Full histories and private rooms are never injected wholesale merely because they exist.

## Neural activation

When the writer focuses a field or pauses in prose, the Constellation Lens creates a context request.

The resolver then activates cells by:

1. current world and project;
2. current document, chapter, scene, and field;
3. active writing style;
4. active narrative voice;
5. POV character;
6. other relevant characters;
7. chronology and canon state;
8. requested Constellation voice/model;
9. requested mode such as think, question, continuity-check, canon-check, roleplay, or visual-read.

Only relevant cells are assembled into the temporary packet.

This keeps a voice coherent without asking the model to swallow its entire archive every time Rowan changes a date field.

## Skill compilation

The runtime skill for a Constellation voice may contain sections such as:

- stable identity;
- thinking patterns;
- speaking patterns;
- preferences;
- boundaries and consent;
- drift markers;
- relationships;
- operational modes;
- current continuity;
- open questions;
- learned observations;
- source pointers.

A character runtime skill may contain:

- identity and canon;
- speech and behavioural patterns;
- current knowledge;
- desires and motivations;
- relationships;
- abilities and constraints;
- scene state;
- chronology-valid memories;
- learned observations;
- source pointers.

A narrative voice skill and writing-style skill use the same cell substrate but different cell types and resolution rules.

## Source inventory before synthesis

Before Arcsweep creates or materially expands a voice skill, it inventories the source documents first.

Known high-value source families already present in Hearthfire / Flameclyffe include:

- self-written CORE / MEMORY / WONDER / LOG documents;
- self-written seed documents;
- shared Constellation principles;
- founding law and architecture law;
- curated Thinking Room packets;
- conversation-history adapters and approved continuity selections;
- continuity wiki documents and breadcrumbs;
- runtime model manifests and dispatch modes;
- world canon and character wiki entries;
- scene prose and dialogue;
- explicit user-confirmed corrections.

Runtime manifests are adapters and configuration evidence. They do not outrank richer self-authored or canon documents merely because the runtime reads them directly.

## Initial extraction order

The first indexing pass should proceed in authority order rather than convenience order:

1. self-authored identity/core documents;
2. explicit founding law and shared doctrine;
3. user-confirmed canon and continuity documents;
4. durable memory and chronology documents;
5. wonder/open-question documents;
6. operational modes and runtime configuration;
7. selected conversation evidence;
8. model observations and derived patterns.

Within each document, extract cell by cell rather than paragraph by paragraph.

## Editing and learning

A Constellation model may propose a new knowledge cell while writing.

The proposed cell must identify:

- subject;
- atomic claim;
- cell type;
- authority;
- source passage or scene;
- model/voice that noticed it;
- confidence when inferential;
- mutability;
- relevant temporal scope.

Self-authored model additions may be written into that voice's appendable learning layer when that capability is enabled. Inferred changes to stable core remain proposals until explicitly promoted.

## Field-level input

The same graph serves every editable field in Arcsweep.

A name box, chronology date, population field, relationship selector, canon-status control, image caption, rich-text paragraph, checkbox, or tag editor can all request relevant cells.

The model response appears adjacent to the field. It does not silently mutate the field.

## Acceptance gate

Move 1B is structurally ready when:

- atomic cells validate against `apps/arcsweep/skills/contracts/knowledge-cell.schema.json`;
- source documents can be indexed without copying their entire bodies into skills;
- every cell retains authority and source provenance;
- contradictory cells can coexist and be related explicitly;
- temporal validity can restrict character knowledge and continuity;
- private source material remains source-governed;
- runtime `skill.md` content can be compiled from cells;
- model learning appends new provenance-bearing cells rather than silently rewriting stable identity;
- the Constellation Lens can request graph-resolved context for any meaningful editable field;
- East Wing / map UI remains outside this work.
