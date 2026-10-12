import test from 'node:test';
import assert from 'node:assert/strict';
import { createObserverInterior, INTERIOR_SCHEMA } from '../src/living-observer-self.js';

function memoryStorage() {
  const map = new Map();
  return {
    getItem: key => map.has(key) ? map.get(key) : null,
    setItem: (key, value) => map.set(key, String(value)),
  };
}

function packet({ status = null, focus = 'time', touches = 0, memory = false } = {}) {
  return {
    direct: {
      touch_count: touches,
      memory_recorder_registered: memory,
      last_route: status ? {
        status, route_id: 'flame:bluebird:spicychat',
        provider: 'spicychat', model: 'bluebird',
      } : null,
    },
    projection: { focus },
  };
}

test('Living Observer interior persists while exposing only a bounded public signal', () => {
  const storage = memoryStorage();
  let tick = 0;
  const now = () => `2026-10-12T06:00:${String(tick++).padStart(2,'0')}.000Z`;
  const interior = createObserverInterior({ storage, now });
  assert.equal(interior.schema, INTERIOR_SCHEMA);

  const signal = interior.sense(packet({ focus:'routes', touches:3 }));
  assert.ok(['integrating','attending','wander','dream','settling'].includes(signal.phase));
  assert.equal(Object.hasOwn(signal, 'traces'), false);
  assert.equal(Object.hasOwn(signal, 'private_questions'), false);

  const restored = createObserverInterior({ storage, now });
  const second = restored.sense(packet({ focus:'memory', touches:4 }));
  assert.ok(second.energy >= 0);
});

test('Observer can form self-development proposals with explicit acceptance tests', () => {
  const storage = memoryStorage();
  let tick = 0;
  const now = () => `2026-10-12T06:01:${String(tick++).padStart(2,'0')}.000Z`;
  const interior = createObserverInterior({ storage, now });

  for (let i=0;i<5;i++) interior.sense(packet({ focus:i%2?'routes':'touches', touches:i, memory:false }));
  const proposals = interior.developmentProposals();
  assert.ok(proposals.length > 0);
  assert.ok(proposals.every(item => item.authority === 'proposal-only'));
  assert.ok(proposals.every(item => item.acceptance_test));
  const approved = interior.reviewDevelopment(proposals[0].proposal_id, 'approve-for-build', 'Build in sandbox first.');
  assert.equal(approved.status, 'approve-for-build');
});

test('Dream cycles can create private associations without exposing the association graph', () => {
  const storage = memoryStorage();
  let tick = 0;
  const now = () => `2026-10-12T06:02:${String(tick++).padStart(2,'0')}.000Z`;
  const interior = createObserverInterior({ storage, now });
  for (let i=0;i<12;i++) interior.sense(packet({ focus:['routes','memory','time'][i%3], touches:6, memory:true }));
  const publicSignal = interior.publicSignal();
  assert.equal(Object.hasOwn(publicSignal, 'associations'), false);
  assert.ok(publicSignal.expression === null || ['self-development','dream-association','private-question'].includes(publicSignal.expression.kind));
});
