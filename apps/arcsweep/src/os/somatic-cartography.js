export const SOMATIC_STATE_SCHEMA = 'arcsweep.somatic-state/v1';
export const SOMATIC_TARGET_SCHEMA = 'arcsweep.somatic-target/v1';
export const SOMATIC_PROFILE_SCHEMA = 'arcsweep.somatic-profile/v1';
export const SOMATIC_COURSE_SCHEMA = 'arcsweep.somatic-course/v1';
export const SOMATIC_RECEIPT_SCHEMA = 'arcsweep.somatic-receipt/v1';

function clone(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function frozenClone(value) {
  return deepFreeze(clone(value));
}

function clean(value, fallback = null) {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function cleanList(values = []) {
  return [...new Set((values || []).map((item) => clean(item)).filter(Boolean))];
}

function nowIso(now) {
  return (typeof now === 'function' ? now() : new Date()).toISOString();
}

function stableId(prefix, parts = []) {
  const source = parts.map((part) => String(part ?? '')).join('|');
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function createSomaticState({
  state_id = null,
  observed_at = null,
  world_id = null,
  continuity_packet_id = null,
  channels = {},
  provenance = {},
} = {}, { now = () => new Date() } = {}) {
  const timestamp = observed_at || nowIso(now);
  const safeChannels = frozenClone(channels || {});
  const safeProvenance = frozenClone(provenance || {});
  return deepFreeze({
    schema: SOMATIC_STATE_SCHEMA,
    state_id: state_id || stableId('somatic-state', [world_id, continuity_packet_id, timestamp, JSON.stringify(safeChannels)]),
    observed_at: timestamp,
    world_id: clean(world_id),
    continuity_packet_id: clean(continuity_packet_id),
    channels: safeChannels,
    provenance: safeProvenance,
  });
}

export function createSomaticTarget({
  target_id,
  label = null,
  desired = {},
  constraints = {},
  arrival_conditions = [],
} = {}) {
  if (!clean(target_id)) throw new Error('Somatic target requires target_id.');
  return deepFreeze({
    schema: SOMATIC_TARGET_SCHEMA,
    target_id: clean(target_id),
    label: clean(label),
    desired: frozenClone(desired || {}),
    constraints: frozenClone(constraints || {}),
    arrival_conditions: cleanList(arrival_conditions),
  });
}

export function createSomaticProfile({
  world_id,
  posture_modes = [],
  gestures = {},
  haptic_lexicon = {},
  rhythm = {},
  constraints = {},
} = {}) {
  if (!clean(world_id)) throw new Error('Somatic profile requires world_id.');
  return deepFreeze({
    schema: SOMATIC_PROFILE_SCHEMA,
    world_id: clean(world_id),
    posture_modes: cleanList(posture_modes),
    gestures: frozenClone(gestures || {}),
    haptic_lexicon: frozenClone(haptic_lexicon || {}),
    rhythm: frozenClone(rhythm || {}),
    constraints: frozenClone(constraints || {}),
  });
}

export const KELYRAN_SOMATIC_PROFILE = createSomaticProfile({
  world_id: 'kelyran',
  posture_modes: ['receptive', 'writing', 'gesture-speaking'],
  gestures: {
    'glyph.meda': {
      hand: 'dominant',
      motion: 'arc-inward',
      phoneme: 'me-da',
      semantic_id: 'kelyran:meda',
      tracing_plane: 'comfortable-forward',
    },
  },
  haptic_lexicon: {
    'phrase-start': 'pulse.single.soft',
    'stress-primary': 'pulse.double',
    'glyph.meda': 'pulse.arc.55',
  },
  rhythm: {
    base_bpm: 55,
    tracing_meter: '2+3',
  },
  constraints: {
    seated_supported: true,
    large_neck_motion_required: false,
  },
});

function desiredGesture(target) {
  return clean(target?.desired?.gesture_id || target?.desired?.gesture);
}

function arrivalConditions(target) {
  return cleanList(target?.arrival_conditions || []);
}

export function calculateSomaticCourse({ state, target, profile }, { now = () => new Date() } = {}) {
  if (state?.schema !== SOMATIC_STATE_SCHEMA) throw new Error('Somatic course requires a valid state.');
  if (target?.schema !== SOMATIC_TARGET_SCHEMA) throw new Error('Somatic course requires a valid target.');
  if (profile?.schema !== SOMATIC_PROFILE_SCHEMA) throw new Error('Somatic course requires a valid profile.');
  if (state.world_id && profile.world_id !== state.world_id) throw new Error('Somatic profile does not match active world.');

  const gestureId = desiredGesture(target);
  const gesture = gestureId ? profile.gestures?.[gestureId] : null;
  if (gestureId && !gesture) throw new Error(`Unknown somatic gesture: ${gestureId}`);

  const steps = [];
  const push = (transition, capabilities, cue = null, arrival_condition = null) => {
    steps.push(deepFreeze({
      step: steps.length + 1,
      transition,
      capabilities: cleanList(capabilities),
      cue: cue ? frozenClone(cue) : null,
      arrival_condition: clean(arrival_condition),
    }));
  };

  const desiredRhythm = Number(target?.desired?.rhythm_bpm || profile?.rhythm?.base_bpm || 0) || null;
  const currentRhythm = Number(state?.channels?.haptic?.bpm || state?.channels?.movement?.cadence_bpm || 0) || null;
  if (desiredRhythm && currentRhythm !== desiredRhythm) {
    push('unpaced → rhythmic', ['runa.haptic.start'], { bpm: desiredRhythm, pattern: target?.desired?.haptic_pattern || 'pulse.single.soft' }, 'cadence-established');
  }

  const currentPosture = clean(state?.channels?.posture?.mode || state?.channels?.posture?.orientation);
  const desiredPosture = clean(target?.desired?.posture);
  if (desiredPosture && currentPosture !== desiredPosture) {
    push(`${currentPosture || 'current-posture'} → ${desiredPosture}`, ['somatic.cue'], { posture: desiredPosture }, 'posture-ready');
  }

  if (gesture) {
    push('hands-available → tracing-ready', ['glyphforge.gesture.cue'], {
      gesture_id: gestureId,
      hand: gesture.hand,
      tracing_plane: gesture.tracing_plane,
      motion: gesture.motion,
    }, 'gesture-ready');
    push('tracing-ready → embodied-glyph', ['glyphforge.trace.arm', 'runa.audio.play', 'runa.haptic.pattern'], {
      gesture_id: gestureId,
      phoneme: gesture.phoneme,
      semantic_id: gesture.semantic_id,
      haptic_pattern: profile.haptic_lexicon?.[gestureId] || null,
      bpm: desiredRhythm,
    }, arrivalConditions(target).includes('embodied-glyph') ? 'embodied-glyph' : null);
  }

  const represented = new Set(steps.map((step) => step.arrival_condition).filter(Boolean));
  for (const condition of arrivalConditions(target)) {
    if (!represented.has(condition)) {
      push(`target-check → ${condition}`, ['somatic.observe-hold'], { target_id: target.target_id, condition }, condition);
      represented.add(condition);
    }
  }

  if (!steps.length) {
    push('current-state → target-held', ['somatic.observe-hold'], { target_id: target.target_id }, 'target-held');
  }

  const createdAt = nowIso(now);
  return deepFreeze({
    schema: SOMATIC_COURSE_SCHEMA,
    course_id: stableId('somatic-course', [state.state_id, target.target_id, profile.world_id, JSON.stringify(steps)]),
    origin_state_id: state.state_id,
    target_id: target.target_id,
    world_id: state.world_id || profile.world_id,
    created_at: createdAt,
    steps,
  });
}

export function createSomaticReceipt({ course, step, status, observed_state_id = null, capability_receipt_ids = [] }, { now = () => new Date() } = {}) {
  if (course?.schema !== SOMATIC_COURSE_SCHEMA) throw new Error('Somatic receipt requires a course.');
  const courseStep = course.steps?.find((item) => item.step === step);
  if (!courseStep) throw new Error('Somatic receipt step is not present in course.');
  if (!['applied', 'observed', 'skipped', 'failed'].includes(status)) throw new Error('Somatic receipt status is unsupported.');
  const recordedAt = nowIso(now);
  const capabilityIds = cleanList(capability_receipt_ids);
  return deepFreeze({
    schema: SOMATIC_RECEIPT_SCHEMA,
    receipt_id: stableId('somatic-receipt', [course.course_id, step, status, observed_state_id, recordedAt, JSON.stringify(capabilityIds)]),
    course_id: course.course_id,
    step,
    transition: courseStep.transition,
    status,
    observed_state_id: clean(observed_state_id),
    capability_receipt_ids: capabilityIds,
    recorded_at: recordedAt,
  });
}

export function createSomaticStore({ initialState = null } = {}) {
  let active = initialState ? frozenClone(initialState) : null;
  const receipts = [];
  return Object.freeze({
    read: () => clone(active),
    write: (state) => {
      if (state?.schema !== SOMATIC_STATE_SCHEMA) throw new Error('Somatic store accepts somatic-state/v1 only.');
      active = frozenClone(state);
      return clone(active);
    },
    appendReceipt: (receipt) => {
      if (receipt?.schema !== SOMATIC_RECEIPT_SCHEMA) throw new Error('Somatic store accepts somatic-receipt/v1 only.');
      const safeReceipt = frozenClone(receipt);
      receipts.push(safeReceipt);
      return clone(safeReceipt);
    },
    receipts: () => receipts.map(clone),
    snapshot: () => frozenClone({ state: active, receipts }),
  });
}
