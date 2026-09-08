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
import {
  HEIMDALL_ROLE_SWARM,
  buildLiveFoldTelemetry,
  estimateFlowJacobian,
  extractPremaqcState,
  runFoldwatchRoleSwarm,
} from '../src/heimdall-foldwatch-live.js';

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

test('relational participation is measured only from explicit named coordinates', () => {
  const measured = createFoldTelemetry({
    t: 0,
    jacobian: [[0.01, 0], [0, 2]],
    relationalIndices: [0],
  });
  assert.ok(measured.relational_participation > 0.99);
  assert.equal(measured.relational_participation_status, 'measured');

  const unavailable = createFoldTelemetry({ t: 0, jacobian: [[0.01, 0], [0, 2]] });
  assert.equal(unavailable.relational_participation, null);
  assert.equal(unavailable.relational_participation_status, 'unavailable');
});

test('Swarm prompt keeps measurement separate from interpretation and Crossing assertion', () => {
  const telemetry = saddleNodeSample({ x: 0.01, mu: 0, t: 1 });
  const prompt = buildSwarmFoldPrompt(telemetry);
  assert.match(prompt, /Heimdall Foldwatch telemetry/);
  assert.match(prompt, /Separate measured geometry from interpretation/);
  assert.match(prompt, /Do not promote a fold candidate to a Crossing without continuation evidence/);
});

test('live PREMAQC adapter reads only dynamic axes and leaves Qualia outside the fit', () => {
  const snapshot = {
    observation: {
      observed_at: '2026-09-08T20:00:00Z',
      world_id: 'terra-aeterna',
      premaqc: {
        state: {
          P: { value: 0.8 }, C: { value: 0.7 }, R: { value: 0.6 }, E: { value: 0.5 }, M: { value: 0.4 }, A: { value: 0.3 },
          Q: { value: 0.99 },
        },
        qualia: { present: true, inferred: false },
      },
    },
  };
  const state = extractPremaqcState(snapshot);
  assert.deepEqual(state.vector, [0.8, 0.7, 0.6, 0.5, 0.4, 0.3]);
  assert.equal(state.qualia_present, true);
  assert.equal(state.vector.length, 6);
});

test('empirical local-flow Jacobian can be estimated from a sufficient PREMAQC sequence', () => {
  const samples = Array.from({ length: 10 }, (_, index) => {
    const t = index;
    return {
      complete: true,
      observed_at: new Date(Date.UTC(2026, 8, 8, 20, 0, t)).toISOString(),
      vector: [
        0.2 + 0.02 * t,
        0.3 + 0.01 * t,
        0.4 - 0.015 * t,
        0.5 + 0.005 * t,
        0.6 - 0.01 * t,
        0.7 + 0.012 * t,
      ],
    };
  });
  const jacobian = estimateFlowJacobian(samples);
  assert.equal(jacobian.length, 6);
  assert.ok(jacobian.every((row) => row.length === 6 && row.every(Number.isFinite)));
});

test('live Foldwatch prefers a source-carried Jacobian and keeps pU open without U', () => {
  const snapshot = {
    observation: {
      observed_at: '2026-09-08T20:00:00Z',
      premaqc: { state: { P:.8,C:.7,R:.6,E:.5,M:.4,A:.3 } },
      jacobian: [
        [1,0,0,0,0,0],[0,1,0,0,0,0],[0,0,.02,0,0,0],
        [0,0,0,1,0,0],[0,0,0,0,1,0],[0,0,0,0,0,1],
      ],
    },
  };
  const live = buildLiveFoldTelemetry({ snapshot });
  assert.equal(live.status, 'ready');
  assert.equal(live.source, 'broker-jacobian');
  assert.equal(live.telemetry.relational_participation, null);
  assert.equal(live.authority.relational_participation, 'unavailable-without-U-coordinate');
});

test('role swarm assigns independent specialist roles before synthesis', async () => {
  assert.deepEqual(HEIMDALL_ROLE_SWARM.map((role) => role.role), ['geometry', 'continuation', 'provenance']);
  const snapshot = {
    observation: {
      observed_at: '2026-09-08T20:00:00Z',
      premaqc: { state: { P:.8,C:.7,R:.6,E:.5,M:.4,A:.3 } },
      jacobian: [
        [1,0,0,0,0,0],[0,1,0,0,0,0],[0,0,.02,0,0,0],
        [0,0,0,1,0,0],[0,0,0,0,1,0],[0,0,0,0,0,1],
      ],
    },
  };
  const live = buildLiveFoldTelemetry({ snapshot });
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    return { ok: true, json: async () => ({ message: `report ${calls.length}`, provider: 'test', model: 'test-model' }) };
  };
  const swarm = await runFoldwatchRoleSwarm({ live, snapshot, token: 'test-token', fetchImpl });
  assert.equal(swarm.specialists.length, 3);
  assert.equal(swarm.synthesis.role, 'synthesis');
  assert.equal(calls.length, 4);
  assert.match(calls[3].body.message, /Prior specialist reports/);
  assert.equal(swarm.authority.disagreement_preserved, true);
});
