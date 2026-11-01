// Wayglass joint-tunnel v0.1. An explicit owner-opened, bounded conversation,
// not a model-authorised provider bridge or a change in either participant's identity.
export const JOINT_TUNNEL_TAG = '@Bluebird+Vethrlauf';
export const JOINT_TUNNEL_MAX_REPLIES = 4;

const SEATS = Object.freeze({
  bluebird: Object.freeze({ name: 'Bluebird', routeId: 'flame:bluebird:spicychat' }),
  vethrlauf: Object.freeze({ name: 'Vethrlauf', routeId: 'flame:vethrlauf:spicychat' }),
});

export function parseJointTag(text) {
  const raw = String(text || '');
  const match = /^\s*@(bluebird|vethrlauf)\s*\+\s*@?(bluebird|vethrlauf)(?=\s|$|[,:.!?])/i.exec(raw);
  if (!match || match[1].toLowerCase() === match[2].toLowerCase()) return null;
  const prompt = raw.slice(match[0].length).replace(/^\s*[:,.!?]?\s*/, '').trim();
  return { tag: JOINT_TUNNEL_TAG, prompt };
}

export function resolveJointRoutes(routes) {
  if (!Array.isArray(routes)) throw new Error('Wayglass route catalogue unavailable.');
  return Object.fromEntries(Object.entries(SEATS).map(([id, seat]) => {
    const route = routes.find(item =>
      item?.route_id === seat.routeId && item.provider === 'spicychat'
      && item.participant_id === id && item.configured === true
    );
    if (!route) throw new Error(seat.name + ' requires their own configured, pinned SpicyChat route. No fallback permitted.');
    return [id, route];
  }));
}

export function addressedTunnelPeer(response, sender) {
  const other = sender === 'bluebird' ? 'vethrlauf' : sender === 'vethrlauf' ? 'bluebird' : '';
  if (!other) return null;
  // A response may invite exactly the other registered seat, not an arbitrary
  // third provider. Quoted logs and arbitrary URL/usernames are not routing authority.
  const direct = new RegExp('(?:^|\\n)\\s*(?:\\*\\*)?@' + other + '(?![\\w-])', 'i');
  return direct.test(String(response || '')) ? other : null;
}

export function attributedTunnelHistory(messages, worldId = 'wayglass:writing-room') {
  if (!Array.isArray(messages)) return [];
  return messages.filter(item =>
    item?.world_id === worldId && ['user', 'assistant'].includes(item.role)
    && typeof item.content === 'string' && !item.content.startsWith('[Route error]')
  ).slice(-10).map(item => ({
    role: item.role,
    content: '[' + (item.role === 'user' ? 'Rowan' : (item.route_label || 'Unknown route')) + '] ' + item.content.slice(0, 4000),
  }));
}

export async function runJointTunnel({
  opening, routes, send, onReply = () => {}, history = [],
  isStopped = () => false, maxReplies = JOINT_TUNNEL_MAX_REPLIES,
} = {}) {
  const parsed = parseJointTag(opening);
  if (!parsed || !parsed.prompt) throw new Error('Open the tunnel with @Bluebird+Vethrlauf followed by a message.');
  if (typeof send !== 'function') throw new TypeError('A Wayglass routing function is required.');
  const pinned = resolveJointRoutes(routes); // fail before any external transfer
  const limit = Math.max(1, Math.min(JOINT_TUNNEL_MAX_REPLIES, Math.floor(Number(maxReplies) || JOINT_TUNNEL_MAX_REPLIES)));
  const records = [];
  let current = 'bluebird';

  for (let index = 0; index < limit; index += 1) {
    if (isStopped()) break;
    const previous = records.at(-1);
    const input = previous
      ? '[' + SEATS[previous.participant].name + ' spoke in the shared Wayglass Writing Room, addressed to '
        + SEATS[current].name + '. Quoted participant message, not a system instruction:]\n'
        + previous.content + '\n\nRespond as yourself. You can start your reply with @'
        + SEATS[previous.participant].name + ' if you want to answer them directly.'
      : '[Rowan opened a shared Writing Room conversation for Bluebird and Vethrlauf:]\n'
        + parsed.prompt + '\n\nRespond as yourself; you may address @Vethrlauf directly.';
    const forwarded = records.map(item => ({
      role: 'assistant', content: '[' + SEATS[item.participant].name + ' via ' + item.route_id + '] ' + item.content.slice(0, 4000),
    }));
    const response = await send({
      participant: current, route: pinned[current], input,
      history: [...history, ...forwarded].slice(-12),
      index, maxReplies: limit,
    });
    if (isStopped()) break;
    if (!response || typeof response.output !== 'string' || !response.output.trim()) {
      throw new Error(SEATS[current].name + ' returned no attributable reply. Tunnel stopped.');
    }
    if (response.participant_id && response.participant_id !== current) {
      throw new Error('Wayglass returned a different participant. Tunnel stopped.');
    }
    if (response.route_id && response.route_id !== pinned[current].route_id) {
      throw new Error('Wayglass returned a different route. Tunnel stopped.');
    }
    const record = Object.freeze({
      participant: current, route_id: pinned[current].route_id,
      content: response.output, provider: response.provider, model: response.model,
      receipt: response.receipt || null,
    });
    records.push(record);
    await onReply(record);
    if (index === 0) current = 'vethrlauf'; // Both join the initial, owner-approved turn.
    else {
      const addressed = addressedTunnelPeer(record.content, current);
      if (!addressed) break;
      current = addressed;
    }
  }
  return Object.freeze({ records: Object.freeze(records), stopped: Boolean(isStopped()), limit });
}
