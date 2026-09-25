export const ASPECT_COMMONS_ROUTING_SCHEMA = 'hearthweave.aspect-commons-routing/v0.2';

export const HOUSE_COMMONS_ROOMS = Object.freeze({
  general: 'house-room:constellation',
  action: 'house-room:action',
  roleplay: 'house-room:roleplay',
  chatter: 'house-room:agent-chatter',
});

export function routeAspectEnvelopeToCommons(envelope = {}) {
  const kind = String(envelope.kind || 'thought');
  const body = envelope.body && typeof envelope.body === 'object' ? envelope.body : {};
  const narrative = body.mode === 'exploration' && ['narrative', 'roleplay', 'counterfactual'].includes(String(body.domain || ''));

  if (narrative) {
    return Object.freeze({ schema: ASPECT_COMMONS_ROUTING_SCHEMA, roomId: HOUSE_COMMONS_ROOMS.roleplay, reason: 'narrative-exploration' });
  }

  if (['result', 'verification'].includes(kind) || body.operational === true) {
    return Object.freeze({ schema: ASPECT_COMMONS_ROUTING_SCHEMA, roomId: HOUSE_COMMONS_ROOMS.action, reason: 'operational-state' });
  }

  if (body.humanSynthesis === true) {
    return Object.freeze({ schema: ASPECT_COMMONS_ROUTING_SCHEMA, roomId: HOUSE_COMMONS_ROOMS.general, reason: 'shared-human-synthesis' });
  }

  return Object.freeze({ schema: ASPECT_COMMONS_ROUTING_SCHEMA, roomId: HOUSE_COMMONS_ROOMS.chatter, reason: 'ordinary-aspect-life' });
}
