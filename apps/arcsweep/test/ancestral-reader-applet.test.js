import test from 'node:test';
import assert from 'node:assert/strict';

import { CORE_APPLETS, coreAppletById } from '../src/core-applet-registry.js';
import { APPLET_CATALOGUE } from '../src/applets.js';

test('Ancestral Reader is a visible continuity applet with web and Pages routes', () => {
  const core = coreAppletById('ancestry');
  assert.ok(core);
  assert.equal(core.label, 'Ancestral Reader');
  assert.equal(core.category, 'continuity');
  assert.equal(core.defaultVisible, true);
  assert.equal(core.webHref, '/arcsweep/ancestry/');
  assert.equal(core.pagesHref, '/Flameclyffe/apps/arcsweep/ancestry/');
  assert.ok(CORE_APPLETS.some((item) => item.id === 'ancestry'));

  const catalogue = APPLET_CATALOGUE.find((item) => item.id === 'ancestry');
  assert.ok(catalogue);
  assert.equal(catalogue.webHref, '/arcsweep/ancestry/');
});
