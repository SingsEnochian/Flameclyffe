function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function bridge() {
  const value = globalThis.__starwellGlyphStudioBridge;
  return value?.schema === 'starwell.glyph-studio-bridge/v1' ? value : null;
}

function requireBridge() {
  const value = bridge();
  if (!value) throw new Error('STARWELL Glyph Studio bridge is not mounted on this surface.');
  return value;
}

function projectSummary(snapshot) {
  const project = snapshot?.project || {};
  const glyph = snapshot?.active_glyph || {};
  return {
    schema: 'arcsweep.glyphforge-project-summary/v1',
    project_id: project.id || null,
    project_name: project.name || null,
    glyph_count: Number(project.glyph_count || 0),
    active_glyph_id: glyph.id || null,
    active_glyph_name: glyph.name || null,
    active_character: glyph.character || null,
    stroke_count: Number(glyph.stroke_count || 0),
    active_layer_id: snapshot?.active_layer?.id || null,
    active_layer_kind: snapshot?.active_layer?.kind || null,
  };
}

function defaultCuePresenter(cue = {}) {
  const surface = globalThis.__arcsweepSomaticCartographyCueSurface;
  if (!surface?.ready || typeof surface.present !== 'function') {
    return { applied: false, supported: false, awaiting_presentation: true, reason: 'somatic-cue-surface-unavailable', cue: clone(cue) };
  }
  return surface.present(cue);
}

function dispatchEventLike(target, name, detail) {
  if (!target?.dispatchEvent) return false;
  if (typeof CustomEvent === 'function') return target.dispatchEvent(new CustomEvent(name, { detail }));
  return target.dispatchEvent({ type: name, detail });
}

function sameOrigin(event) {
  const expected = globalThis.location?.origin;
  if (!expected || !event?.origin) return true;
  return event.origin === expected;
}

function messageDetail(data) {
  if (!data || typeof data !== 'object') return null;
  const type = data.type || data.name;
  if (type !== 'starwell:glyph-stroke-committed') return null;
  if (data.schema && data.schema !== 'starwell.glyph-studio-event-message/v1') return null;
  const detail = data.detail || data.payload || null;
  return detail?.schema === 'starwell.glyph-stroke-receipt/v1' ? detail : null;
}

export function registerGlyphForgeService(registry, { eventTarget = globalThis, presentCue = defaultCuePresenter } = {}) {
  if (!registry?.registerService || !registry?.registerCapability) throw new Error('Glyph Forge service requires the ArcSweep capability registry.');

  const armedTraces = new Map();

  function traceStatus() {
    return {
      schema: 'arcsweep.glyphforge-trace-status/v1',
      pending_count: armedTraces.size,
      pending: [...armedTraces.values()].map(clone),
      cross_document_bridge: true,
      concurrency: 'single-active-trace',
    };
  }

  function findMatchingTrace(stroke = {}) {
    const explicit = stroke.trace_id || stroke.pending_id;
    if (explicit && armedTraces.has(explicit)) return explicit;
    const matches = [...armedTraces.values()].filter((trace) => {
      if (trace.glyph_id && stroke.glyph_id && trace.glyph_id !== stroke.glyph_id) return false;
      if (trace.brush_id && stroke.brush_id && trace.brush_id !== stroke.brush_id) return false;
      if (trace.gesture_id && stroke.gesture_id && trace.gesture_id !== stroke.gesture_id) return false;
      return trace.glyph_id || trace.brush_id || trace.gesture_id;
    });
    return matches.length === 1 ? matches[0].trace_id : null;
  }

  function observeStroke(stroke = {}) {
    const traceId = findMatchingTrace(stroke);
    if (!traceId) {
      return { schema: 'arcsweep.glyphforge-trace-observation/v1', applied: false, observed: false, reason: 'no-unique-armed-trace', pending_count: armedTraces.size };
    }
    const trace = armedTraces.get(traceId);
    armedTraces.delete(traceId);
    const observation = {
      schema: 'arcsweep.glyphforge-trace-observation/v1',
      applied: true,
      observed: true,
      trace_id: traceId,
      course_id: trace.course_id || null,
      step: trace.step || null,
      stroke: clone(stroke),
      observed_at: new Date().toISOString(),
    };
    dispatchEventLike(eventTarget, 'arcsweep:glyph-stroke-observed', observation);
    return observation;
  }

  const onLocalStroke = (event) => observeStroke(event?.detail || {});
  const onMessage = (event) => {
    if (!sameOrigin(event)) return;
    const detail = messageDetail(event?.data);
    if (detail) observeStroke(detail);
  };
  eventTarget?.addEventListener?.('starwell:glyph-stroke-committed', onLocalStroke);
  globalThis.addEventListener?.('message', onMessage);

  registry.registerService({
    service_id: 'glyphforge',
    label: 'STARWELL Glyph Forge',
    authority_boundary: {
      read_project_state: true,
      select_existing_brush: true,
      patch_existing_brush_setting: 'steward-approved-mutate',
      synthetic_drawing: false,
      arbitrary_file_access: false,
      source_mutation: false,
      cross_document_stroke_bridge: 'same-origin-postmessage',
      trace_correlation: 'explicit-trace-or-unique-glyph-match',
      concurrent_trace_arms: 'rejected',
    },
    consumes: ['starwell:glyph-studio-bridge-ready', 'starwell:glyph-stroke-committed'],
    emits: ['arcsweep:glyph-stroke-observed'],
  });

  registry.registerCapability({
    capability_id: 'glyphforge.status',
    service_id: 'glyphforge',
    description: 'Report whether the live STARWELL Glyph Studio bridge is mounted and ready.',
    authority: 'read',
    execute: () => {
      const live = bridge();
      return {
        schema: 'arcsweep.glyphforge-status/v1',
        mounted: Boolean(live),
        bridge_schema: live?.schema || null,
        surface: live?.surface || null,
        trace_bridge: traceStatus(),
      };
    },
  });

  registry.registerCapability({
    capability_id: 'glyphforge.project-summary',
    service_id: 'glyphforge',
    description: 'Read a bounded summary of the active Glyph Studio project without exposing full stroke payloads.',
    authority: 'read',
    execute: () => projectSummary(requireBridge().snapshot()),
  });

  registry.registerCapability({
    capability_id: 'glyphforge.active-brush',
    service_id: 'glyphforge',
    description: 'Read the active brush identity and effective drawing runtime settings.',
    authority: 'read',
    execute: () => {
      const snapshot = requireBridge().snapshot();
      return clone({
        schema: 'arcsweep.glyphforge-active-brush/v1',
        brush: snapshot.active_brush || null,
        runtime: snapshot.brush_runtime || null,
        available_brushes: snapshot.available_brushes || [],
      });
    },
  });

  registry.registerCapability({
    capability_id: 'glyphforge.select-brush',
    service_id: 'glyphforge',
    description: 'Select one already-present Glyph Studio brush by stable brush ID.',
    authority: 'operate',
    input_schema: { required: ['brush_id'] },
    validate: (input) => Boolean(String(input?.brush_id || '').trim()),
    execute: (input) => requireBridge().selectBrush(String(input.brush_id).trim()),
  });

  registry.registerCapability({
    capability_id: 'glyphforge.patch-brush-setting',
    service_id: 'glyphforge',
    description: 'Change one existing setting on one existing Glyph Studio brush. Model-originated use requires the Steward mutation gate.',
    authority: 'mutate',
    requires_confirmation: true,
    input_schema: { required: ['brush_id', 'group', 'setting', 'value'] },
    validate: (input) => Boolean(
      String(input?.brush_id || '').trim()
      && String(input?.group || '').trim()
      && String(input?.setting || '').trim()
      && Object.prototype.hasOwnProperty.call(input || {}, 'value')
    ),
    execute: (input) => requireBridge().patchBrushSetting({
      brush_id: String(input.brush_id).trim(),
      group: String(input.group).trim(),
      setting: String(input.setting).trim(),
      value: clone(input.value),
    }),
  });

  registry.registerCapability({
    capability_id: 'glyphforge.gesture.cue',
    service_id: 'glyphforge',
    description: 'Present one glyph gesture cue through the mounted somatic cue surface before claiming it was shown.',
    authority: 'operate',
    execute: (input) => {
      const result = presentCue({ cue_type: 'glyph-gesture', ...clone(input || {}) });
      if (result === false) return { applied: false, supported: false, awaiting_presentation: true };
      return result?.applied === false ? clone(result) : { applied: true, supported: true, cue_presented: true, cue: clone(input || {}) };
    },
  });

  registry.registerCapability({
    capability_id: 'glyphforge.trace.arm',
    service_id: 'glyphforge',
    description: 'Arm exactly one expected human glyph trace; completion requires a correlated real stroke observation.',
    authority: 'operate',
    input_schema: { required: ['course_id', 'step'] },
    validate: (input) => Boolean(input?.course_id && input?.step),
    execute: (input) => {
      const traceId = String(input.trace_id || `trace:${input.course_id}:${input.step}`).trim();
      if (armedTraces.size && !armedTraces.has(traceId)) throw new Error('Glyph Forge already has an armed trace; concurrent trace arms are rejected until explicit correlation is available.');
      const trace = {
        schema: 'arcsweep.glyphforge-armed-trace/v1',
        trace_id: traceId,
        course_id: input.course_id,
        step: input.step,
        glyph_id: input.glyph_id || null,
        gesture_id: input.gesture_id || null,
        brush_id: input.brush_id || null,
        arrival_condition: input.arrival_condition || null,
        armed_at: new Date().toISOString(),
      };
      armedTraces.set(traceId, trace);
      return { applied: true, supported: true, awaiting_observation: true, trace_id: traceId, armed: clone(trace) };
    },
  });

  registry.registerCapability({
    capability_id: 'glyphforge.trace.pending',
    service_id: 'glyphforge',
    description: 'Read pending armed glyph traces without stroke payloads.',
    authority: 'read',
    execute: traceStatus,
  });

  registry.registerCapability({
    capability_id: 'glyphforge.trace.observe',
    service_id: 'glyphforge',
    description: 'Record a real stroke observation and correlate it to the matching armed trace.',
    authority: 'operate',
    input_schema: { required: ['stroke'] },
    validate: (input) => Boolean(input?.stroke),
    execute: (input) => observeStroke(input.stroke),
  });

  return Object.freeze({
    service_id: 'glyphforge',
    capabilities: [
      'glyphforge.status',
      'glyphforge.project-summary',
      'glyphforge.active-brush',
      'glyphforge.select-brush',
      'glyphforge.patch-brush-setting',
      'glyphforge.gesture.cue',
      'glyphforge.trace.arm',
      'glyphforge.trace.pending',
      'glyphforge.trace.observe',
    ],
    destroy: () => {
      eventTarget?.removeEventListener?.('starwell:glyph-stroke-committed', onLocalStroke);
      globalThis.removeEventListener?.('message', onMessage);
    },
  });
}
