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

const STORE_KEY = 'arcsweep:continuity-store:v1';

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

let previewPacket = null;
let store = loadStore();

function loadStore() {
  try {
    return normalizeContinuityStore(JSON.parse(localStorage.getItem(STORE_KEY) || 'null'));
  } catch {
    return createEmptyContinuityStore();
  }
}

function saveStore(nextStore) {
  store = normalizeContinuityStore(nextStore);
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
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
    fragment.querySelector('.route-chip').textContent = humanize(item.route);
    fragment.querySelector('.layer-chip').textContent = humanize(item.layer);
    fragment.querySelector('p').textContent = item.text;
    fragment.querySelector('.register-chip').textContent = humanize(item.epistemic_register);
    fragment.querySelector('.source-chip').textContent = item.source_packet_ids.length
      ? `${item.source_packet_ids.length} source packet${item.source_packet_ids.length === 1 ? '' : 's'}`
      : 'review-room addition';
    itemGrid.append(fragment);
  }

  importButton.disabled = false;
  setMessage(`Packet ${packet.continuity_packet_id} passed the gate checks.`, 'success');
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
    const empty = document.createElement('p');
    empty.className = 'empty-receipts';
    empty.textContent = 'No Arcsweep imports yet. The gate is awake and unburdened.';
    receiptList.append(empty);
    return;
  }

  for (const receipt of receipts) {
    const article = document.createElement('article');
    article.className = 'receipt-card';
    article.innerHTML = `
      <div>
        <strong>${receipt.world_slug}</strong>
        <span>${receipt.item_count} item${receipt.item_count === 1 ? '' : 's'} · ${formatDate(receipt.imported_at)}</span>
        <code>${receipt.packet_id}</code>
      </div>
    `;

    if (receipt.rolled_back_at) {
      const state = document.createElement('span');
      state.className = 'receipt-state rolled';
      state.textContent = `Rolled back ${formatDate(receipt.rolled_back_at)}`;
      article.append(state);
    } else if (receipt.rollback?.available) {
      const rollback = document.createElement('button');
      rollback.type = 'button';
      rollback.className = 'rollback-button';
      rollback.textContent = 'Rollback import';
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
      article.append(rollback);
    }
    receiptList.append(article);
  }
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
    export_note: 'Portable Arcsweep continuity store. Canon promotion is not included.',
  });
  setMessage('Local Arcsweep continuity store exported.', 'success');
});

if (store.schema !== ARCSWEEP_STORE_SCHEMA) saveStore(createEmptyContinuityStore());
renderStore();
setMessage('The gate is ready. Bring a reviewed continuity packet.');
