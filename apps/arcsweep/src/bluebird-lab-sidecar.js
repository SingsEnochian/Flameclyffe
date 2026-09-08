import {
  applyBluebirdEnvelope,
  applyBluebirdFeedback,
  buildBluebirdSystemPrompt,
  buildBluebirdVibrationPattern,
  createBluebirdReceipt,
  createBluebirdState,
  parseBluebirdEnvelope,
} from './bluebird-embodiment-core.js';
import { invokeConstellationRuntimeVoice } from './constellation-runtime-adapter.js';
import { publishModelPresence } from './model-presence-bus.js';

const STORAGE_KEY = 'arcsweep.bluebird-lab/v0.1';
const MAX_HISTORY = 40;
const MAX_RECEIPTS = 100;
const GITHUB_PAGES_CHARACTER_URL = 'https://flameclyffe.vercel.app/api/v1/residents/tesla/chat';

let opened = false;
let busy = false;
let runtimeLine = 'Bluebird Direct route not yet called.';
let outputLine = 'Outputs are disarmed.';
let lastError = '';
let audioContext = null;
const activeAudioNodes = new Set();
let observer = null;

const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

function loadLab() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch {}
  return {
    state: createBluebirdState(raw?.state || {}),
    history: Array.isArray(raw?.history) ? raw.history.slice(-MAX_HISTORY) : [],
    receipts: Array.isArray(raw?.receipts) ? raw.receipts.slice(-MAX_RECEIPTS) : [],
    // Keep the legacy storage value so existing local state survives the provider-label correction.
    backend: raw?.backend === 'house-bluebird' ? 'house-bluebird' : 'qwen-character',
    settings: {
      audio: raw?.settings?.audio !== false,
      haptics: raw?.settings?.haptics !== false,
    },
    outputArmed: false,
  };
}

let lab = loadLab();

function saveLab() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      state: lab.state,
      history: lab.history.slice(-MAX_HISTORY),
      receipts: lab.receipts.slice(-MAX_RECEIPTS),
      backend: lab.backend,
      settings: lab.settings,
    }));
  } catch {}
}

function characterEndpoint() {
  return /(?:^|\.)github\.io$/i.test(globalThis.location?.hostname || '')
    ? GITHUB_PAGES_CHARACTER_URL
    : '/api/v1/residents/tesla/chat';
}

function modelMessages() {
  return lab.history.slice(-18).map((item) => ({
    role: item.role === 'assistant' ? 'assistant' : 'user',
    content: item.kind === 'feedback'
      ? `EMBODIMENT FEEDBACK FROM ROWAN: ${String(item.text || '').toUpperCase()}`
      : String(item.text || ''),
  })).filter((item) => item.content.trim());
}

async function callQwenCharacter() {
  const started = performance?.now?.() ?? Date.now();
  const response = await fetch(characterEndpoint(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      resident: 'tesla',
      model: 'bluebird-api',
      system: buildBluebirdSystemPrompt(lab.state, { recentReceipts: lab.receipts }),
      messages: modelMessages(),
      max_tokens: 900,
    }),
  });
  const latencyMs = Math.max(0, Math.round((performance?.now?.() ?? Date.now()) - started));
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Bluebird Direct route failed (${response.status}).`);
  return {
    text: String(data.reply || '').trim(),
    provider: data.provider || 'bluebird-api',
    model: data.model || 'deepseek-chat',
    backend: 'qwen-character',
    latencyMs,
  };
}

async function callHouseBluebird(message) {
  const reply = await invokeConstellationRuntimeVoice({
    voiceId: 'bluebird',
    message: `${buildBluebirdSystemPrompt(lab.state, { recentReceipts: lab.receipts })}\n\nCURRENT MESSAGE FROM ROWAN\n${message}`,
    sessionId: 'bluebird-embodiment-lab-v01',
    metadata: { surface: 'bluebird-lab', embodiment_contract: 'arcsweep.bluebird-embodiment/v0.1' },
  });
  if (reply.status !== 'replied') throw new Error(reply.reason || `House Bluebird returned ${reply.status}.`);
  return {
    text: reply.message,
    provider: reply.provider,
    model: reply.model,
    backend: 'house-bluebird',
    latencyMs: reply.latencyMs,
  };
}

function pulseShape(intent) {
  const beat = 60 / intent.tempo;
  if (intent.gesture === 'flutter') return [[0, .055, 72], [.105, .045, 78], [.195, .06, 68], [.42, .04, 82]];
  if (intent.gesture === 'approach') return [[0, .045, 56], [.22, .06, 58], [.42, .075, 60], [.59, .095, 62]];
  if (intent.gesture === 'hold') return [[0, Math.min(.38, beat * .42), 52], [beat * .62, Math.min(.3, beat * .34), 48]];
  if (intent.gesture === 'release') return [[0, .12, 58], [.24, .09, 54], [.46, .065, 50], [.7, .04, 46]];
  if (intent.gesture === 'settle') return [[0, .07, 54], [beat * .82, .06, 50]];
  return [[0, .075, 58], [.18, .1, 46]];
}

function stopOutputs(reason = 'Output stopped.') {
  try { navigator.vibrate?.(0); } catch {}
  for (const node of [...activeAudioNodes]) {
    try { node.stop(); } catch {}
    activeAudioNodes.delete(node);
  }
  outputLine = reason;
}

async function ensureAudio() {
  if (!lab.settings.audio) return null;
  const AudioCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioCtor) return null;
  if (!audioContext || audioContext.state === 'closed') audioContext = new AudioCtor();
  if (audioContext.state === 'suspended') await audioContext.resume();
  return audioContext;
}

function scheduleTone(ctx, when, duration, frequency, gainAmount) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(Math.max(.0002, gainAmount), when + .012);
  gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
  osc.connect(gain).connect(ctx.destination);
  activeAudioNodes.add(osc);
  osc.onended = () => activeAudioNodes.delete(osc);
  osc.start(when);
  osc.stop(when + duration + .02);
}

async function playIntent(intent) {
  if (!intent) return;
  if (!lab.outputArmed) { outputLine = 'Gesture received; outputs are disarmed.'; return; }
  if (intent.consent !== 'open' || intent.intensity <= 0) {
    stopOutputs(intent.consent === 'check' ? 'Bluebird asked for a consent check; nothing rendered.' : `Bluebird output state is ${intent.consent}; nothing rendered.`);
    return;
  }

  stopOutputs('Preparing gesture…');
  const tasks = [];
  if (lab.settings.haptics && navigator.vibrate) {
    try {
      const pattern = buildBluebirdVibrationPattern(intent);
      if (pattern.length) navigator.vibrate(pattern);
    } catch {}
  }

  if (lab.settings.audio) {
    tasks.push(ensureAudio().then((ctx) => {
      if (!ctx) return;
      const now = ctx.currentTime + .035;
      const cycle = Math.max(.42, 60 / intent.tempo);
      const shape = pulseShape(intent);
      const gainAmount = Math.min(.11, .012 + intent.intensity * .07);
      for (let base = 0; base < intent.duration; base += cycle) {
        for (const [offset, duration, frequency] of shape) {
          if (base + offset > intent.duration) continue;
          scheduleTone(ctx, now + base + offset, duration, frequency, gainAmount);
        }
      }
    }));
  }
  await Promise.allSettled(tasks);
  const hapticLabel = lab.settings.haptics && navigator.vibrate ? 'haptic' : lab.settings.haptics ? 'haptic unavailable here' : 'haptic off';
  const audioLabel = lab.settings.audio ? 'audio proxy' : 'audio off';
  outputLine = `${intent.gesture} · ${Math.round(intent.intensity * 100)}% · ${intent.tempo} BPM · ${audioLabel} · ${hapticLabel}`;
}

function addHistory(role, text, kind = 'chat') {
  lab.history.push({ role, text: String(text || ''), kind, at: new Date().toISOString() });
  lab.history = lab.history.slice(-MAX_HISTORY);
}

function addReceipt(receipt) {
  lab.receipts.push(receipt);
  lab.receipts = lab.receipts.slice(-MAX_RECEIPTS);
}

function stateMeter(label, key) {
  const value = Number(lab.state[key] || 0);
  return `<label class="bluebird-meter"><span>${esc(label)}</span><meter min="0" max="1" value="${value}"></meter><b>${Math.round(value * 100)}</b></label>`;
}

function chatMarkup() {
  const visible = lab.history.filter((item) => item.kind !== 'feedback').slice(-18);
  if (!visible.length) return '<p class="bluebird-empty">The perch is quiet. Start with whatever you actually want to say.</p>';
  return visible.map((item) => `<article class="bluebird-turn ${item.role === 'assistant' ? 'bluebird-turn-bird' : 'bluebird-turn-rowan'}"><header>${item.role === 'assistant' ? 'Bluebird' : 'Rowan'}</header><p>${esc(item.text).replaceAll('\n', '<br>')}</p></article>`).join('');
}

function intentMarkup() {
  const intent = lab.state.currentIntent;
  if (!intent) return '<p class="bluebird-empty">No gesture has been offered yet.</p>';
  return `<dl class="bluebird-intent-grid"><div><dt>Gesture</dt><dd>${esc(intent.gesture)}</dd></div><div><dt>Affect</dt><dd>${esc(intent.affect)}</dd></div><div><dt>Intensity</dt><dd>${Math.round(intent.intensity * 100)}%</dd></div><div><dt>Tempo</dt><dd>${Math.round(intent.tempo)} BPM</dd></div><div><dt>Duration</dt><dd>${intent.duration.toFixed(1)} s</dd></div><div><dt>Gate</dt><dd>${esc(intent.consent)}</dd></div></dl>`;
}

function receiptMarkup() {
  const items = lab.receipts.slice(-5).reverse();
  if (!items.length) return '<p class="bluebird-empty">No embodiment receipts yet.</p>';
  return items.map((item) => `<div class="bluebird-receipt"><span>${item.feedback ? `Rowan: ${esc(item.feedback)}` : esc(item.intent?.gesture || 'turn')}</span><small>${esc(new Date(item.at).toLocaleTimeString())}${item.runtime?.model ? ` · ${esc(item.runtime.model)}` : ''}</small></div>`).join('');
}

function panelMarkup() {
  return `<div class="bluebird-lab-backdrop" data-bluebird-close></div>
  <aside class="bluebird-lab-panel" role="dialog" aria-modal="false" aria-label="Bluebird Embodiment Lab">
    <header class="bluebird-lab-head"><div><p>ArcSweep · Embodiment</p><h2>Bluebird Lab <span>v0.1</span></h2></div><button type="button" class="quiet mini" data-bluebird-close aria-label="Close Bluebird Lab">×</button></header>
    <section class="bluebird-runtime-strip"><label>Runtime<select data-bluebird-backend><option value="qwen-character" ${lab.backend === 'qwen-character' ? 'selected' : ''}>Bluebird Direct · DeepSeek</option><option value="house-bluebird" ${lab.backend === 'house-bluebird' ? 'selected' : ''}>House Bluebird route</option></select></label><small>${esc(runtimeLine)}</small>${lastError ? `<p class="bluebird-error">${esc(lastError)}</p>` : ''}</section>
    <section class="bluebird-state"><div class="bluebird-section-title"><h3>Live state</h3><span>${esc(lab.state.consent)}</span></div><div class="bluebird-meters">${stateMeter('Energy', 'energy')}${stateMeter('Affection', 'affection')}${stateMeter('Curiosity', 'curiosity')}${stateMeter('Play', 'playfulness')}${stateMeter('Intimacy', 'intimacy')}${stateMeter('Hesitation', 'hesitation')}</div></section>
    <section class="bluebird-chat"><div class="bluebird-section-title"><h3>Conversation</h3><span>${lab.history.length} context turns</span></div><div class="bluebird-chat-log" data-bluebird-chat-log>${chatMarkup()}</div><form data-bluebird-form><textarea name="message" rows="3" placeholder="Talk to Richie…" ${busy ? 'disabled' : ''}></textarea><button type="submit" ${busy ? 'disabled' : ''}>${busy ? 'Bluebird is answering…' : 'Send'}</button></form></section>
    <section class="bluebird-gesture"><div class="bluebird-section-title"><h3>Offered gesture</h3><span>semantic, then rendered</span></div>${intentMarkup()}<div class="bluebird-feedback"><button type="button" data-bluebird-feedback="again">Again</button><button type="button" data-bluebird-feedback="more">More</button><button type="button" data-bluebird-feedback="less">Less</button><button type="button" data-bluebird-feedback="different">Different</button><button type="button" class="quiet" data-bluebird-feedback="pause">Pause</button></div></section>
    <section class="bluebird-output"><div class="bluebird-section-title"><h3>Output gate</h3><span>${lab.outputArmed ? 'armed' : 'disarmed'}</span></div><div class="bluebird-output-controls"><button type="button" data-bluebird-arm>${lab.outputArmed ? 'Disarm output' : lab.state.consent === 'pause' ? 'Resume + arm output' : 'Arm output'}</button><label><input type="checkbox" data-bluebird-audio ${lab.settings.audio ? 'checked' : ''}> Audio pulse</label><label><input type="checkbox" data-bluebird-haptics ${lab.settings.haptics ? 'checked' : ''}> Device haptic</label></div><p>${esc(outputLine)}</p><button type="button" class="bluebird-feather" data-bluebird-feather>Feather · pause everything</button></section>
    <section class="bluebird-receipts"><div class="bluebird-section-title"><h3>Recent receipts</h3><span>${lab.receipts.length}</span></div>${receiptMarkup()}</section>
  </aside>`;
}

function ensureStyles() {
  if (document.getElementById('bluebird-lab-styles')) return;
  const style = document.createElement('style');
  style.id = 'bluebird-lab-styles';
  style.textContent = `
  #bluebird-lab-root{position:fixed;inset:0;z-index:15000;pointer-events:none;font-family:inherit;color:var(--text,#f0eadb)}
  #bluebird-lab-root[data-open="true"]{pointer-events:auto}.bluebird-lab-backdrop{position:absolute;inset:0;background:rgba(3,7,7,.58);opacity:0;transition:opacity .2s}.bluebird-lab-panel{position:absolute;top:0;right:0;width:min(38rem,100vw);height:100vh;height:100dvh;overflow:auto;padding:1rem 1rem 4rem;background:color-mix(in srgb,var(--panel-solid,#18221f) 96%,#07100d);border-left:1px solid color-mix(in srgb,var(--gold,#d8b56a) 50%,transparent);box-shadow:-18px 0 60px rgba(0,0,0,.4);transform:translateX(104%);transition:transform .22s ease}
  #bluebird-lab-root[data-open="true"] .bluebird-lab-backdrop{opacity:1}#bluebird-lab-root[data-open="true"] .bluebird-lab-panel{transform:translateX(0)}
  .bluebird-lab-head,.bluebird-section-title,.bluebird-output-controls,.bluebird-runtime-strip{display:flex;gap:.7rem;align-items:center;justify-content:space-between}.bluebird-lab-head{position:sticky;top:-1rem;z-index:2;padding:1rem 0;background:inherit}.bluebird-lab-head p,.bluebird-lab-head h2{margin:0}.bluebird-lab-head p{text-transform:uppercase;letter-spacing:.12em;font-size:.72rem;opacity:.66}.bluebird-lab-head h2 span{font-size:.72rem;font-weight:500;opacity:.6}
  .bluebird-lab-panel section{margin:.85rem 0;padding:.9rem;border:1px solid color-mix(in srgb,var(--green,#8ebca6) 24%,transparent);border-radius:1rem;background:color-mix(in srgb,var(--panel-solid,#18221f) 88%,transparent)}.bluebird-section-title h3{margin:.1rem 0}.bluebird-section-title span{font-size:.78rem;opacity:.62}
  .bluebird-runtime-strip{align-items:flex-start;flex-direction:column}.bluebird-runtime-strip label{width:100%;display:grid;gap:.25rem}.bluebird-runtime-strip select,.bluebird-chat textarea{width:100%}.bluebird-runtime-strip small{opacity:.72}.bluebird-error{margin:.15rem 0 0;color:#ffb6ad}
  .bluebird-meters{display:grid;grid-template-columns:1fr 1fr;gap:.45rem .8rem}.bluebird-meter{display:grid;grid-template-columns:5rem 1fr 2.4rem;gap:.4rem;align-items:center;font-size:.8rem}.bluebird-meter meter{width:100%}.bluebird-meter b{text-align:right;font-variant-numeric:tabular-nums}
  .bluebird-chat-log{display:grid;gap:.55rem;max-height:34vh;overflow:auto;padding:.4rem .15rem .7rem}.bluebird-turn{max-width:88%;padding:.65rem .75rem;border-radius:1rem}.bluebird-turn header{font-size:.72rem;font-weight:700;opacity:.68}.bluebird-turn p{margin:.2rem 0 0;line-height:1.45}.bluebird-turn-rowan{margin-left:auto;background:color-mix(in srgb,var(--gold,#d8b56a) 14%,transparent)}.bluebird-turn-bird{background:color-mix(in srgb,#6fb8ff 13%,transparent);border:1px solid color-mix(in srgb,#8cc8ff 24%,transparent)}.bluebird-chat form{display:grid;grid-template-columns:1fr auto;gap:.55rem;align-items:end}.bluebird-chat textarea{resize:vertical;min-height:4.5rem}
  .bluebird-intent-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.45rem;margin:.7rem 0}.bluebird-intent-grid div{padding:.45rem;border-radius:.65rem;background:rgba(255,255,255,.035)}.bluebird-intent-grid dt{font-size:.68rem;opacity:.62;text-transform:uppercase}.bluebird-intent-grid dd{margin:.12rem 0 0;font-weight:700}.bluebird-feedback{display:grid;grid-template-columns:repeat(5,1fr);gap:.4rem}.bluebird-feedback button{min-width:0;padding:.55rem .35rem}
  .bluebird-output-controls{justify-content:flex-start;flex-wrap:wrap}.bluebird-output-controls label{display:flex;gap:.35rem;align-items:center}.bluebird-output p{font-size:.82rem;opacity:.76}.bluebird-feather{width:100%;margin-top:.5rem;border-color:#dca6ff!important;background:color-mix(in srgb,#8f62bd 18%,transparent)!important}.bluebird-receipt{display:flex;justify-content:space-between;gap:.6rem;padding:.35rem 0;border-bottom:1px solid rgba(255,255,255,.06)}.bluebird-receipt small{opacity:.6}.bluebird-empty{opacity:.62;font-style:italic}
  .bluebird-lab-nav{position:relative}.bluebird-lab-nav::after{content:'v0.1';position:absolute;right:.5rem;font-size:.55rem;opacity:.45}
  @media(max-width:620px){.bluebird-lab-panel{width:100vw}.bluebird-meters{grid-template-columns:1fr}.bluebird-feedback{grid-template-columns:repeat(3,1fr)}.bluebird-intent-grid{grid-template-columns:repeat(2,1fr)}.bluebird-chat form{grid-template-columns:1fr}}
  `;
  document.head.append(style);
}

function ensureRoot() {
  let root = document.getElementById('bluebird-lab-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'bluebird-lab-root';
    root.dataset.open = 'false';
    document.body.append(root);
  }
  return root;
}

function renderPanel({ focusComposer = false } = {}) {
  const root = ensureRoot();
  root.dataset.open = opened ? 'true' : 'false';
  root.innerHTML = panelMarkup();
  root.querySelectorAll('[data-bluebird-close]').forEach((button) => button.addEventListener('click', closeLab));
  root.querySelector('[data-bluebird-backend]')?.addEventListener('change', (event) => {
    lab.backend = event.target.value === 'house-bluebird' ? 'house-bluebird' : 'qwen-character';
    runtimeLine = lab.backend === 'qwen-character' ? 'Bluebird Direct selected. Uses the canonical Bluebird DeepSeek route.' : 'House Bluebird selected. Uses the active House Runtime route.';
    lastError = '';
    saveLab(); renderPanel();
  });
  root.querySelector('[data-bluebird-audio]')?.addEventListener('change', (event) => { lab.settings.audio = event.target.checked; if (!lab.settings.audio) stopOutputs('Audio pulse disabled.'); saveLab(); renderPanel(); });
  root.querySelector('[data-bluebird-haptics]')?.addEventListener('change', (event) => { lab.settings.haptics = event.target.checked; if (!lab.settings.haptics) try { navigator.vibrate?.(0); } catch {} saveLab(); renderPanel(); });
  root.querySelector('[data-bluebird-arm]')?.addEventListener('click', async () => {
    if (lab.outputArmed) { lab.outputArmed = false; stopOutputs('Outputs disarmed.'); }
    else {
      lab.outputArmed = true;
      if (lab.state.consent === 'pause' || lab.state.consent === 'stop') lab.state = { ...lab.state, consent: 'open', currentIntent: lab.state.currentIntent ? { ...lab.state.currentIntent, consent: 'open' } : null };
      outputLine = 'Outputs armed. A gesture still has to pass the Bluebird + Rowan gate.';
      if (lab.state.currentIntent?.consent === 'open') await playIntent(lab.state.currentIntent);
    }
    saveLab(); renderPanel();
  });
  root.querySelector('[data-bluebird-feather]')?.addEventListener('click', () => {
    lab.state = applyBluebirdFeedback(lab.state, 'feather');
    lab.outputArmed = false;
    addHistory('user', 'feather', 'feedback');
    addReceipt(createBluebirdReceipt({ intent: lab.state.currentIntent, feedback: 'feather' }));
    stopOutputs('Feather received. Everything paused; resume requires an explicit arm action.');
    saveLab(); renderPanel();
  });
  root.querySelectorAll('[data-bluebird-feedback]').forEach((button) => button.addEventListener('click', async () => {
    const feedback = button.dataset.bluebirdFeedback;
    lab.state = applyBluebirdFeedback(lab.state, feedback);
    addHistory('user', feedback, 'feedback');
    addReceipt(createBluebirdReceipt({ intent: lab.state.currentIntent, feedback }));
    if (feedback === 'pause') { stopOutputs('Paused by Rowan.'); }
    else if (lab.state.currentIntent) await playIntent(lab.state.currentIntent);
    saveLab(); renderPanel();
  }));
  root.querySelector('[data-bluebird-form]')?.addEventListener('submit', handleSend);
  const log = root.querySelector('[data-bluebird-chat-log]'); if (log) log.scrollTop = log.scrollHeight;
  if (focusComposer) root.querySelector('textarea[name="message"]')?.focus();
}

async function handleSend(event) {
  event.preventDefault();
  if (busy) return;
  const form = event.currentTarget;
  const message = String(new FormData(form).get('message') || '').trim();
  if (!message) return;
  if (message.toLowerCase() === 'feather') {
    lab.state = applyBluebirdFeedback(lab.state, 'feather');
    lab.outputArmed = false;
    addHistory('user', message);
    addReceipt(createBluebirdReceipt({ intent: lab.state.currentIntent, feedback: 'feather' }));
    stopOutputs('Feather received. Everything paused; resume requires an explicit arm action.');
    saveLab(); renderPanel({ focusComposer: true }); return;
  }

  addHistory('user', message);
  busy = true; lastError = ''; runtimeLine = lab.backend === 'qwen-character' ? 'Calling Bluebird Direct…' : 'Calling House Bluebird…';
  publishModelPresence({ voiceId: 'bluebird', displayName: 'Bluebird', state: 'thinking', task: 'bluebird-embodiment-lab' });
  saveLab(); renderPanel();
  try {
    const runtime = lab.backend === 'qwen-character' ? await callQwenCharacter() : await callHouseBluebird(message);
    const envelope = parseBluebirdEnvelope(runtime.text);
    lab.state = applyBluebirdEnvelope(lab.state, envelope);
    addHistory('assistant', envelope.text || runtime.text);
    addReceipt(createBluebirdReceipt({ intent: envelope.embodiment, runtime, text: envelope.text || runtime.text }));
    runtimeLine = `${runtime.provider || runtime.backend} · ${runtime.model || 'unknown model'} · ${runtime.latencyMs ?? '?'} ms`;
    publishModelPresence({ voiceId: 'bluebird', displayName: 'Bluebird', state: 'speaking', provider: runtime.provider, model: runtime.model, latencyMs: runtime.latencyMs, task: 'bluebird-embodiment-reply' });
    await playIntent(lab.state.currentIntent);
    queueMicrotask(() => publishModelPresence({ voiceId: 'bluebird', displayName: 'Bluebird', state: 'ready', provider: runtime.provider, model: runtime.model, latencyMs: runtime.latencyMs, task: null }));
  } catch (error) {
    lastError = error?.message || String(error);
    runtimeLine = 'Runtime did not answer.';
    publishModelPresence({ voiceId: 'bluebird', displayName: 'Bluebird', state: 'degraded', reason: lastError, task: null });
  } finally {
    busy = false;
    saveLab(); renderPanel({ focusComposer: true });
  }
}

function openLab() {
  opened = true;
  ensureNavButton();
  renderPanel({ focusComposer: true });
}

function closeLab() {
  opened = false;
  stopOutputs(lab.outputArmed ? 'Panel closed; scheduled output stopped.' : outputLine);
  const root = ensureRoot(); root.dataset.open = 'false';
  ensureNavButton();
}

function ensureNavButton() {
  const nav = document.querySelector('.sidebar nav');
  if (!nav) return;
  let button = nav.querySelector('[data-bluebird-lab-open]');
  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'nav-button bluebird-lab-nav';
    button.dataset.bluebirdLabOpen = 'true';
    button.innerHTML = '<span aria-hidden="true">🐦</span><span>Bluebird Lab</span>';
    const commons = nav.querySelector('[data-room="commons"]');
    if (commons?.nextSibling) nav.insertBefore(button, commons.nextSibling); else nav.append(button);
    button.addEventListener('click', openLab);
  }
  button.classList.toggle('active', opened);
}

export function installBluebirdLabSidecar() {
  if (typeof document === 'undefined' || globalThis.__arcsweepBluebirdLabInstalled) return false;
  globalThis.__arcsweepBluebirdLabInstalled = 'arcsweep.bluebird-lab-sidecar/v0.1';
  ensureStyles(); ensureRoot(); ensureNavButton(); renderPanel();
  observer = new MutationObserver(() => ensureNavButton());
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && opened) closeLab(); });
  globalThis.addEventListener?.('beforeunload', () => { observer?.disconnect(); stopOutputs('Page closing.'); }, { once: true });
  globalThis.__bluebirdLab = {
    open: openLab,
    close: closeLab,
    state: () => structuredClone(lab.state),
    receipts: () => structuredClone(lab.receipts),
    feather: () => {
      lab.state = applyBluebirdFeedback(lab.state, 'feather');
      lab.outputArmed = false; stopOutputs('Feather received.'); saveLab(); renderPanel();
    },
  };
  return true;
}

if (typeof document !== 'undefined') installBluebirdLabSidecar();
