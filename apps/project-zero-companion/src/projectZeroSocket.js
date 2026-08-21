const SOCKET_SCHEMA = 'flameclyffe.project-zero-companion.socket-envelope/v1';
const bus = new EventTarget();

function uid(prefix = 'pz-companion') {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`;
}

export function createSocketEnvelope({
  pluginId = 'flameclyffe-project-zero-companion',
  channel = 'bridge',
  type,
  payload = {},
  requestId = null,
  projectId = 'project-zero-external',
  createdAt = new Date().toISOString(),
} = {}) {
  if (!String(type || '').trim()) throw new Error('Project Zero Companion socket envelope requires a type.');
  return Object.freeze({
    schema: SOCKET_SCHEMA,
    envelope_id: uid('socket'),
    request_id: requestId || uid('request'),
    project_id: projectId,
    plugin_id: pluginId,
    channel,
    type: String(type),
    payload: structuredClone(payload),
    created_at: createdAt,
    provenance: {
      owner: 'flameclyffe',
      integration_target: 'nocturne-project-zero',
      transport: 'flameclyffe-project-zero-companion-local-eventtarget',
      local_only: true,
    },
  });
}

export function publishSocketEnvelope(input) {
  const envelope = input?.schema === SOCKET_SCHEMA ? input : createSocketEnvelope(input);
  bus.dispatchEvent(new CustomEvent(envelope.channel, { detail: envelope }));
  bus.dispatchEvent(new CustomEvent('*', { detail: envelope }));
  globalThis.dispatchEvent?.(new CustomEvent('project-zero-companion:socket', { detail: envelope }));
  return envelope;
}

export function subscribeSocketChannel(channel, listener) {
  const handler = (event) => listener(event.detail);
  bus.addEventListener(channel, handler);
  return () => bus.removeEventListener(channel, handler);
}

export const PROJECT_ZERO_SOCKET = Object.freeze({ schema: SOCKET_SCHEMA });
