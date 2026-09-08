import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HEIMDALL_FOLDWATCH_SCHEMA,
  buildSwarmFoldPrompt,
  createFoldTelemetry,
  estimateJacobian,
  saddleNodeSample,
  singularGeometry,
} from '../src/heimdall-foldwatch.js';

test('finite-difference Jacobian resolves the saddle-node derivative', () => {
  const jacobian = estimateJacobian(([x], { mu }) => [mu - x * x], [0.25], { parameters: { mu: 0.1 } });
  assert.equal(jacobian.length, 1);
  assert.ok(Math.abs(jacobian[0][0] + 0.5) < 1e-6);
});

test('singular geometry exposes the soft direction and rank loss', () => {
  const geometry = singularGeometry([[3, 0], [0, 0.02]]);
  assert.ok(Math.abs(geometry.sigma_min - 0.02) < 1e-8);
  assert.ok(Math.abs(geometry.sigma_max - 3) < 1e-8);
  assert.equal(geometry.soft_direction.length, 2);
});

test('Foldwatch approaches the known saddle-node fold as x tends to zero', () => {
  const history = [];
  let previousState = 'CLEAR';
  let sample;
  for (const [index, x] of [0.8, 0.4, 0.2, 0.08, 0.03, 0.01, 0].entries()) {
    sample = saddleNodeSample({ x, mu: 0, t: index, history, previousState });
    history.push(sample);
    previousState = sample.state;
  }
  assert.equal(sample.schema, HEIMDALL_FOLDWATCH_SCHEMA);
  assert.equal(sample.sigma_min, 0);
  assert.equal(sample.rank_loss_score, 1);
  assert.ok(['APPROACH', 'FOLD'].includes(sample.state));
});

test('relational participation is measured from named soft-vector coordinates', () => {
  const telemetry = createFoldTelemetry({
    t: 0,
    jacobian: [[0.01, 0], [0, 2]],
    relationalIndices: [0],
  });
  assert.ok(telemetry.relational_participation > 0.99);
});

test('Swarm prompt keeps measurement separate from interpretation and Crossing assertion', () => {
  const telemetry = saddleNodeSample({ x: 0.01, mu: 0, t: 1 });
  const prompt = buildSwarmFoldPrompt(telemetry);
  assert.match(prompt, /Heimdall Foldwatch telemetry/);
  assert.match(prompt, /Separate measured geometry from interpretation/);
  assert.match(prompt, /Do not promote a fold candidate to a Crossing without continuation evidence/);
});
