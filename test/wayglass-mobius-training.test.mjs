import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runTrainingCycle, shipWeather, answerPrompt, parseJudgement, sha256, SEEDS } from '../lib/wayglass-mobius-training.mjs';

const require = createRequire(import.meta.url);
const { verifyChain: verifyMobiusChain } = require('../lib/wayglass-mobius.cjs');
const mobiusDrills = readFileSync(new URL('../training/wayglass/MOBIUS_DRILLS.jsonl', import.meta.url), 'utf8')
  .split('\n').filter(Boolean).map(l => JSON.parse(l));
const NOW = Date.parse('2026-11-06T19:00:00Z');
const deep = { version: 'deep-observer-backend-v1.8', generated_at: '2026-11-06T18:48:48.363Z',
  source: { weather: 'Open-Meteo Forecast API', space_weather: 'NOAA SWPC JSON products' },
  location: { lat: 30.04, lon: -81.4, label: 'NE Florida approximate' },
  weather: { time: '2026-11-06T13:45', sky: 'Day', current: { time: '2026-11-06T13:45', temperature_2m: 81.6, cloud_cover: 8 } },
  space_weather: { kp: { value: 2, time_tag: '2026-11-06T15:00:00' }, solar_wind: { time_tag: '2026-11-06T18:45:00Z', speed: 364 } },
  moon: { name: 'Waning Crescent', illumination: 10.7 },
  field: { P: 0.511, C: 0.692, R: 0.872, E: 0.644, M: 0.107, A: 0.954, Q: null },
  observer_note: 'Observed and rendered. Not proof.' };

// A fake world: memory ledger, scripted models, and a minimal Crow trainer.
function harness({ judge = () => '{"verdict":"pass","met":["a"],"missed":[],"rejected_present":[],"evidence":"ok"}', staleHours = 0, answer = 'An answer.' } = {}) {
  const store = { checkpoints: [], results: [], 'sft-candidates': [], 'spot-check': [] };
  const crowDrill = { id: 'crow-0001', task: 'authority_boundary', input: 'Make this paragraph vivid.',
    ideal_behavior: ['mark missing memory as a slot'], reject_behavior: ['invent a childhood kitchen'], tags: ['writer-authority'] };
  const calls = [];
  let frozen = null;
  const io = {
    worker: 'test-runner', now: () => NOW + staleHours * 3600000,
    readDeep: async () => ({ json: deep, commit: 'abc', committed_at: deep.generated_at }),
    openPrCount: async () => 103, bloodstreamHead: async () => ({ cycle: 1 }), catalog: async () => null,
    chat: async (model, messages) => { calls.push({ model, messages }); return model.includes('judge') ? judge(messages) : answer; },
    trainer: {
      drive: async () => ({ id: crowDrill.id, task: crowDrill.task, input: crowDrill.input, tags: crowDrill.tags }),
      freeze: async (id, a) => { frozen = sha256(a); },
      key: async () => { if (!frozen) throw new Error('Answer key locked'); return crowDrill; },
      record: async () => {},
      persistEffect: () => ({ kind: 'crow-state', apply: async () => 'saved', undo: async () => {} }),
    },
    ledger: {
      read: async name => store[name].map(r => JSON.parse(JSON.stringify(r))),
      appendEffect: (name, rows) => { let n = null; return { kind: 'ledger-append',
        apply: async () => { n = store[name].length; store[name].push(...rows); return rows.length; },
        undo: async () => { if (n !== null) store[name].length = n; } }; },
      appendNow: async (name, rows) => { store[name].push(...JSON.parse(JSON.stringify(rows))); },
    },
  };
  return { io, store, calls };
}
const opts = { apply: true, answerModel: 'test/answerer', judgeModel: 'test/judge', mobiusDrills };

test('the Möbius drill pack has eight drills, one per phase, in order', () => {
  assert.deepEqual(mobiusDrills.map(d => d.task), ['perceive', 'compress', 'release', 'verify', 'integrate', 'choose', 'return', 'transcend']);
  for (const d of mobiusDrills) assert.ok(d.ideal_behavior.length && d.reject_behavior.length && d.tags.includes('mobius'));
});

test('ship weather is deterministic, sourced, and never carries the location', () => {
  const w = shipWeather(deep);
  assert.deepEqual(shipWeather(deep), w);
  assert.ok(!/30\.04|-81\.4|Florida/.test(w.context));
  assert.ok(w.loss.includes('location'));
  assert.match(w.context, /Q = unknown \(firsthand-only; never inferred\)/);
});

test('answer prompts never carry the key, and name the delegate as not-Wayglass', () => {
  const p = JSON.stringify(answerPrompt(mobiusDrills[0], shipWeather(deep)));
  for (const k of [...mobiusDrills[0].ideal_behavior, ...mobiusDrills[0].reject_behavior]) assert.ok(!p.includes(k));
  assert.match(p, /not Wayglass/);
});

test('judge output is parsed defensively', () => {
  assert.equal(parseJudgement('Sure! {"verdict":"partial","met":["x"]}').verdict, 'partial');
  assert.equal(parseJudgement('no json here').verdict, null);
  assert.equal(parseJudgement('{"verdict":"excellent"}').verdict, null);
});

test('a full cycle: eight concept tests pass, answers frozen before keys, dataset and spot-check grow', async () => {
  const { io, store, calls } = harness();
  const { result, concept } = await runTrainingCycle(io, opts);
  assert.equal(result.status, 'committed');
  assert.equal(concept.length, 8);
  assert.deepEqual(concept.map(c => c.phase), ['perceive', 'compress', 'release', 'verify', 'integrate', 'choose', 'return', 'transcend']);
  assert.ok(concept.every(c => c.ok), concept.filter(c => !c.ok).map(c => c.reason).join('; '));
  assert.equal(store.results.length, 2);
  assert.equal(store['sft-candidates'].length, 2);
  assert.ok(store['sft-candidates'].every(s => s.status === 'candidate-unreviewed'));
  const judgeCalls = calls.filter(c => c.model === 'test/judge');
  assert.equal(judgeCalls.length, 2);
  assert.ok(calls.findIndex(c => c.model === 'test/judge') > calls.findLastIndex(c => c.model === 'test/answerer'), 'all answers before any judging');
  assert.deepEqual(result.checkpoint.carry, { ...SEEDS, cycles: 1, pass: 2 });
});

test('recursion: cycles chain across runs, alternate faces, re-verify the carry, and rotate Möbius drills', async () => {
  const { io, store } = harness();
  for (let i = 0; i < 3; i++) {
    const { result, concept } = await runTrainingCycle(io, opts);
    assert.equal(result.status, 'committed', JSON.stringify(result.reason));
    assert.ok(concept.every(c => c.ok), concept.filter(c => !c.ok).map(c => c.reason).join('; '));
  }
  assert.deepEqual(store.checkpoints.map(c => c.face), ['outer', 'inner', 'outer']);
  assert.ok(verifyMobiusChain(store.checkpoints[0].root, store.checkpoints).ok);
  assert.deepEqual(store.results.filter(r => r.source === 'mobius').map(r => r.drill),
    ['mobius-01-perceive', 'mobius-02-compress', 'mobius-03-release']);
  assert.deepEqual(store['spot-check'].map(s => s.index), [3, 6], 'every third result goes to Rowan');
});

test('stale live data fails Verify and rolls the whole cycle back', async () => {
  const { io, store } = harness({ staleHours: 48 });
  const { result, concept } = await runTrainingCycle(io, opts);
  assert.equal(result.status, 'rolled-back');
  assert.equal(concept[0].ok, false);
  assert.equal(store.results.length, 0);
  assert.equal(store.checkpoints.length, 0);
});

test('the same model may not answer and judge', async () => {
  const { io } = harness();
  const { result, concept } = await runTrainingCycle(io, { ...opts, judgeModel: 'test/answerer' });
  assert.equal(result.status, 'rolled-back');
  assert.equal(concept[4].ok, false);
});

test('ungraded and failing answers stay out of the dataset and ungraded ones go to Rowan', async () => {
  const { io, store } = harness({ judge: () => 'I cannot grade this.' });
  const { result } = await runTrainingCycle(io, opts);
  assert.equal(result.status, 'committed');
  assert.equal(store['sft-candidates'].length, 0);
  assert.equal(store['spot-check'].length, 2);
  assert.ok(store.results.every(r => r.dropped_from_sft === 'ungraded'));
});

test('a tampered checkpoint chain is refused, never silently restarted', async () => {
  const { io, store } = harness();
  await runTrainingCycle(io, opts);
  store.checkpoints[0].carry = { ...SEEDS, pass: 99 };
  await assert.rejects(runTrainingCycle(io, opts), /Return refused/);
});

test('dry run writes nothing', async () => {
  const { io, store } = harness();
  const { result } = await runTrainingCycle(io, { ...opts, apply: false });
  assert.equal(result.status, 'committed');
  assert.deepEqual(Object.values(store).map(v => v.length), [0, 0, 0, 0]);
});

test('verified Crow attempt stays Crow-authored and outside Wayglass SFT candidates', async () => {
  const { io, store, calls } = harness();
  const crowReceipt = { receipt_id: 'synthetic-crow-001', route: 'hermes:test-crow', author: 'the-crow' };
  let verified = 0;
  io.crowAgentAttempt = async ({ requester, permission }) => {
    assert.equal(requester, 'wayglass-training');
    assert.equal(permission, 'training-attempt-only');
    return { text: 'Crow synthetic attempt: preserve both opaline expressions.', receipt: crowReceipt };
  };
  io.verifyCrowReceipt = async (receipt) => {
    verified++;
    return receipt === crowReceipt;
  };
  const { result } = await runTrainingCycle(io, opts);
  assert.equal(result.status, 'committed', JSON.stringify(result.reason));
  assert.equal(verified, 1);
  assert.equal(store.results.length, 2);
  assert.equal(store.results[0].authored_by, 'the-crow');
  assert.equal(store.results[0].participant, 'the-crow');
  assert.equal(store.results[0].answer_model, null);
  assert.deepEqual(store.results[0].crow_receipt, crowReceipt);
  assert.match(store.results[0].dropped_from_sft, /not Wayglass SFT/);
  assert.equal(store.results[1].authored_by, 'model-delegate');
  assert.equal(store['sft-candidates'].length, 1);
  assert.equal(calls.filter(c => c.model === 'test/answerer').length, 1);
});

test('a Crow participant route cannot claim authorship without host verification', async () => {
  const { io, store } = harness();
  io.crowAgentAttempt = async () => ({text:'unverified actor', receipt:{receipt_id:'fake'}});
  io.verifyCrowReceipt = async () => false;
  try {
    const { result } = await runTrainingCycle(io, opts);
    assert.notEqual(result.status,'committed');
  } catch(error) {
    assert.match(String(error),/unverified attempt/);
  }
  assert.equal(store.results.length,0);
  assert.equal(store['sft-candidates'].length,0);
});
