import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProjectCatalog } from '../src/surfaces/project-catalog.js';

const valid = { schema: 'wayglass.project-federation/v1',
  status: 'declared-not-runtime-mounted', authority_grant: false,
  projects: [{ id: 'arcsweep', role: 'writing', mode: 'native', mounted: false }] };

test('catalog labels declarations without claiming mounts', () => {
  assert.deepEqual(normalizeProjectCatalog(valid), [
    { id: 'arcsweep', role: 'writing', mode: 'native', mounted: false },
  ]);
});
test('catalog fails closed on forged authority, mount and malformed payloads', () => {
  for (const bad of [null, {}, { ...valid, authority_grant: true },
    { ...valid, status: 'mounted' }, { ...valid, projects: null },
    { ...valid, projects: [{ ...valid.projects[0], mounted: true }] },
    { ...valid, projects: [valid.projects[0], valid.projects[0]] },
    { ...valid, projects: [{ ...valid.projects[0], id: '<script>' }] }]) {
    assert.throws(() => normalizeProjectCatalog(bad));
  }
});
