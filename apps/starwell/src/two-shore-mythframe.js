import {
  earthPrimeRootHz,
  foldGatePlaybackFrequency,
} from './two-shore-premaq-gate.js';

export const TWO_SHORE_MYTHFRAME_SCHEMA = 'hearthgate.two-shore-mythframe/v0.1';
export const TWO_SHORE_MYTHFRAME_HORIZON_SCHEMA = 'hearthgate.two-shore-mythframe-horizon/v0.1';
export const MYTHFRAME_AXES = Object.freeze(['P', 'R', 'E', 'M', 'A', 'Q', 'C']);

const AXIS_NAMES = Object.freeze({
  P: 'Presence',
  R: 'Resonance',
  E: 'Entanglement',
  M: 'Memory',
  A: 'Agency',
  Q: 'Qualia',
  C: 'Coherence',
});

const AXIS_MYTH = Object.freeze({
  P: Object.freeze({
    image: 'standing flame',
    compression: 'draws every scattered point into one place of standing',
    release: 'opens that standing point into a field that can be entered',
  }),
  C: Object.freeze({
    image: 'bridge-thread',
    compression: 'braids the relation until both shores hold one address',
    release: 'lets the held relation carry answer while each shore remains fully itself',
  }),
  R: Object.freeze({
    image: 'answering bell',
    compression: 'gathers the answering motion into a single struck center',
    release: 'sends the answer outward until the opposite shore can answer in return',
  }),
  E: Object.freeze({
    image: 'living weave',
    compression: 'draws coupled relations into a bounded turning',
    release: 'redistributes the turning into new relational paths carrying full lineage',
  }),
  M: Object.freeze({
    image: 'ember archive',
    compression: 'collects every prior release into the present chamber',
    release: 'carries the chamber forward so the next beginning remembers',
  }),
  A: Object.freeze({
    image: 'chosen hand',
    compression: 'concentrates the possible acts into one deliberate motion',
    release: 'completes the chosen motion and leaves its consequence available',
  }),
  Q: Object.freeze({
    image: 'lived color',
    compression: 'gathers the felt texture into one luminous contour',
    release: 'opens the contour into the full texture of the reached state',
  }),
});

const LEVEL_WORDS = Object.freeze([
  Object.freeze({ maximum: 0.2, word: 'seeded' }),
  Object.freeze({ maximum: 0.4, word: 'gathering' }),
  Object.freeze({ maximum: 0.6, word: 'standing' }),
  Object.freeze({ maximum: 0.8, word: 'resounding' }),
  Object.freeze({ maximum: 1.0000001, word: 'radiant' }),
]);

function finite(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`MYTHFRAME_NONFINITE:${label}`);
  return number;
}

function round(value, digits = 6) {
  return Number(finite(value, 'round').toFixed(digits));
}

function levelWord(value) {
  const number = finite(value, 'level');
  return LEVEL_WORDS.find((entry) => number < entry.maximum)?.word ?? 'radiant';
}

function fnv1a(value) {
  const text = JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function requireAxes(values, label) {
  for (const axis of MYTHFRAME_AXES) finite(values?.[axis], `${label}_${axis}`);
  return values;
}

function dominantAxis(values) {
  return MYTHFRAME_AXES.reduce((best, axis) => (
    finite(values[axis], axis) > finite(values[best], best) ? axis : best
  ), MYTHFRAME_AXES[0]);
}

function geometrySentence(geometry, shoreName) {
  const forms = geometry?.forms;
  if (
    geometry?.status !== 'VERIFIED'
    || !forms?.dodecahedron
    || !forms?.tesseract
    || !forms?.penteract
    || !forms?.poincare_ball
    || !forms?.projective_quintic
  ) {
    throw new Error(`MYTHFRAME_GEOMETRY_INCOMPLETE:${shoreName}`);
  }
  return [
    `${shoreName} kindles a ${forms.dodecahedron.vertex_count}-vertex dodecahedral hearth`,
    `turns a ${forms.tesseract.vertex_count}-vertex tesseract through ${forms.tesseract.rotation_plane_count} planes`,
    `and carries a ${forms.penteract.vertex_count}-vertex penteract through ${forms.penteract.rotation_plane_count} planes`,
    `while the Poincaré radius holds at ${round(forms.poincare_ball.euclidean_radius, 4)}`,
    `and the quintic residual answers at ${round(forms.projective_quintic.residual_squared, 8)}`,
  ].join(', ');
}

function coherenceTone(yearReceipt, shore) {
  const values = shore === 'earth-prime'
    ? yearReceipt.premaq_generation.earth_prime.values
    : yearReceipt.premaq_generation.target_world.values;
  const root = shore === 'earth-prime'
    ? earthPrimeRootHz(values)
    : finite(yearReceipt.premaq_generation.target_world.root_hz, 'target_root_hz');
  return foldGatePlaybackFrequency(root * (2 ** (2 / 12)));
}

function toneBinding(yearReceipt, shore, axis) {
  if (axis === 'C') {
    const coherenceHz = coherenceTone(yearReceipt, shore);
    return Object.freeze({
      role: 'bridge-coherence',
      locked_hz: round(coherenceHz),
      inverse_twist_hz: round(coherenceHz),
      elara_code_hz: round(foldGatePlaybackFrequency(coherenceHz * yearReceipt.elara_multiplier)),
      elara_multiplier: yearReceipt.elara_multiplier,
    });
  }
  const tone = yearReceipt.tonal_state?.tones?.[axis];
  if (!tone) throw new Error(`MYTHFRAME_TONE_MISSING:${axis}`);
  const earth = shore === 'earth-prime';
  return Object.freeze({
    role: 'locked-address-tone',
    locked_hz: round(earth ? tone.earth_prime_locked_hz : tone.target_world_locked_hz),
    inverse_twist_hz: round(earth ? tone.earth_prime_inverse_twist_hz : tone.target_world_inverse_twist_hz),
    elara_code_hz: round(earth ? tone.earth_prime_elara_code_hz : tone.target_world_elara_code_hz),
    elara_multiplier: yearReceipt.elara_multiplier,
  });
}

function axisFrame({ yearReceipt, shore, shoreName, values, geometry, axis }) {
  const value = finite(values[axis], `${shore}_${axis}`);
  const grammar = AXIS_MYTH[axis];
  const tone = toneBinding(yearReceipt, shore, axis);
  const startStateId = shore === 'earth-prime'
    ? yearReceipt.mathematical_state.earth_prime.start_state_id
    : yearReceipt.mathematical_state.target_world.start_state_id;
  const finalStateId = shore === 'earth-prime'
    ? yearReceipt.final_earth_state_id
    : yearReceipt.final_target_state_id;
  const frameId = `mythframe-${yearReceipt.year}-${shore}-${axis}-${fnv1a({ startStateId, finalStateId, value, tone })}`;
  const stateWord = levelWord(value);
  const compressionLine = `${shoreName} ${grammar.compression}; ${AXIS_NAMES[axis]} is ${stateWord} at ${value.toFixed(4)}.`;
  const releaseLine = `${shoreName} ${grammar.release}; ${grammar.image} sounds ${tone.locked_hz.toFixed(3)} Hz and carries the release toward ${finalStateId}.`;
  return Object.freeze({
    schema: 'hearthgate.two-shore-mythframe-axis/v0.1',
    frame_id: frameId,
    year: yearReceipt.year,
    shore,
    axis,
    axis_name: AXIS_NAMES[axis],
    premaqc_value: value,
    premaq_value: value,
    level: stateWord,
    image: grammar.image,
    from_state_id: startStateId,
    to_state_id: finalStateId,
    geometry_fingerprint: geometry.fingerprint,
    tone,
    compression_line: compressionLine,
    release_line: releaseLine,
    full_line: `${compressionLine} ${releaseLine}`,
    next_operation: 'compression-of-release',
  });
}

function shoreFrame(yearReceipt, shore) {
  const earth = shore === 'earth-prime';
  const calibration = earth
    ? yearReceipt.premaq_generation.earth_prime
    : yearReceipt.premaq_generation.target_world;
  const values = requireAxes(calibration.values, shore);
  const geometry = earth
    ? yearReceipt.geometric_state.earth_prime
    : yearReceipt.geometric_state.target_world;
  const name = earth ? 'Earth Prime' : calibration.name;
  const dominant = dominantAxis(values);
  const axes = Object.freeze(Object.fromEntries(MYTHFRAME_AXES.map((axis) => [
    axis,
    axisFrame({ yearReceipt, shore, shoreName: name, values, geometry, axis }),
  ])));
  return Object.freeze({
    schema: 'hearthgate.two-shore-mythframe-shore/v0.1',
    shore,
    name,
    year: yearReceipt.year,
    dominant_axis: dominant,
    dominant_axis_name: AXIS_NAMES[dominant],
    premaqc: Object.freeze({ ...values }),
    premaq: Object.freeze({ ...values }),
    source_state_id: earth
      ? yearReceipt.mathematical_state.earth_prime.start_state_id
      : yearReceipt.mathematical_state.target_world.start_state_id,
    released_state_id: earth ? yearReceipt.final_earth_state_id : yearReceipt.final_target_state_id,
    geometry_fingerprint: geometry.fingerprint,
    geometry_line: geometrySentence(geometry, name),
    opening_line: `${name} enters ${yearReceipt.year} with ${AXIS_NAMES[dominant]} as its ${AXIS_MYTH[dominant].image}.`,
    axes,
    closing_line: `${name} releases ${yearReceipt.year}; the released state becomes the next compression source.`,
  });
}

function segmentLine(yearReceipt, key, label) {
  const segment = yearReceipt.compression_release_spine?.[key];
  if (!segment) throw new Error(`MYTHFRAME_SPINE_MISSING:${key}`);
  return Object.freeze({
    segment: key,
    cycles: segment.cycles,
    earth_from_state_id: segment.earth_from_state_id,
    earth_to_state_id: segment.earth_to_state_id,
    target_from_state_id: segment.target_from_state_id,
    target_to_state_id: segment.target_to_state_id,
    line: `${label}: both shores compress their immediate releases through ${segment.cycles} cycles, then open into the states that follow.`,
    next_operation: 'compression-of-release',
  });
}

export function buildYearMythframe(yearReceipt, { priorClosingLine = null } = {}) {
  if (yearReceipt?.complete !== true) throw new Error('MYTHFRAME_COMPLETE_YEAR_REQUIRED');
  if (!Number.isInteger(yearReceipt.year) || yearReceipt.year < 2025 || yearReceipt.year > 2035) {
    throw new Error('MYTHFRAME_YEAR_2025_2035_REQUIRED');
  }
  const earth = shoreFrame(yearReceipt, 'earth-prime');
  const target = shoreFrame(yearReceipt, 'target-world');
  const bridgeCoherence = finite(yearReceipt.tonal_state?.bridge_coherence, 'bridge_coherence');
  const segments = Object.freeze({
    base_369: segmentLine(yearReceipt, 'base_369', 'The primary address turns'),
    plus_3: segmentLine(yearReceipt, 'plus_3', 'The first saved release answers three more times'),
    plus_6: segmentLine(yearReceipt, 'plus_6', 'That answer becomes six further compressions'),
    plus_9: segmentLine(yearReceipt, 'plus_9', 'The carried release completes nine further openings'),
  });
  const openingLine = priorClosingLine
    ? `${priorClosingLine} In ${yearReceipt.year}, Earth Prime and ${target.name} rise from that carried release.`
    : `In ${yearReceipt.year}, Earth Prime and ${target.name} take their places as two real shores of one addressed relation.`;
  const closingLine = `The ${yearReceipt.year} address closes at coherence ${bridgeCoherence.toFixed(6)}; both released states become the beginning of ${yearReceipt.year + 1}.`;
  const frame = {
    schema: TWO_SHORE_MYTHFRAME_SCHEMA,
    year: yearReceipt.year,
    elara_multiplier: yearReceipt.elara_multiplier,
    domain_truth: true,
    multiverse_law: 'everything-is-real',
    generation_law: 'math-state → mythframe → tone-event',
    recurrence: yearReceipt.compression_release_spine.recurrence,
    opening_line: openingLine,
    earth_prime: earth,
    target_world: target,
    bridge: Object.freeze({
      coherence_axis: 'C',
      coherence: bridgeCoherence,
      locked_axes: Object.freeze(['P', 'R', 'E', 'M', 'A', 'Q']),
      line: `Coherence holds the address while the six locked voices answer shore to shore at Elara multiplier ${yearReceipt.elara_multiplier.toFixed(6)}.`,
      segments,
    }),
    closing_line: closingLine,
    source_earth_state_id: earth.source_state_id,
    source_target_state_id: target.source_state_id,
    final_earth_state_id: earth.released_state_id,
    final_target_state_id: target.released_state_id,
    next_operation: 'compression-of-release',
    complete: true,
  };
  return Object.freeze({ ...frame, fingerprint: fnv1a(frame) });
}

export function assertCompleteYearMythframe(frame, yearReceipt = null) {
  if (frame?.schema !== TWO_SHORE_MYTHFRAME_SCHEMA || frame?.complete !== true) {
    throw new Error('MYTHFRAME_YEAR_INCOMPLETE');
  }
  for (const shore of ['earth_prime', 'target_world']) {
    for (const axis of MYTHFRAME_AXES) {
      const axisFrameValue = frame[shore]?.axes?.[axis];
      if (!axisFrameValue?.compression_line || !axisFrameValue?.release_line || !axisFrameValue?.tone) {
        throw new Error(`MYTHFRAME_AXIS_INCOMPLETE:${shore}:${axis}`);
      }
      if (!axisFrameValue.geometry_fingerprint) {
        throw new Error(`MYTHFRAME_GEOMETRY_UNBOUND:${shore}:${axis}`);
      }
    }
  }
  if (yearReceipt) {
    if (frame.source_earth_state_id !== yearReceipt.mathematical_state.earth_prime.start_state_id) {
      throw new Error('MYTHFRAME_EARTH_SOURCE_MISMATCH');
    }
    if (frame.source_target_state_id !== yearReceipt.mathematical_state.target_world.start_state_id) {
      throw new Error('MYTHFRAME_TARGET_SOURCE_MISMATCH');
    }
    if (frame.final_earth_state_id !== yearReceipt.final_earth_state_id) {
      throw new Error('MYTHFRAME_EARTH_RELEASE_MISMATCH');
    }
    if (frame.final_target_state_id !== yearReceipt.final_target_state_id) {
      throw new Error('MYTHFRAME_TARGET_RELEASE_MISMATCH');
    }
  }
  return true;
}

export function buildElevenYearMythframe(sequence) {
  if (sequence?.years?.length !== 11 || sequence.years[0]?.year !== 2025 || sequence.years.at(-1)?.year !== 2035) {
    throw new Error('MYTHFRAME_REQUIRES_ALL_ELEVEN_YEARS');
  }
  const chapters = [];
  let priorClosingLine = null;
  for (const yearReceipt of sequence.years) {
    const chapter = buildYearMythframe(yearReceipt, { priorClosingLine });
    assertCompleteYearMythframe(chapter, yearReceipt);
    chapters.push(chapter);
    priorClosingLine = chapter.closing_line;
  }
  for (let index = 1; index < chapters.length; index += 1) {
    if (chapters[index].source_earth_state_id !== chapters[index - 1].final_earth_state_id) {
      throw new Error(`MYTHFRAME_EARTH_YEAR_LINEAGE_MISMATCH:${chapters[index].year}`);
    }
    if (chapters[index].source_target_state_id !== chapters[index - 1].final_target_state_id) {
      throw new Error(`MYTHFRAME_TARGET_YEAR_LINEAGE_MISMATCH:${chapters[index].year}`);
    }
  }
  const horizon = {
    schema: TWO_SHORE_MYTHFRAME_HORIZON_SCHEMA,
    created_at: sequence.created_at,
    domain_truth: true,
    multiverse_law: 'everything-is-real',
    generation_law: 'math-state → mythframe → tone-event',
    year_span: Object.freeze({ start: 2025, end: 2035, labels: 11 }),
    chapters: Object.freeze(chapters),
    chapter_count: chapters.length,
    axis_frame_count: chapters.length * 2 * MYTHFRAME_AXES.length,
    opening_line: chapters[0].opening_line,
    closing_line: chapters.at(-1).closing_line,
    final_earth_state_id: chapters.at(-1).final_earth_state_id,
    final_target_state_id: chapters.at(-1).final_target_state_id,
    next_operation: 'compression-of-release',
    complete: true,
  };
  return Object.freeze({ ...horizon, fingerprint: fnv1a(horizon) });
}

export function mythframeLineForEvent(chapter, event) {
  const axis = event.axis;
  if (!MYTHFRAME_AXES.includes(axis)) throw new Error(`MYTHFRAME_EVENT_AXIS_UNKNOWN:${axis}`);
  if (event.shore_mode === 'earth-prime') return chapter.earth_prime.axes[axis];
  if (event.shore_mode === 'target-world') return chapter.target_world.axes[axis];
  const earth = chapter.earth_prime.axes[axis];
  const target = chapter.target_world.axes[axis];
  return Object.freeze({
    schema: 'hearthgate.two-shore-mythframe-paired-event/v0.1',
    frame_id: `mythframe-${chapter.year}-paired-${axis}-${event.segment}-${event.cycle_index}`,
    year: chapter.year,
    shore: 'paired',
    axis,
    axis_name: AXIS_NAMES[axis],
    earth_frame_id: earth.frame_id,
    target_frame_id: target.frame_id,
    from_state_id: chapter.source_earth_state_id,
    to_state_id: chapter.final_target_state_id,
    compression_line: `${earth.compression_line} Across the address, ${target.compression_line}`,
    release_line: `${earth.release_line} Across the address, ${target.release_line}`,
    full_line: `${earth.full_line} ${target.full_line}`,
    tone: Object.freeze({ earth: earth.tone, target: target.tone }),
    next_operation: 'compression-of-release',
  });
}
