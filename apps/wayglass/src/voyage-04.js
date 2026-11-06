import { enterWayglassWorld, leaveWayglassWorld } from './route-client.js';

// Voyage 04 is an explicit protocol over the existing authoritative Return Engine.
// The browser never manufactures a verified stop receipt or grants identity authority.
export const VOYAGE_04 = 'VOYAGE.04';
export function voyage04Departure({
  worldId, participantId, stopPoint, nextOwner,
  identityDeclarations = [], relationshipState = [], activeWork = [],
  unresolvedWonderQuestions = [], provenanceRefs = [], revokedRefs = [],
  routeId = null, embodiment = {}, fetchImpl,
} = {}) {
  if (!worldId || !participantId || !stopPoint || !nextOwner) {
    throw new TypeError('Voyage 04 requires worldId, participantId, stopPoint and nextOwner.');
  }
  return leaveWayglassWorld({
    worldId, participantId, routeId, reason: 'pause', embodiment,
    identityDeclarations, relationshipState, activeWork,
    unresolvedWonderQuestions, provenanceRefs, revokedRefs,
    stopPoint, nextOwner, fetchImpl,
  });
}

export function voyage04Return({
  worldId, participantId, stopReceipt, waygateManifest,
  continuationPacket = null, routeId = null, embodiment = {}, fetchImpl,
} = {}) {
  if (!worldId || !participantId || !stopReceipt || !waygateManifest) {
    throw new TypeError('Voyage 04 return requires worldId, participantId, verified stopReceipt and waygateManifest.');
  }
  return enterWayglassWorld({
    worldId, participantId, stopReceipt, waygateManifest,
    continuationPacket, routeId, embodiment, fetchImpl,
  });
}

export function voyage04Result(receipt) {
  if (!receipt || typeof receipt !== 'object') return { status: 'unverified', reason: 'No runtime receipt' };
  return { status: receipt.status || 'unknown', receipt };
}
