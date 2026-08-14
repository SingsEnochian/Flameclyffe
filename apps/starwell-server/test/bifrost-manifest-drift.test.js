'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const starwellManifest = require('../../starwell/src/constellation/models/model-manifest.json');
const { MODEL_PROFILES, materialiseModelProfile } = require('../bifrost/model-profiles');

const byProfile = new Map(starwellManifest.vessels.filter((item) => item.profileId).map((item) => [item.profileId, item]));

test('STARWELL manifest declares server Bifröst registry as authority', () => {
  assert.equal(starwellManifest.authority, 'apps/starwell-server/bifrost/model-profiles.js');
  assert.equal(starwellManifest.rules.serverProfileRegistryIsAuthoritative, true);
  assert.equal(starwellManifest.rules.noSilentFallback, true);
});

test('every STARWELL model profile mirrors its server source lineage and runtime name', () => {
  for (const [profileId, vessel] of byProfile) {
    const server = materialiseModelProfile(profileId, {});
    assert.ok(server, `missing server profile ${profileId}`);
    assert.equal(vessel.sourceLineage, server.source.repo, `${profileId} source lineage drift`);
    assert.equal(vessel.runtimeName, server.runtime.model, `${profileId} runtime name drift`);
  }
});

test('every named server profile is represented in STARWELL or is deliberately non-Starwell', () => {
  for (const [profileId, profile] of Object.entries(MODEL_PROFILES)) {
    assert.ok(byProfile.has(profileId), `STARWELL manifest missing ${profileId} (${profile.owner})`);
  }
});

test('Sonata remains explicitly vessel-unselected', () => {
  const sonata = starwellManifest.vessels.find((item) => item.id === 'sonata');
  assert.ok(sonata);
  assert.equal(sonata.profileId, null);
  assert.equal(sonata.status, 'VESSEL_UNSELECTED');
});

test('deep reasoner remains an instrument rather than identity vessel', () => {
  const reasoner = starwellManifest.vessels.find((item) => item.id === 'deep-reasoner');
  assert.equal(reasoner.instrumentOnly, true);
  assert.equal(reasoner.optInOnly, true);
  assert.equal(reasoner.route, 'bifrost-deep-reasoner');
});
