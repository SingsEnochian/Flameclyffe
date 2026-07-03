import { detectAspects, detectConfigurations } from './aspects.js';
import { calculateBarbaultIndex } from './barbault.js';
import { reviewConfigurations } from './configuration-review.js';
import { createDefaultFieldSnapshot, validateFieldSnapshot } from './contracts/field-snapshot.js';
import { deriveDeepSeed, normalizeSomatic } from './deep-somatic.js';
import { createManualEphemerisState, getLongitudesFromEphemeris } from './ephemeris.js';
import { createAgencyOutput, mapTerraAeterna, selectFrequencyProtocol } from './frequency-terra.js';
import { mapSacredGeometry } from './geometry.js';

export const JULY_2026_TEST_LONGITUDES = {
  jupiter: 126,
  saturn: 14,
  uranus: 62,
  neptune: 4,
  pluto: 307,
};

export const DEFAULT_SCFE_INPUT = {
  target_timestamp: '2026-07-20T12:00:00-04:00',
  timezone: 'America/New_York',
  mode: 'hearthfire',
  context: {
    project: 'Flameclyffe',
    world: 'Terra Aeterna',
    surface: 'Hearthfire',
    question: 'What does this threshold ask us to build?',
  },
  longitudes: JULY_2026_TEST_LONGITUDES,
  somatic: {
    activation: 'moderate',
    fatigue: 'high',
    pain: 'low',
    migraine: false,
    tinnitus: 'stable',
    body_yes: 'gentle work',
    body_no: null,
  },
};

export function createFieldSnapshot(input = DEFAULT_SCFE_INPUT) {
  const base = createDefaultFieldSnapshot(input);
  const ephemeris = createManualEphemerisState({
    longitudes: input.longitudes || JULY_2026_TEST_LONGITUDES,
    target_timestamp: input.target_timestamp,
    timezone: input.timezone,
    source_note: input.source_note,
  });
  const barbault = calculateBarbaultIndex(getLongitudesFromEphemeris(ephemeris));
  const aspects = detectAspects(barbault.longitudes);
  const configurations = detectConfigurations(aspects, barbault.longitudes);
  const configuration_review = reviewConfigurations({ aspects, configurations, barbault });
  const sacred_geometry = mapSacredGeometry({ aspects, configurations, barbault });
  const somatic = normalizeSomatic(input.somatic || {});
  const deep = deriveDeepSeed({ barbault, aspects, sacred_geometry, somatic });
  const frequency_protocol = selectFrequencyProtocol({ deep, somatic });
  const terra_aeterna = mapTerraAeterna({
    deep,
    sacred_geometry,
    barbault,
    somatic,
    context: input.context || {},
  });
  const agency = createAgencyOutput({ deep, somatic, terra_aeterna });

  return validateFieldSnapshot({
    ...base,
    ephemeris,
    barbault: {
      ...base.barbault,
      ...barbault,
      aspects,
      configurations,
      configuration_review,
      sign_degrees: Object.fromEntries(
        Object.entries(ephemeris.positions).map(([body, position]) => [body, { sign: position.sign, degree: position.degree }])
      ),
    },
    sacred_geometry,
    somatic,
    deep,
    frequency_protocol,
    terra_aeterna,
    agency,
  });
}

export function exportSnapshot(snapshot) {
  return JSON.stringify(snapshot, null, 2);
}
