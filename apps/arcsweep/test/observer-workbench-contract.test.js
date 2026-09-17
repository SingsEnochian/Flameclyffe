import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { APPLET_CATALOGUE, appletLaunchTarget } from '../src/applets.js';
import { createScientificSkillRouter } from '../src/os/scientific-skill-service.js';
import { buildObserverEpistemicLedger, buildObserverSemanticStatus } from '../src/os/observer-epistemic.js';
import {
  OBSERVER_PREMAQC_MESSAGE_TYPE,
  OBSERVER_PREMAQC_SCHEMA,
  OBSERVER_PREMAQC_STORAGE_KEY,
  PREMAQC_NAMING_LAW,
  canonicalPremaqcSchema,
} from '../../starwell/src/premaqc-contract.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const arcsweepRoot = path.resolve(here, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(arcsweepRoot, relativePath), 'utf8');
}

test('Observer Workbench is a first-class launch-target applet and packaged route', () => {
  const applet = APPLET_CATALOGUE.find((item) => item.id === 'observer-workbench');
  assert.ok(applet);
  assert.equal(applet.category, 'observation');
  assert.equal(applet.organKind, 'external');
  assert.equal(applet.defaultVisible, true);
  assert.match(applet.pagesHref, /arcsweep\/observer\/$/);
  assert.match(applet.webHref, /arcsweep\/observer\/$/);

  const pagesTarget = appletLaunchTarget('observer-workbench', {
    hostname: 'singsenochian.github.io',
    pathname: '/Flameclyffe/apps/arcsweep/',
    origin: 'https://singsenochian.github.io',
  });
  assert.match(pagesTarget, /\/Flameclyffe\/apps\/arcsweep\/observer\//);

  const html = read('observer/index.html');
  const vite = read('vite.config.js');
  assert.match(html, /id="observer-workbench"/);
  assert.match(html, /observer-workbench\.js/);
  assert.match(vite, /observer:\s*resolve\(ARCSWEEP_ROOT, 'observer\/index\.html'\)/);
});

test('Observer Workbench uses PREMAQC canonically and keeps PREMAQ compatibility-only', () => {
  assert.equal(PREMAQC_NAMING_LAW.canonical, 'PREMAQC');
  assert.equal(PREMAQC_NAMING_LAW.legacy_status, 'compatibility-only');
  assert.equal(OBSERVER_PREMAQC_SCHEMA, 'hearthgate.observer.premaqc/v1');
  assert.equal(OBSERVER_PREMAQC_STORAGE_KEY, 'hearthgate.observer.premaqc.v1');
  assert.equal(OBSERVER_PREMAQC_MESSAGE_TYPE, 'hearthgate.observer.premaqc');
  assert.equal(canonicalPremaqcSchema('hearthgate.observer.premaq/v1'), OBSERVER_PREMAQC_SCHEMA);

  const bridge = read('src/observer-bridge.js');
  const workbench = read('src/observer-workbench.js');
  assert.match(bridge, /OBSERVER_PREMAQC_SCHEMA/);
  assert.match(bridge, /OBSERVER_PREMAQC_LEGACY_STORAGE_KEYS/);
  assert.match(workbench, /OBSERVER_PREMAQC_STORAGE_KEY/);
  assert.match(workbench, /OBSERVER_PREMAQC_LEGACY_STORAGE_KEYS/);
});

test('Observer Workbench preserves the semantic boundaries of the merged instrument', () => {
  const semantic = buildObserverSemanticStatus({
    snapshot: { schema: OBSERVER_PREMAQC_SCHEMA, field: { P: 0.5 } },
    bridgePresent: true,
  });
  assert.equal(semantic.availability.state, 'available');
  assert.equal(semantic.integration_health.state, 'healthy');
  assert.equal(semantic.runtime_state.state, 'unknown');
  assert.equal(semantic.provenance.runtime_inference, false);
  assert.equal(semantic.provenance.unknowns_preserved, true);

  const ledger = buildObserverEpistemicLedger({
    snapshot: {
      schema: OBSERVER_PREMAQC_SCHEMA,
      narrative_state: {
        claims: [{ id: 'c1', text: 'A claim', evidence_refs: ['e1'] }],
        evidence: [{ id: 'e1', text: 'An observation', epistemic_status: 'observed' }],
      },
    },
  });
  assert.equal(ledger.boundaries.claim_not_automatic_fact, true);
  assert.equal(ledger.boundaries.narrative_not_automatic_evidence, true);
  assert.equal(ledger.boundaries.visualisation_not_evidence, true);
  assert.equal(ledger.boundaries.unknown_stays_unknown, true);
});

test('Observer Workbench uses bounded procedural-skill selection instead of loading every skill', () => {
  const router = createScientificSkillRouter();
  const selection = router.select({
    topics: ['observer', 'evidence'],
    capabilities: ['observer.status'],
    limit: 2,
  });
  assert.equal(selection.selection_only, true);
  assert.equal(selection.grants_runtime_authority, false);
  assert.ok(selection.selected.length > 0);
  assert.ok(selection.selected.length <= 2);
  assert.ok(selection.selected.every((skill) => skill.grants_runtime_authority === false));
});

test('rich text is a working-note surface and Boxfire witness lane is explicitly non-authoritative', () => {
  const workbench = read('src/observer-workbench.js');
  const witness = read('src/observer-witness.js');
  const preload = read('desktop/preload.cjs');
  const ipc = read('desktop/register-arcsweep-ipc.cjs');

  assert.match(workbench, /contenteditable="true"/);
  assert.match(workbench, /data-editor-mark="evidence"/);
  assert.match(workbench, /data-editor-mark="claim"/);
  assert.match(workbench, /data-editor-mark="hypothesis"/);
  assert.match(workbench, /data-editor-mark="canon"/);
  assert.match(workbench, /working-note-non-canon/);
  assert.match(witness, /witness_only:\s*true/);
  assert.match(witness, /grants_authority:\s*false/);
  assert.match(witness, /canon_commit:\s*false/);
  assert.match(witness, /source_mutation:\s*false/);
  assert.match(preload, /publishObserverWitness/);
  assert.match(ipc, /arcsweep:observer-witness:publish/);
});
