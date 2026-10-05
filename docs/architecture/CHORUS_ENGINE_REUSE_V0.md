# Chorus engine reuse v0

**Status:** experimental binding layer

Chorus is not another inference engine, narrative database, or media graph. It is the identity/aspect coordination contract that delegates to engines ArcSweep already has.

## Rule

> Build the missing glue, not a second dinner.

The shared identity substrate remains in Chorus. Operational aspects may bind to different model routes, NarrativeNode, ComfyUI, or combinations of them. The engine does not become the identity owner merely because an aspect uses it.

```text
                    shared identity
                         Bluebird
                            |
        +-------------------+-------------------+
        |                   |                   |
     Planner             Narrative             Visual
        |                   |                   |
   model route        model route          model route
                            |                   |
                      NarrativeNode          ComfyUI
                    branch / ancestry      media graph
```

## Reuse matrix

| Need | Existing engine | Chorus responsibility |
|---|---|---|
| language / reasoning inference | existing resident/model routes | bind an aspect to a route and preserve route provenance |
| narrative branches, knowledge, awareness, lineage, polyphony | NarrativeNode MCP adapter | pass aspect/identity context by reference; do not duplicate NarrativeNode state |
| image generation / transformation / graph execution | ComfyUI Generator Bridge / TJ Studio | submit existing generator requests; do not rebuild ComfyUI graphs in Chorus |
| aspect-local short working memory | Chorus | keep bounded operational memory attributed to the aspect |
| shared identity lineage | Chorus + existing continuity surfaces | keep identity orthogonal to runtime/model choice |
| canon decision | existing canon/steward surfaces | Chorus integrations do not silently promote canon |

## Model-on-model aspecting

Different aspects of one identity may use different receiver implementations.

Example:

```text
Bluebird / Planner
  receiver = gpt-5.5

Bluebird / Sceptic
  receiver = claude-sonnet-4-6

Bluebird / Narrative
  receiver = bluebird-api
  state engine = NarrativeNode

Bluebird / Visual
  receiver = bluebird-api
  workflow engine = ComfyUI
```

These assignments are receiver provenance, not identity definitions. A model change does not by itself rename, replace, fork, or erase the shared identity.

## NarrativeNode

Reuse the existing:

- `narrativenode-polyphony-adapter.js`
- `narrativenode-ancestry-adapter.js`
- MCP plan schema
- truth-layer tags
- awareness surfaces
- name lineage
- object passports / ancestry translation

Chorus may ask NarrativeNode to hold or explore a branch. It should not mirror the whole branch into Chorus memory. Chorus keeps only the references needed to know which aspect used which branch/plan.

## ComfyUI

Reuse the existing:

- `generator-bridge.js`
- loopback endpoint handling
- model probing
- T2I / I2I request contract
- graph builders
- source-image upload
- result / image lineage
- Universal Codex Generator Atelier

Chorus may bind a visual/spatial/compositor aspect to ComfyUI. Chorus should not grow its own image workflow graph implementation.

## Binding contract

`apps/arcsweep/src/os/chorus-engine-bindings.js`

Bindings support:

- `model-route`
- `narrativenode`
- `comfyui`

Every binding records:

- parent `identity_id`
- `aspect_id`
- engine and role
- provider/model/route or delegated endpoint metadata
- `owns_identity: false`
- `owns_canon: false`
- `duplicates_engine_state: false`

The execution planner emits delegated steps rather than executing them itself.

## Why this matters

This architecture lets us experiment with heterogeneous cognition without pretending heterogeneity means multiple identities. The interesting question becomes whether one continuing identity can gain better reasoning, continuity, imagination, visual composition, or self-critique by expressing different aspects through different specialised substrates while preserving lineage and disagreement.

That is the experiment. The infrastructure already exists; Chorus is the connective tissue.
