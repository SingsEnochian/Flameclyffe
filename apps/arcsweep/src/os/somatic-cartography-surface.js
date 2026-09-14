const GLOBAL_KEY = '__arcsweepSomaticCartographyCueSurface';
const MAX_CUES = 12;

function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function text(value) { return String(value == null ? '' : value); }

function dispatch(name, detail) {
  if (typeof globalThis.dispatchEvent !== 'function' || typeof CustomEvent === 'undefined') return;
  globalThis.dispatchEvent(new CustomEvent(name, { detail }));
}

function make(tag, className = null, value = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value != null) node.textContent = text(value);
  return node;
}

function cueLine(cue = {}) {
  if (cue.gesture_id) return `${cue.gesture_id}: ${cue.motion || cue.tracing_plane || 'trace when ready'}`;
  if (cue.posture) return `Posture: ${cue.posture}`;
  if (cue.pattern) return `Haptic cue: ${cue.pattern}`;
  return cue.transition || 'Somatic cue';
}

export function installSomaticCartographyCueSurface({ os = null } = {}) {
  if (globalThis[GLOBAL_KEY]) return globalThis[GLOBAL_KEY];
  const cues = [];
  let panel = null;
  let list = null;

  function render() {
    if (!list) return;
    list.replaceChildren();
    if (!cues.length) {
      list.appendChild(make('div', 'sc-empty', 'No active body-cues. The page is waiting for Rowan’s hand.'));
      return;
    }
    for (const cue of [...cues].reverse()) {
      const card = make('article', 'sc-cue');
      card.appendChild(make('strong', null, cueLine(cue)));
      card.appendChild(make('span', null, cue.arrival_condition ? `Arrival: ${cue.arrival_condition}` : 'Observe, do not force.'));
      list.appendChild(card);
    }
  }

  function ensurePanel() {
    if (panel || typeof document === 'undefined' || !document.body) return panel;
    const shell = document.querySelector('[data-arcsweep-os-shell]');
    const guide = shell?.querySelector?.('.os-guide');
    if (!shell || !guide) return null;

    const style = document.createElement('style');
    style.textContent = `
      [data-somatic-cartography-cues]{border-top:1px solid rgba(255,255,255,.08);padding:9px 13px;max-height:36vh;overflow:auto}
      .sc-head{display:flex;justify-content:space-between;gap:8px;align-items:center}.sc-head b{font-size:12px}.sc-head span,.sc-cue span,.sc-empty{font-size:10px;opacity:.65}.sc-list{display:grid;gap:6px;margin-top:7px}.sc-cue{border-left:2px solid rgba(220,180,95,.5);border-radius:0 8px 8px 0;background:rgba(255,255,255,.025);padding:6px 8px}.sc-cue strong{display:block;font-size:11px;margin-bottom:2px}
    `;
    shell.appendChild(style);

    panel = document.createElement('section');
    panel.dataset.somaticCartographyCues = 'v0.1';
    panel.setAttribute('aria-label', 'Somatic Cartography Cues');
    panel.appendChild(make('div', 'sc-head'));
    panel.firstChild.appendChild(make('b', null, 'Somatic Helm'));
    panel.firstChild.appendChild(make('span', null, 'Cues are presented before completion is claimed.'));
    list = make('div', 'sc-list');
    panel.appendChild(list);
    guide.parentNode.insertBefore(panel, guide);
    render();
    return panel;
  }

  function present(cue = {}) {
    const record = Object.freeze({
      schema: 'arcsweep.somatic-cartography-cue/v1',
      ...clone(cue),
      presented_at: new Date().toISOString(),
    });
    cues.push(record);
    if (cues.length > MAX_CUES) cues.splice(0, cues.length - MAX_CUES);
    ensurePanel();
    render();
    dispatch('arcsweep:somatic-cartography-cue-presented', record);
    return { applied: true, supported: true, cue_presented: true, cue_id: record.cue_id || record.gesture_id || record.posture || record.transition || null };
  }

  const api = Object.freeze({
    schema: 'arcsweep.somatic-cartography-cue-surface/v1',
    ready: true,
    present,
    cues: () => cues.map(clone),
    element: () => panel,
    install: ensurePanel,
  });
  globalThis[GLOBAL_KEY] = api;
  if (typeof document !== 'undefined') {
    if (document.body) queueMicrotask(ensurePanel);
    else document.addEventListener('DOMContentLoaded', ensurePanel, { once: true });
  }
  os?.bus?.publish?.('arcsweep:caretaker-alert', { message: 'Somatic Cartography cue surface mounted.' }, { source: 'somatic-cartography-surface' });
  return api;
}
