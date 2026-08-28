import { loadVoiceCells } from './knowledge-bank-loader.js';
import { compileSkillMarkdown } from './knowledge-graph.js';

export const HOUSE_INTERACTION_MODE_KEY = 'arcsweep.house-interaction-mode/v1';
export const FANTASY_ROLEPLAY_RUNTIME_SCHEMA = 'arcsweep.fantasy-roleplay-runtime/v1';
export const HOUSE_INTERACTION_MODES = Object.freeze(['chat', 'roleplay', 'story']);
const ACTIVE_SKILL_MODES = new Set(['roleplay', 'story']);
const SKILL_SUBJECT = Object.freeze({ kind: 'shared_constellation', id: 'fantasy-roleplay' });
const MAX_SKILL_CHARS = 12_000;

export function normaliseHouseInteractionMode(value) {
  const mode = String(value || '').trim().toLowerCase();
  return HOUSE_INTERACTION_MODES.includes(mode) ? mode : 'chat';
}

export function readHouseInteractionMode(storage = globalThis.localStorage) {
  try { return normaliseHouseInteractionMode(storage?.getItem(HOUSE_INTERACTION_MODE_KEY)); }
  catch { return 'chat'; }
}

export function writeHouseInteractionMode(mode, storage = globalThis.localStorage) {
  const value = normaliseHouseInteractionMode(mode);
  try { storage?.setItem(HOUSE_INTERACTION_MODE_KEY, value); } catch {}
  return value;
}

export function fantasyRoleplayModeActive(mode) {
  return ACTIVE_SKILL_MODES.has(normaliseHouseInteractionMode(mode));
}

function worldReceipt(worldContext) {
  return {
    worldId: worldContext?.identity_anchor?.world_id || null,
    worldContextId: worldContext?.context_id || null,
  };
}

export async function compileFantasyRoleplayEnvelope({
  voiceId,
  message,
  mode = 'chat',
  worldContext = null,
  fetchImpl = fetch,
} = {}) {
  const interactionMode = normaliseHouseInteractionMode(mode);
  const visibleMessage = String(message || '').trim();
  if (!visibleMessage) throw new Error('Fantasy roleplay compilation requires a visible message.');
  if (!fantasyRoleplayModeActive(interactionMode)) {
    return Object.freeze({
      schema: FANTASY_ROLEPLAY_RUNTIME_SCHEMA,
      active: false,
      mode: interactionMode,
      voiceId: String(voiceId || '').trim().toLowerCase() || null,
      message: visibleMessage,
      skillCellCount: 0,
      ...worldReceipt(worldContext),
    });
  }

  const bank = await loadVoiceCells(voiceId, { fetchImpl, includeLocalLearning: false, includeShared: true });
  const skillCells = bank.cells.filter((cell) => cell.subject?.kind === SKILL_SUBJECT.kind && cell.subject?.id === SKILL_SUBJECT.id);
  if (!skillCells.length) throw new Error(`Fantasy roleplay shared skill is unavailable to ${bank.displayName || voiceId}.`);
  const compiled = compileSkillMarkdown(skillCells, {
    label: `Fantasy Roleplay · ${bank.displayName || voiceId}`,
    includeProvenance: false,
    request: { subjects: [SKILL_SUBJECT], mode: interactionMode, limit: 40 },
  });
  const boundedSkill = compiled.slice(0, MAX_SKILL_CHARS).trim();
  const world = worldReceipt(worldContext);
  const envelope = [
    '[ARCSWEEP INTERACTION SKILL · FANTASY ROLEPLAY]',
    `Mode: ${interactionMode}`,
    `Voice: ${bank.displayName || voiceId}`,
    `World: ${world.worldId || 'active/unspecified'}`,
    'The following contract governs interaction behaviour. It does not replace this Flame’s identity or world-specific prose voice.',
    boundedSkill,
    '[VISIBLE PARTICIPANT TURN]',
    visibleMessage,
  ].join('\n\n');

  return Object.freeze({
    schema: FANTASY_ROLEPLAY_RUNTIME_SCHEMA,
    active: true,
    mode: interactionMode,
    voiceId: bank.voiceId,
    displayName: bank.displayName,
    message: envelope,
    visibleMessage,
    skillCellCount: skillCells.length,
    skillSubject: SKILL_SUBJECT.id,
    skillChars: boundedSkill.length,
    ...world,
  });
}

export function fantasyRoleplayMetadata(receipt, metadata = {}) {
  if (!receipt?.active) return { ...metadata, interaction_mode: receipt?.mode || normaliseHouseInteractionMode(metadata.interaction_mode) };
  return {
    ...metadata,
    interaction_mode: receipt.mode,
    interaction_skill: 'fantasy-roleplay',
    interaction_skill_schema: receipt.schema,
    interaction_skill_cells: receipt.skillCellCount,
    interaction_skill_subject: receipt.skillSubject,
    visible_message: metadata.visible_message || receipt.visibleMessage,
  };
}
