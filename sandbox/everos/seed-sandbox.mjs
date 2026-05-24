import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storeMemory } from './evercore-client.mjs';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const seedPath = path.join(currentDir, 'seed-memories.json');

try {
  const raw = await fs.readFile(seedPath, 'utf8');
  const seeds = JSON.parse(raw);

  for (const [index, seed] of seeds.entries()) {
    if (!seed.content) continue;
    const result = await storeMemory(seed.content, {
      messageId: `starwell_seed_${String(index + 1).padStart(3, '0')}`
    });
    console.log(`Seed ${index + 1}/${seeds.length} submitted.`);
    console.log(JSON.stringify(result, null, 2));
  }

  console.log('Sandbox seed run complete.');
} catch (error) {
  console.error('Sandbox seed run failed.');
  console.error(error.message);
  process.exitCode = 1;
}
