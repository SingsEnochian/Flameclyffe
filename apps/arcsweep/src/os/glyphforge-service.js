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

export function registerGlyphForgeService(registry) {
  if (!registry?.registerService || !registry?.registerCapability) throw new Error('Glyph Forge service requires the ArcSweep capability registry.');

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
    },
    consumes: ['starwell:glyph-studio-bridge-ready', 'starwell:glyph-stroke-committed'],
    emits: [],
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

  return Object.freeze({
    service_id: 'glyphforge',
    capabilities: [
      'glyphforge.status',
      'glyphforge.project-summary',
      'glyphforge.active-brush',
      'glyphforge.select-brush',
      'glyphforge.patch-brush-setting',
    ],
  });
}
