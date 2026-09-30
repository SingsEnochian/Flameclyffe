# Comfy Workflow Registry v0.1

**Status:** architecture contract candidate  
**Scope:** ComfyUI / Comfy.org workflow discovery, classification, validation, and execution handoff for ArcSweep, House Commons, Universal Codex, Runa, and visual/media generation surfaces.  
**Authority:** descriptive and implementation-guiding only. This document grants no production, external-write, model-download, paid-cloud, canon-promotion, or execution authority by itself.

## Why this exists

Comfy workflows are not just prompts. They are executable graphs: nodes, model dependencies, parameters, media inputs, media outputs, and reusable subgraphs. ArcSweep needs a way to ingest workflow knowledge without confusing workflow templates with canon, identity, authority, or automatic execution.

The official Comfy workflow library and `Comfy-Org/workflow_templates` repository show the right shape: full standalone templates, reusable subgraph blueprints, per-media packages, preview assets, model metadata, manifest generation, validation, and a browsable site. ArcSweep should learn the pattern, not copy workflows blindly.

## Core distinction

```text
workflow reference != workflow import
workflow import != validated workflow
validated workflow != execution authority
execution receipt != canon
output artefact != truth
```

## Comfy workflow lanes

Astra 6.1 should treat Comfy workflows as a registry of capability templates.

Useful lanes:

- image generation
- image edit / inpaint / outpaint
- video generation
- video-to-video transformation
- audio/music generation
- 3D/model generation
- pose/control/composition workflows
- style/LoRA/model experiments
- reusable subgraph blueprints
- ArcSweep-specific house workflows

## Minimal registry shape

```ts
interface ComfyWorkflowRecord {
  workflowId: string;
  title: string;
  source: "comfy-org" | "local" | "user-import" | "third-party";
  sourceUrl?: string;
  mediaType: "image" | "video" | "audio" | "3d" | "multimodal" | "unknown";
  workflowKind: "template" | "subgraph" | "experiment" | "house-canonical-candidate";
  status: "reference" | "candidate" | "validated" | "deprecated" | "rejected";
  graphRef?: string;
  previewRefs?: string[];
  requiredModels?: ComfyModelDependency[];
  requiredCustomNodes?: ComfyNodeDependency[];
  inputs: ComfyWorkflowInputSpec[];
  outputs: ComfyWorkflowOutputSpec[];
  hazards: ComfyWorkflowHazard[];
  provenance: SourceReceipt[];
  authority: {
    mayExecute: boolean;
    mayDownloadModels: boolean;
    mayWriteExternal: boolean;
    mayPromoteToCanon: false;
  };
}
```

```ts
interface ComfyModelDependency {
  name: string;
  url?: string;
  hash?: string;
  hashType?: "SHA256" | "unknown";
  directory?: string;
  licenceNotes?: string;
}
```

## Import policy

When importing a workflow reference:

1. Preserve source URL and licence/provenance.
2. Record whether it is official, third-party, local, or user-supplied.
3. Extract only workflow metadata until explicitly approved.
4. Do not commit large model weights, private assets, user prompts, or generated media into the repository.
5. Do not auto-download models or custom nodes.
6. Do not treat thumbnail/preview output as proof that the workflow works locally.
7. Do not promote workflow outputs to Universal Codex canon without review.

## Validation gates

A workflow becomes **validated** only after the relevant checks pass:

- JSON parses cleanly.
- Required inputs are explicit.
- Required outputs are explicit.
- Required models are listed with hashes where available.
- Required custom nodes are listed.
- Unknown nodes are reported as `UNKNOWN`, not silently ignored.
- Licence/commercial-use notes are recorded when known.
- Execution is tested in the target runner or deliberately marked untested.
- Receipt records environment, runner, model refs, input refs, output refs, and status.

## Execution boundary

Execution must be routed through an explicit capability gate. A Comfy workflow may be available in the registry but still not executable in the current environment.

Reasons include:

- missing model
- missing custom node
- unknown licence
- GPU unavailable
- paid cloud unavailable
- unsafe/unsupported media input
- required external service not connected
- user has not approved execution

## House Commons / Watch Room connection

Video ingest and watch-together work can later call Comfy workflows for:

- thumbnail extraction or stylisation from permitted stills
- visual summaries
- chapter cards
- scene boards
- transcript-linked image notes
- non-canon illustration drafts

These outputs must remain presentation or candidate artefacts unless separately reviewed.

## Universal Codex connection

Codex may store:

- workflow record
- output artefact reference
- provenance
- prompt/input summary
- model/workflow dependencies
- review status

Codex must not silently convert generated media into canon fact.

## Runa connection

Audio/music workflows may become Runa render sources only through explicit Runa render-target contracts. Generated audio is not automatically an entrainment protocol, hearing-profile render, or therapeutic claim.

## ArcSweep Companion / AR connection

Comfy workflows may produce AR-ready assets, overlays, concept frames, masks, depth estimates, or visualisations. The AR surface remains an output adapter; Comfy does not gain sensor, identity, or authority ownership.

## First implementation slice

```text
TASK:
Add a Comfy workflow registry contract and a tiny mock registry record.

SCOPE:
One schema/module or architecture-side fixture representing a Comfy workflow reference, required model metadata, validation status, and authority boundary.

OUT OF SCOPE:
No workflow execution, no model download, no custom-node installation, no paid cloud, no automatic Codex promotion, no generated media committed.

VERIFY:
A mock workflow record parses, reports missing/unknown dependencies explicitly, and emits a registry receipt with mayExecute=false by default.
```

## Future implementation order

1. Registry record and validation receipt.
2. Local JSON workflow import with metadata-only extraction.
3. Dependency report for models/custom nodes.
4. Manual approval to mark a workflow candidate executable.
5. Runner adapter: local ComfyUI or Comfy Cloud/CLI, behind capability gate.
6. Output artefact receipt and review lane.
7. House Commons / Universal Codex / Runa / AR surface integrations.

## Non-goals

This contract does not:

- vendor official Comfy workflow templates into Flameclyffe;
- execute workflows automatically;
- install nodes or download models;
- bypass licences or platform terms;
- claim generated media is true;
- grant Comfy control of ArcSweep identity, memory, canon, or authority;
- replace existing Generator Bridge / ComfyUI integration work.

## Closing law

A Comfy workflow is a spell diagram with wires. ArcSweep may catalogue it, test it, run it with permission, and preserve the receipt. It does not become law just because the graph is pretty.
