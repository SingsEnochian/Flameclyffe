import { createDestinationRegistration, normaliseReactionRegistryStore } from './react-ion-registry.js';

export const REACTION_WORLD_TONE_SYNC_SCHEMA = 'reaction.world-tone-sync/v1';
export const WORLD_TONE_APPROVAL_SCHEMA = 'hearthgate.world-tone-approval-receipt.v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`REACT_ION_WORLD_TONE_SYNC: ${message}`);
}

function receiptTime(receipt) {
  const time = Date.parse(receipt?.created_at);
  return Number.isFinite(time) ? time : 0;
}

function validReceipt(receipt) {
  return receipt?.schema === WORLD_TONE_APPROVAL_SCHEMA
    && typeof receipt.world_id === 'string'
    && receipt.world_id.trim()
    && typeof receipt.candidate_hash === 'string'
    && receipt.candidate_hash.trim()
    && ['approved', 'adjust', 'rejected'].includes(receipt.decision)
    && Number.isFinite(Number(receipt.root_hz))
    && Number(receipt.root_hz) > 0;
}

export function currentApprovedWorldTones(receipts = []) {
  invariant(Array.isArray(receipts), 'receipts must be an array');
  const latestByCandidate = new Map();
  for (const receipt of receipts) {
    if (!validReceipt(receipt)) continue;
    const key = receipt.candidate_hash;
    const existing = latestByCandidate.get(key);
    if (!existing || receiptTime(receipt) >= receiptTime(existing)) latestByCandidate.set(key, receipt);
  }

  const approvedByWorld = new Map();
  for (const receipt of latestByCandidate.values()) {
    if (receipt.decision !== 'approved') continue;
    const worldId = receipt.world_id.trim();
    const existing = approvedByWorld.get(worldId);
    if (!existing || receiptTime(receipt) >= receiptTime(existing)) approvedByWorld.set(worldId, receipt);
  }
  return Object.freeze(Object.fromEntries([...approvedByWorld.entries()].sort(([left], [right]) => left.localeCompare(right))));
}

export async function syncApprovedWorldTonesToRegistry({
  store,
  approvalReceipts = [],
  syncedAt = new Date().toISOString(),
} = {}) {
  invariant(!Number.isNaN(Date.parse(syncedAt)), 'syncedAt must be an ISO-compatible timestamp');
  const normalised = normaliseReactionRegistryStore(store);
  const current = currentApprovedWorldTones(approvalReceipts);
  const destinations = [...normalised.destinations];
  const updated = [];
  const unchanged = [];
  const missingDestination = [];

  for (const [worldId, receipt] of Object.entries(current)) {
    const indexes = destinations
      .map((registration, index) => ({ registration, index }))
      .filter(({ registration }) => registration?.kind === 'world' && registration?.world?.id === worldId);
    if (!indexes.length) {
      missingDestination.push(Object.freeze({
        world_id: worldId,
        world_name: receipt.world_name || null,
        approval_receipt_hash: receipt.receipt_hash || null,
        reason: 'register a world-level dimensional address before importing its approved tone',
      }));
      continue;
    }

    for (const { registration, index } of indexes) {
      const sourceRef = receipt.receipt_hash
        ? `hearthgate.world-tone-approval:${receipt.receipt_hash}`
        : `hearthgate.world-tone-approval:${receipt.candidate_hash}`;
      const alreadyCurrent = Number(registration.harmonic?.root_hz) === Number(receipt.root_hz)
        && registration.harmonic?.profile_version === receipt.profile_version
        && registration.harmonic?.source_ref === sourceRef;
      if (alreadyCurrent) {
        unchanged.push(registration.registration_id);
        continue;
      }

      const refreshed = await createDestinationRegistration({
        id: registration.registration_id,
        name: registration.name,
        aliases: registration.aliases,
        kind: registration.kind,
        worldId: registration.world.id,
        worldName: registration.world.name,
        locationId: registration.location?.id ?? null,
        locationName: registration.location?.name ?? null,
        anchorId: registration.anchor?.id ?? null,
        anchorName: registration.anchor?.name ?? null,
        address: registration.address,
        rootHz: Number(receipt.root_hz),
        phase: registration.harmonic?.phase ?? null,
        profileVersion: receipt.profile_version || 'approved-world-tone',
        evidenceClass: 'symbolic',
        sourceRef,
        state: registration.state,
        notes: registration.notes || '',
        updatedAt: syncedAt,
      });
      destinations[index] = refreshed;
      updated.push(Object.freeze({
        registration_id: refreshed.registration_id,
        world_id: worldId,
        root_hz: Number(receipt.root_hz),
        profile_version: receipt.profile_version || null,
        approval_receipt_hash: receipt.receipt_hash || null,
      }));
    }
  }

  return Object.freeze({
    schema: REACTION_WORLD_TONE_SYNC_SCHEMA,
    synced_at: new Date(syncedAt).toISOString(),
    store: Object.freeze({
      ...normalised,
      destinations: Object.freeze(destinations),
    }),
    report: Object.freeze({
      approved_worlds_seen: Object.keys(current).length,
      updated: Object.freeze(updated),
      unchanged: Object.freeze(unchanged),
      missing_destination: Object.freeze(missingDestination),
    }),
    authority: Object.freeze({
      approval_is_human_profile_calibration: true,
      harmonic_profile_is_not_physical_universe_location_evidence: true,
      dimensional_address_is_never_created_from_frequency_alone: true,
    }),
  });
}
