import { PROJECT_ZERO_COMPANION_OWNERSHIP } from './ownershipBoundary.js';
import { PROJECT_ZERO_RICH_TEXT_SCHEMA, createRichTextDocument, visibleTextToRichDocument } from './richText.js';

export const COMPANION_ARTIFACT_SCHEMA = 'flameclyffe.project-zero-companion.artifact/v1';
export const COMPANION_ARTIFACT_KINDS = Object.freeze([
  'passage',
  'draft',
  'prompt',
  'document',
  'image',
  'audio',
  'file',
  'artifact',
]);

function uid(prefix = 'artifact') {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`;
}

function cleanString(value) {
  const text = value == null ? '' : String(value).trim();
  return text || null;
}

function normaliseTags(value = []) {
  const input = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(input.map((item) => String(item).trim().toLowerCase()).filter(Boolean))].slice(0, 64);
}

export function localPathToAlias(value = '') {
  const normalised = String(value || '').replaceAll('\\', '/').replace(/^\s+|\s+$/g, '');
  if (!normalised) return null;
  const withoutDrive = normalised.replace(/^[A-Za-z]:\//, '');
  const pieces = withoutDrive.split('/').filter(Boolean);
  return pieces.length ? pieces.slice(-3).join('/') : null;
}

function normaliseRichText(value) {
  if (!value) return null;
  if (value.schema === PROJECT_ZERO_RICH_TEXT_SCHEMA) {
    return createRichTextDocument({ html: value.html || '', plainText: value.plain_text ?? null });
  }
  if (typeof value === 'string') return visibleTextToRichDocument(value);
  if (typeof value === 'object' && ('html' in value || 'plain_text' in value)) {
    return createRichTextDocument({ html: value.html || '', plainText: value.plain_text ?? null });
  }
  return null;
}

export function createCompanionArtifact({
  kind = 'artifact',
  title = 'Untitled artifact',
  worldId = null,
  sourceAdapter,
  localBindingKey = null,
  localPathAlias = null,
  localPath = null,
  mimeType = null,
  sourceHash = null,
  richText = null,
  plainText = null,
  externalRef = null,
  tags = [],
  metadata = {},
  visibility = 'needs-review',
  canonStatus = 'unreviewed',
  createdAt = new Date().toISOString(),
} = {}) {
  const artifactKind = COMPANION_ARTIFACT_KINDS.includes(kind) ? kind : 'artifact';
  let document = normaliseRichText(richText);
  if (!document && cleanString(plainText)) document = visibleTextToRichDocument(String(plainText));
  const pathAlias = cleanString(localPathAlias) || localPathToAlias(localPath);

  return Object.freeze({
    schema: COMPANION_ARTIFACT_SCHEMA,
    artifact_id: uid('artifact'),
    bridge_owner: PROJECT_ZERO_COMPANION_OWNERSHIP.bridge_owner,
    integration_target: PROJECT_ZERO_COMPANION_OWNERSHIP.integration_target,
    project_zero_core_authority: false,
    kind: artifactKind,
    title: String(title || 'Untitled artifact'),
    world_id: cleanString(worldId),
    source_adapter: cleanString(sourceAdapter),
    source: {
      local_binding_key: cleanString(localBindingKey),
      local_path_alias: pathAlias,
      raw_local_path_persisted: false,
      mime_type: cleanString(mimeType),
      source_hash: cleanString(sourceHash),
      external_ref: cleanString(externalRef),
    },
    content: {
      rich_text: document,
      plain_text: document?.plain_text || cleanString(plainText),
    },
    tags: normaliseTags(tags),
    metadata: metadata && typeof metadata === 'object' ? structuredClone(metadata) : {},
    visibility,
    authority: {
      canon_status: canonStatus,
      canon_commit: false,
      claims_project_zero_adoption: false,
      claims_external_consumption: false,
    },
    created_at: createdAt,
  });
}
