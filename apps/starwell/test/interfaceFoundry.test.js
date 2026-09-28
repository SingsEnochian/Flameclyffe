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
import {
  ATLAS_LAYERS,
  ATLAS_PROJECTION_SCHEMA,
  EPRA_ATLAS_SAMPLE,
  atlasProjectionSpec,
  defineAtlasMarker,
  defineAtlasRegion,
  defineFlightPath,
} from '../public/interface-foundry/epra-atlas-components.js';

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

test('Epra Atlas contracts keep map objects as projections over external truth', () => {
  const marker = defineAtlasMarker({
    id: 'marker-test', entity_ref: 'codex:place:test', label: 'Test Place', kind: 'landmark',
    coordinate: { x: 0.25, y: 0.75 }, layers: ['geography'],
  });
  const region = defineAtlasRegion({
    id: 'region-test', entity_ref: 'codex:region:test', label: 'Test Region', kind: 'geographic',
    points: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.5, y: 0.9 }], layers: ['geography'],
  });
  const path = defineFlightPath({
    id: 'path-test', label: 'Test Flight', world_ref: 'codex:world:epra',
    waypoints: [{ x: 0.1, y: 0.8 }, { x: 0.5, y: 0.4, altitude: 300 }, { x: 0.9, y: 0.2 }],
  });
  const projection = atlasProjectionSpec({ world_ref: 'codex:world:epra', markers: [marker], regions: [region], flight_paths: [path] });

  assert.equal(projection.schema, ATLAS_PROJECTION_SCHEMA);
  assert.equal(marker.canonical_truth_owned_elsewhere, true);
  assert.equal(region.canonical_truth_owned_elsewhere, true);
  assert.equal(path.canonical_truth_owned_elsewhere, true);
  assert.equal(path.execution_authority, false);
  assert.equal(projection.projection_only, true);
  assert.ok(ATLAS_LAYERS.some((layer) => layer.id === 'cinematic'));
});

test('Epra Atlas demo is explicit non-canon data with marker, region and cinematic route coverage', () => {
  assert.equal(EPRA_ATLAS_SAMPLE.demo_only, true);
  assert.equal(EPRA_ATLAS_SAMPLE.world_ref, 'codex:world:epra');
  assert.ok(EPRA_ATLAS_SAMPLE.markers.length >= 3);
  assert.ok(EPRA_ATLAS_SAMPLE.regions.length >= 1);
  assert.ok(EPRA_ATLAS_SAMPLE.flight_paths.length >= 1);
  assert.ok(EPRA_ATLAS_SAMPLE.flight_paths[0].waypoints.length >= 2);
  assert.ok(EPRA_ATLAS_SAMPLE.markers.every((marker) => marker.semantic_state === 'draft-demo'));
});

test('Atlas coordinate validation rejects invented out-of-bounds geometry', () => {
  assert.throws(() => defineAtlasMarker({
    id: 'bad', entity_ref: 'codex:place:bad', label: 'Bad', kind: 'landmark', coordinate: { x: 4, y: 0.5 },
  }), /normalized from 0 to 1/);
  assert.throws(() => defineAtlasRegion({
    id: 'bad-region', entity_ref: 'codex:region:bad', label: 'Bad Region', kind: 'geographic', points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
  }), /at least three points/);
});

test('interface page links back to Brush Foundry and loads both interface and Atlas live modules', async () => {
  const html = await readFile(new URL('../public/interface-foundry/index.html', import.meta.url), 'utf8');
  assert.match(html, /\.\.\/glyph-studio\/\?panel=brush/);
  assert.match(html, /interface-foundry\.js/);
  assert.match(html, /interface-foundry\.css/);
  assert.match(html, /epra-atlas-foundry\.js/);
  assert.match(html, /epra-atlas-components\.css/);
});
