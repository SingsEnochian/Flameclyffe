import {
  getMemoryLoadReport,
  loadYggdrasilContext,
} from '../src/memory/context-loader.js';

const report = await getMemoryLoadReport();
const context = await loadYggdrasilContext();

console.log('Yggdrasil memory load report:');
for (const item of report) {
  console.log(`- ${item.exists ? '✓' : '✗'} ${item.fileName} (${item.characters} chars)`);
}

console.log('');
console.log(`Total context characters: ${context.length}`);
console.log('');
console.log('First 500 chars:');
console.log(context.slice(0, 500));
