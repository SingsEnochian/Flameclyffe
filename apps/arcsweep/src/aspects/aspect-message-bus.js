export const ASPECT_ENVELOPE_SCHEMA = 'hearthweave.aspect-envelope/v0.2';

export const ASPECT_MESSAGE_KINDS = Object.freeze([
  'thought',
  'observation',
  'question',
  'proposal',
  'challenge',
  'reply',
  'result',
  'verification',
  'refusal',
  'pause',
  'growth',
]);

function id(prefix = 'aspect-msg') {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function strings(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || '').trim()).filter(Boolean))];
}

export function createAspectEnvelope({
  id: messageId,
  traceId,
  parentId,
  sender,
  recipients = [],
  kind = 'thought',
  body = null,
  evidenceRefs = [],
  stateRefs = [],
  createdAt = new Date().toISOString(),
} = {}) {
  if (!sender?.aspectId) throw new Error('Aspect envelope requires sender.aspectId.');
  if (!ASPECT_MESSAGE_KINDS.includes(kind)) throw new Error(`Unsupported aspect message kind: ${kind}`);

  return Object.freeze({
    schema: ASPECT_ENVELOPE_SCHEMA,
    id: String(messageId || id()),
    traceId: String(traceId || id('aspect-trace')),
    ...(parentId ? { parentId: String(parentId) } : {}),
    sender: Object.freeze({
      aspectId: String(sender.aspectId),
      invocationId: String(sender.invocationId || id('aspect-invocation')),
      ...(sender.voiceId ? { voiceId: String(sender.voiceId) } : {}),
      ...(sender.provider ? { provider: String(sender.provider) } : {}),
      ...(sender.model ? { model: String(sender.model) } : {}),
    }),
    recipients: Object.freeze(strings(recipients)),
    kind,
    body: structuredClone(body),
    evidenceRefs: Object.freeze(strings(evidenceRefs)),
    stateRefs: Object.freeze(strings(stateRefs)),
    createdAt: String(createdAt),
  });
}

export function createAspectMessageBus(seed = []) {
  const messages = seed.map((entry) => createAspectEnvelope(entry));
  const subscribers = new Set();

  return Object.freeze({
    publish(input) {
      const envelope = createAspectEnvelope(input);
      messages.push(envelope);
      for (const subscriber of subscribers) subscriber(envelope);
      return envelope;
    },

    subscribe(listener) {
      if (typeof listener !== 'function') throw new Error('Aspect bus subscriber must be a function.');
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },

    all() {
      return Object.freeze([...messages]);
    },

    forTrace(traceId) {
      return Object.freeze(messages.filter((message) => message.traceId === traceId));
    },

    forRecipient(aspectId) {
      const target = String(aspectId || '');
      return Object.freeze(messages.filter((message) => message.recipients.length === 0 || message.recipients.includes(target)));
    },
  });
}
