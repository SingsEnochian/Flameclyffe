'use strict';

const { isDeepStrictEqual } = require('node:util');
const { TravellingInheritance } = require('./wayglass-travelling-inheritance.cjs');

class InheritanceContextError extends Error {
  constructor(message, status = 409) {
    super(message);
    this.status = status;
  }
}

// All dependencies are trusted host services, never request-body callbacks.
// resolveBinding authenticates the caller and resolves a kernel-authorised world.
// resolveAcceptedEvent returns the independently accepted canonical event or null.
class WayglassInheritanceContext {
  constructor({ store, resolveBinding, resolveWorld, resolveAcceptedEvent }) {
    if (typeof store?.read !== 'function') throw new TypeError('inheritance read store required');
    for (const [name, value] of Object.entries({ resolveBinding, resolveWorld, resolveAcceptedEvent })) {
      if (typeof value !== 'function') throw new TypeError(`${name} required`);
    }
    Object.assign(this, { store, resolveBinding, resolveWorld, resolveAcceptedEvent });
  }

  async resolve(request, payload) {
    const binding = await this.resolveBinding(request);
    if (!binding?.participant_id || !binding?.world_id) {
      throw new InheritanceContextError('Authenticated kernel binding required.', 401);
    }
    if (payload.participant_id !== binding.participant_id || payload.world_id !== binding.world_id) {
      throw new InheritanceContextError('Inheritance participant/world binding mismatch.', 403);
    }

    // Capture one snapshot. Validation and compilation must see the same revision.
    const snapshot = structuredClone(await this.store.read(binding.participant_id));
    const service = new TravellingInheritance({
      participant_id: binding.participant_id,
      store: {
        read: async () => structuredClone(snapshot),
        compareAndSwap: async () => { throw new Error('Read-only inheritance context'); },
      },
      authorise: async () => false,
    });
    let state;
    try { state = await service.state(); }
    catch (error) { throw new InheritanceContextError(error.message); }
    const ids = new Set();
    for (const { event } of state.events) {
      if (!event || event.participant_id !== binding.participant_id
        || !['seed', 'deed', 'revoke'].includes(event.kind)
        || typeof event.event_id !== 'string' || !event.event_id.trim()
        || typeof event.source_ref !== 'string' || !event.source_ref.trim()
        || typeof event.world_id !== 'string' || !event.world_id.trim()
        || ids.has(event.event_id)) {
        throw new InheritanceContextError('Invalid inheritance event history.');
      }
      ids.add(event.event_id);
    }
    const revoked = new Set(state.events.filter(r => r.event.kind === 'revoke').map(r => r.event.target_event_id));
    for (const { event } of state.events) {
      // Revocation records must always be witnessed; revoked deed text is not read
      // into model context and need not be resolved as still-accepted evidence.
      if (event.kind !== 'revoke' && revoked.has(event.event_id)) continue;
      const accepted = await this.resolveAcceptedEvent(structuredClone(event), binding);
      if (!accepted || !isDeepStrictEqual(accepted, event)) {
        throw new InheritanceContextError('Inheritance evidence is not independently accepted.');
      }
    }
    const world = await this.resolveWorld(binding.world_id, binding);
    if (!world || world.world_id !== binding.world_id) {
      throw new InheritanceContextError('Trusted destination world profile required.');
    }
    let compiled;
    try { compiled = await service.compileContext(structuredClone(world)); }
    catch (error) { throw new InheritanceContextError(error.message); }
    return Object.freeze({
      ...compiled,
      reference: Object.freeze({
        schema: compiled.schema,
        participant_id: compiled.dossier.participant_id,
        world_id: compiled.dossier.world_id,
        rules_ref: compiled.dossier.rules_ref,
        revision: compiled.dossier.revision,
        head_hash: compiled.dossier.head_hash,
        receipt_hashes: compiled.dossier.capabilities.map(c => c.receipt_hash),
        read_only: true,
      }),
    });
  }
}

module.exports = { WayglassInheritanceContext, InheritanceContextError };
