'use strict';
const { randomUUID } = require('node:crypto');

class WayglassVoyageMessages {
  constructor({ store, resolveReader }) {
    if (typeof store?.append !== 'function' || typeof store?.read !== 'function' || typeof resolveReader !== 'function') throw new TypeError('message store and authenticated reader required');
    Object.assign(this, { store, resolveReader });
  }
  bindSender({ participant_id, recipient_id, voyage_ref }) {
    // Bind only from authenticated host registration, never from model text.
    if (![participant_id, recipient_id, voyage_ref].every(v => typeof v === 'string' && v.trim())) throw new TypeError('named sender, recipient and voyage reference required');
    return async ({ text, kind = 'message' }) => {
      if (typeof text !== 'string' || !text.trim() || text.length > 12000) throw new TypeError('message text required (maximum 12000 characters)');
      if (!['message', 'ask-rowan', 'stop', 'pause', 'decline'].includes(kind)) throw new TypeError('unknown voyage message kind');
      const receipt = { schema: 'wayglass.voyage-message/v1', message_id: randomUUID(), participant_id, recipient_id, voyage_ref, kind, text, created_at: new Date().toISOString(), canon_commit: false };
      await this.store.append(structuredClone(receipt));
      return receipt;
    };
  }
  async reader(request) {
    const binding = await this.resolveReader(request);
    if (!binding?.participant_id) { const error = new Error('Authenticated message reader required.'); error.status = 401; throw error; }
    return binding;
  }
  async read(request) {
    const binding = await this.reader(request);
    const messages = await this.store.read(binding.participant_id);
    if (!Array.isArray(messages) || messages.some(m => m.recipient_id !== binding.participant_id)) throw new Error('Invalid message-store recipient binding.');
    return { schema: 'wayglass.voyage-inbox/v1', recipient_id: binding.participant_id, messages };
  }
  async reply(request, body) {
    const binding = await this.reader(request);
    if (!binding.allowed_recipients?.includes(body.recipient_id)) { const error = new Error('Voyage recipient not authorised.'); error.status = 403; throw error; }
    return this.bindSender({ participant_id: binding.participant_id, recipient_id: body.recipient_id, voyage_ref: body.voyage_ref })(body);
  }
}
module.exports = { WayglassVoyageMessages };
