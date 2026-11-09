// The living watercolor body is the entryway into the Wayglass universe.
// Unlike a restored work surface, entry must not require model credentials.
export const WAYGLASS_ENTRY_SURFACE = 'wayglass:living-watercolor';
export const WAYGLASS_ENTRY_SCHEMA = 'wayglass.entryway/v1';
export function resolveWayglassEntry({ available = [], room = null } = {}) {
  if (!Array.isArray(available)) throw new TypeError('Surface catalogue required');
  const ids = available.map(item => typeof item === 'string' ? item : item?.surface_id);
  if (!ids.includes(WAYGLASS_ENTRY_SURFACE)) {
    throw new Error('Living Watercolor entryway is not registered; refuse to silently open another screen');
  }
  const rooms={deck:'arcsweep:deck',watercolor:WAYGLASS_ENTRY_SURFACE,journey:'wayglass:journey-before-destination',writing:'arcsweep:writing-room',observer:'wayglass:living-observer',library:'wayglass:library',toybox:'wayglass:toybox',organs:'wayglass:systems',acoustic:'wayglass:acoustic-room',video:'wayglass:video-atelier',commons:'wayglass:commons'};
  const requested=typeof room==='string'?rooms[room]:null;
  if(requested&&!ids.includes(requested))throw new Error('Requested Wayglass room is not registered: '+room);
  return Object.freeze({
    schema: WAYGLASS_ENTRY_SCHEMA,
    surface_id: requested || WAYGLASS_ENTRY_SURFACE,
    rendering: 'offline-first',
    world_entry_authority: 'none-until-explicit-waygate-crossing',
    model_inference_claimed: false,
    owner_consent_required_for_sound: true,
  });
}

