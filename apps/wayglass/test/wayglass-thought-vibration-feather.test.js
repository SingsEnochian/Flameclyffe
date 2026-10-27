import test from 'node:test';
import assert from 'node:assert/strict';
import { renderThoughtVibrationSession } from '../src/route-client.js';

test('Thought Vibration render transport forwards abort signal and never requests playback', async () => {
  const controller = new AbortController();
  let seen = null;
  const result = await renderThoughtVibrationSession({
    session: {
      schema: 'thought-vibration.session/v1',
      session_id: 'feather-test',
      render_intent_confirmed: true,
      output: { kind: 'offline-diagnostic-wav', playback: false },
    },
    signal: controller.signal,
    fetchImpl: async (url, options) => {
      seen = { url, options };
      return { ok: true, async json() { return { status: 'offline-rendered' }; } };
    },
  });
  assert.equal(result.status, 'offline-rendered');
  assert.equal(seen.url, '/api/v1/wayglass/thought-vibration/render');
  assert.equal(seen.options.signal, controller.signal);
  assert.equal(JSON.parse(seen.options.body).session.output.playback, false);
});

test('Feather AbortController cancels an in-flight render request', async () => {
  const controller = new AbortController();
  const pending = renderThoughtVibrationSession({
    session: { schema: 'thought-vibration.session/v1' },
    signal: controller.signal,
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => {
        reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
      }, { once: true });
    }),
  });
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
});
