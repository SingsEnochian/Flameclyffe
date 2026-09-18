# ArcSweep × NarrativeNode Polyphony Integration

**Date:** 2026-09-17  
**ArcSweep branch:** `codex/arcsweep-narrativenode-polyphony`  
**NarrativeNode observed release:** 1.0.0.0  
**Integration mode:** protocol-only through NarrativeNode's public MCP surface

## Purpose

This slice turns the Hollow Vale comparison into a general narrative law:

> ArcSweep preserves the conditions under which continuity, difference, and relationship can coexist.

The engineering target is **viable polyphony**, not maximum coherence.

## Why NarrativeNode fits

NarrativeNode already distinguishes temporal order from narrative order, models entities as histories rather than static cards, tracks Knowledge separately from entities, tracks who knows what and when, tracks name/alias awareness, and exposes those operations through MCP.

Those native capabilities make it possible to carry ArcSweep's new layers without changing NarrativeNode's source model:

- diegetic provenance;
- productive apocrypha;
- naming lineage and naming politics;
- active erasure/forgetting;
- mnemonic ecology;
- palimpsest geography;
- over-coupling / forced-convergence risk.

## Licence boundary

NarrativeNode is source-available under its own custom licence. This repository does not vendor, redistribute, rebrand, or incorporate NarrativeNode source.

The bridge is independently authored and targets the public interoperability surface:

`http://127.0.0.1:13316/mcp/server/`

NarrativeNode retains its own application identity and authority. ArcSweep retains its own.

## ArcSweep changes

### Story Mode

Story Mode now names viable polyphony explicitly:

- distinct voices remain distinct;
- character belief is not canon;
- productive apocrypha may remain unresolved;
- memory channels may disagree;
- forced convergence is prohibited;
- maximum coherence is not the objective.

The model prompt now tells Story voices to distinguish:

```text
world state
narrator statement
witness observation
character belief
institutional doctrine
folklore
reader knowledge
committed canon
```

### Scene Cognition

Evidence-bearing scene cognition adds these observation kinds:

- belief
- memory
- naming
- provenance
- erasure
- resonance

They remain evidence records, not automatic canon.

### Canon Intelligence

A conflict can now receive the explicit Steward review action:

`preserve-apocrypha`

That produces:

`status: preserved-apocrypha`

This is reviewed intentional plurality. It cannot be promoted through the existing canon-promotion path because promotion still requires `accepted`.

### Branch Garden

Narrative candidate transitions are now rejected when they achieve apparent coherence through:

- forced agreement;
- collapse of difference / voice collapse;
- failure to preserve unresolved variants;
- leakage of omniscient/canon knowledge into participant-local knowledge;
- loss of participant agency, identity, or voice.

A legal branch therefore needs more than continuity. It must also pass the polyphony gate.

## NarrativeNode mapping

The bridge profile installs, through MCP, three custom categories:

- **In-world Source**
- **Tradition**
- **Place Layer**

and project tags including:

- `diegetic-source`
- `productive-apocrypha`
- `name-lineage`
- `imposed-name`
- `recovered-name`
- `erasure-active`
- `mnemonic-ecology`
- `palimpsest`
- `sensory-memory`
- `overcoupling-risk`
- `agency-boundary`
- `world-truth`
- `witness-belief`
- `institutional-doctrine`
- `folklore`

Story seeds for future entities:

- Name Lineage
- Mnemonic Channels
- Erasure Pressure
- Resonance Autonomy

## Knowledge mapping

ArcSweep claim → NarrativeNode Knowledge.

NarrativeNode's native awareness model then records **who knows or believes the claim, and when**.

That means two characters can carry incompatible versions of the same event without either version being mistaken for omniscient world truth.

For productive apocrypha, each variant remains a separate Knowledge object tagged `productive-apocrypha`. Character/institution awareness can diverge normally.

## Name mapping

NarrativeNode aliases hold practical name history.

ArcSweep retains the richer authority layer:

- self-name;
- chosen name;
- kin-name;
- title;
- exonym;
- administrative name;
- imposed/conquest name;
- translation name;
- recovered name.

When a name change is scene-anchored, the bridge uses NarrativeNode's alias-chain operation with `track_as_knowledge`, so awareness of the renaming itself can be modelled.

## Permission model

NarrativeNode write tools require a user-authorised MCP authoring session.

Every ArcSweep plan therefore begins with:

`request_mcp_session(purpose=...)`

and ends with:

`end_mcp_session(summary=...)`

The bridge does not bypass or pre-authorise that gate.

## Current execution boundary

This repository now produces deterministic MCP plans and interop receipts. It does not assume a cloud deployment can reach a user's local NarrativeNode process.

When NarrativeNode is running locally, an MCP-capable local agent/client can execute the generated steps against the native NarrativeNode MCP endpoint after the user grants the session.

## Files

- `apps/arcsweep/contracts/POLYPHONIC_NARRATIVE_V1.md`
- `apps/arcsweep/src/polyphonic-narrative-contract.js`
- `apps/arcsweep/src/narrativenode-polyphony-adapter.js`
- `apps/arcsweep/skills/sources/narrativenode/integration-profile.v0.1.json`
- Story Mode / Feedback / Scene Cognition / Canon Intelligence / Branch Garden updates
- corresponding test coverage

## What Hollow Vale actually donated

Not its canon.

It sharpened seven mechanisms that ArcSweep had either left implicit or under-modelled:

1. diegetic provenance;
2. forgetting as causal activity;
3. naming as historical/social power;
4. resonance failure through over-coupling;
5. mnemonic ecology beyond archives;
6. palimpsest geography;
7. productive apocrypha.

These are now general ArcSweep narrative capabilities rather than Hollow Vale-specific lore.

## Seal

**A bridge is successful when both shores are still there.**
