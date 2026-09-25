import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('physical Codex material skin uses shared tokens and semantic wear rather than random decoration', async () => {
  const source = await readFile(new URL('../src/codex-physical-materials-sidecar.js', import.meta.url), 'utf8');
  assert.match(source, /--codex-abyss-1000/);
  assert.match(source, /--codex-old-gold/);
  assert.match(source, /--codex-glass-smoke/);
  assert.match(source, /--codex-teal-500/);
  assert.match(source, /--codex-wear-edge-opacity/);
  assert.match(source, /--codex-wear-fibre-depth/);
  assert.match(source, /Semantic wear is deliberately subtle/);
  assert.doesNotMatch(source, /Math\.random|random\(|noise\(/i);
});

test('physical skin keeps glow tied to active controls and honours reduced motion', async () => {
  const source = await readFile(new URL('../src/codex-physical-materials-sidecar.js', import.meta.url), 'utf8');
  assert.match(source, /button\[aria-pressed="true"\]/);
  assert.match(source, /--codex-teal-500/);
  assert.match(source, /prefers-reduced-motion/);
  assert.doesNotMatch(source, /animation[^;]*infinite|scanline|orbit/i);
});

test('runtime boot mounts the physical material skin before live semantic projections', async () => {
  const bootstrap = await readFile(new URL('../src/runtime-integration-bootstrap.js', import.meta.url), 'utf8');
  const physicalIndex = bootstrap.indexOf("./codex-physical-materials-sidecar.js");
  const aliveIndex = bootstrap.indexOf("./codex-alive-sidecar.js");
  assert.ok(physicalIndex >= 0);
  assert.ok(aliveIndex > physicalIndex);
});
