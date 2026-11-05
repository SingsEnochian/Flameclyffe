// The living watercolor body is the entryway into the Wayglass universe.
// Unlike a restored work surface, entry must not require model credentials.
export const WAYGLASS_ENTRY_SURFACE = 'wayglass:living-watercolor';
export const WAYGLASS_ENTRY_SCHEMA = 'wayglass.entryway/v1';
export function resolveWayglassEntry({ available = [] } = {}) {
  if (!Array.isArray(available)) throw new TypeError('Surface catalogue required');
  const ids = available.map(item => typeof item === 'string' ? item : item?.surface_id);
  if (!ids.includes(WAYGLASS_ENTRY_SURFACE)) {
    throw new Error('Living Watercolor entryway is not registered; refuse to silently open another screen');
  }
  return Object.freeze({
    schema: WAYGLASS_ENTRY_SCHEMA,
    surface_id: WAYGLASS_ENTRY_SURFACE,
    rendering: 'offline-first',
    world_entry_authority: 'none-until-explicit-waygate-crossing',
    model_inference_claimed: false,
    owner_consent_required_for_sound: true,
  });
}
