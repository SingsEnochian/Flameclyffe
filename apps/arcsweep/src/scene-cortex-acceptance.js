import { buildFieldContext } from './constellation-lens.js';
import { buildWriterContextPacket } from './writer-context-resolver.js';

function textIncludes(value, needle) {
  const target = String(needle || '').toLowerCase();
  if (!target || value == null) return false;
  if (['string', 'number', 'boolean'].includes(typeof value)) return String(value).toLowerCase().includes(target);
  if (Array.isArray(value)) return value.some((item) => textIncludes(item, target));
  if (typeof value === 'object') return Object.values(value).some((item) => textIncludes(item, target));
  return false;
}

function cellContains(cells, needle) {
  return (cells || []).some((cell) => textIncludes(cell.value, needle) || textIncludes(cell.predicate, needle));
}

function subjectBy(packet, kind, id) {
  return (packet.subjects || []).find((subject) => subject.kind === kind && subject.id === id) || null;
}

function check(id, label, passed, detail, severity = 'required') {
  return { id, label, passed: Boolean(passed), detail, severity };
}

export async function buildSceneCortexAcceptanceReport(fieldContext, options = {}) {
  const packet = await buildWriterContextPacket(fieldContext, {
    voiceIds: options.voiceIds,
    includeHistorical: false,
    perVoiceLimit: options.perVoiceLimit || 36,
    perSubjectLimit: options.perSubjectLimit || 48,
    resolveLocalState: options.resolveLocalState,
    stateLoader: options.stateLoader,
    fetchImpl: options.fetchImpl,
    learnedCellLoader: options.learnedCellLoader,
    localCellLoader: options.localCellLoader,
    includeLocalLearning: options.includeLocalLearning,
    includeLocalSubjects: options.includeLocalSubjects,
  });

  const page = packet.fieldContext?.page || {};
  const character = page.povCharacterId ? subjectBy(packet, 'character', page.povCharacterId) : null;
  const narrator = page.narrativeVoiceId ? subjectBy(packet, 'narrative_voice', page.narrativeVoiceId) : null;
  const style = page.writingStyleId ? subjectBy(packet, 'writing_style', page.writingStyleId) : null;
  const activeCells = (packet.subjects || []).flatMap((subject) => subject.cells || []);
  const isTaaveren = ['taaveren-vaen', 'taveren-vaen'].includes(String(page.worldId || '').toLowerCase());
  const activeCurrentName = !isTaaveren || !character || cellContains(character.cells, 'Kestrelle al’Var');
  const oldNameLeak = isTaaveren && (cellContains(activeCells, 'Kestrelle al’Valari') && !cellContains(activeCells, 'Kestrelle al’Var'));
  const oldEraLeak = isTaaveren && (cellContains(activeCells, 'Mending') || cellContains(activeCells, 'Fourth Age'));
  const restorationActive = !isTaaveren || cellContains(activeCells, 'Age of Restoration');

  const checks = [
    check('world', 'World context resolved', Boolean(page.worldId), page.worldId || 'world not selected'),
    check('pov', 'POV character cortex resolved', Boolean(character?.cells?.length), character ? `${character.label} · ${character.cells.length} active cells` : 'POV character not selected or bank unavailable'),
    check('narrator', 'Narrative voice cortex resolved', Boolean(narrator?.cells?.length), narrator ? `${narrator.label} · ${narrator.cells.length} active cells` : 'Narrative voice not selected or bank unavailable'),
    check('style', 'Writing style cortex resolved', Boolean(style?.cells?.length), style ? `${style.label} · ${style.cells.length} active cells` : 'Writing style not selected or bank unavailable'),
    check('chronology-law', 'Character chronology firewall active', packet.rules?.characterKnowledgeMustRespectTemporalScope === true, 'calendar/date validity remains active'),
    check('story-order-law', 'Fictional story-order firewall active', packet.rules?.characterKnowledgeMustRespectStoryOrder === true, page.storyOrder == null ? 'law active · story order not set for this scene' : `law active · story order ${page.storyOrder}`),
    check('subject-separation', 'Narrator and character knowledge remain separate', packet.rules?.narrativeVoiceMayShapeProseButMayNotGrantCharacterKnowledge === true && packet.rules?.subjectKindsRemainDistinct === true, 'subject boundaries preserved'),
    check('no-silent-mutation', 'Field remains user-controlled', packet.rules?.noSilentFieldMutation === true, 'dry-run builds context without editing prose'),
    check('no-impersonation', 'Unavailable voices keep their own identity boundary', packet.rules?.unavailableVoiceMayNotBeImpersonated === true, 'no fallback impersonation'),
    check('active-name', 'Current protagonist terminology present', activeCurrentName, isTaaveren ? 'Kestrelle al’Var expected in active character context' : 'not a Ta’veren Vaen scene'),
    check('superseded-name', 'Superseded protagonist name excluded from active subject context', !oldNameLeak, oldNameLeak ? 'al’Valari leaked as active canon' : 'historical name remains outside ordinary activation'),
    check('restoration-era', 'Age of Restoration context active', restorationActive, isTaaveren ? 'Restoration must resolve in active cortex' : 'not a Ta’veren Vaen scene'),
    check('superseded-era', 'Superseded era terms excluded from active subject context', !oldEraLeak, oldEraLeak ? 'Fourth Age or Mending leaked into active cortex' : 'superseded era terms remain historical only'),
  ];

  const required = checks.filter((item) => item.severity === 'required');
  return {
    contract: 'arcsweep.scene-cortex-acceptance-report/v2',
    createdAt: new Date().toISOString(),
    passed: required.every((item) => item.passed),
    checks,
    summary: {
      worldId: page.worldId || null,
      documentId: page.documentId || null,
      sceneId: page.sceneId || null,
      storyAt: page.storyAt || null,
      storyOrder: page.storyOrder ?? null,
      povCharacterId: page.povCharacterId || null,
      narrativeVoiceId: page.narrativeVoiceId || null,
      writingStyleId: page.writingStyleId || null,
      voiceIds: (packet.voices || []).map((voice) => voice.voiceId),
      subjectCellCounts: Object.fromEntries((packet.subjects || []).map((subject) => [`${subject.kind}:${subject.id}`, subject.cells?.length || 0])),
    },
    packet,
    rules: { invokesModels: false, mutatesField: false, promotesCanon: false },
  };
}

export async function inspectSceneCortexControl(control, options = {}) {
  if (!control) throw new Error('Scene cortex acceptance requires a field control.');
  return buildSceneCortexAcceptanceReport(buildFieldContext(control, 'scene-cortex-acceptance'), options);
}
