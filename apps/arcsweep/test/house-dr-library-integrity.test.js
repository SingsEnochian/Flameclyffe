import assert from 'node:assert/strict';
import test from 'node:test';
import { HOUSE_DR_BUNDLE } from '../src/house-dr-bundle.js';
import {
  applyHouseDrBundle,
  inspectHouseDrBundleIntegrity,
} from '../src/house-dr-library.js';
import { reconcileHouseDrLibraryBeforeHydration } from '../src/terra-prime-core.js';

const T0 = '2026-08-29T03:40:00.000Z';
const T1 = '2026-08-29T03:41:00.000Z';

function fullyInstalledState() {
  return applyHouseDrBundle({
    worlds: [],
    scripts: [],
    records: { ingest: [] },
    houseBundles: [],
    provenance: {},
  }, HOUSE_DR_BUNDLE, T0).state;
}

test('a current bundle receipt is not enough when managed worlds, scripts, or ingests are missing', () => {
  const state = fullyInstalledState();
  const ingestDocument = HOUSE_DR_BUNDLE.documents.find((document) => document.kind === 'source-ingest');
  assert.ok(ingestDocument, 'fixture requires at least one bundle source-ingest document');
  const targetWorldEntry = HOUSE_DR_BUNDLE.worlds.find((world) => world.sourceKey === ingestDocument.worldSourceKey);
  assert.ok(targetWorldEntry, 'source-ingest must reference a bundle world');
  const scriptDocument = HOUSE_DR_BUNDLE.documents.find((document) => (
    document.kind !== 'source-ingest' && document.worldSourceKey === targetWorldEntry.sourceKey
  ));
  assert.ok(scriptDocument, 'fixture requires a script in the same bundle world');

  const survivingManaged = state.scripts.find((script) => (
    script.houseBundleManaged && script.houseSourceKey !== scriptDocument.sourceKey
  ));
  assert.ok(survivingManaged, 'fixture requires another managed script');
  survivingManaged.content = 'LOCAL EDIT MUST SURVIVE REPAIR';
  state.scripts.push({
    id: 'local-user-script',
    name: 'Local user script',
    worldId: state.worlds[0].id,
    world: state.worlds[0].name,
    status: 'Draft I',
    content: 'KEEP THIS TOO',
  });

  state.worlds = state.worlds.filter((world) => world.houseSourceKey !== targetWorldEntry.sourceKey);
  state.scripts = state.scripts.filter((script) => script.houseSourceKey !== scriptDocument.sourceKey);
  state.records.ingest = state.records.ingest.filter((record) => record.houseSourceKey !== ingestDocument.sourceKey);

  const before = inspectHouseDrBundleIntegrity(state, HOUSE_DR_BUNDLE);
  assert.ok(before.currentReceipt, 'the stale current receipt must remain present');
  assert.equal(before.complete, false);
  assert.ok(before.missingWorlds.includes(targetWorldEntry.sourceKey));
  assert.ok(before.missingScripts.includes(scriptDocument.sourceKey));
  assert.ok(before.missingIngests.includes(ingestDocument.sourceKey));

  const repaired = reconcileHouseDrLibraryBeforeHydration(state, T1);
  assert.equal(repaired.mode, 'additive-repair');
  assert.equal(repaired.changed, true);

  const restoredWorld = repaired.state.worlds.find((world) => world.houseSourceKey === targetWorldEntry.sourceKey);
  assert.ok(restoredWorld, 'missing bundle world must be restored');
  const restoredScript = repaired.state.scripts.find((script) => script.houseSourceKey === scriptDocument.sourceKey);
  assert.ok(restoredScript, 'missing bundle script must be restored');
  assert.equal(restoredScript.worldId, restoredWorld.id);
  const restoredIngest = repaired.state.records.ingest.find((record) => record.houseSourceKey === ingestDocument.sourceKey);
  assert.ok(restoredIngest, 'missing bundle ingest must be restored');
  assert.equal(restoredIngest.worldId, restoredWorld.id);

  assert.equal(
    repaired.state.scripts.find((script) => script.houseSourceKey === survivingManaged.houseSourceKey)?.content,
    'LOCAL EDIT MUST SURVIVE REPAIR',
    'surviving managed prose must not be overwritten by additive repair',
  );
  assert.equal(
    repaired.state.scripts.find((script) => script.id === 'local-user-script')?.content,
    'KEEP THIS TOO',
    'unmanaged local scripts must survive repair',
  );

  const after = inspectHouseDrBundleIntegrity(repaired.state, HOUSE_DR_BUNDLE);
  assert.equal(after.complete, true);
});

test('additive repair relinks surviving bundle scripts without rewriting their text', () => {
  const state = fullyInstalledState();
  const scriptDocument = HOUSE_DR_BUNDLE.documents.find((document) => document.kind !== 'source-ingest');
  const script = state.scripts.find((item) => item.houseSourceKey === scriptDocument.sourceKey);
  const world = state.worlds.find((item) => item.houseSourceKey === scriptDocument.worldSourceKey);
  assert.ok(script && world);

  script.content = 'LOCALLY PRESERVED SCRIPT BODY';
  script.worldId = 'wrong-world';
  script.world = 'Wrong World';

  const before = inspectHouseDrBundleIntegrity(state, HOUSE_DR_BUNDLE);
  assert.ok(before.mislinkedScripts.includes(scriptDocument.sourceKey));

  const repaired = reconcileHouseDrLibraryBeforeHydration(state, T1);
  const result = repaired.state.scripts.find((item) => item.houseSourceKey === scriptDocument.sourceKey);
  assert.equal(result.content, 'LOCALLY PRESERVED SCRIPT BODY');
  assert.equal(result.worldId, world.id);
  assert.equal(result.world, world.name);
});

test('a complete current House library remains untouched', () => {
  const state = fullyInstalledState();
  const before = JSON.stringify(state);
  const result = reconcileHouseDrLibraryBeforeHydration(state, T1);
  assert.equal(result.mode, 'verified');
  assert.equal(result.changed, false);
  assert.equal(JSON.stringify(result.state), before);
});
