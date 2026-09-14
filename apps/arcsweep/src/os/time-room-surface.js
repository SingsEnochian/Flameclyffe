function text(value) { return String(value == null ? '' : value); }

function make(tag, className = null, value = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value != null) node.textContent = text(value);
  return node;
}

function titleCase(value) {
  return text(value).replace(/^./, (char) => char.toUpperCase());
}

function clockLabel(clock = {}) {
  const layer = clock.layer ? ` · ${clock.layer}` : '';
  return `${clock.label || clock.clock_id || 'Clock'}${layer}`;
}

async function readTimeRoom(os, capabilityId, input = {}) {
  return os.capabilities.invoke(capabilityId, input, {
    actor_id: 'human-ui',
    source: 'time-room-surface',
    authority: 'read',
    expected_authority: 'read',
  });
}

export function installTimeRoomSurface({ os } = {}) {
  if (!os?.capabilities?.invoke || typeof document === 'undefined' || !document.body) return null;
  if (document.querySelector('[data-time-room-surface]')) return null;

  const shell = document.querySelector('[data-arcsweep-os-shell]');
  if (!shell) return null;
  const actions = shell.querySelector('.os-actions');
  const guide = shell.querySelector('.os-guide');
  if (!actions || !guide) return null;

  const style = document.createElement('style');
  style.textContent = `
    [data-time-room-surface]{border-top:1px solid rgba(255,255,255,.08);padding:11px 13px;max-height:62vh;overflow:auto}
    [data-time-room-surface][hidden]{display:none}.tr-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.tr-kicker{font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.6}.tr-title{font-size:14px;font-weight:700;margin-top:2px}.tr-law{font-size:12px;opacity:.72;margin-top:3px;line-height:1.35}.tr-close,.tr-button{border:1px solid rgba(220,180,95,.4);border-radius:8px;background:rgba(220,180,95,.08);color:inherit;padding:6px 9px;font:inherit}.tr-controls{display:grid;grid-template-columns:1fr auto;gap:7px;margin:10px 0}.tr-select{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.16);border-radius:8px;background:rgba(255,255,255,.055);color:inherit;padding:7px 8px;font:inherit}.tr-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:9px 0}.tr-stat{padding:7px;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:rgba(255,255,255,.035)}.tr-stat b{display:block;font-size:13px}.tr-stat span{font-size:10px;opacity:.65}.tr-ready{border:1px solid rgba(220,180,95,.28);border-radius:12px;padding:8px 9px;margin:8px 0;background:rgba(220,180,95,.06)}.tr-ready strong{display:block}.tr-ready div{font-size:11px;opacity:.78;margin-top:2px;line-height:1.35}.tr-clocks{display:grid;gap:6px;margin-top:9px}.tr-clock{border-left:2px solid rgba(220,180,95,.48);padding:6px 8px;background:rgba(255,255,255,.025);border-radius:0 8px 8px 0}.tr-clock-head{font-size:11px;font-weight:700}.tr-clock-reading{font-size:12px;margin-top:2px}.tr-clock-question{font-size:10px;opacity:.6;margin-top:2px}.tr-chips{display:flex;gap:5px;flex-wrap:wrap;margin:9px 0}.tr-chip{border-radius:999px;border:1px solid rgba(220,180,95,.3);padding:3px 7px;font-size:11px;background:rgba(220,180,95,.06)}.tr-empty,.tr-message{font-size:11px;opacity:.62}.tr-question{font-size:12px;font-weight:650;margin-top:7px}.tr-lists{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}.tr-list{border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:7px;background:rgba(255,255,255,.02)}.tr-list b{display:block;font-size:11px;margin-bottom:4px}.tr-list div{font-size:10px;opacity:.72;margin-top:2px}
    @media(max-width:520px){.tr-grid,.tr-lists,.tr-controls{grid-template-columns:1fr}}
  `;
  shell.appendChild(style);

  const openButton = document.createElement('button');
  openButton.type = 'button';
  openButton.dataset.osTimeRoom = 'open';
  openButton.textContent = 'Time Room';
  actions.appendChild(openButton);

  const panel = document.createElement('section');
  panel.dataset.timeRoomSurface = 'v0.1';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'ArcSweep Time Room');
  panel.innerHTML = `
    <div class="tr-head">
      <div><div class="tr-kicker">Universe Clock</div><div class="tr-title" data-tr-title>Time Room</div><div class="tr-law" data-tr-law></div></div>
      <button type="button" class="tr-close" data-tr-close>Close</button>
    </div>
    <div class="tr-question">What hour is it in this universe, and what can happen now?</div>
    <div class="tr-controls"><select class="tr-select" data-tr-universe aria-label="Universe"></select><button type="button" class="tr-button" data-tr-refresh>Read clocks</button></div>
    <div class="tr-grid">
      <div class="tr-stat"><b data-tr-weather>unmeasured</b><span>Temporal Weather</span></div>
      <div class="tr-stat"><b data-tr-ready>quiet</b><span>Readiness</span></div>
      <div class="tr-stat"><b data-tr-clocks>0</b><span>clocks</span></div>
    </div>
    <div class="tr-ready"><strong data-tr-ready-label>State-time</strong><div data-tr-ready-reason></div></div>
    <div class="tr-chips" data-tr-signals></div>
    <div class="tr-lists"><div class="tr-list"><b>Can happen now</b><div data-tr-can-happen></div></div><div class="tr-list"><b>Entry questions</b><div data-tr-questions></div></div></div>
    <div class="tr-clocks" data-tr-clocks-list></div>
    <div class="tr-message" data-tr-message aria-live="polite"></div>`;
  guide.parentNode.insertBefore(panel, guide);

  const universeSelect = panel.querySelector('[data-tr-universe]');

  async function loadUniverses() {
    const receipt = await readTimeRoom(os, 'time-room.universes');
    if (receipt.status !== 'applied') return [];
    const universes = receipt.output?.universes || [];
    universeSelect.replaceChildren();
    for (const universe of universes) {
      const option = document.createElement('option');
      option.value = universe.universe_id;
      option.textContent = universe.title;
      universeSelect.appendChild(option);
    }
    const activeWorld = os.session?.()?.active_world_id;
    if (activeWorld && [...universeSelect.options].some((option) => option.value === activeWorld)) universeSelect.value = activeWorld;
    return universes;
  }

  function fillList(target, values = []) {
    target.replaceChildren();
    for (const value of values.slice(0, 5)) target.appendChild(make('div', null, value));
    if (!target.childNodes.length) target.appendChild(make('div', 'tr-empty', 'Nothing named yet.'));
  }

  function fillChips(target, values = []) {
    target.replaceChildren();
    for (const value of values.slice(0, 7)) target.appendChild(make('span', 'tr-chip', value));
    if (!target.childNodes.length) target.appendChild(make('span', 'tr-empty', 'No arrival signals named yet.'));
  }

  async function render() {
    const universeId = universeSelect.value || null;
    const receipt = await readTimeRoom(os, 'time-room.snapshot', { universe_id: universeId });
    if (receipt.status !== 'applied') {
      panel.querySelector('[data-tr-message]').textContent = `Time Room read failed: ${receipt.reason || receipt.error || 'unknown'}`;
      return;
    }
    const snapshot = receipt.output || {};
    panel.querySelector('[data-tr-title]').textContent = `${snapshot.title || 'Time Room'} · ${snapshot.chamber || 'Loom Clock'}`;
    panel.querySelector('[data-tr-law]').textContent = snapshot.time_law || '';
    panel.querySelector('[data-tr-weather]').textContent = titleCase(snapshot.temporal_weather || 'unmeasured');
    panel.querySelector('[data-tr-ready]').textContent = titleCase(snapshot.readiness?.state || 'unknown');
    panel.querySelector('[data-tr-clocks]').textContent = text(snapshot.clocks?.length || 0);
    panel.querySelector('[data-tr-ready-label]').textContent = `${titleCase(snapshot.readiness?.state || 'State')} state-time`;
    panel.querySelector('[data-tr-ready-reason]').textContent = snapshot.readiness?.reason || 'No readiness signal yet.';
    fillChips(panel.querySelector('[data-tr-signals]'), snapshot.arrival_signals || []);
    fillList(panel.querySelector('[data-tr-can-happen]'), snapshot.can_happen || []);
    fillList(panel.querySelector('[data-tr-questions]'), snapshot.entry_questions || []);

    const clocks = panel.querySelector('[data-tr-clocks-list]');
    clocks.replaceChildren();
    for (const item of snapshot.clocks || []) {
      const card = make('article', 'tr-clock');
      card.appendChild(make('div', 'tr-clock-head', clockLabel(item)));
      card.appendChild(make('div', 'tr-clock-reading', item.reading));
      if (item.question) card.appendChild(make('div', 'tr-clock-question', item.question));
      clocks.appendChild(card);
    }
    panel.querySelector('[data-tr-message]').textContent = snapshot.generated_at ? `Read ${new Date(snapshot.generated_at).toLocaleTimeString()}` : '';
  }

  async function open() {
    panel.hidden = false;
    if (!universeSelect.options.length) await loadUniverses();
    await render();
  }

  openButton.addEventListener('click', () => { void open(); });
  panel.querySelector('[data-tr-close]').addEventListener('click', () => { panel.hidden = true; });
  panel.querySelector('[data-tr-refresh]').addEventListener('click', () => { void render(); });
  universeSelect.addEventListener('change', () => { void render(); });
  globalThis.addEventListener?.('arcsweep:os-navigation', () => { if (!panel.hidden) void render(); });
  globalThis.addEventListener?.('arcsweep:temporal-witness-updated', () => { if (!panel.hidden) void render(); });

  return Object.freeze({ element: panel, open, render, loadUniverses });
}
