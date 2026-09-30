# ComfyUI Deep Ingest v0.1

**Status:** research synthesis for Astra 6.1  
**Scope:** ComfyUI, ComfyUI Desktop, workflow templates, subgraph blueprints, local API execution, App Mode, custom nodes, model/dependency handling, and ArcSweep integration boundaries.  
**Authority:** this document informs implementation. It grants no execution, download, custom-node install, external API, or canon-promotion authority.

## 1. Core understanding

ComfyUI is best treated as a **local graph execution engine for generative and media workflows**. It is not merely an image generator. Current ComfyUI supports graph-based workflows across image, video, audio, 3D, text, vision, upscaling, segmentation, depth, masking, compositing, and media processing.

For ArcSweep, the central insight is:

> A Comfy workflow is an executable media graph. ArcSweep should treat that graph as a capability recipe with dependencies, permissions, provenance, and output review.

ArcSweep must not confuse the workflow graph with cognition, identity, canon, or evidence.

## 2. Local-first execution surface

The user has ComfyUI Desktop. That matters.

ComfyUI Desktop is the preferred local execution surface for Astra 6.1 because it can manage isolated ComfyUI installs, model/custom-node differences, updates, snapshots, and rollback. ArcSweep should therefore detect and cooperate with a local Desktop-managed ComfyUI instance rather than assuming a single hardcoded install.

The right separation:

```text
ComfyWorkflowRecord
  = what the workflow is

ComfyInstallProfile
  = where and how it may run

ComfyExecutionRequest
  = a specific approved run

ComfyOutputArtifact
  = generated media requiring review
```

## 3. Workflow graph model

ComfyUI workflows exist in at least two important forms:

1. **Editor workflow JSON**: the full graph as used and saved in the UI.
2. **API workflow / prompt format**: node-id keyed JSON with `class_type` and `inputs`, suitable for `/prompt` submission.

ArcSweep should store both only when appropriate:

- editor JSON for inspection, provenance, future editing, and visual graph recovery;
- API JSON for execution requests;
- workflow hash for reproducibility and cache/dedup;
- dependency list for safety gates;
- human-readable purpose/expected outputs for review.

Never execute a workflow merely because it was imported.

## 4. Comfy Server API execution pattern

The basic execution path is:

```text
ArcSweep / adapter
  -> POST /prompt with API-format graph
  -> receive or track prompt_id
  -> optional WebSocket /ws?clientId=... for progress/events
  -> GET /history/{prompt_id}
  -> GET /view?... for generated media references
  -> store output artifact receipt
```

The official script examples show two useful patterns:

- basic HTTP-only submission to `http://127.0.0.1:8188/prompt`;
- WebSocket tracking that waits for an `executing` event with `node: null`, then reads `/history/{prompt_id}` and downloads image outputs through `/view`.

ArcSweep should use this pattern only behind explicit local approval and should preserve the Comfy prompt id, client id, workflow hash, input summary, output references, and history response in a receipt.

## 5. Desktop adapter contract

Recommended contract shape:

```ts
interface ComfyInstallProfile {
  installId: string;
  label?: string;
  source: "desktop" | "portable" | "manual" | "cloud" | "unknown";
  baseUrl?: string;
  comfyVersion?: string;
  frontendVersion?: string;
  platform?: string;
  gpuProfile?: string;
  customNodesKnown?: boolean;
  modelRootsKnown?: boolean;
}

interface ComfyWorkflowRecord {
  workflowId: string;
  name: string;
  mediaTypes: ("image" | "video" | "audio" | "3d" | "text" | "vision" | "mixed")[];
  editorWorkflowJsonRef?: string;
  apiWorkflowJsonRef?: string;
  workflowHash: string;
  dependencies: ComfyDependency[];
  source: ComfyWorkflowSource;
  reviewStatus: "imported" | "validated" | "approved-local" | "deprecated" | "rejected";
  mayExecute: boolean;
}

interface ComfyExecutionRequest {
  requestId: string;
  workflowId: string;
  installId: string;
  apiWorkflowHash: string;
  inputSummary: string;
  requestedBy: string;
  approvedBy?: string;
  mayExecute: boolean;
  mayDownloadModels: boolean;
  mayInstallCustomNodes: boolean;
  mayUseComfyApiNodes: boolean;
}

interface ComfyOutputArtifact {
  artifactId: string;
  requestId: string;
  promptId?: string;
  nodeId?: string;
  mediaType: "image" | "video" | "audio" | "3d" | "text" | "other";
  localPath?: string;
  previewPath?: string;
  reviewStatus: "review_required" | "accepted" | "rejected" | "archived";
  mayCanonize: false;
}
```

Default permissions:

```text
mayExecute=false
mayDownloadModels=false
mayInstallCustomNodes=false
mayUseComfyApiNodes=false
mayCanonize=false
```

## 6. Workflow templates and template registry

The official `Comfy-Org/workflow_templates` ecosystem is valuable because it models workflows as curated templates with manifests, packages, preview assets, dependency metadata, bundle mapping, validation, and a browsable site.

For ArcSweep, borrow the shape, not the whole repository:

- template registry
- media-type classification
- preview assets
- model dependency declarations
- custom-node requirements
- minimum ComfyUI version
- workflow status and review state
- manifest sync / hash validation
- reusable subgraph blueprints

ArcSweep should maintain its own `ComfyWorkflowRecord` layer rather than copying templates directly into canon.

## 7. Subgraph blueprints

Subgraph blueprints are especially important for ArcSweep. They let common node clusters become reusable components rather than one-off spaghetti graphs.

ArcSweep use cases:

- Runa visualiser subgraph
- Codex illustration card subgraph
- character consistency subgraph
- pose/reference adapter subgraph
- image-to-video / storyboard subgraph
- transcript-to-chapter-image subgraph
- mask / segmentation / depth prep subgraph
- AR overlay preparation subgraph

Blueprints map neatly to the existing ArcSweep principle: **capability components should be composable and reviewable**.

## 8. App Mode

App Mode matters because the most sophisticated workflows can expose a simplified UI. ArcSweep should eventually generate or load workflow-backed mini-apps where Rowan sees only the meaningful controls, not every node.

Pattern:

```text
complex Comfy graph
  -> selected exposed controls
  -> ArcSweep form / House Commons card / Codex panel
  -> explicit execution request
  -> reviewable output
```

Do not expose raw node graphs to every user interaction when a bounded control surface will do.

## 9. Models and dependency handling

Comfy workflows may require checkpoints, diffusion models, VAEs, text encoders, LoRAs, ControlNets, adapters, upscalers, audio/video models, custom nodes, or remote API nodes.

ArcSweep must separate:

- required local model files;
- optional model files;
- model download URLs;
- hashes and hash types;
- target model directory;
- custom nodes required;
- API/closed-source nodes required;
- hardware requirements;
- expected VRAM/RAM pressure where known.

Automatic model download is not allowed in the first adapter slice. Model download may later become an explicit reviewed action with hash verification and storage-path visibility.

## 10. Custom nodes

Custom nodes are powerful but risky. They may add code execution, dependencies, dependency conflicts, hidden network calls, unstable APIs, or incompatible Python packages.

ArcSweep handling:

- imported workflow may declare custom-node requirements;
- missing custom nodes produce `blocked_missing_dependency`;
- custom-node installation is never automatic;
- Desktop snapshots/rollback should be recommended before risky changes;
- unknown custom nodes require source/reputation/licence review;
- custom nodes cannot grant ArcSweep authority.

## 11. Offline / API node boundary

ComfyUI can run locally/offline for core functionality, and it has optional API/partner nodes for closed-source/cloud models. For Rowan's local-first ArcSweep use, offline/local workflows should be preferred unless an external call is explicitly chosen.

ArcSweep receipt must record whether a workflow uses:

- local-only execution;
- partner/API nodes;
- remote model APIs;
- network fetches;
- external credentials.

If any external call is required, the request must stay blocked until explicit approval.

## 12. Output review and canon boundary

Generated artefacts are not canon. They are candidates.

A Comfy output may become:

- sketch/reference
- draft illustration
- creature exploration
- continuity sheet candidate
- scene card
- House Commons visual
- Runa visualizer asset
- Codex candidate illustration
- AR overlay candidate

But it does not become canon unless separately reviewed and promoted by the Codex/canon workflow.

Required invariant:

```text
output artifact != truth
output artifact != canon
output artifact != evidence of source-world reality
```

## 13. ArcSweep integration lanes

### Universal Codex

Store workflow provenance, prompt/input summary, dependency declarations, output artefact refs, review status, and canon-promotion decisions.

### House Commons

Use Comfy outputs for watch-room chapter cards, seminar visuals, shared sketchboards, world-entry cards, and agent discussion aids.

### Narrative Engine / Crow

Use generated scene cards, character sheets, creature boards, and continuity references. Crow writes. Comfy renders. ArcSweep validates boundaries.

### Runa / Glyph Forge

Use Comfy for glyph imagery, visualizers, symbolic overlays, motion tests, haptic/audio-linked visual drafts, and style experiments. Runa owns resonance logic; Comfy outputs visual artefacts.

### AR Companion Node

Use generated masks, overlays, depth/segmentation references, concept frames, and spatial UI assets. AR sensors and authority remain outside Comfy.

### Video Ingest / Watch Room

Use Comfy for transcript-linked chapter cards, scene thumbnails, speculative visual summaries, and storyboard frames, always labelled as generated/interpretive.

## 14. First implementation slice

```text
TASK:
Add a ComfyUI Desktop Adapter contract and local-only mock execution receipt.

SCOPE:
- represent local Comfy install profile
- represent imported workflow record
- hash workflow JSON
- list declared dependencies
- build execution request with all permissions false by default
- produce mock output artefact receipt marked review_required

OUT OF SCOPE:
- no real execution yet
- no model downloads
- no custom-node install
- no cloud/API nodes
- no canon promotion
- no media upload

VERIFY:
Given a mock Comfy workflow record and mock Desktop install profile, the adapter creates a blocked request until approval, then creates a local-only receipt with mayCanonize=false and review_required output.
```

## 15. Second implementation slice

After the contract is tested, add local endpoint discovery/manual configuration:

```text
- user enters or confirms http://127.0.0.1:8188
- adapter probes safe endpoints only
- adapter records server reachable / unreachable
- adapter never queues a prompt during discovery
- adapter reports version/info only where available
```

## 16. Third implementation slice

Add real execution only after approval:

```text
- load an API-exported workflow JSON
- validate required node classes exist if endpoint supports it
- POST /prompt
- track prompt id via WebSocket or polling
- read /history/{prompt_id}
- store output references
- mark review_required
```

## 17. Safety and provenance law

```text
workflow reference != workflow import
workflow import != dependency validation
validated dependencies != execution approval
execution approval != canon approval
output artifact != truth
```

ComfyUI is the forge. ArcSweep is the steward. Codex is the archive. Rowan decides what becomes real.
