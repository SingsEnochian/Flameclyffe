import assert from 'node:assert/strict';
import test from 'node:test';
import { brushRuntime, makeBrushLibrary } from '../src/components/glyph-studio/glyphStudioModel.js';
import {
  BRUSH_SETTING_RECEIPT_SCHEMA,
  LIVE_BRUSH_FRAME_SCHEMA,
  brushRevision,
  createBrushSemanticContext,
  createBrushSettingChangeReceipt,
  createLiveBrushFrame,
  getBrushSensoryPreferences,
  makeBrushAuditionStroke,
} from '../src/components/glyph-studio/liveBrushRuntime.js';

test('full brush runtime exposes visual, Pencil, material, grain, wet and dynamic state', () => {
  const brush = makeBrushLibrary().brushes[0];
  const runtime = brushRuntime(brush);

  assert.equal(runtime.revision, brush.modifiedAt);
  assert.equal(runtime.grainSource, brush.attributes.grain.sourceName);
  assert.equal(runtime.renderingMode, brush.attributes.rendering.mode);
  assert.equal(runtime.pressureFlow, brush.attributes.applePencil.pressureFlow);
  assert.equal(runtime.roughness, brush.attributes.materials.roughness);
  assert.equal(runtime.charge, brush.attributes.wetMix.charge);
  assert.equal(runtime.speedSize, brush.attributes.dynamics.speedSize);
});

test('live brush frame derives bounded semantic, sonic and haptic state from one brush relation', () => {
  const brush = makeBrushLibrary().brushes[0];
  const previous = { x: 100, y: 100, pressure: 0.25, tiltX: 0, tiltY: 0, twist: 0, t: 100 };
  const point = { x: 180, y: 135, pressure: 0.82, tiltX: 24, tiltY: 18, twist: 35, t: 132 };
  const frame = createLiveBrushFrame(brush, point, previous, 'test');

  assert.equal(frame.schemaVersion, LIVE_BRUSH_FRAME_SCHEMA);
  assert.equal(frame.brushRevision, brushRevision(brush));
  assert.equal(frame.semantic.pressureBand, 'firm');
  assert.ok(frame.semantic.speedNorm >= 0 && frame.semantic.speedNorm <= 1);
  assert.ok(frame.sensory.audio.pitch > 0);
  assert.ok(frame.sensory.audio.gain > 0 && frame.sensory.audio.gain <= 0.11);
  assert.ok(frame.sensory.haptic.intensity >= 0 && frame.sensory.haptic.intensity <= 1);
  assert.equal(frame.sensory.visual.roughness, brush.attributes.materials.roughness);
});

test('semantic brush context keeps participant-readable performance bands separate from raw values', () => {
  const brush = makeBrushLibrary().brushes[0];
  brush.attributes.grain.depth = 0.9;
  brush.attributes.materials.roughness = 0.85;
  const semantic = createBrushSemanticContext(
    brush,
    { x: 30, y: 30, pressure: 0.2, tiltX: 4, tiltY: 2, t: 220 },
    { x: 28, y: 29, pressure: 0.2, tiltX: 0, tiltY: 0, t: 200 },
  );

  assert.equal(semantic.pressureBand, 'light');
  assert.equal(semantic.textureBand, 'coarse');
  assert.equal(typeof semantic.speed, 'number');
  assert.equal(semantic.brushName, brush.name);
});

test('sealed audition stroke changes runtime revision when brush definition changes', () => {
  const brush = makeBrushLibrary().brushes[0];
  const first = makeBrushAuditionStroke(brush);
  const revised = structuredClone(brush);
  revised.modifiedAt = '2026-09-07T20:30:00.000Z';
  revised.attributes.properties.size = brush.attributes.properties.size + 20;
  const second = makeBrushAuditionStroke(revised);

  assert.equal(first.points.length, second.points.length);
  assert.notEqual(first.brushRevision, second.brushRevision);
  assert.notEqual(first.brush.size, second.brush.size);
  assert.deepEqual(first.points, second.points);
});

test('brush setting receipt preserves before and after without rewriting the previous brush value', () => {
  const brush = makeBrushLibrary().brushes[0];
  const previousValue = brush.attributes.materials.roughness;
  const revised = structuredClone(brush);
  revised.modifiedAt = '2026-09-07T20:31:00.000Z';
  revised.attributes.materials.roughness = 0.91;
  const receipt = createBrushSettingChangeReceipt({
    brush: revised,
    group: 'materials',
    setting: 'roughness',
    previousValue,
    nextValue: revised.attributes.materials.roughness,
  });

  assert.equal(receipt.schemaVersion, BRUSH_SETTING_RECEIPT_SCHEMA);
  assert.equal(receipt.previousValue, previousValue);
  assert.equal(receipt.nextValue, 0.91);
  assert.match(receipt.brushRevision, /2026-09-07T20:31:00.000Z/);
});

test('sensory preferences have safe non-browser defaults for tests and server rendering', () => {
  assert.deepEqual(getBrushSensoryPreferences(), { sound: true, haptic: true, observer: true });
});
