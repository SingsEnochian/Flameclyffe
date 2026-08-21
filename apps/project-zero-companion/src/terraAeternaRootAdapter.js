import { createCompanionArtifact } from './artifactContract.js';
import { publishSocketEnvelope } from './projectZeroSocket.js';

export const TERRA_AETERNA_ROOT_SCHEMA = 'flameclyffe.project-zero-companion.terra-aeterna-root/v1';
export const TERRA_AETERNA_ROOT_STORAGE_KEY = 'flameclyffe:project-zero-companion:terra-aeterna-root/v1';
const MAX_ARTIFACTS = 192;

export function loadTerraAeternaArtifacts(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(TERRA_AETERNA_ROOT_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(-MAX_ARTIFACTS) : [];
  } catch {
    return [];
  }
}

export function persistTerraAeternaArtifact(artifact, storage = globalThis.localStorage) {
  const current = loadTerraAeternaArtifacts(storage);
  const next = [...current.filter((item) => item.artifact_id !== artifact.artifact_id), artifact].slice(-MAX_ARTIFACTS);
  try { storage?.setItem(TERRA_AETERNA_ROOT_STORAGE_KEY, JSON.stringify(next)); } catch {}
  return artifact;
}

export function createTerraAeternaArtifact(input = {}) {
  return createCompanionArtifact({
    ...input,
    worldId: input.worldId || 'terra-aeterna',
    sourceAdapter: 'terra-aeterna-root',
    visibility: input.visibility || 'needs-review',
  });
}

export function emitTerraAeternaArtifact(input = {}, { storage = globalThis.localStorage } = {}) {
  const artifact = persistTerraAeternaArtifact(createTerraAeternaArtifact(input), storage);
  publishSocketEnvelope({
    pluginId: 'terra-aeterna-root',
    channel: 'artifact',
    type: 'artifact.terra_aeterna.received',
    requestId: artifact.artifact_id,
    payload: {
      schema: TERRA_AETERNA_ROOT_SCHEMA,
      artifact,
      claims_project_zero_adoption: false,
    },
  });
  return artifact;
}
