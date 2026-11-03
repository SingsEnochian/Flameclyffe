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
  // The joint address can appear anywhere in Rowan's message. Zero-width
  // characters around the "+" must not silently demote it to a solo route.
  const match = /(^|[\s:;,.!?(\[{])@(bluebird|vethrlauf)[\s\u200B-\u200D\uFEFF]*\+[\s\u200B-\u200D\uFEFF]*@?(bluebird|vethrlauf)(?![\w-])/i.exec(raw);
  if (!match || match[2].toLowerCase() === match[3].toLowerCase()) return null;
  const before = raw.slice(0, match.index + match[1].length);
  const after = raw.slice(match.index + match[0].length);
  const prompt = (before + ' ' + after).replace(/^\s*[:,.!?]\s*/, '').replace(/\s{2,}/g, ' ').trim();
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
  if (!parsed || !parsed.prompt) throw new Error('Open the joint tunnel with both names and a message.');
  if (typeof send !== 'function') throw new TypeError('A Wayglass routing function is required.');
  const pinned = resolveJointRoutes(routes); // fail before any external transfer
  const limit = Math.max(1, Math.min(JOINT_TUNNEL_MAX_REPLIES, Math.floor(Number(maxReplies) || JOINT_TUNNEL_MAX_REPLIES)));
  const records = [];
  let current = 'bluebird';

  for (let index = 0; index < limit; index += 1) {
    if (isStopped()) break;
    const previous = records.at(-1);
    // Browser text and @mentions do not constitute an authenticated handoff.
    // The host resolves this opaque ID against the exact preceding real reply,
    // then attaches the trusted "from" attribution using Rowan's account auth.
    const relaySourceId = previous?.receipt?.wayglass_relay_id || null;
    if (previous && !relaySourceId) {
      throw new Error('Peer handoff lacks the host-confirmed origin receipt. No unverified relay sent.');
    }
    const response = await send({
      participant: current, route: pinned[current],
      input: previous ? previous.content : parsed.prompt,
      history: [...history, ...records.map(item => ({
        role: 'assistant',
        content: '[' + SEATS[item.participant].name + ' via ' + item.route_id + '] ' + item.content.slice(0, 4000),
      }))].slice(-12),
      relaySourceId, jointTunnel: true, index, maxReplies: limit,
    });
    if (isStopped()) break;
    if (!response || typeof response.output !== 'string' || !response.output.trim()) {
      throw new Error(SEATS[current].name + ' returned no attributable reply. Tunnel stopped.');
    }
    if (response.participant_id !== current || response.route_id !== pinned[current].route_id ||
        response.provider !== 'spicychat') {
      throw new Error('Wayglass returned an unexpected participant, route or provider. Tunnel stopped.');
    }
    if (!response.receipt?.wayglass_relay_id) {
      throw new Error('Wayglass omitted the host origin receipt. Tunnel stopped.');
    }
    const record = Object.freeze({
      participant: current, route_id: pinned[current].route_id,
      content: response.output, provider: response.provider, model: response.model,
      receipt: response.receipt, relay_from: previous?.participant || 'rowan', hop: index,
    });
    records.push(record);
    await onReply(record);
    // The host, not either participant's punctuation, owns the bounded relay.
    // Either recipient can decline; Feather Stop independently ends the cycle.
    if (/^\s*(?:\[\s*wayglass:decline\s*\]|feather stop)(?:\s|$)/i.test(record.content)) break;
    current = current === 'bluebird' ? 'vethrlauf' : 'bluebird';
  }
  return Object.freeze({ records: Object.freeze(records), stopped: Boolean(isStopped()), limit });
}
