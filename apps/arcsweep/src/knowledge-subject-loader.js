import { compileSkillMarkdown, resolveKnowledgeCells, validateKnowledgeCell } from './knowledge-graph.js';
import { listLocalKnowledgeCells } from './knowledge-learning-store.js';

const MANIFEST_URL = new URL('../skills/subject-banks.json', import.meta.url);
let manifestCache = null;
const bankCache = new Map();

function normaliseSubject(subject = {}) {
  const kind = String(subject.kind || '').trim().toLowerCase();
  const id = String(subject.id || '').trim().toLowerCase();
  if (!kind || !id) throw new Error('Knowledge subject requires kind and id.');
  return { ...subject, kind, id };
}

function subjectKey(subject) {
  const value = normaliseSubject(subject);
  return `${value.kind}:${value.id}`;
}

async function readJson(url, fetchImpl = globalThis.fetch) {
  const key = String(url);
  if (bankCache.has(key)) return bankCache.get(key);
  if (typeof fetchImpl !== 'function') throw new Error(`No fetch implementation available for ${key}`);
  const response = await fetchImpl(url);
  if (!response?.ok) throw new Error(`Failed to load ${key}: ${response?.status ?? 'unknown status'}`);
  const value = await response.json();
  bankCache.set(key, value);
  return value;
}

function dedupeCells(cells = []) {
  const byId = new Map();
  for (const cell of cells) {
    const errors = validateKnowledgeCell(cell);
    if (errors.length) throw new Error(`Invalid knowledge cell ${cell?.id || '<unknown>'}: ${errors.join('; ')}`);
    const prior = byId.get(cell.id);
    if (prior && JSON.stringify(prior) !== JSON.stringify(cell)) {
      throw new Error(`Conflicting duplicate knowledge cell id: ${cell.id}`);
    }
    byId.set(cell.id, cell);
  }
  return [...byId.values()];
}

export function clearKnowledgeSubjectCache() {
  manifestCache = null;
  bankCache.clear();
}

export async function loadSubjectBankManifest({ fetchImpl } = {}) {
  if (manifestCache) return manifestCache;
  manifestCache = await readJson(MANIFEST_URL, fetchImpl);
  return manifestCache;
}

export async function loadKnowledgeSubject(subject, {
  fetchImpl,
  includeLocal = true,
  localCellLoader = listLocalKnowledgeCells,
} = {}) {
  const normalised = normaliseSubject(subject);
  const manifest = await loadSubjectBankManifest({ fetchImpl });
  const entry = manifest.subjects?.[subjectKey(normalised)] || null;
  const urls = (entry?.banks || []).map((path) => new URL(path, MANIFEST_URL));
  const staticBanks = await Promise.all(urls.map((url) => readJson(url, fetchImpl)));
  const localCells = includeLocal && typeof localCellLoader === 'function'
    ? await localCellLoader({ subjectKind: normalised.kind, subjectId: normalised.id }).catch(() => [])
    : [];
  const cells = dedupeCells([
    ...staticBanks.flatMap((bank) => bank.cells || []),
    ...(localCells || []),
  ]);
  return {
    subject: normalised,
    label: entry?.label || subject.label || subject.name || normalised.id,
    cells,
    bankUrls: urls.map(String),
    localCellCount: localCells?.length || 0,
    staticBankCount: staticBanks.length,
  };
}

export async function resolveKnowledgeSubjectCells(subject, request = {}, options = {}) {
  const loaded = await loadKnowledgeSubject(subject, options);
  return {
    ...loaded,
    cells: resolveKnowledgeCells(loaded.cells, {
      ...request,
      subject: loaded.subject,
    }),
  };
}

export async function compileKnowledgeSubjectSkill(subject, options = {}, runtimeOptions = {}) {
  const loaded = await loadKnowledgeSubject(subject, runtimeOptions);
  return compileSkillMarkdown(loaded.cells, {
    ...options,
    label: options.label || loaded.label,
    request: {
      ...(options.request || {}),
      subject: loaded.subject,
    },
  });
}

export const KNOWLEDGE_SUBJECT_URLS = Object.freeze({
  manifest: String(MANIFEST_URL),
});
