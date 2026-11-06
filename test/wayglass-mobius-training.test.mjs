import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runTrainingCycle, shipWeather, answerPrompt, parseJudgement, sha256, SEEDS,
  learningState, learningReward, chooseMobiusDrill, curriculumChoice, verifyFrozenEvaluation, transferSignal, evaluationDue,
  LEARNING } from '../lib/wayglass-mobius-training.mjs';

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
  const store = { journal: [], results: [], 'sft-candidates': [], 'spot-check': [], learning: [], evaluation: [] };
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
  const { result } = await runTrainingCycle(io, { ...opts, apply: false, evaluation });
  assert.equal(result.status, 'committed');
  assert.ok(Object.values(store).every(v => v.length === 0), 'no ledger, including evaluation, is written');
});

// ---- Learning is the reward ------------------------------------------------------
const row = (drill, verdict, tags = ['craft'], cycle) => ({ drill, verdict, tags, cycle });
const rewardFor = (history, next) => learningReward(learningState(history), learningState([...history, ...next]), next);
const steps = (verdicts, drill = 'd') => verdicts.map((v, i) => rewardFor(verdicts.slice(0, i).map(x => row(drill, x)), [row(drill, verdicts[i])]));

test('competence starts unknown: first sight is exploration, not learning', () => {
  const r = rewardFor([], [row('d1', 'pass')]);
  assert.equal(r.exploration, LEARNING.discovery);
  assert.equal(r.demonstrated_learning, 0);
  assert.deepEqual(r.establishing, ['craft']);
  assert.equal(r.per_skill.craft.competence, null, 'no competence is claimed before a baseline exists');
  assert.equal(r.per_skill.craft.status, 'establishing');
});

test('sustained success from the first observation is never mistaken for improvement', () => {
  const all = steps(Array(12).fill('pass'));
  assert.equal(all.reduce((a, r) => a + r.demonstrated_learning, 0), 0);
  assert.equal(all.slice(1).reduce((a, r) => a + r.reward, 0), 0, 'only the first sight earns anything');
  const s = learningState(Array(12).fill(0).map(() => row('d1', 'pass')));
  assert.equal(s.tags['tag:craft'].baseline, 1);
  assert.equal(s.tags['tag:craft'].status, 'mastered');
});

test('change is measured only after a baseline is established from evidence', () => {
  const early = steps(['fail', 'pass']); // improving, but still establishing
  assert.equal(early[1].demonstrated_learning, 0);
  assert.deepEqual(early[1].learning_moments, []);
  const later = steps(['fail', 'fail', 'fail', 'pass']);
  assert.ok(later[3].demonstrated_learning > 0.4, 'a rise from an established baseline is learning');
  assert.deepEqual(later[3].learning_moments, ['d']);
  assert.equal(later[3].exploration, 0, 'exploration and demonstrated learning stay separate fields');
});

test('regression is a signal, not a punishment: the reward never goes negative', () => {
  const r = steps(['pass', 'pass', 'pass', 'fail'])[3];
  assert.ok(r.regression > 0);
  assert.equal(r.reward, 0);
});

test('unknown is not evidence: ungraded answers move nothing', () => {
  const r = rewardFor([row('d5', 'fail')], [row('d5', null)]);
  assert.equal(r.skills_touched, 0);
  assert.equal(r.reward, 0);
  assert.equal(r.unknown, 1);
});

test('curriculum: untried first, and no priority change without enough evidence', () => {
  const drills = mobiusDrills;
  assert.deepEqual(curriculumChoice(drills, learningState([]), 1), { drill: drills[0], reason: 'explore' });
  const base = drills.flatMap(d => [1, 2, 3].map(() => row(d.id, 'pass', d.tags)));
  // A dramatic-looking swing on only two observations is not confident movement.
  const thin = [...base.filter(r => r.drill !== 'mobius-06-choose'), row('mobius-06-choose', 'fail', drills[5].tags), row('mobius-06-choose', 'pass', drills[5].tags)];
  assert.deepEqual(curriculumChoice(drills, learningState(thin), 9), { drill: drills[5], reason: 'establish-baseline' });
  // On an established baseline, movement is confident and the curriculum follows it.
  const moving = [...base, row('mobius-06-choose', 'fail', drills[5].tags), row('mobius-06-choose', 'pass', drills[5].tags)];
  assert.deepEqual(curriculumChoice(drills, learningState(moving), 9), { drill: drills[5], reason: 'learning-moving' });
  assert.equal(chooseMobiusDrill(drills, learningState(moving), 9).id, 'mobius-06-choose');
});

test('curriculum: mastered skills are rechecked so regressions stay observable', () => {
  const drills = mobiusDrills;
  const hist = drills.flatMap(d => [1, 2, 3].map(c => row(d.id, 'pass', d.tags, c)));
  for (let c = 4; c <= 10; c++) for (const d of drills.slice(1)) hist.push(row(d.id, 'pass', d.tags, c));
  hist.push(row('mobius-06-choose', 'fail', drills[5].tags, 10), row('mobius-06-choose', 'pass', drills[5].tags, 10));
  const state = learningState(hist);
  assert.equal(state.drills['drill:mobius-01-perceive'].status, 'mastered');
  assert.deepEqual(curriculumChoice(drills, state, 11), { drill: drills[0], reason: 'recheck-mastered' },
    'unseen mastery is rechecked ahead of live movement');
  assert.equal(curriculumChoice(drills, state, 5).reason, 'learning-moving', 'not yet due: movement leads');
});

// ---- Frozen evaluation ------------------------------------------------------------
const evalText = readFileSync(new URL('../training/wayglass/MOBIUS_EVAL_FROZEN.jsonl', import.meta.url), 'utf8');
const evalManifest = JSON.parse(readFileSync(new URL('../training/wayglass/MOBIUS_EVAL_FROZEN.manifest.json', import.meta.url), 'utf8'));
const evaluation = { text: evalText, manifest: evalManifest };
const evalIds = evalText.split('\n').filter(Boolean).map(l => JSON.parse(l).id);

test('the frozen evaluation set is digest-pinned, keyed, and disjoint from the training drills', () => {
  const ok = verifyFrozenEvaluation(evaluation, mobiusDrills);
  assert.equal(ok.ok, true, ok.reason);
  assert.equal(ok.tasks.length, 4);
  assert.match(verifyFrozenEvaluation({ text: evalText.replace('512', '513'), manifest: evalManifest }, mobiusDrills).reason, /changed/);
  assert.match(verifyFrozenEvaluation({ text: evalText }, mobiusDrills).reason, /missing/);
  const leakedDrill = { ...mobiusDrills[0], id: evalIds[0] };
  assert.match(verifyFrozenEvaluation(evaluation, [...mobiusDrills, leakedDrill]).reason, /overlap/);
  assert.deepEqual([1, 2, 3, 4, 5, 9].map(evaluationDue), [true, false, false, false, true, true]);
});

const isEvalPrompt = messages => /512 km\/s|status badge|runner timed out|earlier commitments/.test(JSON.stringify(messages));
const PASS = '{"verdict":"pass","met":["x"],"missed":[],"rejected_present":[],"evidence":"e"}';
const FAIL = '{"verdict":"fail","met":[],"missed":["x"],"rejected_present":[],"evidence":"e"}';

test('in the loop: the frozen evaluation runs on schedule, in its own ledger, and feeds nothing the learner optimises', async () => {
  let cycle = 1; // training improves after two cycles; the held-out tasks never do
  const trainingJudge = () => (cycle <= 2 ? FAIL : PASS);
  const { io, store } = harness({ judge: m => (isEvalPrompt(m) ? FAIL : trainingJudge()) });
  const plain = harness({ judge: trainingJudge });
  for (; cycle <= 5; cycle++) {
    const { result } = await runTrainingCycle(io, { ...opts, evaluation });
    const twin = await runTrainingCycle(plain.io, opts);
    assert.equal(result.status, 'committed', JSON.stringify(result.reason));
    assert.deepEqual(result.checkpoint.spiral, twin.result.checkpoint.spiral, `cycle ${cycle}: the spiral cannot see the evaluation`);
  }
  assert.deepEqual(store.evaluation.map(e => [e.cycle, e.status, e.score]), [[1, 'ran', 0], [5, 'ran', 0]]);
  assert.equal(store.evaluation[0].set_digest, evalManifest.sha256);
  const seen = JSON.stringify([store.results.map(r => r.drill), store['sft-candidates'], store.learning, store['spot-check']]);
  for (const id of evalIds) assert.ok(!seen.includes(id), `${id} leaked into training`);
  assert.ok(!seen.includes('frozen-eval'));
  assert.ok(store.results.filter(r => r.source === 'mobius').every(r => !evalIds.includes(r.drill)));
  assert.equal(store.evaluation[1].transfer.status, 'accustomed-suspected',
    'training competence rose while held-out performance stayed flat');
  assert.ok(store.evaluation[1].gap > 0.5);
});

test('a tampered frozen set refuses the evaluation, records why, and lets training continue', async () => {
  const { io, store } = harness();
  const { result } = await runTrainingCycle(io, { ...opts, evaluation: { text: evalText + '\n{"id":"sneaky"}', manifest: evalManifest } });
  assert.equal(result.status, 'committed');
  assert.equal(store.evaluation.length, 1);
  assert.equal(store.evaluation[0].status, 'refused');
  assert.match(store.evaluation[0].reason, /changed/);
  assert.equal(store.evaluation[0].score, null);
});

test('transfer signal: baseline, transferring, and getting accustomed to the examination', () => {
  assert.equal(transferSignal(null, 0.5, 0.5).status, 'baseline');
  assert.equal(transferSignal({ score: 0.25, training_competence: 0.5 }, 0.75, 0.8).status, 'transferring');
  const accustomed = transferSignal({ score: 0.5, training_competence: 0.5 }, 0.5, 0.9);
  assert.equal(accustomed.status, 'accustomed-suspected');
  assert.equal(accustomed.accustomed_suspected, true);
});

test('in the loop: learning is recorded each cycle, and an established breakthrough is prioritised', async () => {
  let round = 0;
  const { io, store } = harness({ judge: () => (round < 3 ? FAIL : PASS) });
  for (; round < 4; round++) {
    const { result } = await runTrainingCycle(io, opts);
    assert.equal(result.status, 'committed', JSON.stringify(result.reason));
  }
  assert.equal(store.learning.length, 4, 'one learning record per cycle');
  assert.ok(store.learning.every(l => l.reward >= 0 && 'exploration' in l && 'demonstrated_learning' in l));
  assert.ok(store.learning[0].exploration > 0 && store.learning[0].demonstrated_learning === 0);
  const last = store.learning.at(-1);
  assert.ok(last.learning_moments.includes('crow-0001'), 'the Crow drill went from failing to passing on an established baseline');
  assert.ok(last.demonstrated_learning > 0);
  assert.ok(store['sft-candidates'].some(c => c.provenance.drill === 'crow-0001' && c.learning_moment && c.priority === 'learning-moment'));
  assert.ok(store.results.every(r => r.curriculum), 'every result records why it was chosen');
  assert.ok(store.results.filter(r => r.source === 'crow').every(r => r.curriculum === 'nikola'), "Crow's curriculum stays Nikola's");
});

test('ungraded answers are never recorded in the Crow trainer as "partial"', async () => {
  const recorded = [];
  const { io } = harness({ judge: () => 'not json' });
  io.trainer.record = async (id, verdict) => recorded.push(verdict);
  await runTrainingCycle(io, opts);
  assert.deepEqual(recorded, []);
});
