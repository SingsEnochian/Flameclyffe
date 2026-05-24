import { searchMemories } from './evercore-client.mjs';

const input = process.argv.slice(2).join(' ').trim();

if (!input) {
  console.error('Usage: node sandbox/everos/search-memory.mjs "text to look up"');
  process.exit(1);
}

try {
  const result = await searchMemories(input);
  console.log('EverCore lookup complete.');
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error('EverCore lookup failed.');
  console.error(error.message);
  process.exitCode = 1;
}
