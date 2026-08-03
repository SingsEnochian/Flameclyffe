import { DEFAULT_DEEP_STATE } from '../lib/deepState.js';
import { fetchBridgeDeepSnapshot } from '../lib/deepBridge.js';
import { resolveHouseProfile } from '../hearthgate/profiles/registry.js';
import {
  assembleCompressionReleaseDualAspectPacket,
  createDegradedDeepSnapshot,
  replayDualAspectPacket,
} from '../hearthweave-kernel/index.js';
import {
  clearDualAspectActivation,
  publishDualAspectActivation,
  readActiveDualAspectPacket,
  recordDualAspectReplay,
} from '../hearthweave-kernel/activation.js';
import {
  clearIPadSomaticLineage,
  publishIPadSomaticLineage,
} from '../ipad-somatic-lineage.js';

const SESSION_CONTEXT_KEY = 'arcsweep:session-context:active:v1';
const SESSION_RECEIPTS_KEY = 'arcsweep:session-receipts:v1';
const LOAD_BUTTON_ID = 'load-session';
const CLEAR_BUTTON_ID = 'clear-session';

function readJson(storage, key, fallback = null) {
  try {
    return JSON.parse(storage.getItem(key) || 'null') ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(storage, key, value) {
  storage.setItem(key, JSON.stringify(value));
}

function setGateMessage(message, kind = 'success') {
  const line = document.getElementById('message-line');
  if (!line) return;
  line.textContent = message;
  line.className = `message-line ${kind}`.trim();
}

function annotateSessionReceipt(packet) {
  const receipts = readJson(sessionStorage, SESSION_RECEIPTS_KEY, []);
  if (!Array.isArray(receipts)) return;
  const index = receipts.findLastIndex?.((receipt) => (
    receipt?.action === 'load'
    && receipt.session_context_id === packet.identity.session_context_id
  )) ?? -1;
  if (index < 0) return;
  receipts[index] = {
    ...receipts[index],
    dual_aspect_packet_id: packet.packet_id,
    dual_aspect_packet_fingerprint: packet.packet_fingerprint,
    shared_state_fingerprint: packet.correspondence.shared_state_fingerprint,
    deep_snapshot_id: packet.observable.deep_snapshot.snapshot_id,
    deep_mode: packet.observable.deep_snapshot.mode,
    premaq_id: packet.observable.premaq.id,
    bridge_packet_id: packet.observable.bridge.bridge_packet_id,
    compression_release_receipt_id: packet.provenance.compression_release_receipt_id,
    house_id: packet.identity.house_id,
  };
  writeJson(sessionStorage, SESSION_RECEIPTS_KEY, receipts);
}

function annotateSessionEnvelope(envelope, packet) {
  const next = {
    ...envelope,
    dual_aspect: {
      packet_id: packet.packet_id,
      packet_fingerprint: packet.packet_fingerprint,
      shared_state_fingerprint: packet.correspondence.shared_state_fingerprint,
      receipt_id: packet.receipts[0],
      compression_release_receipt_id: packet.provenance.compression_release_receipt_id,
      house_id: packet.identity.house_id,
      deep_mode: packet.observable.deep_snapshot.mode,
      activated_at: packet.temporal.activated_at,
    },
  };
  writeJson(sessionStorage, SESSION_CONTEXT_KEY, next);
}

async function acquireActivationSnapshot() {
  try {
    return await fetchBridgeDeepSnapshot({
      preferActivePacket: false,
      storage: sessionStorage,
    });
  } catch (error) {
    return createDegradedDeepSnapshot({
      state: DEFAULT_DEEP_STATE,
      reason: 'BRIDGE_PULSE_UNAVAILABLE_AT_ARCSWEEP_FREEZE',
      error,
    });
  }
}

export async function freezeLoadedArcsweepContext() {
  const envelope = readJson(sessionStorage, SESSION_CONTEXT_KEY, null);
  const context = envelope?.context;
  if (!context) {
    setGateMessage('No loaded continuity context was available for the kernel freeze.', 'error');
    return null;
  }

  const current = readActiveDualAspectPacket({ storage: sessionStorage });
  if (current?.identity?.session_context_id === context.session_context_id) {
    publishIPadSomaticLineage(current, { storage: localStorage });
    setGateMessage(
      `DualAspectPacket ${current.packet_id} is already bound to this session. Its iPad somatic lineage is active. No second clock was created.`,
      'success',
    );
    return current;
  }

  setGateMessage('Freezing continuity, DEEP, PREMAQ, temporal evolution, compression, release, and House identity into one packet…');
  const deepSnapshot = await acquireActivationSnapshot();
  const house = resolveHouseProfile(context.world_slug);
  const packet = assembleCompressionReleaseDualAspectPacket({
    context,
    deepSnapshot,
    house,
  });
  publishDualAspectActivation(packet, {
    storage: sessionStorage,
    eventTarget: window,
  });
  publishIPadSomaticLineage(packet, { storage: localStorage });
  const replay = replayDualAspectPacket(packet);
  recordDualAspectReplay(packet, replay, { storage: sessionStorage });
  annotateSessionEnvelope(envelope, packet);
  annotateSessionReceipt(packet);

  const mode = packet.degraded.active
    ? `DEGRADED: ${packet.degraded.reasons.join(', ')}`
    : 'LIVE';
  setGateMessage(
    `Bifröst bound: ${packet.packet_id} · ${packet.identity.house_id} · ${mode}. Compression, release, glyph, tone, image, haptic, narrative, and iPad somatic output share ${packet.correspondence.shared_state_fingerprint}.`,
    packet.degraded.active ? 'attention' : 'success',
  );
  return packet;
}

function clearKernelBinding() {
  clearDualAspectActivation({
    storage: sessionStorage,
    eventTarget: window,
    reason: 'arcsweep-session-cleared',
  });
  clearIPadSomaticLineage({ storage: localStorage });
}

function scheduleAfterArcsweep(callback) {
  window.setTimeout(() => {
    Promise.resolve(callback()).catch((error) => {
      setGateMessage(`Dual-aspect kernel failed: ${error.message}`, 'error');
    });
  }, 0);
}

function handleGateClick(event) {
  const button = event.target?.closest?.('button');
  if (!button) return;
  if (button.id === LOAD_BUTTON_ID) {
    scheduleAfterArcsweep(freezeLoadedArcsweepContext);
  } else if (button.id === CLEAR_BUTTON_ID) {
    scheduleAfterArcsweep(clearKernelBinding);
  }
}

document.addEventListener('click', handleGateClick, true);

const restoredContext = readJson(sessionStorage, SESSION_CONTEXT_KEY, null)?.context;
const restoredPacket = readActiveDualAspectPacket({ storage: sessionStorage });
if (restoredPacket) {
  try {
    publishIPadSomaticLineage(restoredPacket, { storage: localStorage });
  } catch (error) {
    setGateMessage(`iPad somatic lineage failed: ${error.message}`, 'error');
  }
} else if (restoredContext) {
  window.setTimeout(() => {
    setGateMessage('This continuity context predates the compression–release freeze. Press “Load for this session” once to bind every layer to one state.', 'attention');
  }, 0);
}
