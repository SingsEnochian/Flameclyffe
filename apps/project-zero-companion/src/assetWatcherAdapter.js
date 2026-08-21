import { createCompanionArtifact } from './artifactContract.js';
import { publishSocketEnvelope } from './projectZeroSocket.js';

export const ASSET_WATCHER_SCHEMA = 'flameclyffe.project-zero-companion.asset-watcher/v1';
export const ASSET_WATCHER_STORAGE_KEY = 'flameclyffe:project-zero-companion:asset-watcher/v1';
const MAX_ARTIFACTS = 256;

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.avif']);
const AUDIO_EXTENSIONS = new Set(['.wav', '.mp3', '.ogg', '.flac', '.m4a', '.aac']);
const DOCUMENT_EXTENSIONS = new Set(['.md', '.txt', '.rtf', '.pdf', '.doc', '.docx', '.odt', '.html', '.htm']);

function inferKind(extension, isDirectory) {
  if (isDirectory === true) return 'artifact';
  if (IMAGE_EXTENSIONS.has(extension)) return 'image';
  if (AUDIO_EXTENSIONS.has(extension)) return 'audio';
  if (DOCUMENT_EXTENSIONS.has(extension)) return 'document';
  return 'file';
}

function cleanAlias(rootLabel, relativeAlias) {
  const root = String(rootLabel || 'watched-folder').replaceAll('\\', '/').replace(/^\/+|\/+$/g, '');
  const relative = String(relativeAlias || '').replaceAll('\\', '/').replace(/^\/+/, '');
  return [root, relative === '.' ? '' : relative].filter(Boolean).join('/');
}

export function isNativeAssetWatcherAvailable(api = globalThis.electronAPI) {
  return Boolean(
    api?.selectAssetWatchDirectory
    && api?.startAssetWatch
    && api?.stopAssetWatch
    && api?.onAssetWatchEvent,
  );
}

export function loadAssetWatcherArtifacts(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(ASSET_WATCHER_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(-MAX_ARTIFACTS) : [];
  } catch {
    return [];
  }
}

function eventKey(event = {}) {
  return [event.watch_id, event.event_type, event.relative_path_alias, event.exists, event.modified_at, event.size_bytes].join('|');
}

export function createAssetWatcherArtifact(event = {}) {
  const extension = String(event.extension || '').toLowerCase();
  const alias = cleanAlias(event.root_label, event.relative_path_alias);
  return createCompanionArtifact({
    kind: inferKind(extension, event.is_directory),
    title: String(event.name || event.relative_path_alias || 'Detected asset'),
    sourceAdapter: 'asset-watcher',
    localPathAlias: alias,
    visibility: 'needs-review',
    metadata: {
      watcher_schema: event.schema || null,
      watch_id: event.watch_id || null,
      root_label: event.root_label || null,
      event_type: event.event_type || null,
      exists: event.exists ?? null,
      is_directory: event.is_directory ?? null,
      size_bytes: event.size_bytes ?? null,
      modified_at: event.modified_at || null,
      observed_at: event.observed_at || null,
      content_read: false,
      event_key: eventKey(event),
    },
  });
}

export function persistAssetWatcherArtifact(artifact, storage = globalThis.localStorage) {
  const current = loadAssetWatcherArtifacts(storage);
  const key = artifact.metadata?.event_key;
  const previous = current[current.length - 1];
  if (key && previous?.metadata?.event_key === key) return previous;
  const next = [...current, artifact].slice(-MAX_ARTIFACTS);
  try { storage?.setItem(ASSET_WATCHER_STORAGE_KEY, JSON.stringify(next)); } catch {}
  return artifact;
}

export function receiptAssetWatchEvent(event, { storage = globalThis.localStorage } = {}) {
  const artifact = persistAssetWatcherArtifact(createAssetWatcherArtifact(event), storage);
  publishSocketEnvelope({
    pluginId: 'asset-watcher',
    channel: 'artifact',
    type: 'asset.file_detected',
    requestId: artifact.artifact_id,
    payload: {
      schema: ASSET_WATCHER_SCHEMA,
      artifact,
      metadata_only: true,
      claims_project_zero_adoption: false,
    },
  });
  return artifact;
}
