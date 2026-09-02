import { MODEL_PRESENCE_EVENT } from './model-presence-bus.js';
import {
  RUNESHELL_DEFAULTS,
  RUNESHELL_PREFS_KEY,
  normaliseRuneShellPrefs,
  runeShellEventKind,
  runeShellParticleBudget,
  shouldAnimateRuneShell,
} from './runeshell-native-core.js';

const RUNES = Object.freeze(['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚾ','ᛁ','ᛃ','ᛇ','ᛈ','ᛉ','ᛋ','ᛏ','ᛒ','ᛖ','ᛗ','ᛚ','ᛜ']);
const SIGILS = Object.freeze(['⚚','☸','🜃','☀','⛥','𓂀']);
const STYLE_ID = 'arcsweep-runeshell-native-styles';
const OVERLAY_ID = 'arcsweep-runeshell-native-overlay';
const ENTRY_SELECTOR = '.commons-chat-entry,.commons-entry,[data-house-entry],[data-entry-id],[data-stream-key]';
let installed = false;
let prefs = readPrefs();
let logObserver = null;
let rootObserver = null;
let composerBound = null;
const seenEntryKeys = new Set();

function readPrefs() {
  try { return normaliseRuneShellPrefs(JSON.parse(localStorage.getItem(RUNESHELL_PREFS_KEY) || 'null') || RUNESHELL_DEFAULTS); }
  catch { return normaliseRuneShellPrefs(RUNESHELL_DEFAULTS); }
}

function savePrefs(next) {
  prefs = normaliseRuneShellPrefs({ ...prefs, ...next });
  try { localStorage.setItem(RUNESHELL_PREFS_KEY, JSON.stringify(prefs)); } catch {}
  reflectState();
  return prefs;
}

function reducedMotion() { return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false; }
function canAnimate() { return shouldAnimateRuneShell(prefs, reducedMotion()); }
function pick(values) { return values[Math.floor(Math.random() * values.length)]; }
function entryKey(node) {
  if (!(node instanceof Element)) return '';
  const stable = node.dataset.entryId || node.dataset.streamKey || node.dataset.houseEntry || '';
  if (stable) return stable;
  const author = node.querySelector('header strong')?.textContent || '';
  const stamp = node.querySelector('header span')?.textContent || '';
  const text = node.querySelector('.commons-chat-body,p')?.textContent || '';
  return `${author}|${stamp}|${text.slice(0,180)}`;
}

function overlay() {
  let node = document.getElementById(OVERLAY_ID);
  if (node) return node;
  node = document.createElement('div');
  node.id = OVERLAY_ID;
  node.className = 'runeshell-native-overlay';
  node.setAttribute('aria-hidden', 'true');
  document.body.appendChild(node);
  return node;
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.runeshell-native-overlay{position:fixed;inset:0;z-index:2147483000;pointer-events:none;overflow:hidden;contain:layout style paint}
.runeshell-native-particle{position:absolute;pointer-events:none;user-select:none;will-change:transform,opacity;font-family:ui-serif,Georgia,serif}
.runeshell-native-rune{font-size:clamp(18px,2.3vw,28px);color:var(--sea,#9efeff);text-shadow:0 0 8px currentColor,0 0 22px color-mix(in srgb,currentColor 45%,transparent);animation:runeshell-native-float 1.9s ease-out forwards}
.runeshell-native-sigil{font-size:clamp(42px,7vw,76px);color:var(--gold,#f3d48e);text-shadow:0 0 14px currentColor,0 0 30px color-mix(in srgb,currentColor 38%,transparent);animation:runeshell-native-burst 1.5s ease-out forwards}
.runeshell-native-mist{width:150px;height:86px;border-radius:50%;background:radial-gradient(ellipse,rgba(210,250,255,.13),rgba(180,160,255,.05) 48%,transparent 72%);filter:blur(8px);animation:runeshell-native-mist 3.4s ease-out forwards}
.runeshell-native-warning{color:#f0b58c}.runeshell-native-ready{color:#b9dcae}.runeshell-native-voice{color:#d5b7ff}.runeshell-native-wake{color:#9efeff}
.runeshell-native-settings-button{min-height:42px;touch-action:manipulation}
.runeshell-native-sheet{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:2147483001;width:min(360px,calc(100vw - 24px));padding:1rem;border:1px solid color-mix(in srgb,var(--gold,#f3d48e) 45%,transparent);border-radius:18px;background:color-mix(in srgb,#0e1513 94%,transparent);box-shadow:0 18px 60px rgba(0,0,0,.45);backdrop-filter:blur(14px);color:#f0eadb}
.runeshell-native-sheet[hidden]{display:none}.runeshell-native-sheet h2{margin:.1rem 0 .8rem;font-size:1.05rem}.runeshell-native-sheet label{display:flex;gap:.65rem;align-items:center;justify-content:space-between;padding:.45rem 0}.runeshell-native-sheet select{min-height:38px}.runeshell-native-sheet-actions{display:flex;gap:.5rem;justify-content:flex-end;margin-top:.8rem;flex-wrap:wrap}
@keyframes runeshell-native-float{0%{opacity:0;transform:translate3d(0,8px,0) scale(.72) rotate(-7deg)}24%{opacity:1}100%{opacity:0;transform:translate3d(0,-52px,0) scale(1.28) rotate(15deg)}}
@keyframes runeshell-native-burst{0%{opacity:0;transform:translate(-50%,-50%) scale(.35) rotate(-12deg)}30%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(2) rotate(18deg)}}
@keyframes runeshell-native-mist{0%{opacity:0;transform:translate(-18px,10px) scale(.7)}30%{opacity:.72}100%{opacity:0;transform:translate(60px,-28px) scale(1.55)}}
@media(max-width:820px){.runeshell-native-sheet{left:12px;right:12px;bottom:max(12px,env(safe-area-inset-bottom));width:auto;max-height:min(70vh,560px);overflow:auto}.runeshell-native-settings-button{min-width:46px;min-height:46px}}
@media(prefers-reduced-motion:reduce){.runeshell-native-particle{animation-duration:.01ms!important;animation-iteration-count:1!important}}
`;
  document.head.appendChild(style);
}

function particle(className, text = '', point = null) {
  if (!canAnimate()) return null;
  const el = document.createElement('span');
  el.className = `runeshell-native-particle ${className}`;
  el.textContent = text;
  const x = point?.x ?? innerWidth * (.18 + Math.random() * .64);
  const y = point?.y ?? innerHeight * (.18 + Math.random() * .62);
  el.style.left = `${Math.max(8, Math.min(innerWidth - 8, x))}px`;
  el.style.top = `${Math.max(8, Math.min(innerHeight - 8, y))}px`;
  overlay().appendChild(el);
  el.addEventListener('animationend', () => el.remove(), { once: true });
  setTimeout(() => el.remove(), 5000);
  return el;
}

function burst(kind = 'ambient', point = null) {
  if (!canAnimate()) return;
  const budget = runeShellParticleBudget(prefs.intensity);
  particle(`runeshell-native-sigil runeshell-native-${kind}`, pick(SIGILS), point || { x: innerWidth * .5, y: innerHeight * .45 });
  for (let i = 0; i < budget; i += 1) setTimeout(() => particle(`runeshell-native-rune runeshell-native-${kind}`, pick(RUNES), point), i * 90);
  if (prefs.intensity !== 'quiet') particle('runeshell-native-mist', '', point);
}

function composerPoint(editor) {
  const rect = editor.getBoundingClientRect();
  return { x: rect.left + Math.random() * Math.max(24, rect.width), y: rect.top + Math.random() * Math.max(24, rect.height) };
}

function bindComposer() {
  const editor = document.querySelector('[data-commons-native-editor]');
  if (!editor || editor === composerBound) return;
  composerBound = editor;
  editor.addEventListener('input', () => {
    if (!prefs.typing || !canAnimate()) return;
    const chance = prefs.intensity === 'bright' ? .68 : prefs.intensity === 'quiet' ? .18 : .38;
    if (Math.random() > chance) return;
    particle('runeshell-native-rune runeshell-native-wake', pick(RUNES), composerPoint(editor));
  });
}

function rememberCurrentEntries(log) {
  log.querySelectorAll(ENTRY_SELECTOR).forEach((node) => {
    const key = entryKey(node); if (key) seenEntryKeys.add(key);
  });
}

function entryPoint(entry) {
  const rect = entry.getBoundingClientRect();
  return {
    x: Math.min(innerWidth - 24, Math.max(24, rect.left + rect.width * .72)),
    y: Math.min(innerHeight - 24, Math.max(24, rect.top + 28)),
  };
}

function bindLog() {
  const log = document.querySelector('[data-house-chat-log],.commons-log');
  if (!log || logObserver?.target === log) return;
  logObserver?.observer?.disconnect();
  rememberCurrentEntries(log);
  const observer = new MutationObserver((mutations) => {
    if (!prefs.incoming || !canAnimate()) return;
    const newEntries = [];
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) continue;
        const candidates = node.matches?.(ENTRY_SELECTOR) ? [node] : [...(node.querySelectorAll?.(ENTRY_SELECTOR) || [])];
        for (const entry of candidates) {
          const key = entryKey(entry);
          if (!key || seenEntryKeys.has(key)) continue;
          seenEntryKeys.add(key);
          newEntries.push(entry);
        }
      }
    }
    const newest = newEntries.at(-1);
    if (newest) burst(newest.dataset.kind === 'voice' ? 'voice' : 'ambient', entryPoint(newest));
  });
  observer.observe(log, { childList: true, subtree: true });
  logObserver = { observer, target: log };
}

function settingsSheet() {
  let sheet = document.querySelector('[data-runeshell-native-sheet]');
  if (sheet) return sheet;
  sheet = document.createElement('section');
  sheet.className = 'runeshell-native-sheet';
  sheet.dataset.runeshellNativeSheet = 'true';
  sheet.hidden = true;
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-label', 'RuneShell settings');
  sheet.innerHTML = `<h2>RuneShell</h2>
    <label><span>Enabled</span><input type="checkbox" data-runeshell-pref="enabled"></label>
    <label><span>Typing glyphs</span><input type="checkbox" data-runeshell-pref="typing"></label>
    <label><span>Incoming message bursts</span><input type="checkbox" data-runeshell-pref="incoming"></label>
    <label><span>Flame presence effects</span><input type="checkbox" data-runeshell-pref="presence"></label>
    <label><span>Respect Reduce Motion</span><input type="checkbox" data-runeshell-pref="respectReducedMotion"></label>
    <label><span>Intensity</span><select data-runeshell-intensity><option value="quiet">Quiet</option><option value="normal">Normal</option><option value="bright">Bright</option></select></label>
    <div class="runeshell-native-sheet-actions"><button type="button" class="quiet" data-runeshell-test>Test burst</button><button type="button" data-runeshell-close>Done</button></div>`;
  document.body.appendChild(sheet);
  sheet.querySelectorAll('[data-runeshell-pref]').forEach((input) => input.addEventListener('change', () => savePrefs({ [input.dataset.runeshellPref]: input.checked })));
  sheet.querySelector('[data-runeshell-intensity]').addEventListener('change', (event) => savePrefs({ intensity: event.target.value }));
  sheet.querySelector('[data-runeshell-test]').addEventListener('click', () => burst('voice'));
  sheet.querySelector('[data-runeshell-close]').addEventListener('click', () => { sheet.hidden = true; });
  return sheet;
}

function settingsButton() {
  let button = document.querySelector('[data-runeshell-native-settings]');
  if (button) return button;
  const actions = document.querySelector('.house-chat-native-actions');
  if (!actions) return null;
  button = document.createElement('button');
  button.type = 'button';
  button.className = 'quiet runeshell-native-settings-button';
  button.dataset.runeshellNativeSettings = 'true';
  button.setAttribute('aria-label', 'RuneShell settings');
  button.addEventListener('click', () => {
    const sheet = settingsSheet();
    sheet.hidden = !sheet.hidden;
    reflectState();
  });
  actions.prepend(button);
  return button;
}

function reflectState() {
  const sheet = document.querySelector('[data-runeshell-native-sheet]');
  if (sheet) {
    sheet.querySelectorAll('[data-runeshell-pref]').forEach((input) => { input.checked = Boolean(prefs[input.dataset.runeshellPref]); });
    const intensity = sheet.querySelector('[data-runeshell-intensity]'); if (intensity) intensity.value = prefs.intensity;
  }
  const button = document.querySelector('[data-runeshell-native-settings]');
  if (button) { button.dataset.enabled = String(prefs.enabled); button.textContent = prefs.enabled ? 'ᚱ RuneShell' : 'ᚱ RuneShell off'; }
  const host = document.getElementById(OVERLAY_ID); if (host) host.hidden = !prefs.enabled;
}

function decorateHouse() {
  settingsButton();
  bindComposer();
  bindLog();
  reflectState();
}

function onPresence(event) {
  if (!prefs.presence || !canAnimate()) return;
  const kind = runeShellEventKind(event.detail || {});
  if (kind === 'voice' || kind === 'wake' || kind === 'warning') burst(kind);
}

export function installNativeRuneShell() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  ensureStyles();
  overlay();
  settingsSheet();
  decorateHouse();
  document.addEventListener(MODEL_PRESENCE_EVENT, onPresence);
  globalThis.addEventListener('arcsweep:house-chat-surface-mounted', decorateHouse);
  document.addEventListener('arcsweep:house-room-metadata-changed', decorateHouse);
  rootObserver = new MutationObserver(() => queueMicrotask(decorateHouse));
  rootObserver.observe(document.body, { childList: true, subtree: true });
  globalThis.addEventListener?.('beforeunload', () => {
    rootObserver?.disconnect();
    logObserver?.observer?.disconnect();
  }, { once: true });
  globalThis.__arcsweepRuneShell = Object.freeze({
    prefs: () => ({ ...prefs }),
    setPrefs: (next) => ({ ...savePrefs(next) }),
    burst: (kind = 'ambient') => burst(kind),
  });
}

if (typeof document !== 'undefined') installNativeRuneShell();
