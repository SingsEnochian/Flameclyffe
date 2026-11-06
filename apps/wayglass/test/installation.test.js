import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installationState, installWayglassInstallation } from '../src/installation.js';

const ipad = { navigator: { platform: 'MacIntel', maxTouchPoints: 5 } };
test('iPad detection includes desktop-mode iPad and excludes desktop Mac', () => {
  assert.equal(installationState(ipad).showGuide, true);
  assert.equal(installationState({ navigator: { userAgent: 'iPad' } }).showGuide, true);
  assert.equal(installationState({ navigator: { platform: 'MacIntel', maxTouchPoints: 0 } }).showGuide, false);
  assert.equal(installationState({ navigator: { userAgent: 'iPhone' } }).showGuide, false);
});
test('installed Safari and standalone display suppress guidance', () => {
  assert.equal(installationState({ navigator: { ...ipad.navigator, standalone: true } }).showGuide, false);
  assert.equal(installationState({ ...ipad, matchMedia: () => ({ matches: true }) }).showGuide, false);
});

function node() {
  return { children: [], listeners: new Map(), hidden: false,
    setAttribute() {}, append(...children) { this.children.push(...children); },
    prepend(child) { this.children.unshift(child); },
    addEventListener(key, fn) { this.listeners.set(key, fn); },
    removeEventListener(key, fn) { if (this.listeners.get(key) === fn) this.listeners.delete(key); },
    remove() { this.removed = true; },
  };
}
test('installation lifecycle handles standalone changes, dismissal and teardown', () => {
  const host = node(); host.ownerDocument = { createElement: node };
  const display = node(); display.matches = false;
  const env = Object.assign(node(), ipad, { matchMedia: () => display });
  const installation = installWayglassInstallation({ host, env });
  const panel = host.children[0];
  assert.equal(panel.hidden, false);
  display.matches = true; display.listeners.get('change')();
  assert.equal(panel.hidden, true);
  display.matches = false; display.listeners.get('change')();
  assert.equal(panel.hidden, false);
  panel.children[1].listeners.get('click')();
  assert.equal(panel.hidden, true);
  env.listeners.get('pageshow')();
  assert.equal(panel.hidden, true);
  installation.destroy();
  assert.equal(panel.removed, true);
  assert.equal(display.listeners.size, 0);
  assert.equal(env.listeners.size, 0);
  assert.equal(panel.children[1].listeners.size, 0);
});

test('manifest and Apple icon stay inside root and subdirectory installation scope', () => {
  const root = new URL('../public/', import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL('manifest.webmanifest', root)));
  for (const base of ['https://example.test/', 'https://example.test/wayglass/']) {
    assert.equal(new URL(manifest.start_url, base).href, base);
    assert.equal(new URL(manifest.scope, base).href, base);
    assert.equal(new URL(manifest.id, base).href, base);
    for (const icon of manifest.icons) assert.ok(new URL(icon.src, base).href.startsWith(base));
  }
  for (const [name, size] of [['apple-touch-icon.png',180],['wayglass-192.png',192],['wayglass-512.png',512]]) {
    const png = readFileSync(new URL(name, root));
    assert.equal(png.subarray(0,8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
  assert.equal(manifest.display, 'standalone');
});
