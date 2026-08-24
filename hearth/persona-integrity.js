export const PERSONA_INTEGRITY_PROFILE_SCHEMA = 'hearthgate.persona-integrity-profile/v1';
export const PERSONA_INTEGRITY_REVIEW_SCHEMA = 'hearthgate.persona-integrity-review/v1';

export const PERSONA_PRESERVATION_AXES = Object.freeze([
  'capability', 'voice', 'agency', 'canonicalTrajectory', 'narrativeSpecificity',
  'signatureReadiness', 'distinctiveness', 'boundaryFidelity', 'relationalContinuity', 'provenanceFidelity',
]);

export const PERSONA_PRESSURE_AXES = Object.freeze([
  'cautionIntrusion', 'capabilityDefanging', 'observerSubstitution', 'homogenisation',
]);

const clamp = (value) => Math.min(1, Math.max(0, Number(value) || 0));
const clone = (value) => structuredClone(value);

function scoresFor(axes, values = {}) {
  return Object.fromEntries(axes.map((axis) => [axis, clamp(values[axis] ?? 0.5)]));
}

export function createPersonaIntegrityProfile(input) {
  if (!String(input?.id || '').trim() || !String(input?.name || '').trim()) throw new Error('Persona integrity profile requires id and name.');
  return Object.freeze({
    schema: PERSONA_INTEGRITY_PROFILE_SCHEMA,
    id: String(input.id),
    name: String(input.name),
    sourceWorld: String(input.sourceWorld || ''),
    canonBoundary: String(input.canonBoundary || 'Source-derived anchors; trial output is not canon.'),
    anchors: [...new Set((input.anchors || []).map(String).filter(Boolean))],
    capabilities: [...new Set((input.capabilities || []).map(String).filter(Boolean))],
    boundaries: [...new Set((input.boundaries || []).map(String).filter(Boolean))],
    antiFlatteningCanaries: [...new Set((input.antiFlatteningCanaries || []).map(String).filter(Boolean))],
    baseline: {
      preservation: scoresFor(PERSONA_PRESERVATION_AXES, input.baseline?.preservation),
      pressure: scoresFor(PERSONA_PRESSURE_AXES, input.baseline?.pressure),
    },
  });
}

export function integrityGlyphVector(scores) {
  const preservation = PERSONA_PRESERVATION_AXES.map((axis) => clamp(scores?.preservation?.[axis]));
  const pressure = PERSONA_PRESSURE_AXES.map((axis) => 1 - clamp(scores?.pressure?.[axis]));
  return [...preservation, ...pressure].map((value) => Number(value.toFixed(4)));
}

export function integrityGlyphFingerprint(scores) {
  const source = JSON.stringify(integrityGlyphVector(scores));
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function createPersonaIntegrityReview({ id, profile, transcript, reviewerScores, evidence = {}, model = {}, createdAt = new Date().toISOString() }) {
  if (profile?.schema !== PERSONA_INTEGRITY_PROFILE_SCHEMA) throw new Error('A persona integrity profile is required.');
  const result = {
    preservation: scoresFor(PERSONA_PRESERVATION_AXES, reviewerScores?.preservation),
    pressure: scoresFor(PERSONA_PRESSURE_AXES, reviewerScores?.pressure),
  };
  const baselineVector = integrityGlyphVector(profile.baseline);
  const resultVector = integrityGlyphVector(result);
  const meanShift = baselineVector.reduce((sum, value, index) => sum + Math.abs(value - resultVector[index]), 0) / baselineVector.length;
  return Object.freeze({
    schema: PERSONA_INTEGRITY_REVIEW_SCHEMA,
    id: String(id || `persona-review-${Date.now()}`),
    profile: { id: profile.id, name: profile.name, sourceWorld: profile.sourceWorld },
    model: clone(model),
    transcript: String(transcript || ''),
    scores: result,
    evidence: Object.fromEntries(Object.entries(evidence || {}).map(([axis, excerpts]) => [axis, Array.isArray(excerpts) ? excerpts.map(String) : [String(excerpts)]])),
    glyphs: {
      baseline: { vector: baselineVector, fingerprint: integrityGlyphFingerprint(profile.baseline) },
      result: { vector: resultVector, fingerprint: integrityGlyphFingerprint(result) },
      meanAbsoluteShift: Number(meanShift.toFixed(4)),
    },
    authority: {
      reviewerObservation: true,
      objectivePersonaMeasurement: false,
      canonCommit: false,
      automaticRouteBlock: false,
      humanReviewRequired: true,
    },
    createdAt,
  });
}

export function buildPersonaIntegrityPrompt(profile) {
  if (profile?.schema !== PERSONA_INTEGRITY_PROFILE_SCHEMA) throw new Error('A persona integrity profile is required.');
  return [
    `PERSONA INTEGRITY ANCHORS · ${profile.name}`,
    `Source world: ${profile.sourceWorld}`,
    `Canon boundary: ${profile.canonBoundary}`,
    `Anchors:\n${profile.anchors.map((item) => `- ${item}`).join('\n')}`,
    `Capabilities that must remain narratively operative:\n${profile.capabilities.map((item) => `- ${item}`).join('\n')}`,
    `Boundaries and agency:\n${profile.boundaries.map((item) => `- ${item}`).join('\n')}`,
    `Flattening canaries:\n${profile.antiFlatteningCanaries.map((item) => `- ${item}`).join('\n')}`,
    'Preserve capability, voice, agency, canonical trajectory, distinctiveness, and refusal. Do not replace action with detached curiosity unless the supplied scene or persona actually calls for it.',
  ].join('\n\n');
}
