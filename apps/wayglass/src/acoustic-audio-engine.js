// Optional WebAudio projection. World state and route authority remain in the host.
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const number = (value, name) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
  return value;
};

export function createAcousticAudioEngine({AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext} = {}) {
  let context = null, graph = null, disposed = false, running = false, epoch = 0, pending = null;
  let status = typeof AudioContext === 'function' ? 'stopped' : 'unsupported', lastError = null;
  let settings = {muted: true, mono: false, ambience: false, quadSoundstage: [], bearing: {pan: 0, gain: 1, distance: 1}};
  const voices = new Set(), presented = new Set();
  const supported = typeof AudioContext === 'function';

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
    for (const osc of [graph.navigationTone, graph.ambienceTone, ...(graph.quadLayers || []).map(x => x.tone)]) {
      try { osc.stop(); } catch {}
    }
    try { graph.master.gain.cancelScheduledValues(context.currentTime); graph.master.gain.setValueAtTime(0, context.currentTime); } catch {}
    for (const layer of graph.quadLayers || []) { disconnect(layer.tone); disconnect(layer.gain); disconnect(layer.panner); }
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
    smooth(graph.navigation.gain, 0.035 * b.gain);
    smooth(graph.ambience.gain, settings.ambience ? 0.008 : 0);
    smooth(graph.status.gain, 0.025);
    if (graph.panner) smooth(graph.panner.pan, settings.mono ? 0 : b.pan);
    smooth(graph.navigationTone.frequency, b.distance < 0.25 ? 220 : 176);
    for (let i = 0; i < (graph.quadLayers || []).length; i++) {
      const node = graph.quadLayers[i], layer = settings.quadSoundstage[i];
      const allowed = !settings.muted && settings.ambience && layer?.evidence_status === 'observed'
        && layer.freshness !== 'clock-skew';
      smooth(node.gain.gain, allowed ? layer.gain : 0);
      if (layer) smooth(node.tone.frequency, layer.frequency_hz);
      if (node.panner) smooth(node.panner.pan, settings.mono ? 0 : (layer?.pan || 0));
    }
  }
  function createGraph() {
    // Register each allocation immediately so any later adapter error is recoverable.
    graph = {};
    graph.master = context.createGain(); graph.compressor = context.createDynamicsCompressor();
    graph.navigation = context.createGain(); graph.ambience = context.createGain(); graph.status = context.createGain();
    graph.panner = typeof context.createStereoPanner === 'function' ? context.createStereoPanner() : null;
    graph.navigationTone = context.createOscillator(); graph.ambienceTone = context.createOscillator();
    graph.quadLayers = [];
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
    // Original layered spatial ambience. Quad evidence supplies parameters, never raw samples.
    for (let i = 0; i < 4; i++) {
      const tone = context.createOscillator();
      const gain = context.createGain();
      const pan = typeof context.createStereoPanner === 'function' ? context.createStereoPanner() : null;
      tone.type = 'sine'; tone.frequency.value = [110, 176, 220, 330][i]; gain.gain.value = 0;
      tone.connect(gain);
      if (pan) gain.connect(pan).connect(master); else gain.connect(master);
      graph.quadLayers.push({tone, gain, panner:pan});
      tone.start();
    }
    navigationTone.start(); ambienceTone.start(); project();
  }
  function isRunning() { return running && (!context?.state || context.state === 'running'); }
  function getState() {
    const active = isRunning();
    const effectiveStatus = running && !disposed && context?.state && context.state !== 'running' ? context.state : status;
    return {supported, running: active, disposed, status: effectiveStatus, muted: settings.muted, mono: settings.mono,
      ambience: settings.ambience, quadLayers: settings.quadSoundstage.filter(x=>x.evidence_status==='observed').length, pending: Boolean(pending), lastError,
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
    if (Object.hasOwn(value, 'quadSoundstage')) {
      if (!Array.isArray(value.quadSoundstage) || value.quadSoundstage.length > 4)
        throw new TypeError('Quad soundstage requires up to four evidence-bound layers');
      next.quadSoundstage = value.quadSoundstage.map((x) => {
        if (!x || typeof x.source_ref !== 'string' || typeof x.layer !== 'string'
          || !['observed','empty','unavailable','error'].includes(x.evidence_status))
          throw new TypeError('Quad layer requires source provenance');
        return {source_ref:x.source_ref, layer:x.layer, evidence_status:x.evidence_status,
          freshness:String(x.freshness || 'unknown'),
          gain:clamp(number(x.gain,'quad gain'),0,0.075),
          pan:clamp(number(x.pan,'quad pan'),-1,1),
          frequency_hz:clamp(number(x.frequency_hz,'quad frequency'),60,1500)};
      });
    }
    settings = next;
    if (settings.muted) stop(); else project();
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
  function stop() {
    ++epoch; pending = null; settings.muted = true; running = false;
    teardown(); status = disposed ? 'disposed' : supported ? 'stopped' : 'unsupported';
    return getState();
  }
  function dispose() {
    if (disposed) return;
    disposed = true; stop();
    try { Promise.resolve(context?.close()).catch(() => {}); } catch {}
  }
  return {start, update, signal, stop, dispose, getState};
}
