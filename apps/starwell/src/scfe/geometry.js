export const ASPECT_GEOMETRY_MAP = {
  conjunction: {
    primary_form: 'seed_point',
    symbolic_function: 'beginning / compression / ignition',
  },
  opposition: {
    primary_form: 'mirror_axis',
    symbolic_function: 'polarity / bridge / confrontation',
  },
  trine: {
    primary_form: 'flow_triangle',
    symbolic_function: 'harmony / ease / current',
  },
  square: {
    primary_form: 'pressure_cross',
    symbolic_function: 'friction / structure / demand',
  },
  sextile: {
    primary_form: 'hexagonal_gate',
    symbolic_function: 'invitation / cooperation / opening',
  },
  quincunx: {
    primary_form: 'adjustment_hinge',
    symbolic_function: 'recalibration / awkward adaptation',
  },
  basket_cradle_candidate: {
    primary_form: 'cradle_vessel',
    symbolic_function: 'holding field / threshold container',
  },
};

export function mapSacredGeometry({ aspects = [], configurations = [], barbault = {} }) {
  const primaryConfiguration = configurations.find((configuration) => configuration.configuration_type === 'basket_cradle_candidate') || configurations[0];
  const primaryAspect = aspects[0];
  const primaryKey = primaryConfiguration?.configuration_type || primaryAspect?.aspect_type || barbault.compression_level || 'field_seed';
  const primary = ASPECT_GEOMETRY_MAP[primaryKey] || {
    primary_form: barbault.compression_level === 'wide_distribution' ? 'open_orrery' : 'field_seed',
    symbolic_function: 'field observation / unclassified pattern',
  };

  const secondaryForms = [
    ...configurations.map((configuration) => configuration.geometry_shape),
    ...aspects.map((aspect) => ASPECT_GEOMETRY_MAP[aspect.aspect_type]?.primary_form).filter(Boolean),
  ];

  return {
    primary_form: primary.primary_form,
    symbolic_function: primary.symbolic_function,
    secondary_forms: [...new Set(secondaryForms)].filter((form) => form !== primary.primary_form),
    interaction_points: createInteractionPoints(aspects, configurations),
    render_payload: {
      density: getDensity(barbault),
      motion: 'slow_breathing',
      palette: 'dark_sky_gold_copper_green',
      reduced_motion_safe: true,
    },
  };
}

function createInteractionPoints(aspects, configurations) {
  const points = [];

  if (configurations.some((configuration) => configuration.configuration_type === 'basket_cradle_candidate')) {
    points.push({
      target: 'vessel',
      prompt: 'What is being held, and what does not need to be carried forward?',
    });
  }

  if (aspects.some((aspect) => aspect.aspect_type === 'opposition')) {
    points.push({
      target: 'opposition_axis',
      prompt: 'What tension is asking to become a bridge?',
    });
  }

  if (aspects.some((aspect) => aspect.aspect_type === 'trine' || aspect.aspect_type === 'sextile')) {
    points.push({
      target: 'flow_channel',
      prompt: 'Where is ease available without surrendering discernment?',
    });
  }

  if (aspects.some((aspect) => aspect.aspect_type === 'square' || aspect.aspect_type === 'quincunx')) {
    points.push({
      target: 'pressure_gate',
      prompt: 'What needs structure, pacing, or adjustment?',
    });
  }

  return points;
}

function getDensity(barbault) {
  if (['extreme_compression', 'high_compression'].includes(barbault.compression_level)) return 'high';
  if (barbault.compression_level === 'moderate_compression') return 'moderate';
  return 'open';
}
