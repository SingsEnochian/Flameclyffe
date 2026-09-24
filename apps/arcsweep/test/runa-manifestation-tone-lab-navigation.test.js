import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/runa-manifestation-sidecar.js', import.meta.url), 'utf8');

test('Tone Lab is inert until workspace or Codex context has resolved', () => {
  assert.match(source, /let lastContext = null;/);
  assert.match(source, /if \(!lastContext\) return '<a data-runa-tone-lab aria-disabled="true">Tone Lab ↗<\/a>';/);
  assert.match(source, /link\.setAttribute\('href', toneLabHref\(\)\);/);
  assert.match(source, /link\.removeAttribute\('aria-disabled'\);/);
});

test('modified or auxiliary-ready navigation cannot consume an uncontextualized Tone Lab href', () => {
  const unreadyGuard = source.indexOf("if (toneLink && !toneLink.hasAttribute('href'))");
  const modifierBranch = source.indexOf('if (toneLink && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey)');
  assert.notEqual(unreadyGuard, -1);
  assert.notEqual(modifierBranch, -1);
  assert.ok(unreadyGuard < modifierBranch, 'unready-link guard must run before modifier-specific navigation');
  const guardBody = source.slice(unreadyGuard, modifierBranch);
  assert.match(guardBody, /event\.preventDefault\(\);/);
});
