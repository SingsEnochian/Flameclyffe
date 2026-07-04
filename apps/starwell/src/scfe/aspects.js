import { BARBAULT_BODIES, angularDistance, normalizeLongitude } from './barbault.js';

export const ASPECT_DEFINITIONS = [
  { type: 'conjunction', angle: 0, orb: 8, weight: 1 },
  { type: 'opposition', angle: 180, orb: 8, weight: 1 },
  { type: 'trine', angle: 120, orb: 6, weight: 0.85 },
  { type: 'square', angle: 90, orb: 6, weight: 0.8 },
  { type: 'sextile', angle: 60, orb: 5, weight: 0.65 },
  { type: 'quincunx', angle: 150, orb: 3, weight: 0.45 },
];

export const HARMONIOUS_ASPECTS = new Set(['trine', 'sextile']);
export const HARD_ASPECTS = new Set(['opposition', 'square', 'quincunx']);

function angleDelta(actual, target) {
  return Math.abs(actual - target);
}

export function detectAspects(longitudes, definitions = ASPECT_DEFINITIONS) {
  const aspects = [];

  for (let i = 0; i < BARBAULT_BODIES.length; i += 1) {
    for (let j = i + 1; j < BARBAULT_BODIES.length; j += 1) {
      const body_a = BARBAULT_BODIES[i];
      const body_b = BARBAULT_BODIES[j];
      const actual_angle = angularDistance(longitudes[body_a], longitudes[body_b]);
      const match = definitions
        .map((definition) => ({
          ...definition,
          actual_orb: Number(angleDelta(actual_angle, definition.angle).toFixed(3)),
        }))
        .filter((definition) => definition.actual_orb <= definition.orb)
        .sort((a, b) => a.actual_orb - b.actual_orb)[0];

      if (match) {
        aspects.push({
          body_a,
          body_b,
          aspect_type: match.type,
          exact_angle: match.angle,
          actual_angle: Number(actual_angle.toFixed(3)),
          orb: match.actual_orb,
          weight: Number((match.weight * Math.max(0.1, 1 - match.actual_orb / Math.max(match.orb, 1))).toFixed(3)),
        });
      }
    }
  }

  return aspects;
}

export function detectConfigurations(aspects, longitudes = {}) {
  const configurations = [];
  const byType = aspects.reduce((map, aspect) => {
    map[aspect.aspect_type] = map[aspect.aspect_type] || [];
    map[aspect.aspect_type].push(aspect);
    return map;
  }, {});

  if (byType.opposition?.length) {
    configurations.push({
      configuration_type: 'opposition_axis',
      involved_bodies: [...new Set(byType.opposition.flatMap((aspect) => [aspect.body_a, aspect.body_b]))],
      exactness_score: averageWeight(byType.opposition),
      geometry_shape: 'mirror_axis',
      symbolic_tags: ['polarity', 'bridge', 'choice'],
    });
  }

  const harmoniousCount = (byType.trine?.length || 0) + (byType.sextile?.length || 0);
  if (byType.opposition?.length && harmoniousCount >= 3) {
    configurations.push({
      configuration_type: 'basket_cradle_candidate',
      involved_bodies: BARBAULT_BODIES.filter((body) => body in longitudes).map((body) => body),
      exactness_score: averageWeight(aspects.filter((aspect) => ['opposition', 'trine', 'sextile'].includes(aspect.aspect_type))),
      geometry_shape: 'cradle_vessel',
      symbolic_tags: ['holding-field', 'threshold', 'reconstruction'],
      caution: 'Candidate only. Full basket geometry requires visual/aspect review before promotion.',
    });
  }

  if ((byType.trine?.length || 0) >= 3) {
    configurations.push({
      configuration_type: 'grand_trine_candidate',
      involved_bodies: [...new Set(byType.trine.flatMap((aspect) => [aspect.body_a, aspect.body_b]))],
      exactness_score: averageWeight(byType.trine),
      geometry_shape: 'harmonic_triangle',
      symbolic_tags: ['flow', 'coherence', 'ease'],
    });
  }

  return configurations;
}

export function averageWeight(items) {
  if (!items?.length) return 0;
  return Number((items.reduce((sum, item) => sum + (item.weight || 0), 0) / items.length).toFixed(3));
}

export function signDegreeFromLongitude(longitude) {
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const normalized = normalizeLongitude(longitude);
  const signIndex = Math.floor(normalized / 30);
  return {
    sign: signs[signIndex],
    degree: Number((normalized - signIndex * 30).toFixed(3)),
  };
}
