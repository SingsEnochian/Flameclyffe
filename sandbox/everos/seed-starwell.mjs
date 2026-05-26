import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storeMemory } from './evercore-client.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedPath = path.join(__dirname, 'starwell-seed-memories.json');

try {
  const raw = await fs.readFile(seedPath, 'utf8');
  const seeds = JSON.parse(raw);

  console.log(`Submitting ${seeds.length} curated STARWELL seed memor${seeds.length === 1 ? 'y' : 'ies'} to EverCore...`);

  for (const [index, seed] of seeds.entries()) {
    const result = await storeMemory(seed.content, {
      messageId: `starwell_seed_${String(index + 1).padStart(3, '0')}`,
      sender: 'rowan',
      senderName: 'Rowan',
      role: 'user'
    });
    console.log(`Seed ${index + 1}/${seeds.length}: submitted`);
    console.log(JSON.stringify(result, null, 2));
  }

  console.log('STARWELL seed pass complete. Give EverCore a moment to index before searching.');
} catch (error) {
  console.error('Seed pass failed.');
  console.error(error.message);
  process.exitCode = 1;
}
