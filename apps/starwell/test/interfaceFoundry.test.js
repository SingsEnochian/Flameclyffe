import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  COMPONENT_CATALOGUE,
  INTERACTION_STAGES,
  INTERFACE_THEMES,
  componentSpec,
  themeVariables,
} from '../public/interface-foundry/interface-foundry.js';

test('interface foundry exposes the shared interaction law and destination themes', () => {
  assert.deepEqual(INTERACTION_STAGES.map((stage) => stage.id), ['glance', 'inspect', 'open']);
  for (const id of ['arcsweep-hud', 'universal-codex', 'epra-atlas', 'house-commons', 'jcink']) assert.ok(Object.hasOwn(INTERFACE_THEMES, id));
  for (const id of ['status-rune', 'vector-meter', 'profile-shell', 'atlas-marker', 'commons-message', 'cut-panel', 'navigation-dock', 'post-shell']) {
    assert.ok(COMPONENT_CATALOGUE.some((component) => component.id === id));
  }
});

test('component contracts keep semantics independent from decoration', () => {
  for (const component of COMPONENT_CATALOGUE) {
    const spec = componentSpec(component.id);
    assert.equal(spec.semantic_state_required, true);
    assert.equal(spec.colour_only_state_forbidden, true);
    assert.equal(spec.canonical_truth_owned_elsewhere, true);
    assert.deepEqual(spec.interaction, ['glance', 'inspect', 'open']);
  }
});

test('theme variables resolve Epra Atlas and safely fall back to it', () => {
  const atlas = themeVariables('epra-atlas');
  assert.equal(atlas['--if-accent'], INTERFACE_THEMES['epra-atlas'].accent);
  assert.deepEqual(themeVariables('does-not-exist'), atlas);
});

test('interface page links back to Brush Foundry and loads its live module', async () => {
  const html = await readFile(new URL('../public/interface-foundry/index.html', import.meta.url), 'utf8');
  assert.match(html, /\.\.\/glyph-studio\/\?panel=brush/);
  assert.match(html, /interface-foundry\.js/);
  assert.match(html, /interface-foundry\.css/);
});
