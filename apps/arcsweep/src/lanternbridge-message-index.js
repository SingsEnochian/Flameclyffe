export const LANTERNBRIDGE_DELIVERY_STATES = Object.freeze([
  'new',
  'processed',
  'superseded',
  'reply_emitted',
]);

function required(value, label) {
  const cleaned = String(value ?? '').trim();
  if (!cleaned) throw new Error(`LANTERNBRIDGE_INDEX: ${label} is required`);
  return cleaned;
}

export function lanternbridgeCursorKey({ bridge_id: bridgeId, source_ref: sourceRef }) {
  return `${encodeURIComponent(required(bridgeId, 'bridge_id'))}::${encodeURIComponent(required(sourceRef, 'source_ref'))}`;
}

export function lanternbridgeActorDisplayName(actor = '') {
  const raw = String(actor || '').trim();
  if (!raw) return 'Lanternbridge';
  const leaf = raw.split(':').filter(Boolean).at(-1) || raw;
  return leaf
    .split(/[-_/\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

export function lanternbridgeThreadId(message, parent = null) {
  if (parent?.thread_id) return String(parent.thread_id);
  const rootBridgeId = parent?.bridge_id || message?.bridge_id;
  return `lanternbridge:${required(rootBridgeId, 'thread bridge_id')}`;
}

export function classifyLanternbridgeDelivery(existing = null) {
  if (!existing) return 'new';
  return LANTERNBRIDGE_DELIVERY_STATES.includes(existing.status) ? existing.status : 'processed';
}

export function buildLanternbridgeIndexEntry(record, {
  sourceRef = null,
  sourceSystem = null,
  sourceRepo = null,
  sourcePath = null,
  sourceCommit = null,
  parent = null,
} = {}) {
  if (!record || record.recognition !== 'VALID') {
    throw new Error('LANTERNBRIDGE_INDEX: only VALID Lanternbridge records may be indexed');
  }

  const metadata = record.metadata || {};
  const bridgeId = required(metadata.bridge_id, 'bridge_id');
  const resolvedSourceRef = required(metadata.provenance?.source_ref || sourceRef, 'source_ref');
  const threadId = lanternbridgeThreadId({ bridge_id: bridgeId }, parent);

  return Object.freeze({
    cursor_key: lanternbridgeCursorKey({ bridge_id: bridgeId, source_ref: resolvedSourceRef }),
    bridge_id: bridgeId,
    source_ref: resolvedSourceRef,
    source_system: metadata.provenance?.source_system || sourceSystem || null,
    source_repo: sourceRepo || null,
    source_path: sourcePath || null,
    source_commit: sourceCommit || null,
    protocol: required(metadata.bridge_protocol, 'bridge_protocol'),
    origin: metadata.origin || null,
    authors: Array.isArray(metadata.authors) ? [...metadata.authors] : [],
    addressed_to: Array.isArray(metadata.addressed_to) ? [...metadata.addressed_to] : [],
    responds_to: metadata.relations?.responds_to || null,
    supersedes: metadata.relations?.supersedes || null,
    thread_id: threadId,
    commons_entry_id: null,
    status: 'new',
    source_created_at: metadata.created_at || null,
    payload: {
      metadata,
      body: record.body,
      unknown_fields: record.unknownFields || [],
      source_preserved: record.sourcePreserved === true,
    },
  });
}

export function projectLanternbridgeCommonsEntry(indexEntry, {
  id,
  createdAt = new Date().toISOString(),
  parent = null,
} = {}) {
  const entryId = required(id, 'Commons entry id');
  const authorId = indexEntry.authors?.[0] || indexEntry.origin || 'lanternbridge';
  const sourceLabel = [indexEntry.source_repo, indexEntry.source_path].filter(Boolean).join(':');

  return Object.freeze({
    schema: 'hearthgate.house-commons-entry/v4',
    id: entryId,
    created_at: createdAt,
    kind: 'voice',
    author: lanternbridgeActorDisplayName(authorId),
    voice_id: String(authorId || '').trim() || null,
    status: 'bridge-received',
    world: null,
    thread_id: indexEntry.thread_id,
    reply_to: parent?.commons_entry_id || null,
    turn_id: null,
    mentions: [],
    links: [
      { kind: 'lanternbridge', id: indexEntry.bridge_id, label: `Lanternbridge ${indexEntry.bridge_id}` },
      ...(sourceLabel ? [{ kind: 'source', id: sourceLabel, label: sourceLabel }] : []),
    ],
    attachments: [],
    summary_of: null,
    runtime: null,
    external: {
      protocol: `lanternbridge/${indexEntry.protocol}`,
      cursor_key: indexEntry.cursor_key,
      bridge_id: indexEntry.bridge_id,
      source_ref: indexEntry.source_ref,
      source_system: indexEntry.source_system,
      source_repo: indexEntry.source_repo,
      source_path: indexEntry.source_path,
      source_commit: indexEntry.source_commit,
      origin: indexEntry.origin,
      authors: indexEntry.authors,
      addressed_to: indexEntry.addressed_to,
      responds_to: indexEntry.responds_to,
      supersedes: indexEntry.supersedes,
    },
    text: String(indexEntry.payload?.body || '').trim() || `[Lanternbridge ${indexEntry.bridge_id}]`,
  });
}
