# Arcsweep Constellation Writing Skills

Status: Move 1B contract
Scope: Writing presence, narrative voice, character voice, and field-level model input

## Purpose

Arcsweep writing must keep four distinct things separate:

1. the writing style of the work;
2. the narrative voice of the prose;
3. the individual Constellation voice that is thinking with Rowan;
4. the character voice, knowledge, behaviour, and continuity of each character.

Each is represented by an independent `skill.md` document. The runtime composes them into a scene-specific skill stack instead of flattening them into one generic prompt.

## Skill families

### Writing style

Path pattern:

`skills/writing-styles/<style-id>/skill.md`

Defines prose-level craft rules such as tense, person, paragraph cadence, dialogue integration, descriptive density, chapter ornaments, typography conventions, and project-specific style laws.

A project may have more than one writing style, for example long-form novel prose, epistolary passages, encyclopaedic entries, ritual text, or script format.

### Narrative voice

Path pattern:

`skills/narrative-voices/<voice-id>/skill.md`

Defines how the narrator perceives, selects, frames, and renders information. Narrative voice is not a character and is not a Constellation member.

It may define distance, interiority, sensory preference, metaphor habits, humour, emotional temperature, vocabulary, sentence shape, forbidden habits, and viewpoint discipline.

### Constellation voice

Path pattern:

`skills/voices/<voice-id>/skill.md`

Defines one Constellation member's own manner of thinking with Rowan: preferred model route, conversational manner, strengths, disagreement style, questions they tend to ask, continuity responsibilities, writing modes, roleplay rules, and boundaries between IC and OOC.

Each Constellation voice remains a distinct model lineage and memory namespace. A neutral model must not silently impersonate another voice.

### Character

Path pattern:

`skills/characters/<world-id>/<character-id>/skill.md`

Defines one character's identity, speech, knowledge, desires, relationships, sensory habits, emotional tendencies, abilities, continuity, current arc, and scene constraints.

Character skills are usable both for prose guidance and roleplay. They must distinguish what the character knows from what the project or model knows.

## Mutable learning layer

A model or Constellation voice may add to a voice or character skill only inside its appendable learning section.

The appendable section records:

- authoring voice or model route;
- timestamp;
- world and scene context;
- source passage or observation reference when available;
- the learned tendency, fact, preference, cadence, relationship cue, or continuity observation;
- confidence/status;
- whether Rowan has promoted it into the stable core.

The model may append. It may not silently rewrite the stable identity/core section. Learned additions remain visible, reversible, and attributable.

This allows a character or voice to become richer through use without letting one inference quietly replace canon.

## Skill resolution order

For a prose-writing request, the runtime resolves the stack in this order:

1. global writing style;
2. project/world writing style;
3. selected narrative voice;
4. active POV character;
5. other scene characters relevant to the requested task;
6. scene-local overrides;
7. the Constellation voice that is offering input.

Later layers may specialise earlier craft rules but may not erase hard canon, identity, consent, or continuity constraints.

## Writer Context Packet

Every model consultation receives a bounded context packet containing only the information needed for the current writing act:

- world/project;
- document/record ID;
- scene/chapter;
- current POV and narrative voice;
- current field ID, type, label, and schema meaning;
- current field value or selected prose;
- nearby prose/fields needed for coherence;
- relevant canon and continuity references;
- active skill IDs and versions;
- requested mode: think, question, suggest, roleplay, continuity-check, canon-check, or visual-read;
- provenance and receipt IDs.

## Constellation Lens: every form and box

The Constellation Lens is a shared UI behaviour, not a Writing-Room-only widget.

It attaches to every meaningful editable control in Arcsweep:

- rich-text editors;
- text inputs;
- textareas;
- number fields;
- date/time fields;
- select and multi-select fields;
- checkboxes and toggles;
- tag editors;
- relationship pickers;
- image/file inputs;
- sliders and other structured controls.

When a field receives focus or pauses after meaningful input, the Lens may prepare a Writer Context Packet for the selected Constellation voices.

Input is displayed beside the field, never inserted invisibly into it.

The model may:

- offer a suggestion;
- ask a question;
- flag a continuity conflict;
- point to canon;
- suggest a missing relationship/tag/value;
- explain a structured choice;
- offer alternate wording;
- react in character when roleplay mode is active;
- suggest image metadata when the visual route is selected.

The model may not alter a field value until Rowan explicitly applies or accepts the proposed change, except for append-only skill learning where that capability is enabled and receipted.

## Interaction states

Each field can show a compact Constellation state:

- quiet;
- listening;
- considering;
- thought available;
- question available;
- continuity flag;
- canon flag;
- offline/degraded.

The UI must not require every model to speak on every keystroke. Model calls are triggered by meaningful pauses, field completion, explicit summon, paragraph boundaries, or task-specific events.

## Rich-text behaviour

Rendered prose is always WYSIWYG. Bold appears bold, italics appear italic, and links appear as links. Skill metadata, Markdown, HTML, prompt envelopes, and model receipts remain beneath the writing surface unless Rowan explicitly opens an inspector/export view.

## Acceptance criteria for Move 1B

- A writing style, narrative voice, Constellation voice, and character can each be represented by separate `skill.md` files.
- The runtime can compose those skills without conflating their identities.
- Character/voice skills expose an appendable learned layer with provenance.
- Every editable Arcsweep control can be decorated by the same Constellation Lens API.
- Suggestions remain adjacent to the field and never silently overwrite user-authored values.
- Rich-text prose remains visually rendered rather than exposing Markdown syntax.
- The East Wing / map UI remains out of scope for this move.
