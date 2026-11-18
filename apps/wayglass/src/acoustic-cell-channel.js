import {
  CELL_ADDRESSES, createAcousticReturn, hearAcousticFrames, isAcousticAcknowledgement,
  renderAcousticCellExchange, receiveAcousticFrame, renderAcousticFrames,
} from '../../../lib/wyrdrune/acoustic-cell.mjs';

function playPcm(context, {sampleRate, channels}, signal) {
  signal.throwIfAborted();
  const buffer = context.createBuffer(channels.length, channels[0].length, sampleRate);
  channels.forEach((channel, index) => buffer.copyToChannel(channel, index));
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  gain.gain.value = 0.6;
  source.connect(gain);
  gain.connect(context.destination);

  return new Promise((resolve, reject) => {
    function finish(error) {
      signal.removeEventListener('abort', abort);
      source.onended = null;
      source.disconnect();
      gain.disconnect();
      if (error) reject(error);
      else resolve();
    }
    function abort() {
      try { source.stop(); } catch {}
      finish(signal.reason);
    }
    source.onended = () => finish();
    signal.addEventListener('abort', abort, {once: true});
    try { source.start(); } catch (error) { finish(error); }
  });
}

function recordWindow(scope, stream, duration, signal) {
  signal.throwIfAborted();
  const recorder = new scope.MediaRecorder(stream);
  const chunks = [];
  return new Promise((resolve, reject) => {
    function finish(error) {
      scope.clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      recorder.ondataavailable = recorder.onstop = recorder.onerror = null;
      if (recorder.state !== 'inactive') recorder.stop();
      if (error) reject(error);
      else resolve(new Blob(chunks, {type: recorder.mimeType}));
    }
    const abort = () => finish(signal.reason);
    const timer = scope.setTimeout(() => {
      if (recorder.state !== 'inactive') recorder.stop();
    }, duration);
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => finish(new Error('The microphone recording ended unexpectedly.'));
    recorder.onstop = () => finish();
    signal.addEventListener('abort', abort, {once: true});
    try { recorder.start(); } catch (error) { finish(error); }
  });
}

async function hearRecording(context, recording, signal) {
  signal.throwIfAborted();
  if (!recording.size) throw new Error('The microphone returned an empty recording.');
  const buffer = await context.decodeAudioData(await recording.arrayBuffer());
  signal.throwIfAborted();
  return hearAcousticFrames(buffer.getChannelData(0), buffer.sampleRate);
}

/** Room-owned playback and short microphone windows. Frames never reach a command dispatcher. */
export function createAcousticCellChannel({scope = globalThis, onStatus = () => {}} = {}) {
  let active = null;
  const {origin, peer} = CELL_ADDRESSES;

  async function run(mode, mono, resolution) {
    if (active) return;
    const controller = new AbortController();
    const {signal} = controller;
    let context, stream;
    function releaseStream() {
      stream?.getTracks().forEach(track => track.stop());
      stream = null;
    }
    function release() {
      releaseStream();
      if (context && context.state !== 'closed') void context.close().catch(() => {});
      context = null;
    }
    active = controller;
    signal.addEventListener('abort', release, {once: true});
    onStatus({busy: true, text: 'Opening sound…'});
    try {
      const Context = scope.AudioContext || scope.webkitAudioContext;
      if (!Context) throw new Error('Audio playback is unavailable on this device.');
      context = new Context();
      await context.resume();
      signal.throwIfAborted();

      let text;
      if (mode === 'audition') {
        const exchange = await renderAcousticCellExchange(369, {mono, resolution, signal});
        onStatus({busy: true, text: 'Playing Return · cell 1 → cell 2 → cell 1'});
        await playPcm(context, exchange, signal);
        text = 'Return 369 heard by cell 2. Cell 1 decoded its acknowledgement.';
        if (exchange.receipt.reply.resolution === 'open') text += ' Question held open.';
      } else {
        if (!scope.navigator?.mediaDevices?.getUserMedia || !scope.MediaRecorder) {
          throw new Error('Microphone recording is unavailable on this Wayglass host.');
        }
        stream = await scope.navigator.mediaDevices.getUserMedia({
          audio: {channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false},
        });
        signal.throwIfAborted();
        if (mode === 'send') {
          const marker = scope.crypto.getRandomValues(new Uint16Array(1))[0] || 1;
          const request = createAcousticReturn({sender: origin, recipient: peer, marker, resolution});
          onStatus({busy: true, text: 'Sending Return ' + marker + ' · listening for its reply'});
          const [recording] = await Promise.all([
            recordWindow(scope, stream, 12000, signal),
            playPcm(context, renderAcousticFrames([request], {mono}), signal),
          ]);
          releaseStream();
          const reply = (await hearRecording(context, recording, signal))
            .find(frame => isAcousticAcknowledgement(frame, request));
          if (!reply || !(await receiveAcousticFrame(origin, reply, {signal})).accepted) {
            throw new Error('No matching reply heard for Return ' + marker + '.');
          }
          if (reply.resolution !== request.resolution) {
            throw new Error('The acknowledgement matched Return ' + marker + ', but its resolution differed.');
          }
          text = 'Cell 1 decoded a matching acknowledgement for Return ' + marker + '.';
          if (reply.resolution === 'open') text += ' Question held open.';
        } else {
          onStatus({busy: true, text: 'Cell 2 is listening for Return for 9 seconds…'});
          const recording = await recordWindow(scope, stream, 9000, signal);
          releaseStream();
          const frames = await hearRecording(context, recording, signal);
          const request = frames.find(frame => frame.sender === origin && frame.recipient === peer);
          const decision = request ? await receiveAcousticFrame(peer, request, {signal}) : null;
          if (!decision?.reply) throw new Error('Cell 2 heard no addressed Return.');
          onStatus({busy: true, text: 'Cell 2 heard Return ' + request.marker + ' · sounding its reply'});
          await playPcm(context, renderAcousticFrames([decision.reply], {mono}), signal);
          text = 'Cell 2 sounded an acknowledgement for Return ' + request.marker + '.';
          if (decision.reply.resolution === 'open') text += ' Question held open.';
        }
      }
      if (active === controller) onStatus({busy: false, text});
    } catch (error) {
      if (active === controller && !signal.aborted) {
        onStatus({busy: false, text: error.name === 'NotAllowedError'
          ? 'Wayglass could not open the microphone. You can still play the local exchange.'
          : error.message});
      }
    } finally {
      if (active === controller) active = null;
      controller.abort();
      release();
    }
  }

  function stop() {
    if (!active) return;
    const stopped = active;
    active = null;
    stopped.abort();
    onStatus({busy: false, text: 'Cell sound stopped.'});
  }

  return Object.freeze({
    audition: (mono, resolution) => run('audition', mono, resolution),
    send: (mono, resolution) => run('send', mono, resolution),
    listen: mono => run('listen', mono),
    stop,
  });
}
