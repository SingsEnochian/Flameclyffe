import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const htmlUrl = new URL('../public/interface-foundry/index.html', import.meta.url);
const cssUrl = new URL('../public/interface-foundry/interface-foundry-spacing.css', import.meta.url);

test('Interface Foundry loads the spacing pass after the depth pass', async () => {
  const html = await readFile(htmlUrl, 'utf8');
  const depth = html.indexOf('./interface-foundry-depth.css');
  const spacing = html.indexOf('./interface-foundry-spacing.css');
  assert.ok(depth >= 0);
  assert.ok(spacing > depth);
});

test('JCINK proof uses explicit copy, component and structural spacing', async () => {
  const css = await readFile(cssUrl, 'utf8');
  assert.match(css, /--jcink-space-micro:\s*\.5rem/);
  assert.match(css, /--jcink-space-component:\s*\.75rem/);
  assert.match(css, /--jcink-space-group:\s*1rem/);
  assert.match(css, /--jcink-space-structural:\s*1\.25rem/);
  assert.match(css, /\.jcink-proof-row\s*>\s*div\s*\{[\s\S]*?gap:\s*\.55rem/);
});

test('JCINK proof caps profile dominance and keeps reply footer intentionally grouped', async () => {
  const css = await readFile(cssUrl, 'utf8');
  assert.match(css, /grid-template-columns:\s*minmax\(11\.5rem,\s*14\.5rem\)\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /\.jcink-proof-avatar\s*\{[\s\S]*?width:\s*min\(100%,\s*12\.75rem\)/);
  assert.match(css, /\.jcink-proof-actions\s*\{[\s\S]*?grid-row:\s*3/);
  assert.match(css, /\.jcink-proof-status\s*\{[\s\S]*?grid-row:\s*3/);
});

test('JCINK spacing remains responsive instead of preserving desktop gaps on touch widths', async () => {
  const css = await readFile(cssUrl, 'utf8');
  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
  assert.match(css, /\.jcink-proof-board\s*\{[\s\S]*?grid-template-columns:\s*1fr/);
  assert.match(css, /\.jcink-proof-avatar\s*\{[\s\S]*?width:\s*4rem/);
  assert.match(css, /\.jcink-proof-actions,[\s\S]*?\.jcink-proof-status\s*\{[\s\S]*?grid-row:\s*auto/);
});
