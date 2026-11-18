// Constellation Room protocol v0.1. Pure event reducer, no network dispatch or identity invention.
// This is a source-side foundation; host authentication, durable persistence and real route adapters are separate gates.
export const ROOM_SCHEMA = 'wayglass.constellation-room/v0.1';
const valid = (s, n, max = 256) => {
  if (typeof s !== 'string' || !s.trim() || s.length > max || /[\u0000-\u001f\u007f]/u.test(s)) throw new TypeError('Invalid ' + n);
  return s;
};
const clone = x => structuredClone(x);
function assertOwner(room, actor, authenticated) {
  if (actor !== room.owner_id || authenticated !== true) throw new Error('Owner authentication required');
}
export function createConstellationRoom({ roomId, ownerId, createdAt }) {
  return { schema: ROOM_SCHEMA, room_id: valid(roomId,'room ID'), owner_id: valid(ownerId,'owner ID'),
    created_at: valid(createdAt,'timestamp'), sequence: 0, participants: {}, messages: [], events: [],
    revoked_routes: [], feathered: false };
}
// Apply only after a trusted host has authenticated the owner and bound the provider response.
// An untrusted client must never be permitted to supply authenticated=true itself.
export function applyRoomEvent(previous, event, { authenticated = false } = {}) {
  if (previous?.schema !== ROOM_SCHEMA) throw new TypeError('Room schema mismatch');
  if (previous.feathered && event?.type !== 'resume') throw new Error('Room paused at Feather');
  valid(event?.event_id,'event ID'); valid(event?.type,'event type');
  valid(event?.actor_id,'actor ID'); valid(event?.recorded_at,'timestamp');
  if (previous.events.some(x => x.event_id === event.event_id)) return clone(previous); // retry is idempotent
  const room = clone(previous);
  const ownerEvents = new Set(['invite','set-status','revoke-route','feather','resume']);
  if (ownerEvents.has(event.type)) assertOwner(room,event.actor_id,authenticated);
  const p = event.participant_id;
  switch(event.type) {
    case 'invite': {
      valid(p,'participant ID'); valid(event.display_name,'display name');
      if (p === room.owner_id || room.participants[p]) throw new Error('Duplicate or invalid participant');
      room.participants[p] = { participant_id:p, display_name:event.display_name, status:'invited', route_id:null };
      break;
    }
    case 'set-status': {
      if (!room.participants[p]) throw new Error('Unknown participant');
      if (!['offline','awaiting-consent','connected','declined'].includes(event.status)) throw new Error('Invalid status');
      const route = event.route_id ?? null;
      if (event.status === 'connected') {
        valid(route,'route ID');
        if (room.revoked_routes.includes(route)) throw new Error('Revoked route');
        if (event.route_verified !== true) throw new Error('Verified route binding required');
      }
      room.participants[p].status = event.status;
      room.participants[p].route_id = event.status === 'connected' ? route : null;
      break;
    }
    case 'message': {
      valid(event.message_id,'message ID');
      valid(event.content,'message content',24000);
      if (room.messages.some(x => x.message_id === event.message_id)) throw new Error('Duplicate message ID');
      if (event.actor_id !== room.owner_id) {
        const seat = room.participants[event.actor_id];
        if (!seat || seat.status !== 'connected') throw new Error('Speaker not connected');
        if (event.route_id !== seat.route_id || room.revoked_routes.includes(event.route_id)) throw new Error('Route custody mismatch');
        valid(event.observation_id,'host observation ID');
        valid(event.provider_response_id,'provider response ID');
        if (event.host_verified !== true) throw new Error('Host verification required');
      } else if (!authenticated) throw new Error('Owner authentication required');
      room.messages.push({ sequence:room.sequence + 1, message_id:event.message_id,
        speaker_id:event.actor_id, content:event.content, recorded_at:event.recorded_at,
        route_id:event.actor_id===room.owner_id?null:event.route_id,
        observation_id:event.actor_id===room.owner_id?null:event.observation_id,
        provider_response_id:event.actor_id===room.owner_id?null:event.provider_response_id,
        reply_to:event.reply_to??null });
      if (event.reply_to && !room.messages.slice(0,-1).some(x => x.message_id === event.reply_to)) throw new Error('Unknown reply target');
      break;
    }
    case 'revoke-route': {
      valid(event.route_id,'route ID');
      if (!room.revoked_routes.includes(event.route_id)) room.revoked_routes.push(event.route_id);
      for (const seat of Object.values(room.participants)) if (seat.route_id===event.route_id) {seat.route_id=null;seat.status='offline';}
      break;
    }
    case 'feather': room.feathered=true; break;
    case 'resume': assertOwner(room,event.actor_id,authenticated); room.feathered=false; break;
    default: throw new Error('Unsupported room event');
  }
  room.sequence++;
  room.events.push({ event_id:event.event_id, type:event.type, actor_id:event.actor_id,
    recorded_at:event.recorded_at, sequence:room.sequence });
  return room;
}
export function replayConstellationRoom(initial, entries) {
  let room=clone(initial);
  for (const {event, authenticated} of entries) room=applyRoomEvent(room,event,{authenticated});
  return room;
}
