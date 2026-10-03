import { createInteractionState } from '../interaction-state.js';
import { emitInteractionCue } from '../interaction-cues.js';
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
          '<label for="wg-route">Route</label>',
          '<select id="wg-route" aria-label="Wayglass route"></select>',
          '<span id="wg-route-state" class="tiny">Loading route catalogue…</span>',
        '</div>',
      '</header>',

      '<section class="wg-control-ribbon glass-panel" aria-label="Writing state">',
        '<div class="glass-segment" role="group" aria-label="IC or OOC">',
          '<button type="button" class="glass-chip active" data-channel="IC" aria-pressed="true">IC</button>',
          '<button type="button" class="glass-chip" data-channel="OOC" aria-pressed="false">OOC</button>',
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
        '<textarea id="wg-input" rows="6" placeholder="Write the next turn…" aria-label="Next writing turn"></textarea>',
        '<div class="composer-foot">',
          '<span id="wg-status" class="tiny">IC · Rowan has the turn</span>',
          '<button id="wg-send" type="button" class="send-jewel">Pass turn</button>',
        '</div>',
      '</section>',

      '<footer class="wg-receipt tiny" id="wg-receipt">No route receipt yet.</footer>',
    '</section>',
  ].join('');

  const routeSelect = root.querySelector('#wg-route');
  const routeState = root.querySelector('#wg-route-state');
  const channelButtons = [...root.querySelectorAll('[data-channel]')];
  const turnOwner = root.querySelector('#wg-turn-owner');
  const ownershipForm = root.querySelector('#wg-ownership-form');
  const ownershipList = root.querySelector('#wg-ownership-list');
  const thread = root.querySelector('#wg-thread');
  const input = root.querySelector('#wg-input');
  const status = root.querySelector('#wg-status');
  const send = root.querySelector('#wg-send');
  const receipt = root.querySelector('#wg-receipt');

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

  function wakeMaterial(strength = 0.7, mode = 'wake') {
    globalThis.dispatchEvent?.(new CustomEvent('wayglass:material-wake', { detail: { strength, mode } }));
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
      wakeMaterial(0.58, 'channel');
      await emitInteractionCue(button.dataset.channel === 'OOC' ? 'ooc' : 'switch');
      refreshState();
    });
  });

  routeSelect.addEventListener('change', () => {
    selectedRoute = routeSelect.value;
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
    wakeMaterial(0.68, 'bind');
    await emitInteractionCue('switch');
    refreshState();
  });

  ownershipList.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-remove-owner]');
    if (!chip) return;
    interaction.removeOwnership(chip.dataset.removeOwner);
    refreshState();
  });

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
  });
}
