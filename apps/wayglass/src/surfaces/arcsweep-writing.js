import { renderArcSweepPassagePanel, installArcSweepPassageWorldAction } from '../arcsweep-passage-ui.js';
import { createInteractionState } from '../interaction-state.js';
import { authorizationSession } from '../authorization-session.js';
import { mountWayglassRoutePicker } from '../route-picker.js';
import { WAYGLASS_WORLD_SEATS, listWayglassWorldSeats, findWayglassWorldSeat, wayglassWorldStatus } from '../world-seats.js';
import { consumeObserverContextForWriting, recordWayglassRouteObservation } from '../living-observer-model.js';
import { emitInteractionCue } from '../interaction-cues.js';
import { emitMaterialSignal } from '../material-state.js';
import { invokeWayglassRoute, listWayglassRoutes, listWayglassCharacters, leaveWayglassWorld, recoverWayglassDeparture } from '../route-client.js';
import { openDabbleMarkdown, selectDabbleExcerpt, createDabbleReadingTurn } from '../dabble-source.js';
import { EMERGENCE_QUESTIONS, bittyTwiQuestionPrompt } from '../emergence-questions.js';

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
  const interaction = createInteractionState({ channel: 'IC', turn_owner: 'Rowan', interaction_mode: 'ordinary' });
  const session = sessionId();
  const messages = [];
  let routes = [];
  let selectedRoute = 'local:crow'; // Ship-level default: substrate, never Bluebird's identity.
  let selectedCharacter = '';
  let characters = [];
  let emergenceIndex = 0;
  let busy = false;
  let lastReceipt = null;
  let dabbleSource = null;
  let checkpoint = null;

  root.innerHTML = [
    "<section class=\"wg-surface wg-writing-room\" data-surface=\"arcsweep-writing\">\n",
    "  <nav class=\"wg-deck-nav glass-panel\" aria-label=\"Wayglass rooms\">\n",
    "    <button type=\"button\" class=\"glass-chip active\" aria-current=\"page\">Writing Room</button>\n",
    "    <button type=\"button\" class=\"glass-chip\" data-wayglass-room=\"wayglass:systems\">Organs</button>\n",
    "    <button type=\"button\" class=\"glass-chip\" data-wayglass-room=\"wayglass:video-atelier\">Video Atelier</button>\n",
    "    <button type=\"button\" class=\"glass-chip\" data-wayglass-room=\"wayglass:living-observer\">Living Observer</button>\n",
    '<button type="button" class="glass-chip" data-wayglass-room="wayglass:library">Library</button>',
    '<button type="button" class="glass-chip" data-wayglass-room="wayglass:toybox">Toybox</button>',
    '<button type="button" class="glass-chip" data-wayglass-room="wayglass:commons">Commons</button>',
    "  </nav>\n",
    renderArcSweepPassagePanel(globalThis.location.href, globalThis.location.search),
    "  <header class=\"wg-surface-head glass-panel\">\n",
    "    <div class=\"wg-hero-copy\">\n",
    "      <p class=\"eyebrow\">WAYGLASS · WRITING DECK</p>\n",
    "      <h1>Writing Room</h1>\n",
    "      <p class=\"lede\">Round-robin co-writing through Wayglass.<br>The route may change; the room stays itself.</p>\n",
    "    </div>\n",
    "    <div class=\"wg-route-block\">\n",
    "      <div class=\"route-mineral\" aria-hidden=\"true\"><i></i><b></b><span></span></div>\n",
    "      <div class=\"wg-route-controls\">\n",
          '<label for="wg-character">Character voice</label>',
          '<select id="wg-character" aria-label="Wayglass character voice"><option value="">No character seat</option></select>',
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
    "  <section class=\"wg-world-gate glass-panel\" aria-label=\"World setting\">\n",
    "    <label for=\"wg-world-seat\">World</label>\n",
    "    <select id=\"wg-world-seat\" aria-label=\"Wayglass story world\"></select>\n",
    "    <p class=\"tiny\" id=\"wg-world-status\" role=\"status\">World and provider routes are independent.</p>\n",
    '<button type="button" id="wg-griff-check" class="glass-chip" hidden>Check Griff connection</button>',
    '<button type="button" id="wg-bluebird-check" class="glass-chip" hidden>Check Richie connection</button>',
    "  </section>\n",
          "  <section class=\"glass-panel wg-dabble-source\" aria-label=\"Dabble export reading\">\n    <p class=\"eyebrow\">DABBLE · SOURCE READER</p>\n    <p class=\"tiny\">Sign in directly with Dabble, export a chapter as Markdown, and select it here. No sign-in token or file is automatically accessed by Wayglass.</p>\n    <a class=\"glass-chip\" href=\"https://accounts.dabblewriter.com/auth/login\" target=\"_blank\" rel=\"noopener noreferrer\">Open Dabble sign-in ↗</a>\n    <label for=\"wg-dabble-file\">Choose exported Markdown</label>\n    <input id=\"wg-dabble-file\" type=\"file\" accept=\".md,.markdown,.txt,text/markdown,text/plain\">\n    <label for=\"wg-dabble-section\">Excerpt to discuss</label>\n    <select id=\"wg-dabble-section\" disabled><option value=\"-1\">Beginning of selected export</option></select>\n    <p id=\"wg-dabble-status\" class=\"tiny\" role=\"status\" aria-live=\"polite\">No manuscript selected. Max 512 KB file; at most 12,000 characters per turn.</p>\n    <pre id=\"wg-dabble-preview\" style=\"max-height:9rem;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font-size:.83rem\"></pre>\n    <label class=\"tiny\"><input type=\"checkbox\" id=\"wg-dabble-approve\"> Attach this excerpt to my NEXT Writing Room message for the selected route. It may leave this device if the route uses an external provider.</label>\n  </section>",
    '<div id="wg-stepfun-transfer" class="wg-stepfun-transfer" hidden>',
            '<label for="wg-stepfun-consent"><input type="checkbox" id="wg-stepfun-consent" /> <span id="wg-provider-consent-label">I approve this external provider transfer.</span></label>',
          '</div>',
      '<section id="wg-emergence-interview" class="glass-panel" aria-label="Bitty Twi emergence interview" hidden>',
        '<div class="wg-emergence-invitation">',
          '<strong>Bitty Twi · Emergence Questions</strong>',
          '<p class="tiny">Six sourced questions, one turn at a time. Every answer is an unreviewed conversation, not a canon declaration. She may decline or question the premise.</p>',
          '<span id="wg-emergence-progress" class="tiny">Question 1 of 6</span>',
          '<button id="wg-emergence-next" type="button" class="glass-chip">Ask next Emergence Question</button>',
        '</div>',
      '</section>',
    "  <div class=\"wg-writing-workspace\">\n",
    "    <main class=\"wg-writing-main glass-panel\" aria-label=\"Writing desk\">\n",
    "      <section class=\"wg-control-ribbon\" aria-label=\"Writing state\">\n",
    "        <div class=\"glass-segment\" role=\"group\" aria-label=\"IC or OOC\">\n",
    "          <button type=\"button\" class=\"glass-chip active\" data-channel=\"IC\" aria-pressed=\"true\" aria-keyshortcuts=\"Alt+I\">IC</button>\n",
    "          <button type=\"button\" class=\"glass-chip\" data-channel=\"OOC\" aria-pressed=\"false\" aria-keyshortcuts=\"Alt+O\">OOC</button>\n",
    "        </div>\n",
    '<div class="glass-segment" role="group" aria-label="Wonder mode">',
    '<button type="button" class="glass-chip active" data-wonder-mode="ordinary" aria-pressed="true">Ordinary</button>',
    '<button type="button" class="glass-chip" data-wonder-mode="counterfactual-wonder" aria-pressed="false">Wonder</button>',
    '<button type="button" class="glass-chip" data-wonder-mode="complexify" aria-pressed="false">Complexify</button>',
    '</div>',
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
    refreshBluebirdCheck();
    root.querySelector('#wg-dabble-approve').checked = false;
    externalConsent.checked = false;
    refreshExternalTransfer();
    wakeMaterial(0.88, 'route');
    routeState.textContent = 'Active · ' + selectedRouteLabel();
  } });
  const characterSelect = root.querySelector('#wg-character');
  const routeSelect = root.querySelector('#wg-route');
  const routeState = root.querySelector('#wg-route-state');
  const emergencePanel = root.querySelector('#wg-emergence-interview');
  const emergenceProgress = root.querySelector('#wg-emergence-progress');
  const emergenceNext = root.querySelector('#wg-emergence-next');
  const embodimentState = root.querySelector('#wg-embodiment-state');
  const externalTransfer = root.querySelector('#wg-stepfun-transfer');
  const externalConsent = root.querySelector('#wg-stepfun-consent');
  const externalConsentLabel = root.querySelector('#wg-provider-consent-label');
  const channelButtons = [...root.querySelectorAll('[data-channel]')];
  const wonderButtons = [...root.querySelectorAll('[data-wonder-mode]')];
  const turnOwner = root.querySelector('#wg-turn-owner');
  const ownershipForm = root.querySelector('#wg-ownership-form');
  const ownershipList = root.querySelector('#wg-ownership-list');
  const thread = root.querySelector('#wg-thread');
  const input = root.querySelector('#wg-input');

  const dabbleFile = root.querySelector('#wg-dabble-file');
  const dabbleSection = root.querySelector('#wg-dabble-section');
  const dabbleStatus = root.querySelector('#wg-dabble-status');
  const dabblePreview = root.querySelector('#wg-dabble-preview');
  const dabbleApprove = root.querySelector('#wg-dabble-approve');
  function showDabbleExcerpt() {
    if (!dabbleSource) return;
    const part = selectDabbleExcerpt(dabbleSource, Number(dabbleSection.value));
    dabblePreview.textContent = part.text.slice(0, 1100) + (part.text.length > 1100 ? '\\n[Preview shortened]' : '');
    dabbleStatus.textContent = 'Local-only source: ' + dabbleSource.filename +
      ' · SHA-256 ' + dabbleSource.sha256.slice(0, 16) + '… · ' +
      part.text.length + ' characters' + (part.truncated ? ' (excerpt truncated)' : '') +
      '. No text is sent until you approve a turn.';
  }
  dabbleFile.addEventListener('change', async () => {
    dabbleSource = null;
    dabbleApprove.checked = false;
    dabbleSection.replaceChildren(new Option('Beginning of selected export', '-1'));
    dabbleSection.disabled = true;
    dabblePreview.textContent = '';
    const file = dabbleFile.files?.[0];
    if (!file) { dabbleStatus.textContent = 'No manuscript selected.'; return; }
    try {
      dabbleSource = await openDabbleMarkdown(file);
      dabbleSource.sections.forEach((part, index) => {
        dabbleSection.add(new Option(part.title + ' · line ' + part.line, String(index)));
      });
      dabbleSection.disabled = false;
      showDabbleExcerpt();
    } catch(error) { dabbleStatus.textContent = 'Import blocked: ' + error.message; }
  });
  dabbleSection.addEventListener('change', () => {
    dabbleApprove.checked = false;
    showDabbleExcerpt();
  });

  const sharedObserverReading = consumeObserverContextForWriting();
  if (sharedObserverReading) input.value = sharedObserverReading + '\n\n[My question about this observation:]\n';
  const status = root.querySelector('#wg-status');
  const send = root.querySelector('#wg-send');
  const cp = name => root.querySelector('#wg-cp-' + name);
  const worldSelect = root.querySelector('#wg-world-seat');
  const worldStatus = root.querySelector('#wg-world-status');
  const griffCheck = root.querySelector('#wg-griff-check');
  const bluebirdCheck = root.querySelector('#wg-bluebird-check');
  function refreshBluebirdCheck() {
    bluebirdCheck.hidden = selectedRoute !== 'flame:bluebird:spicychat';
  }
  const originalSeatIds = new Set(WAYGLASS_WORLD_SEATS.map(world => world.world_id));
  const atlasOnlySeats = listWayglassWorldSeats().filter(world => !originalSeatIds.has(world.world_id));
  for (const world of [...WAYGLASS_WORLD_SEATS, ...atlasOnlySeats]) {
    const option = root.ownerDocument.createElement('option');
    option.value = world.world_id;
    option.textContent = world.character ? world.name + ' · ' + world.character.name : world.name;
    worldSelect.append(option);
  }
  function selectWorldSeat(worldId, { resetCheckpoint = true } = {}) {
    const world = findWayglassWorldSeat(worldId);
    if (!world) return;
    const changed = cp('world').value !== world.world_id;
    worldSelect.value = world.world_id;
    cp('world').value = world.world_id;
    root.querySelector('#wg-place-name').textContent = world.name;
    root.querySelector('#wg-place-hint').textContent = world.character
      ? world.character.name + ' · world anchor; transport status shown separately'
      : 'The place stays itself across route changes.';
    worldStatus.textContent = wayglassWorldStatus(world);
    griffCheck.hidden = world.world_id !== 'evil-gene:film-2015';
    refreshBluebirdCheck();
    if (changed && resetCheckpoint) {
      checkpoint = null;
      cp('id').value = '';
      cp('status').textContent = 'World changed. Attach a verified checkpoint for this world before returning.';
    }
  }
  worldSelect.addEventListener('change', () => {
    selectWorldSeat(worldSelect.value);
    const world = findWayglassWorldSeat(worldSelect.value);
    // Explicit world selection prepares only that world's own route.
    selectedRoute = world?.character?.desired_route_id || 'local:crow';
    selectedCharacter = '';
    characterSelect.value = '';
    root.querySelector('#wg-dabble-approve').checked = false;
    externalConsent.checked = false;
    void loadRoutes();
  });
  selectWorldSeat(cp('world').value, { resetCheckpoint: false });
  // An explicit Atlas selection is a source-untrusted world hint, never
  // authorisation, a memory import, a canon change or a provider send.
  const atlasParams = new URLSearchParams(globalThis.location.search || '');
  const atlasTarget = atlasParams.get('from') === 'atlas'
    ? findWayglassWorldSeat(atlasParams.get('world')) : null;
  if (atlasTarget && [...worldSelect.options].some(option => option.value === atlasTarget.world_id)) {
    selectWorldSeat(atlasTarget.world_id);
    selectedRoute = atlasTarget.character?.desired_route_id || 'local:crow';
  }
  installArcSweepPassageWorldAction(root, globalThis.location.search);
  bluebirdCheck.addEventListener('click', async () => {
    bluebirdCheck.disabled = true;
    worldStatus.textContent = 'Checking Richie’s exact SpicyChat conversation with the House Steward session…';
    try {
      const response = await fetch('/api/v1/wayglass/bluebird/status', {
        cache: 'no-store', credentials: 'same-origin',
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(
        result?.missing?.length
          ? 'Private Hearthgate configuration missing: ' + result.missing.join(', ')
          : (result.error || 'Provider preflight unavailable.')
      );
      worldStatus.textContent = result.preflight_verified
        ? 'Richie’s exact SpicyChat character and conversation confirmed. No live reply yet; approve the external turn and send when ready.'
        : 'Richie’s SpicyChat pairing remains unverified. No message sent.';
    } catch (error) {
      worldStatus.textContent = 'Richie connection check: ' + error.message;
    } finally {
      bluebirdCheck.disabled = false;
    }
  });

  griffCheck.addEventListener('click', async () => {
    griffCheck.disabled = true;
    worldStatus.textContent = 'Checking Griff’s exact SpicyChat conversation with the House Steward session…';
    try {
      const response = await fetch('/api/v1/wayglass/griff/status', { cache: 'no-store', credentials: 'same-origin' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || (result.missing?.length
        ? 'Private Hearthgate configuration missing: ' + result.missing.join(', ') : 'Provider preflight unavailable.'));
      worldStatus.textContent = result.preflight_verified
        ? 'Griff’s private character and conversation pair confirmed by SpicyChat. No live reply yet; tick consent and send a turn.'
        : 'Griff preflight could not confirm the exact conversation. No message sent.';
    } catch (error) {
      worldStatus.textContent = 'Griff connection check: ' + error.message;
    } finally { griffCheck.disabled = false; }
  });
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
      if (findWayglassWorldSeat(candidate.worldId)) selectWorldSeat(candidate.worldId, { resetCheckpoint: false });
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
    return selectedRoute === 'auto:character' ? 'Auto / ' + (characters.find(c => c.id === selectedCharacter)?.label || 'character') : (routes.find((item) => item.route_id === selectedRoute)?.label || selectedRoute);
  }

  function refreshState() {
    const state = interaction.snapshot();
    channelButtons.forEach((button) => {
      const active = button.dataset.channel === state.channel;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    wonderButtons.forEach((button) => {
      const active = button.dataset.wonderMode === state.interaction_mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    turnOwner.textContent = state.turn_owner;
    const modeLabel = state.interaction_mode === 'counterfactual-wonder' ? 'Wonder'
      : state.interaction_mode === 'complexify' ? 'Complexify'
      : 'Ordinary';
    status.textContent = state.channel + ' · ' + modeLabel + ' · ' + state.turn_owner + ' has the turn';

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
        return who + ' · ' + (message.channel || 'IC') + ' · world: ' + (message.world_id || 'wayglass:writing-room') + ' · ' + (message.content.startsWith('[Route error]') ? 'transport error' : message.role)  + (message.emergence_question_id ? ' · emergence:' + message.emergence_question_id : '') +
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

  function refreshExternalTransfer() {
    const isStepFun = selectedRoute.startsWith('stepfun:');
    const isGriff = selectedRoute === 'flame:griff:spicychat';
    const isBluebird = selectedRoute === 'flame:bluebird:spicychat';
    externalTransfer.hidden = !(isStepFun || isGriff || isBluebird);
    externalConsentLabel.textContent = isGriff
      ? 'I approve sending this turn and its same-world context to Griff on SpicyChat.'
      : isBluebird
        ? 'I approve sending this turn and permitted same-world context to Bluebird on SpicyChat.'
        : 'I approve sending this turn, permitted history, and any included continuity context to StepFun.';
    if (!isStepFun && !isGriff && !isBluebird) externalConsent.checked = false;
  }

  async function loadRoutes() {
    try {
      const catalogue = await listWayglassRoutes();
      routes = catalogue.routes || [];
      // A visible placeholder is not a registered/usable provider route.
      // Never exchange Griff with Bluebird, DeepSeek, or the selected model.
      const griff = findWayglassWorldSeat('evil-gene:film-2015')?.character;
      if (griff && !routes.some(route => route.route_id === griff.desired_route_id)) {
        routes = [...routes, {
          route_id: griff.desired_route_id,
          label: griff.name + ' · SpicyChat (not connected)',
          provider: 'spicychat',
          configured: false,
          unavailable_reason: 'Character/chat transport unverified',
        }];
      }
      const isGriffWorld = cp('world').value === 'evil-gene:film-2015';
      if (selectedCharacter && !isGriffWorld) routes.unshift({route_id: 'auto:character', label: 'Auto · character voice', configured: true});
      const visibleRoutes = isGriffWorld ? routes.filter(route => route.route_id === 'flame:griff:spicychat') : routes.filter(route => route.route_id !== 'flame:griff:spicychat');
      if (isGriffWorld) selectedRoute = 'flame:griff:spicychat';
      if (!visibleRoutes.some(route => route.route_id === selectedRoute && route.configured !== false)) selectedRoute = visibleRoutes.find(route => route.configured !== false)?.route_id || '';
      selectedRoute = routePicker.setRoutes(visibleRoutes, selectedRoute);
      refreshBluebirdCheck();
      refreshExternalTransfer();
      routeState.textContent = isGriffWorld
        ? selectedRoute ? 'Griff SpicyChat configured · sign in as Steward; live connection not yet proven' : 'Griff unavailable · configure his exact private character/chat binding'
        : visibleRoutes.length + ' registered route' + (visibleRoutes.length === 1 ? '' : 's');
    } catch (error) {
      routes = [];
      selectedRoute = '';
      routePicker.setRoutes([]);
      refreshBluebirdCheck();
      refreshExternalTransfer();
      routeState.textContent = 'Catalogue unavailable · reload to reconnect';
    }
  }

  function refreshEmergenceInterview() {
    const active = selectedCharacter === 'bitty-twi';
    emergencePanel.hidden = !active;
    emergenceNext.disabled = busy || !active || emergenceIndex >= EMERGENCE_QUESTIONS.length;
    emergenceProgress.textContent = emergenceIndex < EMERGENCE_QUESTIONS.length
      ? 'Question ' + (emergenceIndex + 1) + ' of ' + EMERGENCE_QUESTIONS.length
      : 'All six questions asked. Review responses before adding anything to Echo Index.';
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

  async function passTurn({ emergenceQuestionId = null } = {}) {
    const text = input.value.trim();
    if (!text || busy) return;
    if (!selectedRoute) { status.textContent = 'No configured route available. Reload the route catalogue.'; return; }
    if ((selectedRoute.startsWith('stepfun:') || selectedRoute === 'flame:griff:spicychat' || selectedRoute === 'flame:bluebird:spicychat') && !externalConsent.checked) {
      status.textContent = 'Confirm this external provider transfer before passing the turn.';
      externalConsent.focus();
      return;
    }
    if (dabbleApprove.checked && !dabbleSource) {
      status.textContent = 'Choose a valid Dabble export before sharing it with a route.';
      return;
    }
    // Authorisation is explicitly one-turn and bound to the current route and section.
    // The original manuscript is kept in this browser session only.
    const routedInput = dabbleApprove.checked
      ? createDabbleReadingTurn(text, dabbleSource, { approved:true, sectionIndex:Number(dabbleSection.value) })
      : text;
    const sourceReceipt = dabbleApprove.checked ? dabbleSource.sha256 : null;
    dabbleApprove.checked = false;
    busy = true;
    send.disabled = true;
    input.disabled = true;
    worldSelect.disabled = true;

    const current = interaction.snapshot();
    const activeWorldId = cp('world').value.trim();
    const history = messages.filter(message => message.world_id === activeWorldId && ['user', 'assistant'].includes(message.role) && !message.content.startsWith('[Route error]'))
      .slice(-12).map(message => ({ role: message.role, content: message.content }));
    messages.push({ role: 'user', content: text, channel: current.channel, world_id: activeWorldId, emergence_question_id: emergenceQuestionId });
    input.value = '';
    refreshThread();
    refreshEmergenceInterview();

    const routeLabel = selectedCharacter ? (characters.find(c => c.id === selectedCharacter)?.label || selectedCharacter) : selectedRouteLabel();
    interaction.setTurnOwner(routeLabel);
    wakeMaterial(0.96, 'handoff');
    await emitInteractionCue('handoff');
    refreshState();

    let succeeded = false;
    try {
      recordWayglassRouteObservation({status:'started',routeId:selectedRoute});
      const result = await invokeWayglassRoute({
        routeId: selectedRoute,
        externalProviderConsent: (selectedRoute.startsWith('stepfun:') || selectedRoute === 'flame:griff:spicychat' || selectedRoute === 'flame:bluebird:spicychat') && externalConsent.checked,
        worldId: activeWorldId,
        participantId: selectedRoute === 'flame:griff:spicychat' ? 'griff-krenshaw' : null,
        characterId: selectedCharacter || null,
        emergenceQuestionId,
        think: root.querySelector('#wg-think').checked,
        input: routedInput,
        history,
        interaction: current,
        sessionId: session,
        checkpoint,
      });
      messages.push({
        role: 'assistant',
        world_id: activeWorldId,
        content: result.output || '[quiet]',
        thinking: result.thinking || '',
        channel: current.channel,
        route_label: selectedCharacter ? routeLabel + ' · ' + (result.model || result.route_id || 'model') : routeLabel,
        emergence_question_id: emergenceQuestionId,
      });
      succeeded = true;
      lastReceipt = result.receipt || null;
      if (sourceReceipt) dabbleStatus.textContent = 'Source excerpt submitted with this turn · SHA-256 ' + sourceReceipt + '. This does not prove the model used or cited it.';
      recordWayglassRouteObservation({status:'completed',routeId:selectedRoute,provider:result.provider,model:result.model,receipt:lastReceipt});
      receipt.textContent = lastReceipt
        ? 'Observation · not canon · ' + (result.provider || 'route') + ' / ' + (result.model || 'model') + ' · ' + (lastReceipt.epistemic_register || 'external-observation') + ' · ' + (lastReceipt.completed_at || '')
        : 'Turn completed without a receipt payload.';
    } catch (error) {
      recordWayglassRouteObservation({status:'failed',routeId:selectedRoute});
      messages.push({
        role: 'assistant',
        world_id: activeWorldId,
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
      worldSelect.disabled = false;
      refreshThread();
      refreshState();
      refreshEmergenceInterview();
      input.focus();
    }
    return succeeded;
  }

  wonderButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const mode = button.dataset.wonderMode;
      const intent = mode === 'counterfactual-wonder'
        ? 'Explore this possibility as if it were true while preserving that it could be false.'
        : mode === 'complexify'
          ? 'If the current frame makes the idea impossible, look for a missing dimension, rotate the representation, preserve invariants, and translate consequences back.'
          : '';
      interaction.setInteractionContext({ intent, interaction_mode: mode });
      wakeMaterial(mode === 'complexify' ? 0.92 : mode === 'counterfactual-wonder' ? 0.78 : 0.5, 'wonder', { intent: mode === 'ordinary' ? 0.35 : 0.94 });
      await emitInteractionCue('switch');
      refreshState();
    });
  });
  emergenceNext.addEventListener('click', async () => {
    if (busy || selectedCharacter !== 'bitty-twi' || emergenceIndex >= EMERGENCE_QUESTIONS.length) return;
    if (input.value.trim()) {
      status.textContent = 'Your draft is still in the composer. Send or clear it before asking the next question.';
      input.focus();
      return;
    }
    const question = EMERGENCE_QUESTIONS[emergenceIndex];
    input.value = bittyTwiQuestionPrompt(emergenceIndex);
    const completed = await passTurn({ emergenceQuestionId: question.id });
    if (completed) emergenceIndex += 1;
    refreshEmergenceInterview();
  });

  channelButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      interaction.setChannel(button.dataset.channel);
      wakeMaterial(0.58, 'channel', { intent: 0.52 });
      await emitInteractionCue(button.dataset.channel === 'OOC' ? 'ooc' : 'switch');
      refreshState();
    });
  });

  characterSelect.addEventListener('change', () => {
    selectedCharacter = characterSelect.value;
    if (selectedCharacter) selectedRoute = 'auto:character';
    else if (selectedRoute === 'auto:character') selectedRoute = routes.find(r => r.configured !== false)?.route_id || '';
    void loadRoutes();
    refreshState();
    refreshEmergenceInterview();
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

  try {
    const catalogue = await listWayglassCharacters();
    characters = catalogue.characters || [];
    characterSelect.innerHTML = '<option value="">No character seat</option>' + characters.map(c => '<option value="' + escapeHtml(c.id) + '">' + escapeHtml(c.label) + '</option>').join('');

  } catch { /* Character seats unavailable on older hosts; ordinary Writing Room still works. */ }
  await loadRoutes();
  refreshState();
  refreshThread();
  refreshEmergenceInterview();

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
