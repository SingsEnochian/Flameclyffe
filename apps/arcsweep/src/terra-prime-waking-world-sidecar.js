import {
  TERRA_PRIME_SYNC_EVENT,
  synchroniseTerraPrimeWakingWorld,
} from './terra-prime-core.js';

export { synchroniseTerraPrimeWakingWorld };

export function installTerraPrimeWakingWorldSidecar() {
  if (typeof document === 'undefined') return;
  void synchroniseTerraPrimeWakingWorld()
    .then((result) => {
      if (result.changed) globalThis.location?.reload?.();
    })
    .catch((error) => console.error('TERRA_PRIME_WAKING_WORLD_SYNC', error));
}

export const TERRA_PRIME_EVENTS = Object.freeze({ synchronised: TERRA_PRIME_SYNC_EVENT });

if (typeof document !== 'undefined') installTerraPrimeWakingWorldSidecar();
