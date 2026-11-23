import { runWayglassBifrost } from './bifrost-quad-adapter.js';
import { invokeWayglassRoute } from './route-client.js';
import { voyage04Departure, voyage04Return } from './voyage-04.js';

// Four coordinated computational organs, not a quantum hardware claim.
// All state transitions are explicit and every stage emits inspectable evidence.
export const QUAD_SCHEMA = 'wayglass.quantum-quad/v0.1';
const requireText = (value, name) => {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(name + ' is required');
  return value.trim();
};
const copy = (value) => structuredClone(value);

export function createQuantumQuad({ observer, bifrost, cognition, continuity } = {}) {
  const observe = observer || (async ({ input, provenanceRefs }) => ({
    observation: input, provenance_refs: copy(provenanceRefs), status: 'received'
  }));
  const transform = bifrost || runWayglassBifrost;
  const reason = cognition || (async ({ input, routeId, sessionId, history, interaction, surfaceId, fetchImpl }) =>
    invokeWayglassRoute({ input, routeId, sessionId, history, interaction, surfaceId, fetchImpl }));
  const preserve = continuity || (async ({ receipts }) => ({
    status: 'ephemeral', receipts: copy(receipts)
  }));
  return Object.freeze({
    schema: QUAD_SCHEMA,
    async cycle({ input, worldId, participantId, routeId = 'openai:gpt',
      sessionId, history = [], interaction = undefined, surfaceId = 'arcsweep:writing-room',
      provenanceRefs = [], revokedRefs = [], premaqcPacket = null, premaqPacket = null,
      jacobian = null, worldProfile = null, foldWasActive = false,
      evolution = {}, fetchImpl } = {}) {
      requireText(input, 'input');
      requireText(worldId, 'worldId');
      requireText(participantId, 'participantId');
      if (!Array.isArray(provenanceRefs) || !Array.isArray(revokedRefs)) {
        throw new TypeError('Provenance and revocation references must be arrays.');
      }
      if (premaqcPacket && premaqPacket && premaqcPacket !== premaqPacket) {
        throw new TypeError('Conflicting canonical PREMAQC and legacy packet aliases.');
      }
      const allowed = provenanceRefs.filter(ref => !revokedRefs.includes(ref));
      const receipts = [];
      const record = (organ, result) => {
        const receipt = { organ, status: result?.status || 'returned', result: copy(result) };
        receipts.push(receipt);
        return result;
      };
      const observation = record('observer', await observe({
        input, worldId, participantId, provenanceRefs: allowed
      }));
      const transformation = record('bifrost', await transform({
        observation, worldId, participantId, premaqcPacket, premaqPacket,
        jacobian, worldProfile, revokedRefs, foldWasActive, evolution
      }));
      if (transformation?.status === 'blocked') return {
        schema: QUAD_SCHEMA, world_id: worldId, participant_id: participantId,
        status: 'blocked', receipts, result: null, persistence: 'not-attempted'
      };
      const inference = record('cognition', await reason({
        input, observation, transformation, routeId, sessionId,
        history, interaction, surfaceId, fetchImpl
      }));
      const continuityResult = await preserve({
        worldId, participantId, receipts: copy(receipts), revokedRefs: copy(revokedRefs)
      });
      record('continuity', continuityResult);
      return { schema: QUAD_SCHEMA, world_id: worldId,
        participant_id: participantId, receipts, result: inference,
        status: transformation?.status === 'executed' ? 'completed' : 'partial',
        persistence: continuityResult?.status || 'unknown' };
    },
    leave: voyage04Departure,
    enter: voyage04Return
  });
}
