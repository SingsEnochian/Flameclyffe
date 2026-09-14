import {
  KELYRAN_SOMATIC_PROFILE,
  SOMATIC_COURSE_SCHEMA,
  SOMATIC_PROFILE_SCHEMA,
  SOMATIC_STATE_SCHEMA,
  SOMATIC_TARGET_SCHEMA,
  calculateSomaticCourse,
  createSomaticReceipt,
  createSomaticStore,
} from './somatic-cartography.js';

function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function receiptId(receipt) {
  return receipt?.call_id || receipt?.event_id || receipt?.receipt_id || null;
}

function outputApplied(receipt) {
  return receipt?.status === 'applied' && receipt?.output?.applied !== false && receipt?.output?.supported !== false;
}

function profileForWorld(worldId, profiles) {
  return profiles.get(worldId) || null;
}

function defaultCue(detail) {
  if (typeof globalThis.dispatchEvent !== 'function' || typeof globalThis.CustomEvent !== 'function') return false;
  return globalThis.dispatchEvent(new globalThis.CustomEvent('arcsweep:somatic-cue', { detail }));
}

function defineCartographyEvents(bus) {
  if (!bus?.define || !bus?.eventNames) return;
  const known = new Set(bus.eventNames());
  if (!known.has('arcsweep:somatic-course-planned')) {
    bus.define('arcsweep:somatic-course-planned', (payload) => payload?.schema === SOMATIC_COURSE_SCHEMA);
  }
  if (!known.has('arcsweep:somatic-step-receipted')) {
    bus.define('arcsweep:somatic-step-receipted', (payload) => payload?.schema === 'arcsweep.somatic-receipt/v1');
  }
  if (!known.has('arcsweep:glyph-stroke-observed')) {
    bus.define('arcsweep:glyph-stroke-observed', (payload) => Boolean(payload?.trace_id && payload?.stroke));
  }
}

export function registerSomaticCartographyService(registry, {
  bus = null,
  store = createSomaticStore(),
  profiles = [KELYRAN_SOMATIC_PROFILE],
  eventTarget = globalThis,
  dispatchCue = defaultCue,
  now = () => new Date(),
} = {}) {
  if (!registry?.registerService || !registry?.registerCapability || !registry?.invoke) {
    throw new Error('Somatic cartography requires the ArcSweep capability registry.');
  }

  const profileMap = new Map(
    (profiles || [])
      .filter((profile) => profile?.schema === SOMATIC_PROFILE_SCHEMA && profile.world_id)
      .map((profile) => [profile.world_id, profile]),
  );
  const pending = new Map();
  defineCartographyEvents(bus);

  registry.registerService({
    service_id: 'somatic-cartography',
    label: 'Somatic Cartography Helm',
    authority_boundary: {
      deterministic_planning: true,
      capability_bus_only: true,
      synthetic_body_evidence: false,
      synthetic_glyph_strokes: false,
      body_observation_required_for_embodied_arrival: true,
    },
    consumes: ['arcsweep:glyph-stroke-observed'],
    emits: ['arcsweep:somatic-course-planned', 'arcsweep:somatic-step-receipted'],
  });

  registry.registerCapability({
    capability_id: 'somatic.cartography.status',
    service_id: 'somatic-cartography',
    description: 'Read the active somatic cartography state, receipts, supported world profiles, and pending embodied transitions.',
    authority: 'read',
    execute: () => ({
      schema: 'arcsweep.somatic-cartography-status/v1',
      store: store.snapshot(),
      profile_worlds: [...profileMap.keys()],
      pending: [...pending.values()].map(clone),
    }),
  });

  registry.registerCapability({
    capability_id: 'somatic.observe',
    service_id: 'somatic-cartography',
    description: 'Store one already-observed somatic state. This records evidence; it does not infer body state.',
    authority: 'operate',
    input_schema: { required: ['state'] },
    validate: (input) => input?.state?.schema === SOMATIC_STATE_SCHEMA,
    execute: (input) => ({ applied: true, state: store.write(input.state) }),
  });

  registry.registerCapability({
    capability_id: 'somatic.cue',
    service_id: 'somatic-cartography',
    description: 'Present a posture or movement cue without claiming that the body completed it.',
    authority: 'operate',
    execute: (input) => {
      const cue = clone({ posture: input?.posture || null, transition: input?.transition || null, course_id: input?.course_id || null, step: input?.step || null });
      const applied = dispatchCue(cue) !== false;
      return { applied, supported: applied, cue, body_state_claimed: false };
    },
  });

  registry.registerCapability({
    capability_id: 'somatic.observe-hold',
    service_id: 'somatic-cartography',
    description: 'Mark a target as held for observation without synthesizing a new body state.',
    authority: 'operate',
    execute: (input) => ({
      applied: true,
      target_id: input?.target_id || null,
      condition: input?.condition || null,
      body_state_claimed: false,
      awaiting_observation: true,
    }),
  });

  registry.registerCapability({
    capability_id: 'somatic.plan',
    service_id: 'somatic-cartography',
    description: 'Calculate a deterministic somatic course from an observed body state to a declared target.',
    authority: 'read',
    input_schema: { required: ['state', 'target'] },
    validate: (input) => input?.state?.schema === SOMATIC_STATE_SCHEMA && input?.target?.schema === SOMATIC_TARGET_SCHEMA,
    execute: (input) => {
      const profile = input.profile?.schema === SOMATIC_PROFILE_SCHEMA
        ? input.profile
        : profileForWorld(input.state.world_id, profileMap);
      if (!profile) throw new Error(`No somatic profile is registered for world: ${input.state.world_id || '<none>'}`);
      const course = calculateSomaticCourse({ state: input.state, target: input.target, profile }, { now });
      bus?.publish?.('arcsweep:somatic-course-planned', course, { source: 'somatic-cartography' });
      return course;
    },
  });

  registry.registerCapability({
    capability_id: 'somatic.execute-course',
    service_id: 'somatic-cartography',
    description: 'Execute a deterministic somatic course through bounded OS capabilities. Human body evidence remains required for embodied completion.',
    authority: 'operate',
    input_schema: { required: ['course'] },
    validate: (input) => input?.course?.schema === SOMATIC_COURSE_SCHEMA,
    execute: async (input, context) => {
      const course = input.course;
      const stepReceipts = [];
      let coursePending = false;

      for (const step of course.steps || []) {
        const capabilityReceipts = [];
        let waitingForBody = false;
        let failed = false;

        for (const capabilityId of step.capabilities || []) {
          const receipt = await registry.invoke(capabilityId, {
            ...clone(step.cue || {}),
            course_id: course.course_id,
            step: step.step,
            transition: step.transition,
          }, {
            actor_id: context.actor_id || 'human-ui',
            source: 'somatic-helm',
            authority: 'operate',
            confirmed: context.confirmed === true,
          });
          capabilityReceipts.push(receipt);
          if (receipt?.status !== 'applied') failed = true;
          if (capabilityId === 'glyphforge.trace.arm' && outputApplied(receipt)) waitingForBody = true;
        }

        const somaticReceipt = createSomaticReceipt({
          course,
          step: step.step,
          status: failed ? 'failed' : waitingForBody ? 'applied' : capabilityReceipts.every(outputApplied) ? 'applied' : 'skipped',
          capability_receipt_ids: capabilityReceipts.map(receiptId).filter(Boolean),
        }, { now });
        store.appendReceipt(somaticReceipt);
        stepReceipts.push(somaticReceipt);
        bus?.publish?.('arcsweep:somatic-step-receipted', somaticReceipt, { source: 'somatic-cartography' });

        if (waitingForBody) {
          const traceReceipt = capabilityReceipts.find((receipt) => receipt?.capability_id === 'glyphforge.trace.arm');
          const traceId = traceReceipt?.output?.trace_id;
          if (traceId) {
            coursePending = true;
            pending.set(traceId, {
              trace_id: traceId,
              course: clone(course),
              step: step.step,
              capability_receipt_ids: capabilityReceipts.map(receiptId).filter(Boolean),
            });
          }
        }
        if (failed) break;
      }

      return {
        schema: 'arcsweep.somatic-execution/v1',
        course_id: course.course_id,
        status: coursePending ? 'awaiting-body-observation' : stepReceipts.some((item) => item.status === 'failed') ? 'failed' : 'applied',
        receipts: stepReceipts,
      };
    },
  });

  function receiveStrokeObservation(observation = {}) {
    const waiting = pending.get(observation.trace_id);
    if (!waiting) return null;
    const receipt = createSomaticReceipt({
      course: waiting.course,
      step: waiting.step,
      status: 'observed',
      observed_state_id: observation.somatic_state_id || null,
      capability_receipt_ids: waiting.capability_receipt_ids,
    }, { now });
    store.appendReceipt(receipt);
    pending.delete(observation.trace_id);
    bus?.publish?.('arcsweep:somatic-step-receipted', receipt, { source: 'glyph-stroke-observer' });
    return receipt;
  }

  let unsubscribeBus = null;
  if (bus?.subscribe) {
    unsubscribeBus = bus.subscribe('arcsweep:glyph-stroke-observed', (event) => receiveStrokeObservation(event?.payload || {}), { id: 'somatic-glyph-stroke-observer' });
  }
  const onDomObservation = (event) => receiveStrokeObservation(event?.detail || {});
  eventTarget?.addEventListener?.('arcsweep:glyph-stroke-observed', onDomObservation);

  return Object.freeze({
    service_id: 'somatic-cartography',
    capabilities: ['somatic.cartography.status', 'somatic.observe', 'somatic.cue', 'somatic.observe-hold', 'somatic.plan', 'somatic.execute-course'],
    store,
    pending: () => [...pending.values()].map(clone),
    receiveStrokeObservation,
    destroy: () => {
      unsubscribeBus?.();
      eventTarget?.removeEventListener?.('arcsweep:glyph-stroke-observed', onDomObservation);
    },
  });
}
