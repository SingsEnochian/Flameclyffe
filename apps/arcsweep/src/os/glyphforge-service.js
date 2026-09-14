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

function createTraceId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `glyph-trace:${uuid || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`}`;
}

function defaultDispatchGestureCue(detail) {
  if (typeof globalThis.dispatchEvent !== 'function' || typeof globalThis.CustomEvent !== 'function') return false;
  return globalThis.dispatchEvent(new globalThis.CustomEvent('arcsweep:glyph-gesture-cue', { detail }));
}

function dispatchObservedStroke(eventTarget, payload) {
  if (typeof eventTarget?.dispatchEvent !== 'function' || typeof globalThis.CustomEvent !== 'function') return false;
  return eventTarget.dispatchEvent(new globalThis.CustomEvent('arcsweep:glyph-stroke-observed', { detail: payload }));
}

function ensureGlyphObservationEvent(bus) {
  if (!bus?.define || !bus?.eventNames) return;
  const known = new Set(bus.eventNames());
  if (!known.has('arcsweep:glyph-stroke-observed')) {
    bus.define('arcsweep:glyph-stroke-observed', (payload) => Boolean(payload?.trace_id && payload?.stroke));
  }
}

export function registerGlyphForgeService(registry, {
  bus = null,
  eventTarget = globalThis,
  dispatchGestureCue = defaultDispatchGestureCue,
  now = () => new Date(),
} = {}) {
  if (!registry?.registerService || !registry?.registerCapability) throw new Error('Glyph Forge service requires the ArcSweep capability registry.');

  const armedTraces = new Map();
  ensureGlyphObservationEvent(bus);

  registry.registerService({
    service_id: 'glyphforge',
    label: 'STARWELL Glyph Forge',
    authority_boundary: {
      read_project_state: true,
      select_existing_brush: true,
      patch_existing_brush_setting: 'steward-approved-mutate',
      somatic_gesture_cue: true,
      somatic_trace_arm: true,
      synthetic_drawing: false,
      arbitrary_file_access: false,
      source_mutation: false,
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
    capability_id: 'glyphforge.gesture.cue',
    service_id: 'glyphforge',
    description: 'Present one somatic gesture cue without drawing or mutating glyph data.',
    authority: 'operate',
    input_schema: { required: ['gesture_id'] },
    validate: (input) => Boolean(String(input?.gesture_id || '').trim()),
    execute: (input) => {
      const cue = clone({
        gesture_id: String(input.gesture_id).trim(),
        hand: input.hand || null,
        tracing_plane: input.tracing_plane || null,
        motion: input.motion || null,
        course_id: input.course_id || null,
        step: input.step || null,
      });
      const dispatched = dispatchGestureCue(cue) !== false;
      return { applied: dispatched, supported: dispatched, cue, synthetic_drawing: false };
    },
  });

  registry.registerCapability({
    capability_id: 'glyphforge.trace.arm',
    service_id: 'glyphforge',
    description: 'Arm an embodied trace and wait for a real STARWELL stroke event. This capability never synthesizes drawing input.',
    authority: 'operate',
    input_schema: { required: ['gesture_id'] },
    validate: (input) => Boolean(String(input?.gesture_id || '').trim()),
    execute: (input) => {
      const traceId = createTraceId();
      armedTraces.set(traceId, Object.freeze(clone({
        trace_id: traceId,
        gesture_id: String(input.gesture_id).trim(),
        semantic_id: input.semantic_id || null,
        course_id: input.course_id || null,
        step: input.step || null,
        armed_at: now().toISOString(),
      })));
      return { applied: true, supported: true, trace_id: traceId, waiting_for: 'starwell:glyph-stroke-committed', synthetic_drawing: false };
    },
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

  const onStroke = (event) => {
    const first = armedTraces.entries().next();
    if (first.done) return;
    const [traceId, armed] = first.value;
    armedTraces.delete(traceId);
    const payload = {
      schema: 'arcsweep.glyph-stroke-observation/v1',
      trace_id: traceId,
      gesture_id: armed.gesture_id,
      semantic_id: armed.semantic_id,
      course_id: armed.course_id,
      step: armed.step,
      stroke: clone(event?.detail || {}),
      observed_at: now().toISOString(),
    };
    if (bus?.publish) bus.publish('arcsweep:glyph-stroke-observed', payload, { source: 'starwell:glyph-stroke-committed' });
    else dispatchObservedStroke(eventTarget, payload);
  };

  eventTarget?.addEventListener?.('starwell:glyph-stroke-committed', onStroke);

  return Object.freeze({
    service_id: 'glyphforge',
    capabilities: [
      'glyphforge.status',
      'glyphforge.project-summary',
      'glyphforge.active-brush',
      'glyphforge.select-brush',
      'glyphforge.gesture.cue',
      'glyphforge.trace.arm',
      'glyphforge.patch-brush-setting',
    ],
    armedTraces: () => [...armedTraces.values()].map(clone),
    destroy: () => eventTarget?.removeEventListener?.('starwell:glyph-stroke-committed', onStroke),
  });
}
