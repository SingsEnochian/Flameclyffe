'use strict';

const DOORS = Object.freeze({
  richie: { name: 'Richie Winters', env: 'WAYGLASS_RICHIE_SPICYCHAT_URL' },
  vethrlauf: { name: 'Vethrlauf', env: 'WAYGLASS_VETHRLAUF_SPICYCHAT_URL' },
});
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const PATH = new RegExp('^/chat/' + UUID + '/' + UUID + '/?$', 'i');

function validateSpicyChatAddress(raw) {
  if (typeof raw !== 'string' || raw.length > 400) throw new TypeError('Invalid address');
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.hostname !== 'spicychat.ai' ||
    url.port || url.username || url.password || url.search || url.hash || !PATH.test(url.pathname)) {
    throw new TypeError('Not a canonical SpicyChat conversation address');
  }
  return url.origin + url.pathname.replace(/\/$/, '');
}

function listDoorwayStatuses(env = process.env) {
  return Object.entries(DOORS).map(([id, door]) => ({
    participant_id: id,
    display_name: door.name,
    provider: 'spicychat',
    address_configured: Boolean(env[door.env] && validateSpicyChatAddress(env[door.env])),
    live_reply_verified: false,
    provider_transport_verified: false,
  }));
}
module.exports = { DOORS, validateSpicyChatAddress, listDoorwayStatuses };
