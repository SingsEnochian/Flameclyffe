import {createSoundComposition} from '../../../lib/wayglass-sound-composition.mjs';
import {createCompositionProjection} from '../../../lib/wayglass-composition-projection.mjs';
// Optional WebAudio projection. World state and route authority remain in the host.
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const number = (value, name) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
  return value;
};

export function createAcousticAudioEngine({AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext,scope=globalThis} = {}) {
  let context = null, graph = null, disposed = false, running = false, epoch = 0, pending = null;
  let status = typeof AudioContext === 'function' ? 'stopped' : 'unsupported', lastError = null;
  let settings = {muted: true, mono: false, ambience: false, bearing: {pan: 0, gain: 1, distance: 1}, score: null};
  const voices = new Set(), presented = new Set();
  const supported = typeof AudioContext === 'function';
  const compositionProjection=createCompositionProjection({getContext:()=>context,getDestination:()=>graph?.ambience,canPlay:()=>isRunning()&&!settings.muted&&!disposed});
  const composition=createSoundComposition({region:'wayglass-acoustic',source_ref:'apps/wayglass/src/acoustic-audio-engine.js',scene:{id:'acoustic-field',root_hz:110,source_ref:'apps/wayglass/src/acoustic-world-model.js'},
    onScore:frame=>{settings.mono=frame.mono;project();return compositionProjection.render(frame);},
    enableAudio:async()=>{await start();settings.ambience=true;project();return isRunning();},stopAudio:()=>compositionProjection.stop()});

  function disconnect(node) { try { node?.disconnect(); } catch {} }
  function releaseVoice(voice) {
    if (!voices.delete(voice)) return;
    voice.osc.onended = null;
    try { voice.osc.stop(); } catch {}
    disconnect(voice.osc); disconnect(voice.envelope);
  }
  function teardown() {
    for (const voice of [...voices]) releaseVoice(voice);
    if (!graph) return;
    for (const osc of [graph.navigationTone, graph.ambienceTone]) {
      try { osc.stop(); } catch {}
    }
    try { graph.master.gain.cancelScheduledValues(context.currentTime); graph.master.gain.setValueAtTime(0, context.currentTime); } catch {}
    for (const node of Object.values(graph)) disconnect(node);
    graph = null;
  }
  function smooth(param, value) {
    param.cancelScheduledValues(context.currentTime);
    param.setTargetAtTime(value, context.currentTime, 0.03);
  }
  function project() {
    if (!graph) return;
    const b = settings.bearing;
    smooth(graph.master.gain, settings.muted ? 0 : 0.35);
    smooth(graph.navigation.gain, (settings.score?.foregroundGain ?? 0.035) * b.gain);
    smooth(graph.ambience.gain, settings.ambience ? (settings.score?.atmosphereGain ?? 0.008) : 0);
    smooth(graph.status.gain, 0.025);
    if (graph.panner) smooth(graph.panner.pan, settings.mono ? 0 : b.pan);
    smooth(graph.navigationTone.frequency, settings.score?.rootHz ?? (b.distance < 0.25 ? 220 : 176));
    if (settings.score) smooth(graph.ambienceTone.frequency, settings.score.counterpartHz);
  }
  function createGraph() {
    // Register each allocation immediately so any later adapter error is recoverable.
    graph = {};
    graph.master = context.createGain(); graph.compressor = context.createDynamicsCompressor();
    graph.navigation = context.createGain(); graph.ambience = context.createGain(); graph.status = context.createGain();
    graph.panner = typeof context.createStereoPanner === 'function' ? context.createStereoPanner() : null;
    graph.navigationTone = context.createOscillator(); graph.ambienceTone = context.createOscillator();
    const {master, compressor, navigation, ambience, status: statusBus, panner, navigationTone, ambienceTone} = graph;
    // Conservative digital gain budget with a compression stage. Device SPL is not calibrated here.
    master.gain.value = 0; navigation.gain.value = 0; ambience.gain.value = 0; statusBus.gain.value = 0;
    compressor.threshold.value = -12; compressor.knee.value = 0; compressor.ratio.value = 20;
    compressor.attack.value = 0.003; compressor.release.value = 0.15;
    navigationTone.type = 'sine'; navigationTone.frequency.value = 176;
    ambienceTone.type = 'sine'; ambienceTone.frequency.value = 110;
    navigationTone.connect(navigation);
    if (panner) { navigation.connect(panner); panner.connect(master); } else navigation.connect(master);
    ambienceTone.connect(ambience); ambience.connect(master); statusBus.connect(master);
    master.connect(compressor); compressor.connect(context.destination);
    navigationTone.start(); ambienceTone.start(); project();
  }
  function isRunning() { return running && (!context?.state || context.state === 'running'); }
  function getState() {
    const active = isRunning();
    const effectiveStatus = running && !disposed && context?.state && context.state !== 'running' ? context.state : status;
    return {supported, running: active, disposed, status: effectiveStatus, muted: settings.muted, mono: settings.mono,
      ambience: settings.ambience, pending: Boolean(pending), lastError,
      buses: {navigation: active && !settings.muted, ambience: active && !settings.muted && settings.ambience,
        status: active && !settings.muted}, activeSignals: voices.size, presentedEvents: presented.size};
  }
  function start() {
    if (disposed || !supported) return Promise.resolve(getState());
    if (pending) return pending;
    if (isRunning()) { settings.muted = false; project(); return Promise.resolve(getState()); }
    const token = ++epoch;
    settings.muted = false; status = 'starting'; lastError = null;
    const attempt = (async () => {
      try {
        if (context?.state === 'closed') { teardown(); context = null; running = false; }
        if (!context) context = new AudioContext({latencyHint: 'interactive'});
        await context.resume();
        if (disposed || token !== epoch || settings.muted) return getState();
        if (!graph) createGraph(); else project();
        running = true; status = 'running';
      } catch (error) {
        if (token === epoch && !disposed) {
          teardown(); running = false; settings.muted = true; status = 'error'; lastError = String(error?.message || error);
        }
      }
      return getState();
    })();
    pending = attempt;
    attempt.finally(() => { if (pending === attempt) pending = null; });
    return attempt;
  }
  function update(value = {}) {
    if (disposed) return getState();
    const next = {...settings};
    for (const key of ['muted', 'mono', 'ambience']) if (key in value) next[key] = Boolean(value[key]);
    if (value.bearing) {
      const b = {...settings.bearing, ...value.bearing};
      next.bearing = {pan: clamp(number(b.pan, 'pan'), -1, 1), gain: clamp(number(b.gain, 'gain'), 0, 1),
        distance: Math.max(0, number(b.distance, 'distance'))};
    }
    if ('score' in value) {
      if (value.score == null) next.score = null;
      else {
        const frame = value.score;
        for (const [key, lo, hi] of [
          ['rootHz',70,650], ['counterpartHz',70,900],
          ['foregroundGain',0,0.06], ['atmosphereGain',0,0.04],
        ]) {
          number(frame[key], key);
          if (frame[key] < lo || frame[key] > hi) throw new RangeError(key + ' exceeds the bounded audio range.');
        }
        next.score = Object.freeze({
          rootHz: frame.rootHz, counterpartHz: frame.counterpartHz,
          foregroundGain: frame.foregroundGain, atmosphereGain: frame.atmosphereGain,
        });
      }
    }
    settings = next;
    if('mono'in value&&composition.snapshot().mono!==next.mono)composition.setMix({mono:next.mono});
    if(value.ambience===false)composition.disableAudio();
    if (settings.muted) stop({pauseComposition:false}); else project();
    return getState();
  }
  function signal({eventId, kind = 'status'} = {}) {
    if (typeof eventId !== 'string' || !eventId || eventId.length > 256) throw new TypeError('A bounded eventId is required');
    if (disposed || !isRunning() || settings.muted || !graph) return {accepted: false, reason: 'inactive'};
    if (presented.has(eventId)) return {accepted: false, reason: 'duplicate'};
    if (voices.size >= 4) return {accepted: false, reason: 'capacity'};
    let osc = null, envelope = null, voice = null;
    try {
      osc = context.createOscillator(); envelope = context.createGain();
      const time = context.currentTime;
      voice = {osc, envelope}; voices.add(voice);
      osc.type = 'sine'; osc.frequency.value = kind === 'declined' ? 330 : kind === 'returned' ? 660 : 440;
      envelope.gain.setValueAtTime(0, time);
      envelope.gain.linearRampToValueAtTime(1, time + 0.01);
      envelope.gain.linearRampToValueAtTime(0, time + 0.12);
      osc.connect(envelope); envelope.connect(graph.status);
      osc.onended = () => releaseVoice(voice); osc.start(time); osc.stop(time + 0.13);
      presented.add(eventId);
      if (presented.size > 256) presented.delete(presented.values().next().value);
      return {accepted: true, eventId};
    } catch {
      if (voice) releaseVoice(voice);
      else { try { osc?.stop(); } catch {} disconnect(osc); disconnect(envelope); }
      return {accepted: false, reason: 'adapter-error'};
    }
  }
  function stop({pauseComposition=true}={}) {
    if(pauseComposition)composition.pauseGeneration();composition.disableAudio();
    ++epoch; pending = null; settings.muted = true; running = false;
    teardown(); status = disposed ? 'disposed' : supported ? 'stopped' : 'unsupported';
    return getState();
  }
  function dispose() {
    if (disposed) return;
    disposed = true; stop();composition.dispose();compositionProjection.dispose();scope.removeEventListener?.('wayglass:feather',onFeather);
    try { Promise.resolve(context?.close()).catch(() => {}); } catch {}
  }
  function onFeather(event){if(event.detail?.stopped===true){composition.feather();stop();}else if(event.detail?.stopped===false&&event.detail?.confirmed===true)composition.releaseFeather({confirmed:true});}
  scope.addEventListener?.('wayglass:feather',onFeather);
  return {composition,start, update, signal, stop, dispose, getState};
}
