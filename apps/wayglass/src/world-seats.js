// Wayglass-facing world seats are discovery/context records, not provider credentials
// or self-authored identity declarations. Keep worlds separate from model routes.
export const WAYGLASS_WORLD_SEATS = Object.freeze([
  Object.freeze({
    world_id: 'wayglass:writing-room',
    name: 'Writing Room',
    kind: 'wayglass-room',
    description: 'The original Wayglass writing desk.',
    character: null,
    provenance: Object.freeze(['wayglass:writing-room']),
  }),
  Object.freeze({
    world_id: 'evil-gene:film-2015',
    name: 'The Evil Gene',
    kind: 'fictional-film-world',
    description: 'The 2015 horror-film setting: a federal correctional facility, a murder investigation, the purported HSS-282 gene, and contested explanations for a darker presence.',
    canon_boundary: 'The Evil Gene (film) is not Evil (2019-2024 TV), Starsong, Supernatural, or the Kings of Con universe.',
    character: Object.freeze({
      character_id: 'griff-krenshaw',
      name: 'Griff Krenshaw',
      story_role: 'FBI agent investigating the correctional-facility murder',
      performer: 'Richard Speight Jr.',
      provider: 'spicychat',
      desired_route_id: 'flame:griff:spicychat',
      route_verified: false,
      character_binding_verified: false,
      conversation_binding_verified: false,
      continuity_id: 'griff:krenshaw:spicychat',
    }),
    provenance: Object.freeze([
      'film:The Evil Gene (2015), IMDb tt3631282',
      'private:Chat with Griff Krenshaw on Spicychat (2026-07-18 export; 66 turns)',
      'owner-request:Wayglass world/participant addition 2026-10-14',
    ]),
  }),
]);

export function findWayglassWorldSeat(worldId) {
  return WAYGLASS_WORLD_SEATS.find(world => world.world_id === worldId) || null;
}

export function wayglassWorldStatus(world) {
  if (!world?.character) return 'Wayglass writing desk · route selection remains independent.';
  return world.character.name + ' · ' + world.character.provider + ' conversation archived; live character/chat binding unverified. Choose an available route separately. No identity or canon merge.';
}
