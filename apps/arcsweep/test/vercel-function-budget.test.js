import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const API_V1 = join(ROOT, 'api', 'v1');
const HOUSE = join(API_V1, 'house');
const HOBBY_FUNCTION_LIMIT = 12;

function functionEntrypoints(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return functionEntrypoints(path);
    return entry.isFile() && entry.name.endsWith('.js') ? [path] : [];
  });
}

test('Vercel Hobby function budget remains within twelve api/v1 entrypoints', () => {
  const entrypoints = functionEntrypoints(API_V1);
  assert.ok(
    entrypoints.length <= HOBBY_FUNCTION_LIMIT,
    `Vercel Hobby permits ${HOBBY_FUNCTION_LIMIT} direct functions; found ${entrypoints.length}: ${entrypoints.join(', ')}`,
  );
});

test('single-segment House routes share the dynamic dispatcher', () => {
  const dispatcher = join(HOUSE, '[action].js');
  assert.equal(existsSync(dispatcher), true, 'House dynamic dispatcher must exist.');
  for (const legacyFile of ['observations.js', 'observer-reports.js', 'model-lab.js', 'emergence-lab.js']) {
    assert.equal(existsSync(join(HOUSE, legacyFile)), false, `${legacyFile} must remain folded into [action].js.`);
  }
  const source = readFileSync(dispatcher, 'utf8');
  for (const route of ['observations', 'observer-reports', 'model-lab', 'emergence-lab']) {
    assert.match(source, new RegExp(`['\"]?${route}['\"]?\\s*:`), `dispatcher must register ${route}`);
  }
});
