import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storeMemory } from './evercore-client.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedPath = path.join(__dirname, 'starwell-seed-memories.json');
const allowedKinds = new Set([
  'world_lore',
  'character_room',
  'dyad_note',
  'interface_rule',
  'visitor_trace',
  'ritual_object',
  'technical_decision',
  'safety_boundary'
]);

function validateSeed(seed, index) {
  const label = `seed ${index + 1}`;

  if (!seed || typeof seed !== 'object') throw new Error(`${label} must be an object.`);
  if (!seed.memory_id) throw new Error(`${label} missing memory_id.`);
  if (!allowedKinds.has(seed.memory_kind)) throw new Error(`${label} has invalid memory_kind: ${seed.memory_kind}`);
  if (!seed.scope) throw new Error(`${label} missing scope.`);
  if (!seed.source) throw new Error(`${label} missing source.`);
  if (!seed.visibility) throw new Error(`${label} missing visibility.`);
  if (!seed.content || !seed.content.trim()) throw new Error(`${label} missing content.`);
  if (!Array.isArray(seed.tags)) throw new Error(`${label} tags must be an array.`);
}

function buildEverCoreContent(seed) {
  return [
    `Memory kind: ${seed.memory_kind}`,
    `Scope: ${seed.scope}`,
    `Source: ${seed.source}`,
    `Visibility: ${seed.visibility}`,
    `Tags: ${seed.tags.join(', ')}`,
    seed.interpretive_context ? `Interpretive context: ${seed.interpretive_context}` : null,
    seed.meta_dynamics ? `Meta dynamics: ${JSON.stringify(seed.meta_dynamics)}` : null,
    '',
    seed.content.trim()
  ]
    .filter(part => part !== null)
    .join('\n');
}

try {
  const raw = await fs.readFile(seedPath, 'utf8');
  const seeds = JSON.parse(raw);

  if (!Array.isArray(seeds)) {
    throw new Error('starwell-seed-memories.json must contain an array.');
  }

  seeds.forEach(validateSeed);

  console.log(`Submitting ${seeds.length} structured STARWELL seed memor${seeds.length === 1 ? 'y' : 'ies'} to EverCore...`);

  for (const [index, seed] of seeds.entries()) {
    const result = await storeMemory(buildEverCoreContent(seed), {
      messageId: seed.memory_id,
      sender: 'rowan',
      senderName: 'Rowan',
      role: 'user'
    });
    console.log(`Seed ${index + 1}/${seeds.length}: ${seed.memory_id} (${seed.memory_kind}) submitted`);
    console.log(JSON.stringify(result, null, 2));
  }

  console.log('STARWELL seed pass complete. Give EverCore a moment to index before searching.');
} catch (error) {
  console.error('Seed pass failed.');
  console.error(error.message);
  process.exitCode = 1;
}
