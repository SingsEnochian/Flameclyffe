import { createSomaticProfileStore, detectSomaticChannels } from './somatic-profile.js';

const GLOBAL_KEY = '__arcsweepSomaticCalibration';

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));
}

function channelRows(status) {
  const rows = [
    ['Web Audio', status.web_audio], ['Vibration', status.vibration], ['Pointer', status.pointer_events],
    ['Touch', status.touch], ['Motion', status.device_motion], ['Orientation', status.device_orientation],
    ['Microphone API', status.microphone_api], ['Gamepad API', status.gamepad_api],
  ];
  return rows.map(([label, available]) => `<li><span>${esc(label)}</span><strong>${available ? 'available' : 'unavailable'}</strong></li>`).join('');
}

function ensureStyle() {
  if (document.querySelector('style[data-somatic-calibration-style]')) return;
  const style = document.createElement('style');
  style.dataset.somaticCalibrationStyle = 'true';
  style.textContent = `[data-somatic-calibration]{position:fixed;inset:0;z-index:2147482000;background:rgba(8,10,14,.72);padding:clamp(12px,3vw,36px);overflow:auto} [data-somatic-calibration][hidden]{display:none}.somatic-calibration-card{max-width:900px;margin:4vh auto;padding:22px;border:1px solid rgba(255,255,255,.18);border-radius:18px;background:#11151d;color:#f3eadb;box-shadow:0 18px 70px rgba(0,0,0,.45)}.somatic-calibration-card header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.somatic-calibration-card header p{margin:0;opacity:.7}.somatic-calibration-card h2,.somatic-calibration-card h3{margin:.2em 0 .55em}.somatic-calibration-card button,.somatic-calibration-card select,.somatic-calibration-card input{font:inherit}.somatic-calibration-controls{display:flex;flex-wrap:wrap;gap:14px;padding:12px 0 18px}.somatic-calibration-controls label{display:flex;align-items:center;gap:7px}.somatic-calibration-card article{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:12px;align-items:center;padding:12px 0;border-top:1px solid rgba(255,255,255,.1)}.somatic-calibration-card article p{margin:.2em 0;opacity:.75}.somatic-device-status ul{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;padding:0;list-style:none}.somatic-device-status li{display:flex;justify-content:space-between;gap:10px}.somatic-calibration-note{font-size:.9em;opacity:.68}`;
  document.head.appendChild(style);
}

export function installSomaticCalibrationSurface({ somatic, root = document.body, storage = null } = {}) {
  if (!somatic || !root || typeof document === 'undefined') return null;
  if (globalThis[GLOBAL_KEY]) return globalThis[GLOBAL_KEY];
  ensureStyle();

  const profile = createSomaticProfileStore({ storage });
  const host = document.createElement('section');
  host.dataset.somaticCalibration = 'true';
  host.hidden = true;
  host.innerHTML = `
    <div class="somatic-calibration-card" role="dialog" aria-modal="false" aria-labelledby="somatic-calibration-title">
      <header><div><p>Somatic Interface</p><h2 id="somatic-calibration-title">Calibration Chamber</h2></div><button type="button" data-somatic-close aria-label="Close">×</button></header>
      <div data-somatic-status></div>
      <div class="somatic-calibration-controls">
        <label>Gain <input data-somatic-gain type="range" min="0.001" max="0.08" step="0.001"></label>
        <label><input data-somatic-audio type="checkbox"> Audio</label>
        <label><input data-somatic-haptic type="checkbox"> Haptic</label>
        <label><input data-somatic-quiet type="checkbox"> Quiet mode</label>
        <label><input data-somatic-navigation type="checkbox"> Navigation cue</label>
        <label><input data-somatic-brush-contact type="checkbox"> Brush contact</label>
        <label><input data-somatic-brush-expression type="checkbox"> Brush expression</label>
        <label>Navigation cooldown <input data-somatic-cooldown type="number" min="150" max="5000" step="50"> ms</label>
        <label>Contact cooldown <input data-somatic-contact-cooldown type="number" min="100" max="1500" step="20"> ms</label>
        <label>Expression cooldown <input data-somatic-expression-cooldown type="number" min="80" max="1000" step="20"> ms</label>
        <label>Min pressure <input data-somatic-min-pressure type="number" min="0.01" max="0.95" step="0.01"></label>
        <label>Velocity reference <input data-somatic-velocity-ref type="number" min="100" max="5000" step="50"> px/s</label>
      </div>
      <div data-somatic-cues></div>
      <div class="somatic-device-status"><h3>Channels</h3><ul data-somatic-channels></ul></div>
      <p class="somatic-calibration-note">Bone-conduction support uses your system-selected audio route. ArcSweep does not control implants or medical devices. Navigation and Glyph Forge brush cues remain opt-in. Pressure changes cue strength, velocity subtly shifts pitch, and tilt changes duration only inside bounded ranges.</p>
    </div>`;
  root.appendChild(host);

  const gain = host.querySelector('[data-somatic-gain]');
  const audio = host.querySelector('[data-somatic-audio]');
  const haptic = host.querySelector('[data-somatic-haptic]');
  const quiet = host.querySelector('[data-somatic-quiet]');
  const navigation = host.querySelector('[data-somatic-navigation]');
  const brushContact = host.querySelector('[data-somatic-brush-contact]');
  const brushExpression = host.querySelector('[data-somatic-brush-expression]');
  const cooldown = host.querySelector('[data-somatic-cooldown]');
  const contactCooldown = host.querySelector('[data-somatic-contact-cooldown]');
  const expressionCooldown = host.querySelector('[data-somatic-expression-cooldown]');
  const minPressure = host.querySelector('[data-somatic-min-pressure]');
  const velocityRef = host.querySelector('[data-somatic-velocity-ref]');
  const statusEl = host.querySelector('[data-somatic-status]');
  const cuesEl = host.querySelector('[data-somatic-cues]');
  const channelsEl = host.querySelector('[data-somatic-channels]');

  function syncControls() {
    const state = profile.load();
    gain.value = String(state.gain_ceiling);
    audio.checked = state.channels.audio;
    haptic.checked = state.channels.haptic;
    quiet.checked = state.quiet_mode;
    navigation.checked = state.bindings.navigation;
    brushContact.checked = state.bindings.brush_contact;
    brushExpression.checked = state.bindings.brush_expression;
    cooldown.value = String(state.cooldown_ms);
    contactCooldown.value = String(state.brush.contact_cooldown_ms);
    expressionCooldown.value = String(state.brush.expression_cooldown_ms);
    minPressure.value = String(state.brush.min_pressure);
    velocityRef.value = String(state.brush.velocity_reference_px_s);
    return state;
  }

  function saveControls() {
    return profile.save({
      gain_ceiling: Number(gain.value),
      channels: { audio: audio.checked, haptic: haptic.checked },
      quiet_mode: quiet.checked,
      bindings: {
        navigation: navigation.checked,
        brush_contact: brushContact.checked,
        brush_expression: brushExpression.checked,
      },
      cooldown_ms: Number(cooldown.value),
      brush: {
        contact_cooldown_ms: Number(contactCooldown.value),
        expression_cooldown_ms: Number(expressionCooldown.value),
        min_pressure: Number(minPressure.value),
        velocity_reference_px_s: Number(velocityRef.value),
      },
    });
  }

  async function render() {
    const state = syncControls();
    const [status, catalog] = await Promise.all([somatic.status(), somatic.cues()]);
    const channelStatus = detectSomaticChannels(globalThis);
    statusEl.innerHTML = `<p><strong>${status.output?.cue_active ? 'Cue active' : 'Ready'}</strong> · profile ${profile.available() ? 'persistent' : 'session only'} · navigation ${state.bindings.navigation ? 'on' : 'off'} · brush ${state.bindings.brush_contact ? 'contact' : 'off'}${state.bindings.brush_expression ? ' + expression' : ''}</p>`;
    channelsEl.innerHTML = channelRows(channelStatus);
    const cues = catalog.output?.cues || [];
    cuesEl.innerHTML = `<h3>Semantic cues</h3>${cues.map((cue) => {
      const feedback = state.cue_feedback?.[cue.id];
      return `<article data-cue-id="${esc(cue.id)}"><div><strong>${esc(cue.id)}</strong><p>${esc(cue.meaning)}</p></div><button type="button" data-test-cue="${esc(cue.id)}">Test</button><select data-rate-cue="${esc(cue.id)}"><option value="">Rate…</option><option value="clear">clear</option><option value="muddy">muddy</option><option value="too-sharp">too sharp</option><option value="pleasant">pleasant</option><option value="indistinct">indistinct</option></select>${feedback ? `<small>Last: ${esc(feedback.rating)}</small>` : ''}</article>`;
    }).join('')}`;
  }

  host.addEventListener('click', async (event) => {
    if (event.target.closest('[data-somatic-close]')) { host.hidden = true; return; }
    const test = event.target.closest('[data-test-cue]');
    if (!test) return;
    const state = saveControls();
    if (state.quiet_mode) { statusEl.textContent = 'Quiet mode is active. Cue not emitted.'; return; }
    statusEl.textContent = `Emitting ${test.dataset.testCue}…`;
    const result = await somatic.emit(test.dataset.testCue, { channels: state.channels, gain_ceiling: state.gain_ceiling });
    statusEl.textContent = result.status === 'applied' ? `Completed ${test.dataset.testCue}.` : `Cue ${result.status}: ${result.reason || 'not emitted'}`;
  });

  host.addEventListener('change', (event) => {
    if (event.target.matches('[data-somatic-gain],[data-somatic-audio],[data-somatic-haptic],[data-somatic-quiet],[data-somatic-navigation],[data-somatic-brush-contact],[data-somatic-brush-expression],[data-somatic-cooldown],[data-somatic-contact-cooldown],[data-somatic-expression-cooldown],[data-somatic-min-pressure],[data-somatic-velocity-ref]')) saveControls();
    const rating = event.target.closest('[data-rate-cue]');
    if (rating?.value) {
      profile.rateCue(rating.dataset.rateCue, rating.value);
      void render();
    }
  });

  const api = Object.freeze({
    open: async () => { host.hidden = false; await render(); return profile.load(); },
    close: () => { host.hidden = true; },
    profile: () => profile.load(),
    saveProfile: (patch) => profile.save(patch),
    rateCue: (cueId, rating, note = '') => profile.rateCue(cueId, rating, note),
    channels: () => detectSomaticChannels(globalThis),
    element: host,
  });
  globalThis[GLOBAL_KEY] = api;
  globalThis.addEventListener?.('arcsweep:somatic-calibration-open', () => void api.open());
  return api;
}
