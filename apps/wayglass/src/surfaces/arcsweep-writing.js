import { createInteractionState } from '../interaction-state.js';
import { authorizationSession } from '../authorization-session.js';
import { mountWayglassRoutePicker } from '../route-picker.js';
import { consumeObserverContextForWriting, recordWayglassRouteObservation } from '../living-observer-model.js';
import { emitInteractionCue } from '../interaction-cues.js';
import { emitMaterialSignal } from '../material-state.js';
import { invokeWayglassRoute, listWayglassRoutes, leaveWayglassWorld, recoverWayglassDeparture } from '../route-client.js';

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
  let selectedRoute = authorizationSession.route() || 'local:ollama';
  let busy = false;
  let lastReceipt = null;
  let checkpoint = null;

  root.innerHTML = [
    "<section class=\"wg-surface wg-writing-room\" data-surface=\"arcsweep-writing\">\n",
    "  <nav class=\"wg-deck-nav glass-panel\" aria-label=\"Wayglass rooms\">\n",
    "    <button type=\"button\" class=\"glass-chip active\" aria-current=\"page\">Writing Room</button>\n",
    "    <button type=\"button\" class=\"glass-chip\" data-wayglass-room=\"wayglass:systems\">Organs</button>\n",
    "    <button type=\"button\" class=\"glass-chip\" data-wayglass-room=\"wayglass:video-atelier\">Video Atelier</button>\n",
    "    <button type=\"button\" class=\"glass-chip\" data-wayglass-room=\"wayglass:living-observer\">Living Observer</button>\n",
    "  </nav>\n",
    "  <header class=\"wg-surface-head glass-panel\">\n",
    "    <div class=\"wg-hero-copy\">\n",
    "      <p class=\"eyebrow\">WAYGLASS · WRITING DECK</p>\n",
    "      <h1>Writing Room</h1>\n",
    "      <p class=\"lede\">Round-robin co-writing through Wayglass.<br>The route may change; the room stays itself.</p>\n",
    "    </div>\n",
    "    <div class=\"wg-route-block\">\n",
    "      <div class=\"route-mineral\" aria-hidden=\"true\"><i></i><b></b><span></span></div>\n",
    "      <div class=\"wg-route-controls\">\n",
    "        <label id=\"wg-route-label\">Route</label>\n",
    "        <div id=\"wg-route\"></div>\n",
    "        <label class=\"wg-thinking-toggle\"><input id=\"wg-think\" type=\"checkbox\" /> Deliberate thinking (local engine)</label>\n",
    "        <span id=\"wg-route-state\" class=\"tiny\" role=\"status\">Loading route catalogue…</span>\n",
    "        <span id=\"wg-embodiment-state\" class=\"tiny\"></span>\n",
    "      </div>\n",
    "    </div>\n",
    "  </header>\n",
    "  <section class=\"wg-constellation-strip glass-panel\" aria-label=\"Our Constellation\">\n",
    "    <div class=\"wg-constellation-symbol\" aria-hidden=\"true\">✦</div>\n",
    "    <div class=\"wg-constellation-place\">\n",
    "      <p class=\"eyebrow\">OUR CONSTELLATION</p>\n",
    "      <span class=\"tiny\">Speaking place</span>\n",
    "      <strong id=\"wg-place-name\">Writing Room</strong>\n",
    "      <span id=\"wg-place-hint\" class=\"tiny\">The place stays itself across route changes.</span>\n",
    "    </div>\n",
    "  </section>\n",
    "  <div class=\"wg-writing-workspace\">\n",
    "    <main class=\"wg-writing-main glass-panel\" aria-label=\"Writing desk\">\n",
    "      <section class=\"wg-control-ribbon\" aria-label=\"Writing state\">\n",
    "        <div class=\"glass-segment\" role=\"group\" aria-label=\"IC or OOC\">\n",
    "          <button type=\"button\" class=\"glass-chip active\" data-channel=\"IC\" aria-pressed=\"true\" aria-keyshortcuts=\"Alt+I\">IC</button>\n",
    "          <button type=\"button\" class=\"glass-chip\" data-channel=\"OOC\" aria-pressed=\"false\" aria-keyshortcuts=\"Alt+O\">OOC</button>\n",
    "        </div>\n",
    "        <div class=\"turn-jewel\"><span>Turn</span><strong id=\"wg-turn-owner\">Rowan</strong></div>\n",
    "        <details class=\"ownership-drawer\">\n",
    "          <summary>Character ownership</summary>\n",
    "          <form id=\"wg-ownership-form\" class=\"ownership-form\">\n",
    "            <input name=\"character\" placeholder=\"Character\" aria-label=\"Character name\" />\n",
    "            <input name=\"owner\" placeholder=\"Owner\" aria-label=\"Character owner\" />\n",
    "            <select name=\"permission\" aria-label=\"Ownership type\">\n",
    "              <option value=\"owned\">Owned</option>\n",
    "              <option value=\"shared\">Shared</option>\n",
    "              <option value=\"temporary-handoff\">Temporary handoff</option>\n",
    "            </select>\n",
    "            <button type=\"submit\" class=\"glass-chip\">Bind</button>\n",
    "          </form>\n",
    "          <div id=\"wg-ownership-list\" class=\"ownership-list\"></div>\n",
    "        </details>\n",
    "      </section>\n",
    "      <section class=\"wg-thread\" aria-label=\"Writing conversation\" aria-live=\"polite\">\n",
    "        <div id=\"wg-thread\" class=\"wg-thread-log\"><div class=\"empty-thread\"><span class=\"wg-empty-feather\" aria-hidden=\"true\">✧</span><strong>The room is quiet. Start anywhere.</strong><small>Your conversation will unfold here.</small></div></div>\n",
    "      </section>\n",
    "      <section class=\"wg-composer\" aria-label=\"Compose a turn\">\n",
    "        <textarea id=\"wg-input\" rows=\"4\" placeholder=\"Write the next turn…\" aria-label=\"Next writing turn\" aria-keyshortcuts=\"Alt+W Control+Enter Meta+Enter\"></textarea>\n",
    "        <div class=\"composer-foot\">\n",
    "          <span id=\"wg-status\" class=\"tiny\">IC · Rowan has the turn</span>\n",
    "          <button id=\"wg-send\" type=\"button\" class=\"send-jewel\"><span aria-hidden=\"true\">➤</span> Send to Writing Room</button>\n",
    "        </div>\n",
    "      </section>\n",
    "    </main>\n",
    "    <aside class=\"wg-session-sidebar glass-panel\" aria-label=\"Session and continuity\">\n",
    "      <div class=\"wg-sidebar-tabs\" role=\"tablist\" aria-label=\"Session views\">\n",
    "        <button type=\"button\" role=\"tab\" id=\"wg-tab-session\" data-wg-side-tab=\"session\" aria-selected=\"true\" aria-controls=\"wg-panel-session\">Session</button>\n",
    "        <button type=\"button\" role=\"tab\" id=\"wg-tab-continuity\" data-wg-side-tab=\"continuity\" aria-selected=\"false\" aria-controls=\"wg-panel-continuity\" tabindex=\"-1\">Continuity</button>\n",
    "      </div>\n",
    "      <section id=\"wg-panel-session\" class=\"wg-sidebar-view\" role=\"tabpanel\" aria-labelledby=\"wg-tab-session\">\n",
    "        <button id=\"wg-copy-session\" type=\"button\" class=\"glass-chip wg-copy-session\">▤ Copy session log</button>\n",
    "        <div class=\"wg-session-empty\" aria-hidden=\"true\"><span>♧</span></div>\n",
    "        <p class=\"wg-session-explainer\"><strong>Session history</strong><span>Responses remain in the writing desk. Copy the session log whenever you wish.</span></p>\n",
    "        <p id=\"wg-receipt\" class=\"tiny\">No route receipt yet.</p>\n",
    "      </section>\n",
    "      <section id=\"wg-panel-continuity\" class=\"wg-sidebar-view wg-continuity-view\" role=\"tabpanel\" aria-labelledby=\"wg-tab-continuity\" hidden>\n",
    "        <h2>Continuity checkpoint</h2>\n",
    "        <label>World <input id=\"wg-cp-world\" value=\"wayglass:writing-room\"></label>\n",
    "        <label>Participant <input id=\"wg-cp-participant\" value=\"rowan\"></label>\n",
    "        <label>Checkpoint text <textarea id=\"wg-cp-text\" rows=\"3\"></textarea></label>\n",
    "        <label>Open questions (one per line) <textarea id=\"wg-cp-questions\" rows=\"2\"></textarea></label>\n",
    "        <label>Stop point <input id=\"wg-cp-stop\"></label>\n",
    "        <label>Next owner <input id=\"wg-cp-owner\" value=\"Rowan\"></label>\n",
    "        <button id=\"wg-cp-save\" type=\"button\" class=\"glass-chip\">Save checkpoint</button>\n",
    "        <label>Storage receipt ID <input id=\"wg-cp-id\"></label>\n",
    "        <button id=\"wg-cp-recover\" type=\"button\" class=\"glass-chip\">Recover checkpoint</button>\n",
    "        <p id=\"wg-cp-status\" role=\"status\" class=\"tiny\">No stored checkpoint attached.</p>\n",
    "      </section>\n",
    "    </aside>\n",
    "  </div>\n",
    "  <footer class=\"wg-receipt tiny\"><span class=\"keyboard-hint\">Keyboard: Alt+I/O channel · Alt+R route · Alt+W write · Ctrl/Cmd+Enter send</span></footer>\n",
    "</section>\n",
  ].join('');

  root.querySelectorAll('[data-wayglass-room]').forEach(button => button.addEventListener('click', () => globalThis.__wayglassOS?.mount(button.dataset.wayglassRoom)));

  const routePicker = mountWayglassRoutePicker(root.querySelector('#wg-route'), { onChange(value) {
    selectedRoute = value;
    wakeMaterial(0.88, 'route');
    routeState.textContent = 'Active · ' + selectedRouteLabel();
  } });
  const routeState = root.querySelector('#wg-route-state');
  const embodimentState = root.querySelector('#wg-embodiment-state');
  const channelButtons = [...root.querySelectorAll('[data-channel]')];
  const turnOwner = root.querySelector('#wg-turn-owner');
  const ownershipForm = root.querySelector('#wg-ownership-form');
  const ownershipList = root.querySelector('#wg-ownership-list');
  const thread = root.querySelector('#wg-thread');
  const input = root.querySelector('#wg-input');
  const sharedObserverReading = consumeObserverContextForWriting();
  if (sharedObserverReading) input.value = sharedObserverReading + '\n\n[My question about this observation:]\n';
  const status = root.querySelector('#wg-status');
  const send = root.querySelector('#wg-send');
  const cp = name => root.querySelector('#wg-cp-' + name);
  cp('save').addEventListener('click', async () => {
    try {
      const worldId = cp('world').value.trim(), participantId = cp('participant').value.trim();
      const result = await leaveWayglassWorld({worldId, participantId, routeId: selectedRoute,
        identityDeclarations: [{entity_id: participantId, declaration: 'Caller-declared checkpoint participant'}],
        activeWork: [{description: cp('text').value}], unresolvedWonderQuestions: cp('questions').value.split('\n').filter(Boolean),
        provenanceRefs: ['wayglass-writing-session:' + session], stopPoint: cp('stop').value, nextOwner: cp('owner').value});
      checkpoint = {storageId: result.storage_receipt.storage_id, worldId, participantId};
      cp('id').value = checkpoint.storageId;
      cp('status').textContent = 'Stored locally; receipt ' + checkpoint.storageId + '. Copy this ID for return.';
    } catch(error) { cp('status').textContent = 'Checkpoint save failed: ' + error.message; }
  });
  cp('recover').addEventListener('click', async () => {
    try {
      const candidate = {storageId: cp('id').value.trim(), worldId: cp('world').value.trim(), participantId: cp('participant').value.trim()};
      const result = await recoverWayglassDeparture(candidate);
      const packet = result.continuation_packet;
      cp('text').value = packet.active_work.map(item => item.description || '').join('\n');
      cp('questions').value = packet.unresolved_wonder_questions.join('\n');
      cp('stop').value = packet.stop_point; cp('owner').value = packet.next_owner;
      checkpoint = candidate;
      cp('status').textContent = 'Verified stored checkpoint attached to subsequent turns. No canon promotion.';
    } catch(error) { checkpoint = null; cp('status').textContent = 'Checkpoint recovery failed: ' + error.message; }
  });

  const sidebarTabs = [...root.querySelectorAll('[data-wg-side-tab]')];
  function selectSidebar(name, focus = false) {
    sidebarTabs.forEach(tab => {
      const active = tab.dataset.wgSideTab === name;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      root.querySelector('#wg-panel-' + tab.dataset.wgSideTab).hidden = !active;
      if (active && focus) tab.focus();
    });
  }
  sidebarTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectSidebar(tab.dataset.wgSideTab));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? sidebarTabs.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + sidebarTabs.length) % sidebarTabs.length;
      selectSidebar(sidebarTabs[next].dataset.wgSideTab, true);
    });
  });
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
      thread.innerHTML = '<div class="empty-thread"><span class="wg-empty-feather" aria-hidden="true">✧</span><strong>The room is quiet. Start anywhere.</strong><small>Your conversation will unfold here.</small></div>';
      return;
    }
    thread.innerHTML = messages.map((message, index) => {
      const who = message.role === 'user' ? 'Rowan' : message.route_label;
      return '<article class="turn-card ' + message.role + '">' +
        '<header><strong>' + escapeHtml(who) + '</strong><span>' + escapeHtml(message.channel || 'IC') + '</span></header>' +
        renderThinking(message) +
        '<div class="turn-text">' + escapeHtml(message.content).replaceAll('\n', '<br>') + '</div>' +
        '<footer><button type="button" class="glass-chip" data-copy-reply="' + index + '">Copy reply</button> ' +
        '<button type="button" class="glass-chip" data-copy-through="' + index + '">Copy log through here</button></footer>' +
        '</article>';
    }).join('');
    thread.scrollTop = thread.scrollHeight;
  }

  function sessionLog(end = messages.length - 1) {
    return 'Wayglass session: ' + session + '\nCopied at: ' + new Date().toISOString() +
      '\n\n' + messages.slice(0, end + 1).map(message => {
        const who = message.role === 'user' ? 'Rowan' : (message.route_label || 'Wayglass');
        return who + ' · ' + (message.channel || 'IC') + ' · ' + (message.content.startsWith('[Route error]') ? 'transport error' : message.role) +
          '\n' + message.content;
      }).join('\n\n');
  }

  async function copyText(text, button) {
    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = 'Copied';
    } catch {
      button.textContent = 'Copy unavailable';
      status.textContent = 'Clipboard unavailable. Select the conversation text to copy manually.';
    }
    globalThis.setTimeout(() => { button.textContent = original; }, 1800);
  }

  root.querySelector('#wg-copy-session').addEventListener('click', event => copyText(sessionLog(), event.currentTarget));
  thread.addEventListener('click', event => {
    const button = event.target.closest('[data-copy-reply], [data-copy-through]');
    if (!button) return;
    if (button.dataset.copyReply !== undefined) {
      copyText(messages[Number(button.dataset.copyReply)].content, button);
    } else {
      copyText(sessionLog(Number(button.dataset.copyThrough)), button);
    }
  });

  async function loadRoutes() {
    try {
      const catalogue = await listWayglassRoutes();
      routes = catalogue.routes || [];
      if (!routes.some((route) => route.route_id === selectedRoute && route.configured !== false)) selectedRoute = routes.find(route => route.configured !== false)?.route_id || '';
      selectedRoute = routePicker.setRoutes(routes, selectedRoute);
      routeState.textContent = routes.length + ' registered route' + (routes.length === 1 ? '' : 's');
    } catch (error) {
      routes = [];
      selectedRoute = '';
      routePicker.setRoutes([]);
      routeState.textContent = 'Catalogue unavailable · reload to reconnect';
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
    if (!selectedRoute) { status.textContent = 'No configured route available. Reload the route catalogue.'; return; }
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
      recordWayglassRouteObservation({status:'started',routeId:selectedRoute});
      const result = await invokeWayglassRoute({
        routeId: selectedRoute,
        think: root.querySelector('#wg-think').checked,
        input: text,
        history,
        interaction: current,
        sessionId: session,
        checkpoint,
      });
      messages.push({
        role: 'assistant',
        content: result.output || '[quiet]',
        thinking: result.thinking || '',
        channel: current.channel,
        route_label: routeLabel,
      });
      lastReceipt = result.receipt || null;
      recordWayglassRouteObservation({status:'completed',routeId:selectedRoute,provider:result.provider,model:result.model,receipt:lastReceipt});
      receipt.textContent = lastReceipt
        ? 'Observation · not canon · ' + (result.provider || 'route') + ' / ' + (result.model || 'model') + ' · ' + (lastReceipt.epistemic_register || 'external-observation') + ' · ' + (lastReceipt.completed_at || '')
        : 'Turn completed without a receipt payload.';
    } catch (error) {
      recordWayglassRouteObservation({status:'failed',routeId:selectedRoute});
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
      routePicker.focus();
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
      routePicker.destroy();
    },
  });
}
