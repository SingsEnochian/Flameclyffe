import test from 'node:test';
import assert from 'node:assert/strict';
import { createArFeatherStop, renderArOverlayText, WAYGLASS_AR_FEATHER_EVENT } from '../src/ar-safety.js';

test('Feather Stop ends XR session and stops every camera track without waiting', async () => {
  const events = new EventTarget();
  const order = [];
  const tracks = [
    { stop() { order.push('video-stop'); } },
    { stop() { order.push('audio-stop'); } },
  ];
  const stop = createArFeatherStop({ events });
  stop.attach({
    cameraStream: { getTracks: () => tracks },
    session: { async end() { order.push('xr-end'); } },
  });
  assert.equal(stop.active, true);
  events.dispatchEvent(new Event(WAYGLASS_AR_FEATHER_EVENT));
  assert.deepEqual(order, ['video-stop', 'audio-stop', 'xr-end']);
  const result = await stop.stop();
  assert.equal(result.stopped, true);
  assert.equal(result.xr_end_resolved, true);
  assert.equal(result.camera_tracks_stopped, 2);
  assert.equal(stop.active, false);
  assert.equal((await stop.destroy()).stopped, false);
});

test('Feather Stop still releases MediaStream tracks if WebXR end fails', async () => {
  let tracksStopped = 0;
  const stop = createArFeatherStop({ events: new EventTarget() });
  stop.attach({
    cameraStream: { getTracks: () => [{ stop() { tracksStopped++; } }] },
    session: { end: () => Promise.reject(new Error('Device refused end')) },
  });
  const result = await stop.stop();
  assert.equal(tracksStopped, 1);
  assert.equal(result.xr_end_resolved, false);
  assert.deepEqual(result.errors, ['xr-session-end-failed']);
  assert.equal(result.stopped, false);
  await stop.destroy();
});

test('AR stop does not start media on its own; repeated stops are inert', async () => {
  const stop = createArFeatherStop({ events: new EventTarget() });
  assert.equal(stop.active, false);
  assert.equal((await stop.stop()).stopped, false);
  assert.throws(() => stop.attach(), /Attach an XR session/);
  let ended = 0;
  stop.attach({ session: { async end() { ended++; } } });
  const first = await stop.stop();
  assert.equal(first.stopped, true);
  assert.equal(first.xr_end_requested, true);
  assert.equal((await stop.stop()).stopped, false);
  assert.equal(ended, 1);
  await stop.destroy();
  assert.throws(() => stop.attach({ session: { end() {} } }), /not available/);
});

test('AR dom-overlay places untrusted participant/model text without interpreting markup', () => {
  const node = {
    textContent: '',
    set innerHTML(_) { throw new Error('Must never parse HTML from model text'); },
  };
  renderArOverlayText(node, '<img src=x onerror=alert(1)><svg onload=alert(2)>');
  assert.equal(node.textContent, '<img src=x onerror=alert(1)><svg onload=alert(2)>');
  assert.throws(() => renderArOverlayText(null, 'text'), /text node/);
});
