import { seedFirstFlightAtlasStorage } from './react-ion-first-flight-atlas.js';

const result = seedFirstFlightAtlasStorage();
if (result.seeded) {
  globalThis.dispatchEvent?.(new CustomEvent('reaction:first-flight-atlas-seeded', {
    detail: { destinations: result.store.destinations.length, corridors: result.store.corridors.length },
  }));
}
