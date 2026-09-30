# ComfyUI Desktop Adapter Task Packet

**Branch:** `feature/astra-6.1-canonical-ingest`  
**Primary docs:**

- `docs/architecture/COMFY_WORKFLOW_REGISTRY_V0_1.md`
- `docs/research/COMFYUI_DEEP_INGEST_V0_1.md`
- `arcsweep.manifest.json`

## TASK

Add the smallest local-only ComfyUI Desktop Adapter contract/prototype for Astra 6.1.

## WHY

The user has ComfyUI Desktop. ArcSweep should be able to treat ComfyUI as a local visual/media forge while preserving authority, dependency, provenance, review, and canon boundaries.

## SCOPE

You may add contracts, schema files, tests, and mock fixtures for:

- `ComfyInstallProfile`
- `ComfyWorkflowRecord`
- `ComfyDependency`
- `ComfyExecutionRequest`
- `ComfyOutputArtifact`
- a local-only execution receipt

The first implementation may be pure TypeScript/schema/test or repository-native equivalent. Prefer existing owners and naming if the repository already has capability/provider/receipt contracts.

## OUT OF SCOPE

Do not:

- execute a real workflow;
- POST to ComfyUI yet;
- download models;
- install custom nodes;
- call Comfy API/partner nodes;
- write output media into canon;
- mutate production data;
- assume a single Comfy install path;
- hardcode ComfyUI Desktop internals as stable API.

## REQUIRED INVARIANTS

- workflow reference != workflow import
- workflow import != dependency validation
- dependency validation != execution approval
- execution approval != canon approval
- output artefact != truth
- output artefact defaults to `review_required`
- `mayExecute=false` by default
- `mayDownloadModels=false` by default
- `mayInstallCustomNodes=false` by default
- `mayUseComfyApiNodes=false` by default
- `mayCanonize=false` always on raw output artefacts

## MOCK VERIFICATION

Given:

- one mock Comfy install profile with source `desktop`;
- one mock API workflow JSON;
- one declared dependency list;
- one requested input summary;

The adapter should:

1. hash the workflow JSON;
2. build a `ComfyWorkflowRecord`;
3. build a blocked `ComfyExecutionRequest` with all approval flags false;
4. allow a test-only approved request only when explicit approval fields are set;
5. produce a `ComfyOutputArtifact` receipt marked `review_required`;
6. preserve workflow hash, install id, request id, input summary, timestamp, and actor;
7. never mark output as canon.

## SECOND SLICE ONLY AFTER FIRST PASSES

Add safe endpoint configuration/probing:

- user-configured base URL such as `http://127.0.0.1:8188`;
- reachable/unreachable status;
- no queueing during discovery;
- no prompt submission;
- no model download;
- no custom node install.

## THIRD SLICE ONLY AFTER USER APPROVAL

Add real API execution via the ComfyUI local server pattern:

- export API-format workflow from ComfyUI;
- POST `/prompt`;
- track by `prompt_id` and optional WebSocket `clientId`;
- read `/history/{prompt_id}`;
- retrieve output refs through `/view` only if needed;
- create receipt and mark outputs `review_required`.

## HANDOFF FORMAT

Leave:

- what existing owners were found;
- what contract/schema was added or reused;
- files changed;
- tests run;
- what is still UNKNOWN;
- next smallest step.

## STOP CONDITIONS

Stop and ask before:

- installing custom nodes;
- downloading model files;
- using Comfy API/partner nodes;
- executing remote/cloud workflows;
- writing generated media into Codex as canon;
- changing production runtime behavior.
