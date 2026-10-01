import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMFY_INSTALL_PROFILE_SCHEMA,
  COMFY_WORKFLOW_RECORD_SCHEMA,
  COMFY_EXECUTION_REQUEST_SCHEMA,
  COMFY_OUTPUT_ARTIFACT_SCHEMA,
  computeWorkflowHash,
  createComfyInstallProfile,
  createComfyDependency,
  createComfyWorkflowRecord,
  createComfyExecutionRequest,
  createComfyOutputArtifact,
} from '../src/architecture/comfy-desktop-adapter.js';

// --- Mock workflow JSON (as in Rarity's task packet) ---
const MOCK_WORKFLOW_JSON = JSON.stringify({
  '1': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: 'flux1-dev.safetensors' } },
  '2': { class_type: 'CLIPTextEncode', inputs: { text: 'a glowing vessel' } },
  '3': { class_type: 'KSampler', inputs: { seed: 42, steps: 20, cfg: 7 } },
  '4': { class_type: 'SaveImage', inputs: { filename_prefix: 'vessel' } },
});

// --- ComfyInstallProfile ---

test('install profile is frozen and schema-tagged', () => {
  const profile = createComfyInstallProfile({
    installId: 'desktop-01',
    source: 'desktop',
    baseUrl: 'http://127.0.0.1:8188',
    platform: 'win32',
    gpuProfile: 'cuda',
  });
  assert.equal(profile.schema, COMFY_INSTALL_PROFILE_SCHEMA);
  assert.equal(profile.install_id, 'desktop-01');
  assert.equal(profile.source, 'desktop');
  assert.equal(profile.base_url, 'http://127.0.0.1:8188');
  assert.equal(profile.platform, 'win32');
  assert.equal(Object.isFrozen(profile), true);
});

test('install profile unknown source normalises to "unknown"', () => {
  const profile = createComfyInstallProfile({ installId: 'x', source: 'astral-projection' });
  assert.equal(profile.source, 'unknown');
});

test('install profile requires installId', () => {
  assert.throws(() => createComfyInstallProfile({}), /installId is required/);
});

test('install profile carries no credentials or authority fields', () => {
  const profile = createComfyInstallProfile({ installId: 'x', source: 'desktop' });
  for (const f of ['api_key', 'token', 'authority', 'credentials']) {
    assert.equal(Object.hasOwn(profile, f), false, `must not have field: ${f}`);
  }
});

// --- computeWorkflowHash ---

test('workflow hash is a non-empty hex string', async () => {
  const hash = await computeWorkflowHash(MOCK_WORKFLOW_JSON);
  assert.ok(typeof hash === 'string' && hash.length > 0, 'hash must be non-empty string');
  assert.ok(/^[0-9a-f]+$/.test(hash), 'hash must be hex');
});

test('workflow hash is deterministic for same input', async () => {
  const h1 = await computeWorkflowHash(MOCK_WORKFLOW_JSON);
  const h2 = await computeWorkflowHash(MOCK_WORKFLOW_JSON);
  assert.equal(h1, h2, 'hash must be deterministic');
});

test('workflow hash differs for different input', async () => {
  const h1 = await computeWorkflowHash(MOCK_WORKFLOW_JSON);
  const h2 = await computeWorkflowHash('{}');
  assert.notEqual(h1, h2, 'different workflows must produce different hashes');
});

// --- ComfyWorkflowRecord ---

test('workflow record is frozen, schema-tagged, and defaults to mayExecute=false', async () => {
  const hash = await computeWorkflowHash(MOCK_WORKFLOW_JSON);
  const dep = createComfyDependency({ name: 'flux1-dev.safetensors', kind: 'model' });
  const record = createComfyWorkflowRecord({
    workflowId: 'wf-flux-001',
    name: 'Flux Image Generation',
    mediaTypes: ['image'],
    workflowHash: hash,
    dependencies: [dep],
    source: 'local',
    reviewStatus: 'imported',
  });

  assert.equal(record.schema, COMFY_WORKFLOW_RECORD_SCHEMA);
  assert.equal(record.workflow_id, 'wf-flux-001');
  assert.equal(record.workflow_hash, hash);
  assert.equal(record.may_execute, false, 'must default to false');
  assert.equal(record.review_status, 'imported');
  assert.equal(record.dependencies.length, 1);
  assert.equal(record.dependencies[0].name, 'flux1-dev.safetensors');
  assert.equal(Object.isFrozen(record), true);
  assert.equal(Object.isFrozen(record.dependencies), true);
});

test('workflow record strips unknown media types', async () => {
  const hash = await computeWorkflowHash('{}');
  const record = createComfyWorkflowRecord({
    workflowId: 'wf-x',
    name: 'test',
    workflowHash: hash,
    mediaTypes: ['image', 'dream-capture', '3d'],
  });
  assert.deepEqual([...record.media_types], ['image', '3d']);
});

test('workflow record rejects non-schema dependencies silently', async () => {
  const hash = await computeWorkflowHash('{}');
  const record = createComfyWorkflowRecord({
    workflowId: 'wf-y',
    name: 'test',
    workflowHash: hash,
    dependencies: [{ name: 'model.safetensors' }], // missing schema
  });
  assert.equal(record.dependencies.length, 0, 'malformed deps must be dropped');
});

test('workflow reference != workflow import: importing does not grant execution', async () => {
  const hash = await computeWorkflowHash(MOCK_WORKFLOW_JSON);
  const record = createComfyWorkflowRecord({
    workflowId: 'wf-ref',
    name: 'Reference Only',
    workflowHash: hash,
    reviewStatus: 'validated', // even validated
    mayExecute: false,
  });
  assert.equal(record.may_execute, false, 'validation alone must not grant execution');
});

// --- ComfyExecutionRequest ---

test('execution request defaults all gates to false', async () => {
  const hash = await computeWorkflowHash(MOCK_WORKFLOW_JSON);
  const req = createComfyExecutionRequest({
    requestId: 'req-001',
    workflowId: 'wf-flux-001',
    installId: 'desktop-01',
    apiWorkflowHash: hash,
    inputSummary: 'prompt: glowing vessel, seed: 42',
    requestedBy: 'rowan',
  });

  assert.equal(req.schema, COMFY_EXECUTION_REQUEST_SCHEMA);
  assert.equal(req.may_execute, false);
  assert.equal(req.may_download_models, false);
  assert.equal(req.may_install_custom_nodes, false);
  assert.equal(req.may_use_comfy_api_nodes, false);
  assert.equal(Object.isFrozen(req), true);
});

test('execution request allows explicit approval when all fields set', async () => {
  const hash = await computeWorkflowHash(MOCK_WORKFLOW_JSON);
  const req = createComfyExecutionRequest({
    requestId: 'req-approved',
    workflowId: 'wf-flux-001',
    installId: 'desktop-01',
    apiWorkflowHash: hash,
    inputSummary: 'prompt: approved run',
    requestedBy: 'rowan',
    approvedBy: 'rowan',
    mayExecute: true,
    // models/nodes still blocked — not approved for download
  });

  assert.equal(req.may_execute, true, 'explicit approval must be honoured');
  assert.equal(req.may_download_models, false, 'model download remains blocked unless explicitly set');
  assert.equal(req.may_install_custom_nodes, false);
  assert.equal(req.approved_by, 'rowan');
});

test('execution request preserves workflow hash, install id, input summary, and actor', async () => {
  const hash = await computeWorkflowHash(MOCK_WORKFLOW_JSON);
  const req = createComfyExecutionRequest({
    requestId: 'req-receipt',
    workflowId: 'wf-001',
    installId: 'desktop-01',
    apiWorkflowHash: hash,
    inputSummary: 'test input',
    requestedBy: 'rowan',
  });
  assert.equal(req.api_workflow_hash, hash);
  assert.equal(req.install_id, 'desktop-01');
  assert.equal(req.input_summary, 'test input');
  assert.equal(req.requested_by, 'rowan');
});

test('execution request has no mayCanonize field', async () => {
  const hash = await computeWorkflowHash('{}');
  const req = createComfyExecutionRequest({
    requestId: 'r', workflowId: 'w', installId: 'i',
    apiWorkflowHash: hash, inputSummary: 's', requestedBy: 'rowan',
  });
  assert.equal(Object.hasOwn(req, 'may_canonize'), false, 'canonize lives on output artifact only');
});

// --- ComfyOutputArtifact ---

test('output artifact defaults to review_required and mayCanonize always false', () => {
  const artifact = createComfyOutputArtifact({
    artifactId: 'art-001',
    requestId: 'req-001',
    mediaType: 'image',
    localPath: '/comfy/output/vessel_00001.png',
  });

  assert.equal(artifact.schema, COMFY_OUTPUT_ARTIFACT_SCHEMA);
  assert.equal(artifact.review_status, 'review_required');
  assert.equal(artifact.may_canonize, false, 'mayCanonize must always be false');
  assert.equal(Object.isFrozen(artifact), true);
});

test('output artifact mayCanonize cannot be overridden to true', () => {
  // Even if a caller tries to pass mayCanonize — it is not a parameter
  const artifact = createComfyOutputArtifact({
    artifactId: 'art-override',
    requestId: 'req-override',
    mediaType: 'image',
  });
  assert.equal(artifact.may_canonize, false, 'mayCanonize is hardcoded false — no parameter exists');
});

test('output artifact preserves workflow hash lineage via requestId', () => {
  const artifact = createComfyOutputArtifact({
    artifactId: 'art-lineage',
    requestId: 'req-001',
    promptId: 'prompt-abc123',
    nodeId: '4',
  });
  assert.equal(artifact.request_id, 'req-001');
  assert.equal(artifact.prompt_id, 'prompt-abc123');
  assert.equal(artifact.node_id, '4');
});

// --- Full mock verification (Rarity's task packet) ---

test('mock verification: import → record → blocked request → artifact → never canon', async () => {
  // 1. Install profile with source 'desktop'
  const profile = createComfyInstallProfile({
    installId: 'desktop-local',
    source: 'desktop',
    baseUrl: 'http://127.0.0.1:8188',
  });
  assert.equal(profile.source, 'desktop');

  // 2. Hash the mock workflow JSON
  const hash = await computeWorkflowHash(MOCK_WORKFLOW_JSON);
  assert.ok(hash.length > 0);

  // 3. Declare a dependency
  const dep = createComfyDependency({
    name: 'flux1-dev.safetensors',
    kind: 'model',
    hash: 'abc123',
    hashType: 'SHA256',
    directory: 'diffusion_models',
    licenceNotes: 'non-commercial',
    status: 'missing',
  });
  assert.equal(dep.status, 'missing');

  // 4. Build workflow record — blocked, imported
  const record = createComfyWorkflowRecord({
    workflowId: 'wf-mock-001',
    name: 'Mock Flux Workflow',
    workflowHash: hash,
    mediaTypes: ['image'],
    dependencies: [dep],
    reviewStatus: 'imported',
  });
  assert.equal(record.may_execute, false, 'step 3: imported workflow must be blocked');
  assert.equal(record.review_status, 'imported');

  // 5. Build blocked execution request
  const blockedReq = createComfyExecutionRequest({
    requestId: 'req-mock-001',
    workflowId: record.workflow_id,
    installId: profile.install_id,
    apiWorkflowHash: hash,
    inputSummary: 'prompt: glowing vessel over water',
    requestedBy: 'rowan',
  });
  assert.equal(blockedReq.may_execute, false, 'step 5: default request must be blocked');

  // 6. Build explicitly approved request
  const approvedReq = createComfyExecutionRequest({
    requestId: 'req-mock-001-approved',
    workflowId: record.workflow_id,
    installId: profile.install_id,
    apiWorkflowHash: hash,
    inputSummary: 'prompt: glowing vessel over water',
    requestedBy: 'rowan',
    approvedBy: 'rowan',
    mayExecute: true,
  });
  assert.equal(approvedReq.may_execute, true, 'step 6: explicit approval must be granted');
  assert.equal(approvedReq.api_workflow_hash, hash, 'hash preserved');
  assert.equal(approvedReq.install_id, profile.install_id, 'install preserved');

  // 7. Build output artifact — always review_required, never canon
  const artifact = createComfyOutputArtifact({
    artifactId: 'art-mock-001',
    requestId: approvedReq.request_id,
    mediaType: 'image',
    localPath: '/comfy/output/vessel_00001.png',
  });
  assert.equal(artifact.review_status, 'review_required', 'artifact must require review');
  assert.equal(artifact.may_canonize, false, 'artifact must never be canon');
  assert.equal(artifact.request_id, approvedReq.request_id, 'lineage preserved');

  // 8. Confirm no path from artifact to canon
  assert.equal(Object.hasOwn(artifact, 'canon_status'), false);
  assert.equal(Object.hasOwn(artifact, 'is_canon'), false);
});
