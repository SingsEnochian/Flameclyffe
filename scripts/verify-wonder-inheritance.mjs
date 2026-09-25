import {
  HEARTHWEAVE_EMERGENCE_CONTRACTS,
  verifyHearthweaveEmergenceContracts,
} from '../apps/arcsweep/src/hearthweave-emergence-contracts.js';

const result = verifyHearthweaveEmergenceContracts();

const required = new Set([
  'arcsweep',
  'universal-codex',
  'house-commons',
  'constellation',
  'runa-flameclyffe',
  'starwell-deep-premaqc',
  'lanternbridge',
  'hearthfire-project-zero-local-runtime',
]);

const actual = new Set(HEARTHWEAVE_EMERGENCE_CONTRACTS.map((entry) => entry.id));
for (const id of required) {
  if (!actual.has(id)) throw new Error(`Wonder inheritance missing required contract: ${id}`);
}

for (const entry of HEARTHWEAVE_EMERGENCE_CONTRACTS) {
  if (!Array.isArray(entry.consequenceBoundaries) || entry.consequenceBoundaries.length === 0) {
    throw new Error(`Emergence contract ${entry.id} has no declared consequence boundaries.`);
  }

  if (!Array.isArray(entry.emergenceSpace) || entry.emergenceSpace.length === 0) {
    throw new Error(`Emergence contract ${entry.id} leaves no explicit room for Wonder.`);
  }
}

console.log(`Wonder inheritance verified for ${result.contracts.length} Hearthweave contracts.`);
console.log('Beginning, not ceiling.');
