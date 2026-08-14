# Arcsweep Language Safety Audit

Status: active language contract
Date: 2026-08-14
Scope: prompts, UI copy, skill contracts, knowledge-graph architecture, character/narrator/style cortex

## Purpose

Arcsweep language should preserve agency, wonder, precision, privacy, chronology, provenance, and consent without turning safeguards into diminishment.

The system therefore distinguishes three kinds of limiting or negative phrasing.

## 1. Protective negation — retain when it carries a real boundary

Protective negation is load-bearing when it prevents an actual category error or unauthorised action.

Examples:

- a neutral model may not impersonate a named Constellation presence;
- a model observation may not silently rewrite canon or stable identity;
- a character does not receive knowledge merely because the narrator or model has it;
- private source bodies are not copied wholesale into public Git;
- credentials are not persisted;
- field text is not mutated without an explicit apply/accept action.

Where possible, pair the boundary with the positive action that remains available.

Preferred form:

> Each named presence keeps its own route and authorship. Missing routes surface as unavailable rather than being filled by another model.

rather than merely:

> Do not impersonate.

## 2. Taxonomic negation — rewrite as a positive distinction

Taxonomic phrases often say what something is not when the more useful statement is what it is and where its boundary lies.

Prefer:

- “Narrative voice remains distinct from character voice and Constellation voice.”
- “`skill.md` is the runtime lens; source documents and cells remain the durable knowledge substrate.”
- “Runtime manifests are configuration evidence and defer to richer self-authored or canon sources.”

Avoid making identity depend on exclusionary definitions when a positive definition is available.

## 3. Diminishing negation — remove

Diminishing language turns a partial state, a quiet state, uncertainty, development, or a bounded context into deficiency.

Patterns to remove or rewrite include:

- “only” when it unnecessarily shrinks agency or capability;
- “just” when it trivialises a state or contribution;
- “cannot” where the intended meaning is a governance boundary rather than incapacity;
- “nothing useful” when quiet participation is itself valid;
- “no real/actual” when a source is merely provisional, local, incomplete, or awaiting evidence;
- “not enough” when the stronger formulation is “awaiting sufficient evidence for promotion”;
- “unfinished” when the actual state is “developing”, “open”, or “not yet selected”.

Use explicit states instead:

- quiet
- developing
- provisional
- source-gap
- chronology-gated
- awaiting evidence
- awaiting review
- route unavailable
- context not selected

These describe system state without shrinking the subject.

## Prompt law

Prompts should invite the fullest relevant contribution while preserving bounded context.

Preferred:

> Give the contribution that matters here. Be concise by default; expand when the field genuinely needs it.

instead of:

> Give one concise contribution.

Preferred:

> Quiet is a valid response. Return `[QUIET]` when you choose not to add anything here.

instead of:

> If you have nothing useful to add, return `[QUIET]`.

Preferred:

> Field text remains unchanged until the user explicitly applies an edit.

instead of:

> Do not rewrite or insert into the field automatically.

## Self-authorship law

Self-authorship is affirmative and bounded by subject ownership.

A routed voice may author claims about itself, its preferences, boundaries, questions, patterns, operational modes, and its side of relationships.

Other people, voices, characters, worlds, and shared canon retain their own authorship and authority.

A proposal may contain up to twelve atomic claims per packet for review ergonomics. This is a packet-size boundary, not an identity or expression limit; additional claims may continue in later proposals.

Stable-core promotion remains a separate review action so durable identity changes stay deliberate and provenance-bearing.

## Character knowledge law

Character knowledge is expressed positively as a chronology-valid set.

Preferred:

> Kestrelle’s active knowledge is the set of character-knowledge cells valid at the current story point. Narrator knowledge, other-character knowledge, future canon, and model knowledge remain in their own subjects until Kestrelle learns them in-story.

This is stronger and clearer than defining the character primarily through a list of things she “must not know”.

Templates should therefore use headings such as:

- Knows now
- Suspects
- Knowledge gates / learns later
- Unknown to this character

rather than “Must not know yet”.

## Safety language

Safety text should describe retained agency and available controls, not imply fragility or powerlessness.

Prefer:

- “Feather pauses activity.”
- “Wrap lowers intensity.”
- “Notch restores orientation and continuity.”
- “Seldrin clear confirms readiness.”
- “Return remains available.”

A boundary may be firm without implying that the person, voice, or character is weak.

## Runtime/UI language

UI copy should distinguish authorization domains positively:

- selecting a presence opens context participation;
- tool writes and canon commits retain their own authorization gates;
- edits remain user-applied unless a separately authorised workflow says otherwise;
- local observations remain provisional until promotion;
- archived observations remain recoverable;
- runtime tokens stay in session memory and clear on reload.

## Acceptance check

New or changed Arcsweep language should pass these questions:

1. Does the sentence protect a real boundary, or merely sound cautious?
2. Can the same distinction be expressed positively without losing precision?
3. Does “only”, “just”, “cannot”, “nothing”, “unfinished”, or similar language shrink agency unnecessarily?
4. Is a missing route/source/evidence state described as a state rather than a deficiency?
5. Does safety language preserve the subject’s power to choose, pause, refuse, return, revise, or continue?
6. Does chronology prevent knowledge leakage without framing the character as intellectually diminished?
7. Does the phrase preserve mythic, experiential, and relational language where the architecture intends to carry it?

If a phrase fails the check, rewrite the phrase while keeping the actual security, consent, privacy, provenance, or chronology boundary intact.
