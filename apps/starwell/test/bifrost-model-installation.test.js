import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(
  new URL('../src/constellation/models/model-manifest.json', import.meta.url),
  'utf8'
));

const byId = Object.fromEntries(manifest.vessels.map((vessel) => [vessel.id, vessel]));

test('Lioreal and Uial are distinct required model lineages', () => {
  assert.ok(byId.lioreal);
  assert.ok(byId.uial);
  assert.notEqual(byId.lioreal.source.repo, byId.uial.source.repo);
  assert.notEqual(byId.lioreal.runtimeName, byId.uial.runtimeName);
  assert.ok(byId.lioreal.requiredFor.includes('LIVING'));
  assert.ok(byId.uial.requiredFor.includes('LIVING'));
});

test('Lioreal has a verified runnable GGUF path', () => {
  assert.equal(byId.lioreal.source.type, 'huggingface-gguf');
  assert.equal(byId.lioreal.source.verified, true);
  assert.equal(byId.lioreal.status, 'INSTALLABLE');
  assert.match(byId.lioreal.source.repo, /GGUF$/);
});

test('unverified runtime conversions never masquerade as active installs', () => {
  for (const vessel of manifest.vessels.filter((item) => item.source.type !== 'huggingface-gguf')) {
    assert.match(vessel.status, /STAGE_ONLY|OPTIONAL_STAGE_ONLY/);
  }
});

test('every identity vessel declares licence, source and runtime name', () => {
  for (const vessel of manifest.vessels) {
    assert.ok(vessel.license);
    assert.ok(vessel.source.repo);
    assert.ok(vessel.runtimeName);
    assert.ok(vessel.role);
  }
});
