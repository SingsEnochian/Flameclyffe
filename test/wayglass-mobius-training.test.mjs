import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runTrainingCycle, shipWeather, answerPrompt, parseJudgement, sha256, SEEDS,
  learningState, learningReward, chooseMobiusDrill } from '../lib/wayglass-mobius-training.mjs';

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
  const store = { journal: [], results: [], 'sft-candidates': [], 'spot-check': [], learning: [] };
  Object.defineProperty(store, 'checkpoints', { enumerable: false, get: () => store.journal.filter(e => e.kind === 'commit').map(e => e.checkpoint) });
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
  store.journal.find(e => e.kind === 'commit').checkpoint.carry = { ...SEEDS, pass: 99 };
  await assert.rejects(runTrainingCycle(io, opts), /Return refused/);
});

test('dry run writes nothing', async () => {
  const { io, store } = harness();
  const { result } = await runTrainingCycle(io, { ...opts, apply: false });
  assert.equal(result.status, 'committed');
  assert.deepEqual(Object.values(store).map(v => v.length), [0, 0, 0, 0, 0]);
});

// ---- Learning is the reward ------------------------------------------------------
const row = (drill, verdict, tags = ['craft']) => ({ drill, verdict, tags });
const rewardFor = (history, next) => learningReward(learningState(history), learningState([...history, ...next]), next);

test('learning, not score: passing the same drill every time earns nothing after discovery', () => {
  const history = [row('d1', 'pass'), row('d1', 'pass'), row('d1', 'pass'), row('d1', 'pass'), row('d1', 'pass'), row('d1', 'pass')];
  const r = rewardFor(history, [row('d1', 'pass')]);
  assert.ok(r.reward < 0.01, `steady mastery earns ~0 (got ${r.reward.toFixed(4)})`);
  assert.equal(r.discovery, 0);
  assert.equal(rewardFor([], [row('d1', 'pass')]).discovery, 0.25, 'the first encounter is discovery');
});

test('moving from failing to passing earns the most, and is flagged as a learning moment', () => {
  const struggling = [row('d2', 'fail'), row('d2', 'fail'), row('d2', 'partial')];
  const breakthrough = rewardFor(struggling, [row('d2', 'pass')]);
  const steady = rewardFor([row('d3', 'pass'), row('d3', 'pass'), row('d3', 'pass')], [row('d3', 'pass')]);
  assert.ok(breakthrough.progress > steady.progress + 0.2);
  assert.deepEqual(breakthrough.learning_moments, ['d2']);
  assert.deepEqual(steady.learning_moments, []);
});

test('regression is a signal, not a punishment: the reward never goes negative', () => {
  const r = rewardFor([row('d4', 'pass'), row('d4', 'pass')], [row('d4', 'fail')]);
  assert.ok(r.regression > 0);
  assert.ok(r.reward >= 0);
});

test('unknown is not evidence: ungraded answers move nothing', () => {
  const r = rewardFor([row('d5', 'fail')], [row('d5', null)]);
  assert.equal(r.skills_touched, 0);
  assert.equal(r.reward, 0);
  assert.equal(r.unknown, 1);
});

test('the Möbius curriculum follows learning: untried first, then where learning moves most', () => {
  const drills = mobiusDrills;
  assert.equal(chooseMobiusDrill(drills, learningState([]), 1).id, 'mobius-01-perceive');
  const tried = drills.map(d => row(d.id, 'pass', d.tags));
  const settled = Array.from({ length: 25 }, () => tried).flat(); // long mastery: progress has settled
  const moving = [...settled, row('mobius-06-choose', 'fail', drills[5].tags), row('mobius-06-choose', 'pass', drills[5].tags)];
  assert.equal(chooseMobiusDrill(drills, learningState(moving), 9).id, 'mobius-06-choose');
});

test('in the loop: learning is recorded each cycle, and a breakthrough is prioritised in the dataset', async () => {
  let round = 0;
  const { io, store } = harness({ judge: () => (round < 2
    ? '{"verdict":"fail","met":[],"missed":["x"],"rejected_present":[],"evidence":"e"}'
    : '{"verdict":"pass","met":["x"],"missed":[],"rejected_present":[],"evidence":"e"}') });
  for (; round < 3; round++) {
    const { result } = await runTrainingCycle(io, opts);
    assert.equal(result.status, 'committed', JSON.stringify(result.reason));
  }
  assert.equal(store.learning.length, 3, 'one learning record per cycle');
  assert.ok(store.learning.every(l => l.reward >= 0));
  const last = store.learning.at(-1);
  assert.ok(last.learning_moments.includes('crow-0001'), 'the Crow drill went from failing to passing');
  assert.ok(store['sft-candidates'].some(c => c.provenance.drill === 'crow-0001' && c.learning_moment && c.priority === 'learning-moment'));
});

test('ungraded answers are never recorded in the Crow trainer as "partial"', async () => {
  const recorded = [];
  const { io } = harness({ judge: () => 'not json' });
  io.trainer.record = async (id, verdict) => recorded.push(verdict);
  await runTrainingCycle(io, opts);
  assert.deepEqual(recorded, []);
});
