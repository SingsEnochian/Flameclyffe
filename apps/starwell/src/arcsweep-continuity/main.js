import './continuity-gate.css';
import {
  ARCSWEEP_STORE_SCHEMA,
  continuityStoreSummary,
  createEmptyContinuityStore,
  importContinuityPacket,
  normalizeContinuityStore,
  rollbackContinuityImport,
  validateContinuityPacket,
} from './adapter.js';
import {
  continuityWorldOptions,
  createSessionLoadReceipt,
  createSessionUnloadReceipt,
  resolveSessionContext,
  sessionContextSummary,
  validateSessionContext,
} from './session-resolver.js';

const STORE_KEY = 'arcsweep:continuity-store:v1';
const SESSION_CONTEXT_KEY = 'arcsweep:session-context:active:v1';
const SESSION_RECEIPTS_KEY = 'arcsweep:session-receipts:v1';

const storeState = document.getElementById('store-state');
const canonState = document.getElementById('canon-state');
const packetUrl = document.getElementById('packet-url');
const readUrl = document.getElementById('read-url');
const packetFile = document.getElementById('packet-file');
const packetCard = document.getElementById('packet-card');
const packetWorld = document.getElementById('packet-world');
const packetChain = document.getElementById('packet-chain');
const packetBadge = document.getElementById('packet-badge');
const packetId = document.getElementById('packet-id');
const packetReviewer = document.getElementById('packet-reviewer');
const packetCount = document.getElementById('packet-count');
const packetAuthority = document.getElementById('packet-authority');
const itemGrid = document.getElementById('item-grid');
const itemTemplate = document.getElementById('item-template');
const importedBy = document.getElementById('imported-by');
const importButton = document.getElementById('import-button');
const exportStore = document.getElementById('export-store');
const storePackets = document.getElementById('store-packets');
const storeItems = document.getElementById('store-items');
const storeWorlds = document.getElementById('store-worlds');
const storeReceipts = document.getElementById('store-receipts');
const receiptList = document.getElementById('receipt-list');
const messageLine = document.getElementById('message-line');

const loadedSession = document.getElementById('loaded-session');
const loadedSessionTitle = document.getElementById('loaded-session-title');
const loadedSessionDetail = document.getElementById('loaded-session-detail');
const clearSession = document.getElementById('clear-session');
const sessionWorld = document.getElementById('session-world');
const sessionRoute = document.getElementById('session-route');
const sessionRegister = document.getElementById('session-register');
const sessionLimit = document.getElementById('session-limit');
const resolveSession = document.getElementById('resolve-session');
const sessionPreview = document.getElementById('session-preview');
const sessionPreviewTitle = document.getElementById('session-preview-title');
const sessionPreviewChain = document.getElementById('session-preview-chain');
const sessionPreviewBadge = document.getElementById('session-preview-badge');
const sessionContextId = document.getElementById('session-context-id');
const sessionContextCount = document.getElementById('session-context-count');
const sessionContextPackets = document.getElementById('session-context-packets');
const sessionItemGrid = document.getElementById('session-item-grid');
const sessionItemTemplate = document.getElementById('session-item-template');
const loadSession = document.getElementById('load-session');
const exportContext = document.getElementById('export-context');
const sessionReceiptList = document.getElementById('session-receipt-list');

let previewPacket = null;
let previewContext = null;
let store = loadStore();

function loadStore() {
  try {
    return normalizeContinuityStore(JSON.parse(localStorage.getItem(STORE_KEY) || 'null'));
  } catch {
    return createEmptyContinuityStore();
  }
}

function loadSessionEnvelope() {
  try {
    const envelope = JSON.parse(sessionStorage.getItem(SESSION_CONTEXT_KEY) || 'null');
    if (!envelope?.context) return null;
    return { ...envelope, context: validateSessionContext(envelope.context) };
  } catch {
    sessionStorage.removeItem(SESSION_CONTEXT_KEY);
    return null;
  }
}

function loadSessionReceipts() {
  try {
    const receipts = JSON.parse(sessionStorage.getItem(SESSION_RECEIPTS_KEY) || '[]');
    return Array.isArray(receipts) ? receipts : [];
  } catch {
    return [];
  }
}

function appendSessionReceipt(receipt) {
  const receipts = loadSessionReceipts();
  receipts.push(receipt);
  sessionStorage.setItem(SESSION_RECEIPTS_KEY, JSON.stringify(receipts.slice(-50)));
}

function activeContextIsBackedByStore(context) {
  return context.items.every((contextItem) => {
    const item = store.items[contextItem.continuity_item_id];
    const packet = item ? store.packets[item.packet_id] : null;
    return Boolean(
      item
      && packet
      && packet.state === 'active'
      && packet.canon_commit === false
      && packet.authority_scope === 'continuity-only'
      && item.arcsweep_state === 'active-continuity'
      && item.canon_state === 'not-promoted'
      && item.canon_commit === false
      && item.source_fingerprint === contextItem.source_fingerprint,
    );
  });
}

function clearLoadedContext({ actor = 'Rowan', reason = 'explicit-clear', silent = false } = {}) {
  const envelope = loadSessionEnvelope();
  if (!envelope) return false;
  const receipt = {
    ...createSessionUnloadReceipt(envelope.context, { unloadedBy: actor }),
    reason,
  };
  appendSessionReceipt(receipt);
  sessionStorage.removeItem(SESSION_CONTEXT_KEY);
  if (!silent) setMessage(`Session context ${envelope.context.session_context_id} cleared. Durable continuity remains.`, 'success');
  return true;
}

function ensureLoadedContextStillValid() {
  const envelope = loadSessionEnvelope();
  if (!envelope) return;
  if (!activeContextIsBackedByStore(envelope.context)) {
    clearLoadedContext({
      actor: importedBy.value.trim() || 'Rowan',
      reason: 'source-continuity-no-longer-active',
      silent: true,
    });
    setMessage('The loaded session context was cleared because its source continuity is no longer active.', 'success');
  }
}

function saveStore(nextStore) {
  store = normalizeContinuityStore(nextStore);
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
  ensureLoadedContextStillValid();
  renderStore();
}

function setMessage(message, kind = '') {
  messageLine.textContent = message;
  messageLine.className = `message-line ${kind}`.trim();
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/New_York',
  }).format(date);
}

function humanize(value) {
  return String(value ?? '—').replaceAll('-', ' ');
}

function fillContinuityCard(fragment, item, sourceText) {
  fragment.querySelector('.route-chip').textContent = humanize(item.route);
  fragment.querySelector('.layer-chip').textContent = humanize(item.layer);
  fragment.querySelector('p').textContent = item.text;
  fragment.querySelector('.register-chip').textContent = humanize(item.epistemic_register);
  fragment.querySelector('.source-chip').textContent = sourceText;
}

function renderPacket(packet) {
  previewPacket = validateContinuityPacket(packet);
  packetCard.hidden = false;
  packetWorld.textContent = humanize(packet.world_slug);
  packetChain.textContent = `session ${packet.session_id} → laminate ${packet.lamination_id} → review ${packet.review_id} → continuity ${packet.continuity_packet_id}`;
  packetBadge.textContent = store.packets[packet.continuity_packet_id]?.state === 'active' ? 'Already ingested' : 'Ready to ingest';
  packetBadge.className = `packet-badge ${store.packets[packet.continuity_packet_id]?.state === 'active' ? 'done' : ''}`;
  packetId.textContent = packet.continuity_packet_id;
  packetReviewer.textContent = `${packet.reviewer ?? '—'} · ${formatDate(packet.reviewed_at)}`;
  packetCount.textContent = String(packet.accepted_items.length);
  packetAuthority.textContent = `${packet.authority.scope} · canon false`;

  itemGrid.replaceChildren();
  for (const item of packet.accepted_items) {
    const fragment = itemTemplate.content.cloneNode(true);
    fillContinuityCard(
      fragment,
      item,
      item.source_packet_ids.length
        ? `${item.source_packet_ids.length} source packet${item.source_packet_ids.length === 1 ? '' : 's'}`
        : 'review-room addition',
    );
    itemGrid.append(fragment);
  }

  importButton.disabled = false;
  setMessage(`Packet ${packet.continuity_packet_id} passed the gate checks.`, 'success');
}

function appendText(parent, tagName, text, className = '') {
  const node = document.createElement(tagName);
  node.textContent = text;
  if (className) node.className = className;
  parent.append(node);
  return node;
}

function renderImportReceipt(receipt) {
  const article = document.createElement('article');
  article.className = 'receipt-card';
  const details = document.createElement('div');
  appendText(details, 'strong', receipt.world_slug);
  appendText(details, 'span', `${receipt.item_count} item${receipt.item_count === 1 ? '' : 's'} · ${formatDate(receipt.imported_at)}`);
  appendText(details, 'code', receipt.packet_id);
  article.append(details);

  if (receipt.rolled_back_at) {
    appendText(article, 'span', `Rolled back ${formatDate(receipt.rolled_back_at)}`, 'receipt-state rolled');
  } else if (receipt.rollback?.available) {
    const rollback = appendText(article, 'button', 'Rollback import', 'rollback-button');
    rollback.type = 'button';
    rollback.addEventListener('click', () => {
      try {
        const result = rollbackContinuityImport(store, receipt.receipt_id, {
          rolledBackBy: importedBy.value.trim() || 'Rowan',
        });
        saveStore(result.store);
        if (previewPacket?.continuity_packet_id === receipt.packet_id) renderPacket(previewPacket);
        setMessage(`Import ${receipt.receipt_id} rolled back. The receipt remains.`, 'success');
      } catch (error) {
        setMessage(error.message, 'error');
      }
    });
  }
  return article;
}

function renderStore() {
  const summary = continuityStoreSummary(store);
  storeState.textContent = `${summary.packet_count} active packet${summary.packet_count === 1 ? '' : 's'} · ${summary.item_count} continuity item${summary.item_count === 1 ? '' : 's'}`;
  canonState.textContent = `${summary.canon_commit_count} canon commit${summary.canon_commit_count === 1 ? '' : 's'}`;
  canonState.className = summary.canon_commit_count === 0 ? 'safe' : 'attention';
  storePackets.textContent = String(summary.packet_count);
  storeItems.textContent = String(summary.item_count);
  storeWorlds.textContent = String(summary.world_count);
  storeReceipts.textContent = String(summary.receipt_count);

  receiptList.replaceChildren();
  const receipts = [...store.receipts].reverse();
  if (!receipts.length) {
    appendText(receiptList, 'p', 'No Arcsweep imports yet. The gate is awake and unburdened.', 'empty-receipts');
  } else {
    for (const receipt of receipts) receiptList.append(renderImportReceipt(receipt));
  }

  renderSessionResolver();
}

function renderWorldOptions() {
  const previous = sessionWorld.value;
  sessionWorld.replaceChildren();
  try {
    const worlds = continuityWorldOptions(store);
    if (!worlds.length) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No active continuity worlds';
      sessionWorld.append(option);
      resolveSession.disabled = true;
      return;
    }
    for (const world of worlds) {
      const option = document.createElement('option');
      option.value = world.world_slug;
      option.textContent = `${humanize(world.world_slug)} · ${world.item_count} item${world.item_count === 1 ? '' : 's'}`;
      sessionWorld.append(option);
    }
    sessionWorld.value = worlds.some((world) => world.world_slug === previous)
      ? previous
      : worlds[0].world_slug;
    resolveSession.disabled = false;
  } catch (error) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Continuity store requires review';
    sessionWorld.append(option);
    resolveSession.disabled = true;
    setMessage(error.message, 'error');
  }
}

function renderLoadedSession() {
  const envelope = loadSessionEnvelope();
  if (!envelope) {
    loadedSession.className = 'loaded-session';
    loadedSessionTitle.textContent = 'No continuity context loaded';
    loadedSessionDetail.textContent = 'The browser session is clear.';
    clearSession.hidden = true;
    return;
  }
  const summary = sessionContextSummary(envelope.context);
  loadedSession.className = 'loaded-session active';
  loadedSessionTitle.textContent = `${humanize(summary.world_slug)} context loaded`;
  loadedSessionDetail.textContent = `${summary.item_count} reviewed continuity item${summary.item_count === 1 ? '' : 's'} · ${summary.packet_count} source packet${summary.packet_count === 1 ? '' : 's'} · canon false`;
  clearSession.hidden = false;
}

function renderSessionReceipts() {
  sessionReceiptList.replaceChildren();
  const receipts = loadSessionReceipts().reverse();
  if (!receipts.length) {
    appendText(sessionReceiptList, 'p', 'No session loads or clears yet.', 'empty-receipts');
    return;
  }
  for (const receipt of receipts) {
    const article = document.createElement('article');
    article.className = 'receipt-card';
    const details = document.createElement('div');
    const action = receipt.action === 'load' ? 'Loaded' : 'Cleared';
    const timestamp = receipt.loaded_at ?? receipt.unloaded_at;
    appendText(details, 'strong', `${action} · ${humanize(receipt.world_slug)}`);
    appendText(details, 'span', `${receipt.item_count} item${receipt.item_count === 1 ? '' : 's'} · ${formatDate(timestamp)}`);
    appendText(details, 'code', receipt.session_context_id);
    article.append(details);
    appendText(article, 'span', receipt.reason ? humanize(receipt.reason) : 'session only', 'receipt-state rolled');
    sessionReceiptList.append(article);
  }
}

function renderSessionResolver() {
  renderWorldOptions();
  renderLoadedSession();
  renderSessionReceipts();
}

function renderContext(contextInput) {
  const context = validateSessionContext(contextInput);
  const summary = sessionContextSummary(context);
  previewContext = context;
  sessionPreview.hidden = false;
  sessionPreviewTitle.textContent = humanize(context.world_slug);
  sessionPreviewChain.textContent = `${context.source.packet_ids.length} packet${context.source.packet_ids.length === 1 ? '' : 's'} → ${context.source.review_ids.length} review${context.source.review_ids.length === 1 ? '' : 's'} → ${context.items.length} continuity item${context.items.length === 1 ? '' : 's'}`;
  sessionPreviewBadge.textContent = summary.truncated ? 'Bounded preview' : 'Preview only';
  sessionPreviewBadge.className = 'packet-badge';
  sessionContextId.textContent = context.session_context_id;
  sessionContextCount.textContent = summary.truncated
    ? `${summary.item_count} of ${context.selection.available_count}`
    : String(summary.item_count);
  sessionContextPackets.textContent = String(summary.packet_count);

  sessionItemGrid.replaceChildren();
  for (const item of context.items) {
    const fragment = sessionItemTemplate.content.cloneNode(true);
    fillContinuityCard(fragment, item, `packet ${item.packet_id}`);
    sessionItemGrid.append(fragment);
  }

  const active = loadSessionEnvelope();
  const alreadyLoaded = active?.context?.context_signature === context.context_signature;
  loadSession.disabled = false;
  loadSession.querySelector('strong').textContent = alreadyLoaded ? 'Already loaded' : 'Load for this session';
  sessionPreviewBadge.textContent = alreadyLoaded ? 'Loaded' : sessionPreviewBadge.textContent;
  sessionPreviewBadge.className = `packet-badge ${alreadyLoaded ? 'done' : ''}`;
  setMessage(`Resolved ${summary.item_count} continuity item${summary.item_count === 1 ? '' : 's'} for a ${context.lifetime}.`, 'success');
}

async function readPacketFromUrl() {
  const url = packetUrl.value.trim();
  if (!url) {
    setMessage('Enter a Hearthfire continuity URL first.', 'error');
    return;
  }

  readUrl.disabled = true;
  setMessage('Calling the Hearthfire loopback gate…');
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Hearthfire answered ${response.status}`);
    renderPacket(await response.json());
  } catch (error) {
    setMessage(
      `Loopback read failed: ${error.message}. Choose bridge-continuity.latest.json below; the file route stays local and needs no cross-origin permission.`,
      'error',
    );
  } finally {
    readUrl.disabled = false;
  }
}

async function readPacketFile(file) {
  if (!file) return;
  setMessage(`Reading ${file.name}…`);
  try {
    renderPacket(JSON.parse(await file.text()));
  } catch (error) {
    previewPacket = null;
    packetCard.hidden = true;
    setMessage(`Packet rejected: ${error.message}`, 'error');
  } finally {
    packetFile.value = '';
  }
}

function downloadJson(filename, value) {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

readUrl.addEventListener('click', readPacketFromUrl);
packetFile.addEventListener('change', () => readPacketFile(packetFile.files?.[0]));

importButton.addEventListener('click', () => {
  if (!previewPacket) return;
  try {
    const actor = importedBy.value.trim();
    if (!actor) throw new Error('Name who is importing this packet.');
    importButton.disabled = true;
    const result = importContinuityPacket(previewPacket, store, { importedBy: actor });
    saveStore(result.store);
    renderPacket(previewPacket);
    setMessage(
      result.idempotent
        ? `Packet ${previewPacket.continuity_packet_id} was already present. No duplicate was created.`
        : `Packet ${previewPacket.continuity_packet_id} ingested with ${result.receipt.item_count} continuity items. Canon remains untouched.`,
      'success',
    );
  } catch (error) {
    setMessage(error.message, 'error');
  } finally {
    importButton.disabled = false;
  }
});

exportStore.addEventListener('click', () => {
  downloadJson('arcsweep-continuity-store.json', {
    ...store,
    exported_at: new Date().toISOString(),
    export_note: 'Portable Arcsweep continuity store. Canon promotion and session context are not included.',
  });
  setMessage('Local Arcsweep continuity store exported.', 'success');
});

resolveSession.addEventListener('click', () => {
  try {
    const actor = importedBy.value.trim();
    if (!actor) throw new Error('Name who is resolving this session context.');
    const maxItems = Number(sessionLimit.value);
    const context = resolveSessionContext(store, {
      worldSlug: sessionWorld.value,
      resolvedBy: actor,
      routes: sessionRoute.value ? [sessionRoute.value] : [],
      registers: sessionRegister.value ? [sessionRegister.value] : [],
      maxItems,
    });
    renderContext(context);
  } catch (error) {
    previewContext = null;
    sessionPreview.hidden = true;
    setMessage(error.message, 'error');
  }
});

loadSession.addEventListener('click', () => {
  if (!previewContext) return;
  try {
    const actor = importedBy.value.trim();
    if (!actor) throw new Error('Name who is loading this session context.');
    const current = loadSessionEnvelope();
    if (current?.context?.context_signature === previewContext.context_signature) {
      setMessage(`Context ${current.context.session_context_id} is already loaded. No duplicate receipt was created.`, 'success');
      renderContext(previewContext);
      return;
    }
    const receipt = createSessionLoadReceipt(previewContext, {
      loadedBy: actor,
      replacesContextId: current?.context?.session_context_id ?? null,
    });
    sessionStorage.setItem(SESSION_CONTEXT_KEY, JSON.stringify({
      context: previewContext,
      load_receipt: receipt,
    }));
    appendSessionReceipt(receipt);
    renderSessionResolver();
    renderContext(previewContext);
    setMessage(`Context ${previewContext.session_context_id} loaded for this browser session. Canon remains untouched.`, 'success');
  } catch (error) {
    setMessage(error.message, 'error');
  }
});

clearSession.addEventListener('click', () => {
  clearLoadedContext({ actor: importedBy.value.trim() || 'Rowan' });
  renderSessionResolver();
  if (previewContext) renderContext(previewContext);
});

exportContext.addEventListener('click', () => {
  if (!previewContext) return;
  downloadJson(`arcsweep-session-context-${previewContext.world_slug}.json`, previewContext);
  setMessage('Resolved session context preview exported. It is still not canon.', 'success');
});

sessionWorld.addEventListener('change', () => {
  previewContext = null;
  sessionPreview.hidden = true;
});
sessionRoute.addEventListener('change', () => {
  previewContext = null;
  sessionPreview.hidden = true;
});
sessionRegister.addEventListener('change', () => {
  previewContext = null;
  sessionPreview.hidden = true;
});

if (store.schema !== ARCSWEEP_STORE_SCHEMA) saveStore(createEmptyContinuityStore());
ensureLoadedContextStillValid();
renderStore();
setMessage('The gate is ready. Bring a reviewed continuity packet or resolve an active world context.');
