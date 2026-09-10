import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventBus } from '../src/os/kernel.js';
import { createCapabilityRegistry } from '../src/os/capabilities.js';
import { registerGlyphForgeService } from '../src/os/glyphforge-service.js';

test('Glyph Forge joins the OS as a bounded creative organ', async () => {
  const previous = globalThis.__starwellGlyphStudioBridge;
  let selected = 'brush-stonewood';
  const patches = [];
  globalThis.__starwellGlyphStudioBridge = {
    schema: 'starwell.glyph-studio-bridge/v1',
    surface: 'glyph-studio',
    snapshot() {
      return {
        project: { id: 'project-1', name: 'Kelyran', glyph_count: 3 },
        active_glyph: { id: 'glyph-meda', name: 'Meda', character: '◇', stroke_count: 7 },
        active_layer: { id: 'layer-ink', kind: 'vector' },
        active_brush: { id: selected, name: selected === 'brush-moon' ? 'Moon Graphite' : 'Stonewood Ink' },
        brush_runtime: { size: 34, opacity: 0.92, colour: '#e6c67a' },
        available_brushes: [
          { id: 'brush-stonewood', name: 'Stonewood Ink' },
          { id: 'brush-moon', name: 'Moon Graphite' },
        ],
      };
    },
    selectBrush(id) {
      if (!['brush-stonewood', 'brush-moon'].includes(id)) throw new Error('Unknown brush.');
      selected = id;
      return { selected_brush_id: id };
    },
    patchBrushSetting(input) {
      patches.push(input);
      return { patched: true, ...input };
    },
  };

  const bus = createEventBus();
  const registry = createCapabilityRegistry({ bus });
  registerGlyphForgeService(registry);

  const status = await registry.invoke('glyphforge.status', {}, { authority: 'read' });
  assert.equal(status.output.mounted, true);
  const project = await registry.invoke('glyphforge.project-summary', {}, { authority: 'read' });
  assert.equal(project.output.active_glyph_id, 'glyph-meda');
  assert.equal(project.output.stroke_count, 7);
  const brush = await registry.invoke('glyphforge.active-brush', {}, { authority: 'read' });
  assert.equal(brush.output.brush.name, 'Stonewood Ink');

  const select = await registry.invoke('glyphforge.select-brush', { brush_id: 'brush-moon' }, { authority: 'operate' });
  assert.equal(select.status, 'applied');
  const after = await registry.invoke('glyphforge.active-brush', {}, { authority: 'read' });
  assert.equal(after.output.brush.name, 'Moon Graphite');

  const weakPatch = await registry.invoke('glyphforge.patch-brush-setting', {
    brush_id: 'brush-moon', group: 'properties', setting: 'size', value: 42,
  }, { authority: 'operate', confirmed: true });
  assert.equal(weakPatch.status, 'rejected');
  assert.equal(weakPatch.reason, 'insufficient-authority');
  assert.equal(patches.length, 0);

  const patch = await registry.invoke('glyphforge.patch-brush-setting', {
    brush_id: 'brush-moon', group: 'properties', setting: 'size', value: 42,
  }, { authority: 'mutate', confirmed: true });
  assert.equal(patch.status, 'applied');
  assert.equal(patches.length, 1);

  if (previous === undefined) delete globalThis.__starwellGlyphStudioBridge;
  else globalThis.__starwellGlyphStudioBridge = previous;
});

test('Glyph Forge reports an unmounted surface without inventing state', async () => {
  const previous = globalThis.__starwellGlyphStudioBridge;
  delete globalThis.__starwellGlyphStudioBridge;
  const registry = createCapabilityRegistry();
  registerGlyphForgeService(registry);
  const status = await registry.invoke('glyphforge.status', {}, { authority: 'read' });
  assert.equal(status.status, 'applied');
  assert.equal(status.output.mounted, false);
  const read = await registry.invoke('glyphforge.active-brush', {}, { authority: 'read' });
  assert.equal(read.status, 'failed');
  assert.match(read.error, /not mounted/);
  if (previous !== undefined) globalThis.__starwellGlyphStudioBridge = previous;
});
