const formats = [
  ['audio/mp4;codecs=mp4a.40.2', 'm4a'],
  ['audio/mp4', 'm4a'],
  ['audio/webm;codecs=opus', 'webm'],
  ['audio/ogg;codecs=opus', 'ogg'],
];

// Keep the last take available when a listener leaves the Garden and returns.
const takes = new WeakMap();

export function colonyTake(scope) {
  if (!takes.has(scope)) takes.set(scope, { clip: null, listeners: new Set() });
  const take = takes.get(scope);
  return {
    subscribe(listener) {
      take.listeners.add(listener);
      listener(take.clip);
      return () => take.listeners.delete(listener);
    },
    save(clip) {
      take.clip = clip;
      for (const listener of take.listeners) listener(clip);
    },
  };
}

export function canRecordRadio(output, scope) {
  return typeof scope.MediaRecorder === 'function' &&
    typeof output?.context?.createMediaStreamDestination === 'function';
}

/** Tap the Colony Radio gain, including the listener's volume and mute. */
export function captureRadioMix(output, scope) {
  const preferred = formats.find(([mime]) => scope.MediaRecorder.isTypeSupported?.(mime))?.[0];
  const destination = output.context.createMediaStreamDestination();
  const chunks = [];
  let recorder;
  let resolveCapture;
  let settled = false;
  const done = new Promise(resolve => { resolveCapture = resolve; });
  function release() {
    try { output.disconnect(destination); } catch {}
    for (const track of destination.stream.getTracks()) track.stop();
  }
  function finish(result) {
    if (settled) return;
    settled = true;
    release();
    resolveCapture(result);
  }
  try {
    recorder = new scope.MediaRecorder(destination.stream, preferred ? { mimeType: preferred } : undefined);
    recorder.addEventListener('dataavailable', event => {
      if (event.data?.size) chunks.push(event.data);
    });
    recorder.addEventListener('error', () => finish({ error: 'The radio recording could not be saved.' }), { once: true });
    recorder.addEventListener('stop', () => {
      const type = recorder.mimeType || chunks[0]?.type || preferred || '';
      const container = type.split(';')[0].split('/').at(-1);
      const extension = formats.find(([mime]) => mime.split(';')[0].endsWith('/' + container))?.[1];
      if (!chunks.length) return finish({ error: 'There was no audio to save.' });
      if (!extension) return finish({ error: 'This browser did not return a shareable audio format.' });
      const timestamp = new Date().toISOString().replace(/[.:]/g, '-');
      finish({ clip: { blob: new Blob(chunks, { type }), filename: 'colony-radio-' + timestamp + '.' + extension } });
    }, { once: true });
    output.connect(destination);
    recorder.start(1000);
  } catch (error) {
    release();
    throw error;
  }
  return {
    done,
    stop() {
      if (!settled && recorder.state !== 'inactive') {
        try { recorder.stop(); }
        catch { finish({ error: 'The radio recording could not be saved.' }); }
      }
      return done;
    },
  };
}
