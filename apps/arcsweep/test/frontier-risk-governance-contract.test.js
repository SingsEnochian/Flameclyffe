import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', 'contracts');

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
}

test('frontier risk ingest preserves epistemic distance and non-canon promotion', () => {
  const schema = load('frontier-risk-governance-v0.1.json');
  const claimClass = schema.properties.claims.items.properties.claim_class.enum;
  assert.ok(claimClass.includes('firsthand_observation'));
  assert.ok(claimClass.includes('insider_testimony'));
  assert.ok(claimClass.includes('forecast'));
  assert.ok(claimClass.includes('policy_prescription'));
  assert.equal(schema.properties.claims.items.properties.epistemic_distance.minimum, 0);
  assert.equal(schema.properties.claims.items.properties.epistemic_distance.maximum, 6);
  assert.equal(schema.properties.promotion.properties.canonical_world.const, false);
  assert.equal(schema.properties.promotion.properties.canonical_theory.const, false);
});

test('swarm synthesis is disagreement-preserving rather than majority canon', () => {
  const schema = load('swarm-epistemic-synthesis-v0.1.json');
  const required = new Set(schema.required);
  for (const field of ['support_count', 'contest_count', 'unresolved_assumptions', 'independent_source_count', 'promotion_status']) {
    assert.ok(required.has(field), `${field} must be required`);
  }
  assert.equal(schema.properties.canonical_world.const, false);
  assert.equal(schema.properties.canonical_theory.const, false);
});

test('caretaker action receipt only admits bounded typed actions', () => {
  const schema = load('caretaker-action-receipt-v0.1.json');
  const allowed = schema.properties.requested_action.enum;
  assert.deepEqual(allowed, ['navigate', 'open_surface']);
  assert.match(schema.properties.context_fingerprint.pattern, /64/);
});
