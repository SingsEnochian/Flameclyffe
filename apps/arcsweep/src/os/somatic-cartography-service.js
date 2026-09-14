import {
  KELYRAN_SOMATIC_PROFILE,
  SOMATIC_CARTOGRAPHY_RECEIPT_SCHEMA,
  SOMATIC_COURSE_SCHEMA,
  SOMATIC_PROFILE_SCHEMA,
  SOMATIC_STATE_SCHEMA,
  SOMATIC_TARGET_SCHEMA,
  calculateSomaticCourse,
  createSomaticCartographyReceipt,
  createSomaticStore,
} from './somatic-cartography.js';

function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function receiptId(receipt) { return receipt?.call_id || receipt?.event_id || receipt?.receipt_id || null; }
function outputApplied(receipt) { return receipt?.status === 'applied' && receipt?.output?.applied !== false && receipt?.output?.supported !== false; }
function awaitingEvidence(receipt) { return Boolean(receipt?.output?.awaiting_observation || receipt?.output?.awaiting_presentation || receipt?.output?.pending_observation); }
function pendingIdFrom(receipt, fallback) { return receipt?.output?.pending_id || receipt?.output?.trace_id || receipt?.output?.pending_observation?.pending_id || fallback; }
function profileForWorld(worldId, profiles) { return profiles.get(worldId) || null; }

function defaultCue(detail) {
  const surface = globalThis.__arcsweepSomaticCartographyCueSurface;
  if (!surface?.ready || typeof surface.present !== 'function') {
    return { applied: false, supported: false, awaiting_presentation: true, reason: 'somatic-cue-surface-unavailable', cue: clone(detail) };
  }
  return surface.present(detail);
}

function defineCartographyEvents(bus) {
  if (!bus?.define || !bus?.eventNames) return;
  const known = new Set(bus.eventNames());
  if (!known.has('arcsweep:somatic-course-planned')) {
    bus.define('arcsweep:somatic-course-planned', (payload) => payload?.schema === SOMATIC_COURSE_SCHEMA);
  }
  if (!known.has('arcsweep:somatic-cartography-step-receipted')) {
    bus.define('arcsweep:somatic-cartography-step-receipted', (payload) => payload?.schema === SOMATIC_CARTOGRAPHY_RECEIPT_SCHEMA);
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
      observation_only_conditions_remain_pending: true,
      cue_presentation_surface_required: true,
      cartography_receipt_schema: SOMATIC_CARTOGRAPHY_RECEIPT_SCHEMA,
    },
    consumes: ['arcsweep:glyph-stroke-observed'],
    emits: ['arcsweep:somatic-course-planned', 'arcsweep:somatic-cartography-step-receipted'],
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
      receipt_schema: SOMATIC_CARTOGRAPHY_RECEIPT_SCHEMA,
    }),
  });

  registry.registerCapability({
    capability_id: 'somatic.observe',
    service_id: 'somatic-cartography',
    description: 'Store one already-observed somatic state. This records evidence; it does not infer body state.',
    authority: 'operate',
    input_schema: { required: ['state'] },
    validate: (input) => input?.state?.schema === SOMATIC_STATE_SCHEMA,
    execute: (input) => ({ applied: true, state: store.write(input.state), body_state_synthesized: false }),
  });

  registry.registerCapability({
    capability_id: 'somatic.cue',
    service_id: 'somatic-cartography',
    description: 'Present a posture or movement cue without claiming that the body completed it.',
    authority: 'operate',
    execute: (input) => {
      const cue = clone({
        cue_type: 'somatic-posture',
        posture: input?.posture || null,
        transition: input?.transition || null,
        course_id: input?.course_id || null,
        step: input?.step || null,
        arrival_condition: input?.arrival_condition || null,
      });
      const result = dispatchCue(cue);
      if (result === false) return { applied: false, supported: false, awaiting_presentation: true, cue, body_state_claimed: false };
      if (result?.applied === false) return { ...clone(result), cue, body_state_claimed: false };
      return { applied: true, supported: true, cue, body_state_claimed: false, cue_presented: true };
    },
  });

  registry.registerCapability({
    capability_id: 'somatic.observe-hold',
    service_id: 'somatic-cartography',
    description: 'Hold a target condition open for future observation without synthesizing body evidence.',
    authority: 'operate',
    execute: (input) => {
      const pendingId = `somatic-hold:${input?.course_id || 'course'}:${input?.step || 'step'}:${input?.condition || 'condition'}`;
      return {
        applied: false,
        supported: true,
        pending_id: pendingId,
        target_id: input?.target_id || null,
        condition: input?.condition || null,
        body_state_claimed: false,
        awaiting_observation: true,
      };
    },
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
        let waitingForEvidence = false;
        let waitingForPresentation = false;
        let failed = false;
        const pendingIds = [];

        for (const capabilityId of step.capabilities || []) {
          const receipt = await registry.invoke(capabilityId, {
            ...clone(step.cue || {}),
            course_id: course.course_id,
            step: step.step,
            transition: step.transition,
            arrival_condition: step.arrival_condition || null,
            condition: step.arrival_condition || step.cue?.condition || null,
          }, {
            actor_id: context.actor_id || 'human-ui',
            source: 'somatic-helm',
            authority: 'operate',
            confirmed: context.confirmed === true,
          });
          capabilityReceipts.push(receipt);
          if (receipt?.status !== 'applied') failed = true;
          if (receipt?.output?.awaiting_presentation) waitingForPresentation = true;
          if (awaitingEvidence(receipt) || capabilityId === 'glyphforge.trace.arm') {
            waitingForEvidence = true;
            pendingIds.push(pendingIdFrom(receipt, `somatic-pending:${course.course_id}:${step.step}:${capabilityId}`));
          }
        }

        const pendingId = pendingIds.filter(Boolean)[0] || null;
        const status = failed ? 'failed' : waitingForEvidence || waitingForPresentation ? 'pending' : capabilityReceipts.every(outputApplied) ? 'applied' : 'skipped';
        const somaticReceipt = createSomaticCartographyReceipt({
          course,
          step: step.step,
          status,
          pending_id: pendingId,
          capability_receipt_ids: capabilityReceipts.map(receiptId).filter(Boolean),
        }, { now });
        store.appendReceipt(somaticReceipt);
        stepReceipts.push(somaticReceipt);
        bus?.publish?.('arcsweep:somatic-cartography-step-receipted', somaticReceipt, { source: 'somatic-cartography' });

        if (status === 'pending' && pendingId) {
          coursePending = true;
          pending.set(pendingId, {
            pending_id: pendingId,
            trace_id: pendingId,
            course: clone(course),
            step: step.step,
            arrival_condition: step.arrival_condition || null,
            capability_receipt_ids: capabilityReceipts.map(receiptId).filter(Boolean),
          });
        }
        if (failed) break;
      }

      return {
        schema: 'arcsweep.somatic-execution/v1',
        course_id: course.course_id,
        status: coursePending ? 'awaiting-observation' : stepReceipts.some((item) => item.status === 'failed') ? 'failed' : 'applied',
        receipts: stepReceipts,
        pending: [...pending.values()].map(({ course: _course, ...item }) => clone(item)),
      };
    },
  });

  function completePending(pendingId, { observed_state_id = null, evidence = null } = {}) {
    const waiting = pending.get(pendingId);
    if (!waiting) return null;
    const receipt = createSomaticCartographyReceipt({
      course: waiting.course,
      step: waiting.step,
      status: 'observed',
      observed_state_id,
      pending_id: pendingId,
      capability_receipt_ids: waiting.capability_receipt_ids,
    }, { now });
    store.appendReceipt(receipt);
    pending.delete(pendingId);
    bus?.publish?.('arcsweep:somatic-cartography-step-receipted', receipt, { source: evidence?.source || 'somatic-observer' });
    return receipt;
  }

  registry.registerCapability({
    capability_id: 'somatic.observation.record',
    service_id: 'somatic-cartography',
    description: 'Complete one pending somatic condition after explicit observed evidence arrives.',
    authority: 'operate',
    requires_confirmation: true,
    input_schema: { required: ['pending_id'] },
    validate: (input) => Boolean(input?.pending_id && pending.has(input.pending_id)),
    execute: (input) => completePending(input.pending_id, { observed_state_id: input.observed_state_id || null, evidence: clone(input.evidence || {}) }),
  });

  function receiveStrokeObservation(observation = {}) {
    const pendingId = observation.trace_id || observation.pending_id;
    if (!pendingId || !pending.has(pendingId)) return null;
    return completePending(pendingId, { observed_state_id: observation.somatic_state_id || null, evidence: { source: 'glyph-stroke-observer', stroke_id: observation.stroke?.stroke_id || observation.stroke?.id || null } });
  }

  let unsubscribeBus = null;
  if (bus?.subscribe) {
    unsubscribeBus = bus.subscribe('arcsweep:glyph-stroke-observed', (event) => receiveStrokeObservation(event?.payload || {}), { id: 'somatic-glyph-stroke-observer' });
  }
  const onDomObservation = (event) => receiveStrokeObservation(event?.detail || {});
  eventTarget?.addEventListener?.('arcsweep:glyph-stroke-observed', onDomObservation);

  return Object.freeze({
    service_id: 'somatic-cartography',
    capabilities: ['somatic.cartography.status', 'somatic.observe', 'somatic.cue', 'somatic.observe-hold', 'somatic.plan', 'somatic.execute-course', 'somatic.observation.record'],
    store,
    pending: () => [...pending.values()].map(clone),
    receiveStrokeObservation,
    destroy: () => {
      unsubscribeBus?.();
      eventTarget?.removeEventListener?.('arcsweep:glyph-stroke-observed', onDomObservation);
    },
  });
}
