import assert from 'node:assert/strict';
import test from 'node:test';
import { brushRuntime, makeBrush } from '../src/components/glyph-studio/glyphStudioModel.js';
import { createStrokeInput, makeBrushSample } from '../src/components/glyph-studio/brushStroke.js';

const event = (pointerId, x = 0, extra = {}) => ({ pointerId, x, y: x / 2, pressure: 0.7, ...extra });
const input = () => createStrokeInput(({ x, y, pressure }) => ({ x, y, pressure }));
const stroke = (brush = makeBrush()) => ({ brush: brushRuntime(brush), points: [] });

test('sample responds to settings while an existing stroke keeps its brush snapshot', () => {
  const brush = makeBrush();
  const original = stroke(brush);
  const originalRuntime = { ...original.brush };
  const before = makeBrushSample(brush);
  brush.attributes.properties.size = 90;
  brush.attributes.properties.opacity = 0.2;
  brush.attributes.preview.color = '#9933ff';
  brush.attributes.taper.pressureEnd = 0.8;
  brush.attributes.applePencil.pressureSize = 0.3;
  brush.attributes.stabilization.streamlineAmount = 0.9;
  const after = makeBrushSample(brush);
  assert.equal(after.brush.size, 90);
  assert.equal(after.brush.opacity, 0.2);
  assert.equal(after.brush.colour, '#9933ff');
  assert.equal(after.brush.taperEnd, 0.8);
  assert.equal(after.brush.pressureSize, 0.3);
  assert.notDeepEqual(after.points, before.points);
  assert.deepEqual(original.brush, originalRuntime);
  assert.deepEqual(stroke(brush).brush, after.brush);
});

test('another finger cannot replace, contaminate or finish a pen stroke', () => {
  const session = input();
  const penStroke = stroke();
  assert.equal(session.start(event(1), penStroke), true);
  assert.equal(session.start(event(2), stroke()), false);
  assert.equal(session.move(event(2, 900)), false);
  assert.equal(session.finish(event(2, 900)), null);
  assert.equal(session.current, penStroke);
  assert.equal(penStroke.points.length, 1);
  session.move(event(1, 100));
  assert.equal(session.finish(event(1)), penStroke);
});

test('React native coalesced samples are consumed, with an empty-list fallback', () => {
  const session = input();
  session.start(event(1), stroke());
  session.move(event(1, 30, { nativeEvent: { getCoalescedEvents: () => [event(1, 10), event(1, 20), event(1, 30)] } }));
  assert.equal(session.current.points.length, 4);
  session.move(event(1, 40, { nativeEvent: { getCoalescedEvents: () => [] } }));
  assert.equal(session.current.points.length, 5);
  session.move(event(1, 50));
  assert.equal(session.current.points.length, 6);
});

test('touch strokes survive cancellation and lost capture commits only once', () => {
  for (const type of ['pointercancel', 'lostpointercapture']) {
    const session = input();
    const touch = stroke();
    session.start(event(8), touch);
    session.move(event(8, 50));
    const finished = session.finish(event(8, 900, { type }));
    assert.equal(finished.points.length, 2);
    assert.equal(session.finish(event(8)), null);
    assert.equal(session.current, null);
    assert.equal(session.start(event(9), stroke()), true);
  }
});

test('pointer release retains its last position without zero-pressure thinning', () => {
  const session = input();
  const brush = makeBrush();
  brush.attributes.stabilization.streamlineAmount = 0;
  brush.attributes.stabilization.stabilizationAmount = 0;
  session.start(event(1), stroke(brush));
  const finished = session.finish(event(1, 100, { type: 'pointerup', pressure: 0 }));
  assert.deepEqual(finished.points.at(-1), { x: 100, y: 50, pressure: 0.7 });
  assert.equal(session.finish(event(1, 100, { type: 'lostpointercapture' })), null);
});

test('a tap is one point and the next stroke uses the newly selected brush', () => {
  const session = input();
  const first = makeBrush();
  session.start(event(1), stroke(first));
  assert.equal(session.finish(event(1, 0, { type: 'pointerup' })).points.length, 1);
  const next = makeBrush({ name: 'New brush' });
  next.attributes.properties.size = 1;
  session.start(event(2), stroke(next));
  assert.equal(session.current.brush.name, 'New brush');
  assert.equal(session.current.brush.size, 1);
});
