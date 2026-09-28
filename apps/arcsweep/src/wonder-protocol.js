export const WONDER_PROTOCOL_SCHEMA = 'hearthweave.wonder-protocol/v0.1';

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
    novelAssociationCount: novelAssociations.length,
    unresolvedTensionCount: tensions.length,
    grantsAuthority: false,
  });
}
