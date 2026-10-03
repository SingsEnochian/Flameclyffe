import { createInteractionState } from '../interaction-state.js';
import { emitInteractionCue } from '../interaction-cues.js';
import { emitMaterialSignal } from '../material-state.js';
import { invokeWayglassRoute, listWayglassRoutes } from '../route-client.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function sessionId() {
  return globalThis.crypto?.randomUUID?.() || 'wayglass-' + Date.now();
}

function renderThinking(message) {
  if (!message?.thinking) return '';
  return '<details class="turn-thinking">' +
    '<summary><span class="thinking-chevron" aria-hidden="true">&gt;</span> Thinking</summary>' +
    '<div class="thinking-trace">' + escapeHtml(message.thinking).replaceAll('\n', '<br>') + '</div>' +
    '</details>';
}

export async function mountArcSweepWritingSurface(root) {
  const interaction = createInteractionState({ channel: 'IC', turn_owner: 'Rowan' });
  const session = sessionId();
  const messages = [];
  let routes = [];
  let selectedRoute = 'openai:gpt';
  let busy = false;
  let lastReceipt = null;

  root.innerHTML = [
    '<section class="wg-surface" data-surface="arcsweep-writing">',
      '<header class="wg-surface-head glass-panel">',
        '<div>',
          '<p class="eyebrow">ArcSweep attached surface</p>',
          '<h1>Writing Room</h1>',
          '<p class="lede">Round-robin co-writing through Wayglass. The route may change; the room stays itself.</p>',
        '</div>',
        '<div class="wg-route-block">',
          '<div class="route-mineral" aria-hidden="true"><i></i><b></b><span></span></div>',
          '<label for="wg-route">Route</label>',
          '<select id="wg-route" aria-label="Wayglass route" aria-keyshortcuts="Alt+R"></select>',
          '<span id="wg-route-state" class="tiny">Loading route catalogue…</span>',
          '<span id="wg-embodiment-state" class="tiny"></span>',
        '</div>',
      '</header>',

      '<section class="wg-control-ribbon glass-panel" aria-label="Writing state">',
        '<div class="glass-segment" role="group" aria-label="IC or OOC">',
          '<button type="button" class="glass-chip active" data-channel="IC" aria-pressed="true" aria-keyshortcuts="Alt+I">IC</button>',
          '<button type="button" class="glass-chip" data-channel="OOC" aria-pressed="false" aria-keyshortcuts="Alt+O">OOC</button>',
        '</div>',
        '<div class="turn-jewel"><span>Turn</span><strong id="wg-turn-owner">Rowan</strong></div>',
        '<details class="ownership-drawer">',
          '<summary>Character ownership</summary>',
          '<form id="wg-ownership-form" class="ownership-form">',
            '<input name="character" placeholder="Character" aria-label="Character name" />',
            '<input name="owner" placeholder="Owner" aria-label="Character owner" />',
            '<select name="permission" aria-label="Ownership type">',
              '<option value="owned">Owned</option>',
              '<option value="shared">Shared</option>',
              '<option value="temporary-handoff">Temporary handoff</option>',
            '</select>',
            '<button type="submit" class="glass-chip">Bind</button>',
          '</form>',
          '<div id="wg-ownership-list" class="ownership-list"></div>',
        '</details>',
      '</section>',

      '<section class="wg-thread glass-panel" aria-live="polite">',
        '<div id="wg-thread" class="wg-thread-log">',
          '<div class="empty-thread">The room is quiet. Start anywhere.</div>',
        '</div>',
      '</section>',

      '<section class="wg-composer glass-panel">',
        '<textarea id="wg-input" rows="6" placeholder="Write the next turn…" aria-label="Next writing turn" aria-keyshortcuts="Alt+W Control+Enter Meta+Enter"></textarea>',
        '<div class="composer-foot">',
          '<span id="wg-status" class="tiny">IC · Rowan has the turn</span>',
          '<button id="wg-send" type="button" class="send-jewel">Pass turn</button>',
        '</div>',
      '</section>',

      '<footer class="wg-receipt tiny"><span id="wg-receipt">No route receipt yet.</span><span class="keyboard-hint"> · Keyboard: Alt+I/O channel · Alt+R route · Alt+W write</span></footer>',
    '</section>',
  ].join('');

  const routeSelect = root.querySelector('#wg-route');
  const routeState = root.querySelector('#wg-route-state');
  const embodimentState = root.querySelector('#wg-embodiment-state');
  const channelButtons = [...root.querySelectorAll('[data-channel]')];
  const turnOwner = root.querySelector('#wg-turn-owner');
  const ownershipForm = root.querySelector('#wg-ownership-form');
  const ownershipList = root.querySelector('#wg-ownership-list');
  const thread = root.querySelector('#wg-thread');
  const input = root.querySelector('#wg-input');
  const status = root.querySelector('#wg-status');
  const send = root.querySelector('#wg-send');
  const receipt = root.querySelector('#wg-receipt');

  const arState = document.documentElement.dataset.wayglassAr || 'unknown';
  embodimentState.textContent = 'Keyboard ready · AR ' + (arState === 'ready' ? 'ready' : arState.replaceAll('-', ' '));

  function selectedRouteLabel() {
    return routes.find((item) => item.route_id === selectedRoute)?.label || selectedRoute;
  }

  function refreshState() {
    const state = interaction.snapshot();
    channelButtons.forEach((button) => {
      const active = button.dataset.channel === state.channel;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    turnOwner.textContent = state.turn_owner;
    status.textContent = state.channel + ' · ' + state.turn_owner + ' has the turn';

    ownershipList.innerHTML = state.character_ownership.length
      ? state.character_ownership.map((entry) =>
          '<button type="button" class="ownership-chip" data-remove-owner="' + escapeHtml(entry.character) + '">' +
          '<strong>' + escapeHtml(entry.character) + '</strong>' +
          '<span>' + escapeHtml(entry.owner) + ' · ' + escapeHtml(entry.permission) + '</span>' +
          '</button>'
        ).join('')
      : '<span class="tiny">No character ownership declared.</span>';
  }

  function refreshThread() {
    if (!messages.length) {
      thread.innerHTML = '<div class="empty-thread">The room is quiet. Start anywhere.</div>';
      return;
    }
    thread.innerHTML = messages.map((message) => {
      const who = message.role === 'assistant' ? message.route_label : 'Rowan';
      return '<article class="turn-card ' + message.role + '">' +
        '<header><strong>' + escapeHtml(who) + '</strong><span>' + escapeHtml(message.channel || 'IC') + '</span></header>' +
        renderThinking(message) +
        '<div class="turn-text">' + escapeHtml(message.content).replaceAll('\n', '<br>') + '</div>' +
        '</article>';
    }).join('');
    thread.scrollTop = thread.scrollHeight;
  }

  async function loadRoutes() {
    try {
      const catalogue = await listWayglassRoutes();
      routes = catalogue.routes || [];
      if (!routes.some((route) => route.route_id === selectedRoute) && routes[0]) selectedRoute = routes[0].route_id;
      routeSelect.innerHTML = routes.map((route) =>
        '<option value="' + escapeHtml(route.route_id) + '">' +
        escapeHtml(route.label + ' · ' + route.model) +
        '</option>'
      ).join('');
      routeSelect.value = selectedRoute;
      routeState.textContent = routes.length + ' registered route' + (routes.length === 1 ? '' : 's');
    } catch (error) {
      routes = [{ route_id: 'openai:gpt', label: 'GPT', model: 'server-selected' }];
      routeSelect.innerHTML = '<option value="openai:gpt">GPT · server-selected</option>';
      routeState.textContent = 'Catalogue unavailable · fallback route shown';
    }
  }

  function wakeMaterial(strength = 0.7, mode = 'wake', semantic = {}) {
    const state = interaction.snapshot();
    emitMaterialSignal({
      strength,
      mode,
      channel: state.channel,
      ownership: state.character_ownership.length ? 1 : 0,
      intent: semantic.intent ?? (mode === 'route' ? 0.9 : mode === 'handoff' ? 1 : 0.45),
      handoff_progress: semantic.handoff_progress ?? (mode === 'handoff' ? 0.82 : 0),
      canon_state: semantic.canon_state || 'candidate',
    });
    root.dataset.materialState = mode;
    globalThis.setTimeout?.(() => { if (root.dataset.materialState === mode) root.dataset.materialState = 'rest'; }, 760);
  }

  async function passTurn() {
    const text = input.value.trim();
    if (!text || busy) return;
    busy = true;
    send.disabled = true;
    input.disabled = true;

    const current = interaction.snapshot();
    const history = messages.slice(-12).map((message) => ({ role: message.role, content: message.content }));
    messages.push({ role: 'user', content: text, channel: current.channel });
    input.value = '';
    refreshThread();

    const routeLabel = selectedRouteLabel();
    interaction.setTurnOwner(routeLabel);
    wakeMaterial(0.96, 'handoff');
    await emitInteractionCue('handoff');
    refreshState();

    try {
      const result = await invokeWayglassRoute({
        routeId: selectedRoute,
        input: text,
        history,
        interaction: current,
        sessionId: session,
      });
      messages.push({
        role: 'assistant',
        content: result.output || '[quiet]',
        thinking: result.thinking || '',
        channel: current.channel,
        route_label: routeLabel,
      });
      lastReceipt = result.receipt || null;
      receipt.textContent = lastReceipt
        ? 'Receipt · ' + (result.provider || 'route') + ' / ' + (result.model || 'model') + ' · ' + (lastReceipt.channel || current.channel) + ' · ' + (lastReceipt.completed_at || '')
        : 'Turn completed without a receipt payload.';
    } catch (error) {
      messages.push({
        role: 'assistant',
        content: '[Route error] ' + error.message,
        channel: 'OOC',
        route_label: 'Wayglass',
      });
      receipt.textContent = 'Route failed · ' + error.message;
    } finally {
      interaction.setTurnOwner('Rowan');
      busy = false;
      send.disabled = false;
      input.disabled = false;
      refreshThread();
      refreshState();
      input.focus();
    }
  }

  channelButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      interaction.setChannel(button.dataset.channel);
      wakeMaterial(0.58, 'channel', { intent: 0.52 });
      await emitInteractionCue(button.dataset.channel === 'OOC' ? 'ooc' : 'switch');
      refreshState();
    });
  });

  routeSelect.addEventListener('change', () => {
    selectedRoute = routeSelect.value;
    wakeMaterial(0.88, 'route');
    routeState.textContent = 'Active · ' + selectedRouteLabel();
  });

  ownershipForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(ownershipForm);
    interaction.setOwnership({
      character: data.get('character'),
      owner: data.get('owner'),
      permission: data.get('permission'),
    });
    ownershipForm.reset();
    wakeMaterial(0.68, 'bind', { intent: 0.62 });
    await emitInteractionCue('switch');
    refreshState();
  });

  ownershipList.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-remove-owner]');
    if (!chip) return;
    interaction.removeOwnership(chip.dataset.removeOwner);
    refreshState();
  });


  function handleWayglassCommand(event) {
    const command = event?.detail?.command;
    if (command === 'channel:ic' || command === 'channel:ooc') {
      const channel = command.endsWith(':ooc') ? 'OOC' : 'IC';
      interaction.setChannel(channel);
      wakeMaterial(0.58, 'channel', { intent: 0.52 });
      void emitInteractionCue(channel === 'OOC' ? 'ooc' : 'switch');
      refreshState();
      return;
    }
    if (command === 'focus:route') {
      routeSelect.focus();
      wakeMaterial(0.52, 'route', { intent: 0.5 });
      return;
    }
    if (command === 'focus:composer') {
      input.focus();
      wakeMaterial(0.42, 'focus', { intent: 0.35 });
      return;
    }
    if (command === 'help:keyboard') {
      status.textContent = 'Keyboard · Alt+I IC · Alt+O OOC · Alt+R route · Alt+W composer · Ctrl/Cmd+Enter pass turn';
      globalThis.setTimeout?.(refreshState, 3600);
    }
  }

  globalThis.addEventListener?.('wayglass:command', handleWayglassCommand);

  send.addEventListener('click', passTurn);
  input.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      void passTurn();
    }
  });

  await loadRoutes();
  refreshState();
  refreshThread();

  return Object.freeze({
    surface_id: 'arcsweep:writing-room',
    interaction,
    session_id: session,
    messages,
    lastReceipt: () => lastReceipt,
    destroy() {
      globalThis.removeEventListener?.('wayglass:command', handleWayglassCommand);
    },
  });
}
