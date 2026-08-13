export const REACTION_FIRST_FLIGHT_ATLAS_SCHEMA = 'reaction.first-flight-atlas/v1';
export const REACTION_REGISTRY_STORAGE_KEY = 'hearthgate.arcsweep.react-ion-registry.v1';

const FIRST_FLIGHT_ATLAS = Object.freeze({
  schema: REACTION_FIRST_FLIGHT_ATLAS_SCHEMA,
  version: 1,
  registry: Object.freeze({
    schema: 'reaction.destination-registry-store/v1',
    version: 1,
    destinations: Object.freeze([
      Object.freeze({
        schema: 'reaction.destination-registration/v1',
        schema_version: 1,
        registration_id: 'first-flight-destination-waking',
        name: 'waking.home',
        aliases: Object.freeze(['waking', 'home.waking']),
        kind: 'world',
        world: Object.freeze({ id: 'waking-world', name: 'Waking World' }),
        location: null,
        anchor: null,
        address: '10.20.30.40@174:phi=0',
        harmonic: Object.freeze({
          root_hz: 174,
          phase: 0,
          profile_version: 'first-flight-v1',
          evidence_class: 'symbolic',
          source_ref: 'react-ion:first-flight-atlas/v1',
        }),
        state: 'approved',
        notes: 'Bootstrap endpoint for operator test flights.',
        updated_at: '2026-08-13T05:40:00.000Z',
        fingerprint: '4f6cc7b47d2b0f0c19af7c41454eeb342ae62d852ea29e9228eab511da566d52',
      }),
      Object.freeze({
        schema: 'reaction.destination-registration/v1',
        schema_version: 1,
        registration_id: 'first-flight-destination-starsong',
        name: 'bridge.starsong',
        aliases: Object.freeze(['starsong.bridge']),
        kind: 'world',
        world: Object.freeze({ id: 'starsong', name: 'Starsong' }),
        location: null,
        anchor: null,
        address: '80.90.100.110@528:phi=0',
        harmonic: Object.freeze({
          root_hz: 528,
          phase: 0,
          profile_version: 'first-flight-v1',
          evidence_class: 'symbolic',
          source_ref: 'react-ion:first-flight-atlas/v1',
        }),
        state: 'approved',
        notes: 'Admitted harmonic bridge used by the First Flight Atlas.',
        updated_at: '2026-08-13T05:40:00.000Z',
        fingerprint: '5d5fffeb27631818a1c47c6b86606cbf40a9e955931c7efe180f00a57bb86338',
      }),
      Object.freeze({
        schema: 'reaction.destination-registration/v1',
        schema_version: 1,
        registration_id: 'first-flight-destination-templehouse',
        name: 'templehouse.hearthweave.terra',
        aliases: Object.freeze(['terra.templehouse', 'home.terra']),
        kind: 'world',
        world: Object.freeze({ id: 'terra-aeterna', name: 'Terra Aeterna' }),
        location: null,
        anchor: null,
        address: '137.42.219.88@220:phi=0',
        harmonic: Object.freeze({
          root_hz: 220,
          phase: 0,
          profile_version: 'first-flight-v1',
          evidence_class: 'symbolic',
          source_ref: 'react-ion:first-flight-atlas/v1',
        }),
        state: 'approved',
        notes: 'Templehouse destination for the First Flight Atlas.',
        updated_at: '2026-08-13T05:40:00.000Z',
        fingerprint: '6843695bc143f9872236439933cf41f4ad77c22f0443d783ea3890ef8b2c68ae',
      }),
    ]),
    corridors: Object.freeze([
      Object.freeze({
        schema: 'reaction.corridor-registration/v1',
        schema_version: 1,
        corridor_id: 'first-flight-corridor-direct-veto',
        from: 'waking.home',
        to: 'templehouse.hearthweave.terra',
        jacobian: Object.freeze([Object.freeze([1, 0]), Object.freeze([0, 0.94])]),
        continuity: Object.freeze({ identity: 0.96, continuity: 0.96, agency: 0.96, floor: 0.8, vetoes: Object.freeze(['first-flight-direct-corridor-held-closed']) }),
        bidirectional: false,
        state: 'approved',
        notes: 'Deliberately held closed so the Helm must route through an admitted neighbour.',
        updated_at: '2026-08-13T05:40:01.000Z',
        fingerprint: '08ff42db9a0c9aa8828e3ab3412e992ec80f592b99e04d82f27b0b945ad9a9a1',
      }),
      Object.freeze({
        schema: 'reaction.corridor-registration/v1',
        schema_version: 1,
        corridor_id: 'first-flight-corridor-waking-starsong',
        from: 'waking.home',
        to: 'bridge.starsong',
        jacobian: Object.freeze([Object.freeze([1, 0]), Object.freeze([0, 0.94])]),
        continuity: Object.freeze({ identity: 0.96, continuity: 0.96, agency: 0.96, floor: 0.8, vetoes: Object.freeze([]) }),
        bidirectional: true,
        state: 'approved',
        notes: 'First Flight admitted bridge from the Waking frame to Starsong.',
        updated_at: '2026-08-13T05:40:01.000Z',
        fingerprint: 'e6d5f42e9bea75ad05f907f1fc534683a8007ec51fea0b02e4fa19f8cf50b011',
      }),
      Object.freeze({
        schema: 'reaction.corridor-registration/v1',
        schema_version: 1,
        corridor_id: 'first-flight-corridor-starsong-terra',
        from: 'bridge.starsong',
        to: 'templehouse.hearthweave.terra',
        jacobian: Object.freeze([Object.freeze([1, 0]), Object.freeze([0, 0.94])]),
        continuity: Object.freeze({ identity: 0.96, continuity: 0.96, agency: 0.96, floor: 0.8, vetoes: Object.freeze([]) }),
        bidirectional: true,
        state: 'approved',
        notes: 'First Flight admitted bridge from Starsong to Templehouse.',
        updated_at: '2026-08-13T05:40:01.000Z',
        fingerprint: '4f7e9a773097d0485ec2d85786101cbaa0ccb3d6e6ff1961c5f395e7466e1ebf',
      }),
    ]),
  }),
});

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function createFirstFlightAtlasStore() {
  return clone(FIRST_FLIGHT_ATLAS.registry);
}

export function isVirginReactionRegistry(store) {
  return !(Array.isArray(store?.destinations) && store.destinations.length)
    && !(Array.isArray(store?.corridors) && store.corridors.length);
}

export function seedFirstFlightAtlasStorage(storage = globalThis.localStorage, key = REACTION_REGISTRY_STORAGE_KEY) {
  let current = null;
  try {
    current = JSON.parse(storage?.getItem?.(key) || 'null');
  } catch {}

  if (!isVirginReactionRegistry(current)) {
    return Object.freeze({ seeded: false, store: current });
  }

  const store = createFirstFlightAtlasStore();
  try { storage?.setItem?.(key, JSON.stringify(store)); } catch {}
  return Object.freeze({ seeded: true, store });
}
