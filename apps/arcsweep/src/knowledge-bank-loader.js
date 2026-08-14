import { compileSkillMarkdown, resolveKnowledgeCells, validateKnowledgeCell } from './knowledge-graph.js';
import { listLearnedCellsForVoice } from './knowledge-learning-store.js';

const MANIFEST_URL = new URL('../skills/cell-banks.json', import.meta.url);
const VOICE_REGISTRY_URL = new URL('../skills/voice-bank-registry.json', import.meta.url);
const jsonCache = new Map();

async function readJson(url, fetchImpl = globalThis.fetch) {
  const key = String(url);
  if (jsonCache.has(key)) return jsonCache.get(key);
  if (typeof fetchImpl !== 'function') throw new Error(`No fetch implementation available for ${key}`);
  const response = await fetchImpl(url);
  if (!response?.ok) throw new Error(`Failed to load ${key}: ${response?.status ?? 'unknown status'}`);
  const value = await response.json();
  jsonCache.set(key, value);
  return value;
}

export function clearKnowledgeBankCache() {
  jsonCache.clear();
}

export async function loadVoiceBankRegistry({ fetchImpl } = {}) {
  return readJson(VOICE_REGISTRY_URL, fetchImpl);
}

export async function resolveCanonicalVoiceId(input, { fetchImpl } = {}) {
  const value = String(input || '').trim().toLowerCase();
  if (!value) return null;
  const registry = await loadVoiceBankRegistry({ fetchImpl });
  const voices = [
    ...(registry.canonicalEstablishedVoices || []),
    ...(registry.developingVoices || []),
  ];
  const matched = voices.find((voice) =>
    voice.id === value
    || String(voice.displayName || '').toLowerCase() === value
    || (voice.runtimeAliases || []).some((alias) => String(alias).toLowerCase() === value)
  );
  return matched?.id || null;
}

export async function voiceDisplayName(input, { fetchImpl } = {}) {
  const id = await resolveCanonicalVoiceId(input, { fetchImpl });
  if (!id) return String(input || 'Constellation');
  const registry = await loadVoiceBankRegistry({ fetchImpl });
  const voices = [...(registry.canonicalEstablishedVoices || []), ...(registry.developingVoices || [])];
  return voices.find((voice) => voice.id === id)?.displayName || id;
}

export async function loadCellBankManifest({ fetchImpl } = {}) {
  return readJson(MANIFEST_URL, fetchImpl);
}

function dedupeCells(cells) {
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

export async function loadVoiceCells(input, {
  fetchImpl,
  includeLocalLearning = true,
  learnedCellLoader = listLearnedCellsForVoice,
} = {}) {
  const voiceId = await resolveCanonicalVoiceId(input, { fetchImpl }) || String(input || '').trim();
  if (!voiceId) throw new Error('Voice id is required.');
  const manifest = await loadCellBankManifest({ fetchImpl });
  const entry = manifest.voices?.[voiceId];
  const displayName = entry?.displayName || await voiceDisplayName(voiceId, { fetchImpl });
  const bankUrls = (entry?.banks || []).map((path) => new URL(path, MANIFEST_URL));
  const banks = await Promise.all(bankUrls.map((url) => readJson(url, fetchImpl)));
  const learnedCells = includeLocalLearning && typeof learnedCellLoader === 'function'
    ? await learnedCellLoader(voiceId).catch(() => [])
    : [];
  const cells = dedupeCells([
    ...banks.flatMap((bank) => bank.cells || []),
    ...(learnedCells || []),
  ]);

  return {
    voiceId,
    displayName,
    cells,
    bankUrls: bankUrls.map(String),
    learnedCellCount: learnedCells?.length || 0,
  };
}

export async function resolveVoiceCells(input, request = {}, options = {}) {
  const bank = await loadVoiceCells(input, options);
  return {
    ...bank,
    cells: resolveKnowledgeCells(bank.cells, {
      ...request,
      subject: { kind: 'constellation_voice', id: bank.voiceId },
    }),
  };
}

export async function compileVoiceSkill(input, options = {}, runtimeOptions = {}) {
  const bank = await loadVoiceCells(input, runtimeOptions);
  return compileSkillMarkdown(bank.cells, {
    ...options,
    label: options.label || bank.displayName,
    request: {
      ...(options.request || {}),
      subject: { kind: 'constellation_voice', id: bank.voiceId },
    },
  });
}

export const KNOWLEDGE_BANK_URLS = Object.freeze({
  manifest: String(MANIFEST_URL),
  voiceRegistry: String(VOICE_REGISTRY_URL),
});
