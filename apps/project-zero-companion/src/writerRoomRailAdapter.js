import { createCompanionArtifact } from './artifactContract.js';
import { publishSocketEnvelope } from './projectZeroSocket.js';

export const WRITER_ROOM_RAIL_SCHEMA = 'flameclyffe.project-zero-companion.writer-room-rail/v1';
export const WRITER_ROOM_RAIL_STORAGE_KEY = 'flameclyffe:project-zero-companion:writer-room-rail/v1';
const MAX_ARTIFACTS = 192;
const WRITER_KINDS = new Set(['passage', 'draft', 'prompt', 'document']);

export function loadWriterRoomArtifacts(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(WRITER_ROOM_RAIL_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(-MAX_ARTIFACTS) : [];
  } catch {
    return [];
  }
}

export function persistWriterRoomArtifact(artifact, storage = globalThis.localStorage) {
  const current = loadWriterRoomArtifacts(storage);
  const next = [...current.filter((item) => item.artifact_id !== artifact.artifact_id), artifact].slice(-MAX_ARTIFACTS);
  try { storage?.setItem(WRITER_ROOM_RAIL_STORAGE_KEY, JSON.stringify(next)); } catch {}
  return artifact;
}

export function createWriterRoomArtifact(input = {}) {
  const kind = WRITER_KINDS.has(input.kind) ? input.kind : 'passage';
  return createCompanionArtifact({
    ...input,
    kind,
    sourceAdapter: 'writer-room-rail',
    visibility: input.visibility || 'needs-review',
    canonStatus: input.canonStatus || 'unreviewed',
  });
}

export function emitWriterRoomArtifact(input = {}, { storage = globalThis.localStorage } = {}) {
  const artifact = persistWriterRoomArtifact(createWriterRoomArtifact(input), storage);
  publishSocketEnvelope({
    pluginId: 'writer-room-rail',
    channel: 'artifact',
    type: 'writer.artifact.received',
    requestId: artifact.artifact_id,
    payload: {
      schema: WRITER_ROOM_RAIL_SCHEMA,
      artifact,
      claims_project_zero_adoption: false,
    },
  });
  return artifact;
}
