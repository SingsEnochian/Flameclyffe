export const COMFY_INSTALL_PROFILE_SCHEMA = 'arcsweep.comfy-install-profile/v1';
export const COMFY_WORKFLOW_RECORD_SCHEMA = 'arcsweep.comfy-workflow-record/v1';
export const COMFY_EXECUTION_REQUEST_SCHEMA = 'arcsweep.comfy-execution-request/v1';
export const COMFY_OUTPUT_ARTIFACT_SCHEMA = 'arcsweep.comfy-output-artifact/v1';
export const COMFY_DEPENDENCY_SCHEMA = 'arcsweep.comfy-dependency/v1';

export const COMFY_INSTALL_SOURCES = Object.freeze(['desktop', 'portable', 'manual', 'cloud', 'unknown']);
export const COMFY_MEDIA_TYPES = Object.freeze(['image', 'video', 'audio', '3d', 'text', 'vision', 'mixed']);
export const COMFY_WORKFLOW_REVIEW_STATUSES = Object.freeze(['imported', 'validated', 'approved-local', 'deprecated', 'rejected']);
export const COMFY_OUTPUT_REVIEW_STATUSES = Object.freeze(['review_required', 'accepted', 'rejected', 'archived']);
export const COMFY_DEPENDENCY_KINDS = Object.freeze(['model', 'custom-node', 'unknown']);

// Invariants:
//   workflow reference != workflow import
//   workflow import != dependency validation
//   dependency validation != execution approval
//   execution approval != canon approval
//   output artefact != truth
//   mayCanonize is always false on output artefacts — not a parameter

const INSTALL_SOURCE_SET = new Set(COMFY_INSTALL_SOURCES);
const MEDIA_TYPE_SET = new Set(COMFY_MEDIA_TYPES);
const REVIEW_STATUS_SET = new Set(COMFY_WORKFLOW_REVIEW_STATUSES);
const OUTPUT_REVIEW_STATUS_SET = new Set(COMFY_OUTPUT_REVIEW_STATUSES);
const DEP_KIND_SET = new Set(COMFY_DEPENDENCY_KINDS);

function text(value) {
  return String(value ?? '').trim();
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function cleanList(value, validSet) {
  const list = Array.isArray(value) ? value : [];
  return Object.freeze(list.map((v) => text(v)).filter((v) => validSet.has(v)));
}

/**
 * Deterministic content hash for a workflow JSON string.
 * Uses Web Crypto (SHA-256) when available; falls back to a stable djb2-style hex.
 * Production should always have crypto.subtle available.
 */
export async function computeWorkflowHash(jsonString) {
  const str = typeof jsonString === 'string' ? jsonString : JSON.stringify(jsonString);
  if (typeof crypto !== 'undefined' && crypto.subtle?.digest) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback: djb2
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * A frozen record describing WHERE and HOW ComfyUI may run.
 * NOT an execution permission. Carries no credentials.
 */
export function createComfyInstallProfile({
  installId,
  label = null,
  source = 'unknown',
  baseUrl = null,
  comfyVersion = null,
  frontendVersion = null,
  platform = null,
  gpuProfile = null,
  customNodesKnown = false,
  modelRootsKnown = false,
} = {}) {
  const normId = text(installId);
  if (!normId) throw new Error('comfy-install-profile: installId is required');
  const normSource = INSTALL_SOURCE_SET.has(text(source)) ? text(source) : 'unknown';
  return deepFreeze({
    schema: COMFY_INSTALL_PROFILE_SCHEMA,
    install_id: normId,
    label: text(label) || normId,
    source: normSource,
    base_url: text(baseUrl) || null,
    comfy_version: text(comfyVersion) || null,
    frontend_version: text(frontendVersion) || null,
    platform: text(platform) || null,
    gpu_profile: text(gpuProfile) || null,
    custom_nodes_known: Boolean(customNodesKnown),
    model_roots_known: Boolean(modelRootsKnown),
  });
}

/**
 * A frozen dependency record — model or custom node required by a workflow.
 * Records provenance. Does NOT trigger download.
 */
export function createComfyDependency({
  name,
  kind = 'unknown',
  url = null,
  hash = null,
  hashType = null,
  directory = null,
  licenceNotes = null,
  status = 'unknown',
} = {}) {
  const normName = text(name);
  if (!normName) throw new Error('comfy-dependency: name is required');
  const normKind = DEP_KIND_SET.has(text(kind)) ? text(kind) : 'unknown';
  return deepFreeze({
    schema: COMFY_DEPENDENCY_SCHEMA,
    name: normName,
    kind: normKind,
    url: text(url) || null,
    hash: text(hash) || null,
    hash_type: text(hashType) || null,
    directory: text(directory) || null,
    licence_notes: text(licenceNotes) || null,
    status,
  });
}

/**
 * A frozen workflow record — WHAT a workflow is.
 * Imported workflows default to mayExecute=false regardless of review status.
 * Use explicit approval to set mayExecute=true only after validation.
 */
export function createComfyWorkflowRecord({
  workflowId,
  name,
  mediaTypes = [],
  workflowHash,
  dependencies = [],
  source = 'local',
  editorWorkflowJsonRef = null,
  apiWorkflowJsonRef = null,
  reviewStatus = 'imported',
  mayExecute = false,
  importedAt,
} = {}) {
  const normId = text(workflowId);
  if (!normId) throw new Error('comfy-workflow-record: workflowId is required');
  const normName = text(name);
  if (!normName) throw new Error('comfy-workflow-record: name is required');
  const normHash = text(workflowHash);
  if (!normHash) throw new Error('comfy-workflow-record: workflowHash is required');
  const normStatus = REVIEW_STATUS_SET.has(text(reviewStatus)) ? text(reviewStatus) : 'imported';
  const normMediaTypes = cleanList(mediaTypes, MEDIA_TYPE_SET);
  const normDeps = Object.freeze(
    (Array.isArray(dependencies) ? dependencies : []).filter(
      (d) => d?.schema === COMFY_DEPENDENCY_SCHEMA,
    ),
  );
  return deepFreeze({
    schema: COMFY_WORKFLOW_RECORD_SCHEMA,
    workflow_id: normId,
    name: normName,
    media_types: normMediaTypes,
    workflow_hash: normHash,
    dependencies: normDeps,
    source: text(source) || 'local',
    editor_workflow_json_ref: text(editorWorkflowJsonRef) || null,
    api_workflow_json_ref: text(apiWorkflowJsonRef) || null,
    review_status: normStatus,
    may_execute: Boolean(mayExecute),
    imported_at: importedAt ?? new Date().toISOString(),
  });
}

/**
 * A frozen execution request. ALL approval gates default to false.
 * The caller must explicitly set each to true — no implicit grants.
 * Even an approved request does not execute anything; it is a record
 * of intent that a separate executor must honour.
 */
export function createComfyExecutionRequest({
  requestId,
  workflowId,
  installId,
  apiWorkflowHash,
  inputSummary,
  requestedBy,
  approvedBy = null,
  mayExecute = false,
  mayDownloadModels = false,
  mayInstallCustomNodes = false,
  mayUseComfyApiNodes = false,
  requestedAt,
} = {}) {
  if (!text(requestId)) throw new Error('comfy-execution-request: requestId is required');
  if (!text(workflowId)) throw new Error('comfy-execution-request: workflowId is required');
  if (!text(installId)) throw new Error('comfy-execution-request: installId is required');
  if (!text(apiWorkflowHash)) throw new Error('comfy-execution-request: apiWorkflowHash is required');
  if (!text(inputSummary)) throw new Error('comfy-execution-request: inputSummary is required');
  if (!text(requestedBy)) throw new Error('comfy-execution-request: requestedBy is required');
  return deepFreeze({
    schema: COMFY_EXECUTION_REQUEST_SCHEMA,
    request_id: text(requestId),
    workflow_id: text(workflowId),
    install_id: text(installId),
    api_workflow_hash: text(apiWorkflowHash),
    input_summary: text(inputSummary),
    requested_by: text(requestedBy),
    approved_by: text(approvedBy) || null,
    may_execute: Boolean(mayExecute),
    may_download_models: Boolean(mayDownloadModels),
    may_install_custom_nodes: Boolean(mayInstallCustomNodes),
    may_use_comfy_api_nodes: Boolean(mayUseComfyApiNodes),
    // mayCanonize is not a field on execution requests — it lives on output artifacts only
    requested_at: requestedAt ?? new Date().toISOString(),
  });
}

/**
 * A frozen output artifact receipt. mayCanonize is ALWAYS false — hardcoded, not a parameter.
 * reviewStatus defaults to 'review_required'. Outputs are never automatically truth or canon.
 */
export function createComfyOutputArtifact({
  artifactId,
  requestId,
  promptId = null,
  nodeId = null,
  mediaType = 'other',
  localPath = null,
  previewPath = null,
  reviewStatus = 'review_required',
  producedAt,
} = {}) {
  if (!text(artifactId)) throw new Error('comfy-output-artifact: artifactId is required');
  if (!text(requestId)) throw new Error('comfy-output-artifact: requestId is required');
  const normMediaType = MEDIA_TYPE_SET.has(text(mediaType)) ? text(mediaType) : 'other';
  const normReviewStatus = OUTPUT_REVIEW_STATUS_SET.has(text(reviewStatus)) ? text(reviewStatus) : 'review_required';
  return deepFreeze({
    schema: COMFY_OUTPUT_ARTIFACT_SCHEMA,
    artifact_id: text(artifactId),
    request_id: text(requestId),
    prompt_id: text(promptId) || null,
    node_id: text(nodeId) || null,
    media_type: normMediaType,
    local_path: text(localPath) || null,
    preview_path: text(previewPath) || null,
    review_status: normReviewStatus,
    may_canonize: false, // hardcoded — never promoted to canon from raw output
    produced_at: producedAt ?? new Date().toISOString(),
  });
}
