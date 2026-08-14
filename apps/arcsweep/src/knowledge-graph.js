const AUTHORITY_WEIGHT = Object.freeze({
  self_authored: 100,
  user_confirmed: 95,
  founding_law: 90,
  project_canon: 85,
  source_canon: 80,
  direct_observation: 70,
  runtime_config: 55,
  derived: 40,
  model_inference: 30,
});

const EXCLUDED_STATUSES = new Set(['deprecated', 'superseded']);

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function sameSubject(cell, requested) {
  if (!requested.length) return true;
  return requested.some((subject) => {
    if (typeof subject === 'string') return cell.subject?.id === subject;
    return cell.subject?.id === subject?.id && (!subject?.kind || cell.subject?.kind === subject.kind);
  });
}

function temporalMatch(cell, at) {
  if (!at || !cell.temporal) return true;
  const point = Date.parse(at);
  if (!Number.isFinite(point)) return true;
  const from = cell.temporal.validFrom ? Date.parse(cell.temporal.validFrom) : null;
  const until = cell.temporal.validUntil ? Date.parse(cell.temporal.validUntil) : null;
  if (Number.isFinite(from) && point < from) return false;
  if (Number.isFinite(until) && point > until) return false;
  return true;
}

function intersects(left = [], right = []) {
  const set = new Set(left);
  return right.some((value) => set.has(value));
}

function scopeMatch(cell, context) {
  const scope = cell.scope || {};
  const worldIds = asArray(context.worldIds?.length ? context.worldIds : context.worldId).filter(Boolean);
  const documentIds = asArray(context.documentIds?.length ? context.documentIds : context.documentId).filter(Boolean);
  const sceneIds = asArray(context.sceneIds?.length ? context.sceneIds : context.sceneId).filter(Boolean);
  const modes = asArray(context.modes?.length ? context.modes : context.mode).filter(Boolean);

  if (scope.worldIds?.length) {
    if (context.requireScopedContext && !worldIds.length) return false;
    if (worldIds.length && !intersects(scope.worldIds, worldIds)) return false;
  }
  if (scope.documentIds?.length) {
    if (context.requireScopedContext && !documentIds.length) return false;
    if (documentIds.length && !intersects(scope.documentIds, documentIds)) return false;
  }
  if (scope.sceneIds?.length) {
    if (context.requireScopedContext && !sceneIds.length) return false;
    if (sceneIds.length && !intersects(scope.sceneIds, sceneIds)) return false;
  }
  if (scope.modes?.length && modes.length && !intersects(scope.modes, modes)) return false;
  return true;
}

export function validateKnowledgeCell(cell) {
  const errors = [];
  if (!cell || typeof cell !== 'object') return ['cell must be an object'];
  for (const key of ['id', 'cellType', 'subject', 'predicate', 'status', 'authority', 'source', 'mutability']) {
    if (cell[key] == null) errors.push(`missing ${key}`);
  }
  if (!cell.subject?.id || !cell.subject?.kind) errors.push('subject requires kind and id');
  if (!cell.authority?.kind) errors.push('authority requires kind');
  if (!cell.source?.surface || !cell.source?.locator) errors.push('source requires surface and locator');
  if (cell.authority?.confidence != null && (cell.authority.confidence < 0 || cell.authority.confidence > 1)) {
    errors.push('authority confidence must be between 0 and 1');
  }
  return errors;
}

export function resolveKnowledgeCells(cells, request = {}) {
  const subjects = asArray(request.subjects || request.subject);
  const cellTypes = new Set(asArray(request.cellTypes));
  const includeHistorical = Boolean(request.includeHistorical);
  const limit = Number.isFinite(request.limit) ? Math.max(1, request.limit) : 80;

  return [...(cells || [])]
    .filter((cell) => validateKnowledgeCell(cell).length === 0)
    .filter((cell) => sameSubject(cell, subjects))
    .filter((cell) => !cellTypes.size || cellTypes.has(cell.cellType))
    .filter((cell) => !EXCLUDED_STATUSES.has(cell.status))
    .filter((cell) => includeHistorical || cell.status !== 'historical')
    .filter((cell) => temporalMatch(cell, request.at))
    .filter((cell) => scopeMatch(cell, request))
    .sort((a, b) => {
      const authorityDelta = (AUTHORITY_WEIGHT[b.authority.kind] || 0) - (AUTHORITY_WEIGHT[a.authority.kind] || 0);
      if (authorityDelta) return authorityDelta;
      const confidenceDelta = (b.authority.confidence ?? 0.5) - (a.authority.confidence ?? 0.5);
      if (confidenceDelta) return confidenceDelta;
      return a.id.localeCompare(b.id);
    })
    .slice(0, limit);
}

function renderValue(value) {
  if (value == null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function sectionTitle(cellType) {
  return String(cellType || 'other')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function compileSkillMarkdown(cells, options = {}) {
  const resolved = resolveKnowledgeCells(cells, options.request || options);
  const label = options.label || options.subjectLabel || resolved[0]?.subject?.id || 'Runtime Skill';
  const groups = new Map();

  for (const cell of resolved) {
    if (!groups.has(cell.cellType)) groups.set(cell.cellType, []);
    groups.get(cell.cellType).push(cell);
  }

  const lines = [
    `# ${label}`,
    '',
    '> Compiled at runtime from provenance-bearing knowledge cells. Source documents remain authoritative.',
    '',
  ];

  for (const [cellType, group] of groups) {
    lines.push(`## ${sectionTitle(cellType)}`, '');
    for (const cell of group) {
      lines.push(`- **${cell.predicate}**: ${renderValue(cell.value)}`);
      if (options.includeProvenance !== false) {
        const src = [cell.source.repository, cell.source.locator].filter(Boolean).join(':');
        lines.push(`  - source: ${src || cell.source.locator}`);
        lines.push(`  - authority: ${cell.authority.kind}; status: ${cell.status}; cell: ${cell.id}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n').trim() + '\n';
}

export function relationIndex(cells) {
  const index = new Map();
  for (const cell of cells || []) {
    for (const relation of cell.relations || []) {
      if (!index.has(cell.id)) index.set(cell.id, []);
      index.get(cell.id).push({ ...relation });
    }
  }
  return index;
}

export const KNOWLEDGE_AUTHORITY_WEIGHT = AUTHORITY_WEIGHT;
