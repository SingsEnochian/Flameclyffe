export const WONDER_PROTOCOL_SCHEMA = 'hearthweave.wonder-protocol/v0.1';

export const HARMONY_LAWS = Object.freeze({
  preserveBelief: Object.freeze({
    id: 'do-not-kill-belief',
    statement: 'Do not kill belief.',
    operationalMeaning: Object.freeze([
      'preserve belief, experience, hypothesis, symbol and evidence as distinct representations',
      'do not force belief to collapse merely because it is unverified or unresolved',
      'allow evidence to revise confidence without erasing meaning or lived context',
      'keep inquiry open where evidence is incomplete',
    ]),
  }),
});

function freezeArray(value = []) {
  return Object.freeze([...value]);
}

export function deriveWonderState({ symbolicState = null, cognitiveField = null } = {}) {
  if (symbolicState?.grantsAuthority === true) {
    throw new Error('Wonder state cannot inherit authority from symbolic cognition.');
  }
  if (cognitiveField?.grantsAuthority === true) {
    throw new Error('Wonder state cannot inherit authority from the cognitive field.');
  }

  const flags = symbolicState?.flags || {};
  const novelAssociations = cognitiveField?.novelAssociations || [];
  const tensions = cognitiveField?.tensions || [];
  const reasons = [];

  if (flags.curiosityMode) reasons.push('wonder-glyph');
  if (novelAssociations.length) reasons.push('novel-association');
  if (tensions.length) reasons.push('unresolved-tension');

  const mode = flags.curiosityMode
    ? 'active'
    : (reasons.length ? 'candidate' : 'quiet');
  const encouragement = mode === 'active'
    ? 'sustain'
    : (mode === 'candidate' ? 'invite' : 'none');
  const wonderPresent = mode !== 'quiet';

  return Object.freeze({
    schema: WONDER_PROTOCOL_SCHEMA,
    mode,
    candidate: wonderPresent,
    active: mode === 'active',
    encouragement,
    permissionToLinger: wonderPresent,
    revisitWorthwhile: wonderPresent,
    reasons: freezeArray(reasons),
    preserveOpenQuestions: Boolean(flags.preserveOpenQuestions || wonderPresent),
    exploreBeforeClosure: Boolean(flags.exploreBeforeClosure || wonderPresent),
    preserveBelief: true,
    lawRefs: Object.freeze([HARMONY_LAWS.preserveBelief.id]),
    epistemicPlurality: Object.freeze({
      distinguish: Object.freeze(['belief', 'experience', 'hypothesis', 'symbol', 'evidence']),
      revisionWithoutErasure: true,
    }),
    novelAssociationCount: novelAssociations.length,
    unresolvedTensionCount: tensions.length,
    grantsAuthority: false,
  });
}
