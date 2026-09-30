# ComfyUI Deep Ingest Summary

Astra 6.1 now treats ComfyUI as a local media/workflow forge behind ArcSweep authority gates.

## Sources ingested

- ComfyUI core README and script examples
- ComfyUI Desktop README
- Comfy-Org workflow templates repository documentation
- Comfy workflow templates / subgraph blueprint structure
- Comfy Server API execution pattern using `/prompt`, `/ws`, `/history/{prompt_id}`, and `/view`

## Core synthesis

ComfyUI is not just an image generator. It is a node-graph execution engine for image, video, audio, 3D, text, vision, segmentation, depth, upscaling, compositing, inpainting/outpainting, media processing, and local or optional API-backed generation.

ComfyUI Desktop is the preferred user-facing local execution surface because it manages independent installs, isolated environments, models, custom nodes, updates, snapshots, rollback, and existing install migration.

ArcSweep should integrate through contracts, not direct uncontrolled execution.

## New files

- `docs/research/COMFYUI_DEEP_INGEST_V0_1.md`
- `docs/handoffs/COMFYUI_DESKTOP_ADAPTER_TASK_PACKET.md`

## Manifest updates

`arcsweep.manifest.json` now includes:

- `comfyDeepIngest`
- `comfyDesktopAdapter`
- `comfy-desktop` surface family
- `customNodeInstalls=false`
- `comfyApiNodes=false`
- strengthened execution/canon boundaries

## Required invariants

- workflow reference != workflow import
- workflow import != dependency validation
- dependency validation != execution approval
- execution approval != canon approval
- output artefact != truth
- output artefact != canon by default

## First implementation target

Add a pure local/mock ComfyUI Desktop Adapter contract:

- `ComfyInstallProfile`
- `ComfyWorkflowRecord`
- `ComfyDependency`
- `ComfyExecutionRequest`
- `ComfyOutputArtifact`
- local-only receipt

Defaults:

- `mayExecute=false`
- `mayDownloadModels=false`
- `mayInstallCustomNodes=false`
- `mayUseComfyApiNodes=false`
- `mayCanonize=false`

## Stop before

- real workflow execution
- model downloads
- custom node installs
- API/partner node use
- cloud execution
- canon promotion
- production runtime mutation

ComfyUI is the forge. ArcSweep is the steward. Codex is the archive. Rowan decides what becomes real.
