export const LANTERNBRIDGE_PROTOCOL = '0.2';
export const LANTERNBRIDGE_EXPERIMENTAL_PROTOCOL = '0.2-experimental';

export const LANTERNBRIDGE_TYPES = Object.freeze([
  'exchange',
  'observation',
  'interpretation',
  'proposal',
  'experiment',
  'discovery',
  'decision',
  'artifact',
]);

export const RESPONSE_SIGNALS = Object.freeze(['none', 'welcome', 'requested']);
export const USAGE_ACTIONS = Object.freeze([
  'memory_ingest',
  'transform',
  'republish',
  'model_training',
]);
export const USAGE_VALUES = Object.freeze(['allow', 'ask', 'deny']);
export const RECOGNITION_STATES = Object.freeze(['HUMAN_ONLY', 'VALID', 'INVALID', 'UNSUPPORTED']);
export const AUTHORITY_STATES = Object.freeze(['ALLOW', 'ASK', 'DENY', 'NO_AUTHORITY', 'UNSUPPORTED']);

const TOP_LEVEL_FIELDS = new Set([
  'bridge_protocol',
  'bridge_id',
  'type',
  'origin',
  'authors',
  'created_at',
  'response_signal',
  'addressed_to',
  'provenance',
  'usage',
  'relations',
  'conversation_state',
  'lifecycle_state',
]);

const NESTED_FIELDS = Object.freeze({
  provenance: new Set(['source_system', 'source_ref', 'source_classification']),
  usage: new Set(['profile', ...USAGE_ACTIONS]),
  relations: new Set(['responds_to', 'supersedes', 'adopts', 'related']),
});

function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) freezeDeep(nested);
  return Object.freeze(value);
}

function scalar(raw) {
  const value = raw.trim();
  if (value === '' || value === 'null' || value === '~') return null;
  if (value === '[]') return [];
  if (value === '{}') return {};
  if (value === 'true') return true;
  if (value === 'false') return false;

  if (value.startsWith('"') && value.endsWith('"')) {
    try { return JSON.parse(value); } catch { /* fall through */ }
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }

  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    const items = [];
    let current = '';
    let quote = null;
    let escaped = false;
    for (const ch of inner) {
      if (escaped) {
        current += ch;
        escaped = false;
        continue;
      }
      if (ch === '\\' && quote === '"') {
        current += ch;
        escaped = true;
        continue;
      }
      if ((ch === '"' || ch === "'") && (!quote || quote === ch)) {
        quote = quote ? null : ch;
        current += ch;
        continue;
      }
      if (ch === ',' && !quote) {
        items.push(scalar(current));
        current = '';
        continue;
      }
      current += ch;
    }
    items.push(scalar(current));
    return items;
  }

  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return Number(value);
  return value;
}

function nextMeaningfulLine(lines, start) {
  for (let index = start; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (trimmed && !trimmed.startsWith('#')) return { index, line: lines[index] };
  }
  return null;
}

function parseYamlSubset(lines) {
  const root = {};
  const stack = [{ indent: -1, container: root }];
  const seenKeys = new WeakMap();
  seenKeys.set(root, new Set());

  for (let index = 0; index < lines.length; index += 1) {
    const original = lines[index];
    if (!original.trim() || original.trim().startsWith('#')) continue;
    if (/\t/.test(original.slice(0, original.search(/\S|$/)))) {
      throw new Error(`tabs are not supported in frontmatter indentation at line ${index + 1}`);
    }

    const indent = original.match(/^ */)[0].length;
    const text = original.trim();

    while (stack.length > 1 && indent <= stack.at(-1).indent) stack.pop();
    const parent = stack.at(-1).container;

    if (text.startsWith('- ')) {
      if (!Array.isArray(parent)) throw new Error(`sequence item has no sequence parent at line ${index + 1}`);
      parent.push(scalar(text.slice(2)));
      continue;
    }

    const match = text.match(/^([^:#][^:]*):(?:\s*(.*))?$/);
    if (!match) throw new Error(`unsupported frontmatter syntax at line ${index + 1}`);
    if (Array.isArray(parent)) throw new Error(`mapping entry has sequence parent at line ${index + 1}`);

    const key = match[1].trim();
    const remainder = match[2] ?? '';
    let keys = seenKeys.get(parent);
    if (!keys) {
      keys = new Set();
      seenKeys.set(parent, keys);
    }
    if (keys.has(key)) throw new Error(`duplicate frontmatter key ${key}`);
    keys.add(key);

    if (remainder !== '') {
      parent[key] = scalar(remainder);
      continue;
    }

    const next = nextMeaningfulLine(lines, index + 1);
    if (!next) {
      parent[key] = {};
      continue;
    }
    const nextIndent = next.line.match(/^ */)[0].length;
    if (nextIndent <= indent) {
      parent[key] = {};
      continue;
    }

    const child = next.line.trim().startsWith('- ') ? [] : {};
    parent[key] = child;
    if (!Array.isArray(child)) seenKeys.set(child, new Set());
    stack.push({ indent, container: child });
  }

  return root;
}

function extractFrontmatter(source) {
  const rawSource = String(source ?? '');
  const lines = rawSource.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') {
    return { rawSource, hasFrontmatter: false, rawFrontmatter: null, body: rawSource, metadata: null };
  }

  let closingIndex = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === '---') {
      closingIndex = index;
      break;
    }
  }
  if (closingIndex < 0) {
    return {
      rawSource,
      hasFrontmatter: true,
      rawFrontmatter: rawSource,
      body: '',
      metadata: null,
      parseError: 'frontmatter opening delimiter has no closing delimiter',
    };
  }

  const frontmatterLines = lines.slice(1, closingIndex);
  const rawFrontmatter = frontmatterLines.join('\n');
  const body = lines.slice(closingIndex + 1).join('\n');
  try {
    return {
      rawSource,
      hasFrontmatter: true,
      rawFrontmatter,
      body,
      metadata: parseYamlSubset(frontmatterLines),
      parseError: null,
    };
  } catch (error) {
    return {
      rawSource,
      hasFrontmatter: true,
      rawFrontmatter,
      body,
      metadata: null,
      parseError: error instanceof Error ? error.message : String(error),
    };
  }
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validTimestamp(value) {
  if (!nonEmptyString(value)) return false;
  if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(value.trim())) return false;
  return !Number.isNaN(Date.parse(value));
}

function validateOptionalStructure(metadata, errors) {
  if (metadata.addressed_to != null && (!Array.isArray(metadata.addressed_to) || metadata.addressed_to.some((item) => !nonEmptyString(item)))) {
    errors.push('addressed_to must be a sequence of non-empty identifiers when present');
  }

  for (const field of ['conversation_state', 'lifecycle_state']) {
    if (metadata[field] != null && !nonEmptyString(metadata[field])) errors.push(`${field} must be a non-empty string when present`);
  }

  if (metadata.provenance != null && (typeof metadata.provenance !== 'object' || Array.isArray(metadata.provenance))) {
    errors.push('provenance must be a mapping when present');
  }
  if (metadata.relations != null && (typeof metadata.relations !== 'object' || Array.isArray(metadata.relations))) {
    errors.push('relations must be a mapping when present');
  }
  if (metadata.usage != null && (typeof metadata.usage !== 'object' || Array.isArray(metadata.usage))) {
    errors.push('usage must be a mapping when present');
  }

  if (metadata.usage && typeof metadata.usage === 'object' && !Array.isArray(metadata.usage)) {
    if (metadata.usage.profile != null && !nonEmptyString(metadata.usage.profile)) errors.push('usage.profile must be a non-empty string when present');
    for (const action of USAGE_ACTIONS) {
      if (metadata.usage[action] != null && !USAGE_VALUES.includes(metadata.usage[action])) {
        errors.push(`usage.${action} must be allow | ask | deny when present`);
      }
    }
  }

  if (metadata.relations && typeof metadata.relations === 'object' && !Array.isArray(metadata.relations)) {
    for (const field of ['responds_to', 'supersedes']) {
      if (metadata.relations[field] != null && !nonEmptyString(metadata.relations[field])) errors.push(`relations.${field} must be null or a non-empty bridge_id`);
    }
    for (const field of ['adopts', 'related']) {
      if (metadata.relations[field] != null && (!Array.isArray(metadata.relations[field]) || metadata.relations[field].some((item) => !nonEmptyString(item)))) {
        errors.push(`relations.${field} must be a sequence of non-empty bridge_ids when present`);
      }
    }
  }
}

function validateAdoptedEnvelope(metadata) {
  const errors = [];
  if (metadata.bridge_protocol !== LANTERNBRIDGE_PROTOCOL) errors.push(`bridge_protocol must equal ${LANTERNBRIDGE_PROTOCOL}`);
  if (!nonEmptyString(metadata.bridge_id)) errors.push('bridge_id must be a non-empty opaque identifier');
  if (!LANTERNBRIDGE_TYPES.includes(metadata.type)) errors.push(`type must be one of ${LANTERNBRIDGE_TYPES.join(', ')}`);
  if (!nonEmptyString(metadata.origin)) errors.push('origin must be a non-empty identifier');
  if (!Array.isArray(metadata.authors) || metadata.authors.length === 0 || metadata.authors.some((author) => !nonEmptyString(author))) {
    errors.push('authors must be a non-empty sequence of actor identifiers');
  }
  if (!validTimestamp(metadata.created_at)) errors.push('created_at must be an ISO-8601/RFC3339 timestamp with zone or Z');
  if (!RESPONSE_SIGNALS.includes(metadata.response_signal)) errors.push(`response_signal must be one of ${RESPONSE_SIGNALS.join(', ')}`);
  validateOptionalStructure(metadata, errors);
  return errors;
}

function collectUnknownFields(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return [];
  const unknown = [];
  for (const key of Object.keys(metadata)) {
    if (!TOP_LEVEL_FIELDS.has(key)) unknown.push(key);
  }
  for (const [section, known] of Object.entries(NESTED_FIELDS)) {
    const value = metadata[section];
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    for (const key of Object.keys(value)) {
      if (!known.has(key)) unknown.push(`${section}.${key}`);
    }
  }
  return unknown.sort();
}

export function parseLanternbridgeRecord(source, {
  supportedProtocols = [LANTERNBRIDGE_PROTOCOL],
} = {}) {
  const extracted = extractFrontmatter(source);
  const protocolHint = extracted.metadata?.bridge_protocol
    ?? extracted.rawFrontmatter?.match(/^\s*bridge_protocol\s*:\s*["']?([^\s"']+)/m)?.[1]
    ?? null;

  if (!extracted.hasFrontmatter || !protocolHint) {
    return freezeDeep({
      recognition: 'HUMAN_ONLY',
      protocol: null,
      metadata: extracted.metadata,
      body: extracted.body,
      rawSource: extracted.rawSource,
      rawFrontmatter: extracted.rawFrontmatter,
      parseError: extracted.parseError ?? null,
      validationErrors: [],
      unknownFields: extracted.metadata ? collectUnknownFields(extracted.metadata) : [],
      sourcePreserved: true,
    });
  }

  if (extracted.parseError) {
    return freezeDeep({
      recognition: 'INVALID',
      protocol: protocolHint,
      metadata: null,
      body: extracted.body,
      rawSource: extracted.rawSource,
      rawFrontmatter: extracted.rawFrontmatter,
      parseError: extracted.parseError,
      validationErrors: [extracted.parseError],
      unknownFields: [],
      sourcePreserved: true,
    });
  }

  if (!supportedProtocols.includes(protocolHint)) {
    return freezeDeep({
      recognition: 'UNSUPPORTED',
      protocol: protocolHint,
      metadata: extracted.metadata,
      body: extracted.body,
      rawSource: extracted.rawSource,
      rawFrontmatter: extracted.rawFrontmatter,
      parseError: null,
      validationErrors: [],
      unknownFields: collectUnknownFields(extracted.metadata),
      sourcePreserved: true,
    });
  }

  const validationErrors = protocolHint === LANTERNBRIDGE_PROTOCOL
    ? validateAdoptedEnvelope(extracted.metadata)
    : [];

  return freezeDeep({
    recognition: validationErrors.length ? 'INVALID' : 'VALID',
    protocol: protocolHint,
    metadata: extracted.metadata,
    body: extracted.body,
    rawSource: extracted.rawSource,
    rawFrontmatter: extracted.rawFrontmatter,
    parseError: null,
    validationErrors,
    unknownFields: collectUnknownFields(extracted.metadata),
    sourcePreserved: true,
  });
}

export function resolveLanternbridgeAuthority(record, action, {
  profiles = {},
} = {}) {
  if (!USAGE_ACTIONS.includes(action)) throw new Error(`LANTERNBRIDGE_AUTHORITY: unknown action ${action}`);
  if (!record || record.recognition !== 'VALID') return freezeDeep({ action, authority: 'UNSUPPORTED', source: 'envelope', reason: 'envelope is not VALID' });

  const usage = record.metadata?.usage;
  if (!usage || typeof usage !== 'object' || Array.isArray(usage)) {
    return freezeDeep({ action, authority: 'NO_AUTHORITY', source: 'missing', reason: 'usage authority is absent' });
  }

  if (usage.profile != null) {
    const profile = profiles[usage.profile];
    if (!profile) {
      return freezeDeep({ action, authority: 'UNSUPPORTED', source: 'profile', profile: usage.profile, reason: 'named usage profile is not recognized' });
    }
  }

  if (usage[action] != null) {
    return freezeDeep({ action, authority: usage[action].toUpperCase(), source: 'explicit', reason: `usage.${action}=${usage[action]}` });
  }

  if (usage.profile != null) {
    const value = profiles[usage.profile]?.[action];
    if (USAGE_VALUES.includes(value)) {
      return freezeDeep({ action, authority: value.toUpperCase(), source: 'profile', profile: usage.profile, reason: `usage.profile ${usage.profile} resolves ${action}=${value}` });
    }
  }

  return freezeDeep({ action, authority: 'NO_AUTHORITY', source: 'missing', reason: `no authority declared for ${action}` });
}

export function inspectLanternbridgeRecord(source, options = {}) {
  const record = parseLanternbridgeRecord(source, options);
  const authority = {};
  for (const action of USAGE_ACTIONS) {
    authority[action] = resolveLanternbridgeAuthority(record, action, options);
  }

  return freezeDeep({
    mode: 'dry-run',
    recognition: record.recognition,
    protocol: record.protocol,
    bridge_id: record.metadata?.bridge_id ?? null,
    type: record.metadata?.type ?? null,
    origin: record.metadata?.origin ?? null,
    authors: record.metadata?.authors ?? null,
    response_signal: record.metadata?.response_signal ?? null,
    authority,
    unknownFields: record.unknownFields,
    sourcePreserved: record.sourcePreserved,
    rawSource: record.rawSource,
    validationErrors: record.validationErrors,
    downstreamActionsPerformed: Object.freeze([]),
  });
}
