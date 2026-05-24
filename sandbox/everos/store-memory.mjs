import { storeMemory } from './evercore-client.mjs';

const content = process.argv.slice(2).join(' ').trim();

if (!content) {
  console.error('Usage: node sandbox/everos/store-memory.mjs "memory text to store"');
  process.exit(1);
}

try {
  const result = await storeMemory(content);
  console.log('Memory submitted to EverCore.');
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error('Failed to store memory.');
  console.error(error.message);
  process.exitCode = 1;
}
