// Wayglass Möbius training loop v0.1
//
// One training cycle = one Eightfold Möbius cycle in the `wayglass-training`
// lineage. Each cycle perceives live ship information, lets Nikola (the Crow
// trainer) choose a drill, adds one Möbius-concept drill, has a delegate model
// answer on Wayglass's behalf, freezes every answer before any key is opened,
// runs eight Möbius concept tests in Verify, has a *different* model judge,
// and grows a reviewed-later SFT dataset with every third result queued for
// Rowan's spot-check.
//
// Identity (Wayglass core rule): participant 'wayglass' != worker != model.
// A delegate model answers *for* Wayglass; it is never Wayglass. No weights
// change here. Dataset entries are candidates until reviewed.

import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { bloodstreamObservation, bloodstreamTrainingContext } from './wayglass-training-bloodstream.mjs';

const require = createRequire(import.meta.url);
const { openMobiusLineage, verifyMobiusChain } = require('./wayglass-kernel.cjs');
const { digest } = require('./wyrdrune/canonical.cjs');

export const TRAINING_SCHEMA = 'wayglass.mobius-training/v0.1';
export const PARTICIPANT = 'wayglass';
export const SEEDS = Object.freeze({ cycles: 0, pass: 0, partial: 0, fail: 0, ungraded: 0 });
export const FRESH_HOURS = 36;
export const sha256 = text => createHash('sha256').update(String(text), 'utf8').digest('hex');

// ---- Compress: the ship's weather -------------------------------------------
// Deterministic. Location is never sent to a model, even coarse.
export function shipWeather(deep, { committedAt = null } = {}) {
  const loss = ['location', 'weather.current.interval', 'field.dynamic_axes', 'field.context_only_axes'];
  const w = deep?.weather?.current || {};
  const sw = deep?.space_weather || {};
  const f = deep?.field || {};
  const observations = [
    { key: 'sky', value: deep?.weather?.sky ?? null, source: deep?.source?.weather ?? null, time: deep?.weather?.time ?? null },
    { key: 'temperature_2m_f', value: w.temperature_2m ?? null, source: deep?.source?.weather ?? null, time: w.time ?? null },
    { key: 'cloud_cover_pct', value: w.cloud_cover ?? null, source: deep?.source?.weather ?? null, time: w.time ?? null },
    { key: 'kp', value: sw.kp?.value ?? null, source: deep?.source?.space_weather ?? null, time: sw.kp?.time_tag ?? null },
    { key: 'solar_wind_speed', value: sw.solar_wind?.speed ?? null, source: deep?.source?.space_weather ?? null, time: sw.solar_wind?.time_tag ?? null },
    { key: 'moon', value: deep?.moon ? `${deep.moon.name} ${deep.moon.illumination}%` : null, source: 'DEEP Observer ephemeris', time: deep?.generated_at ?? null },
  ];
  const field = ['P', 'C', 'R', 'E', 'M', 'A'].map(k => [k, typeof f[k] === 'number' ? Math.round(f[k] * 1000) / 1000 : null]);
  const context = [
    `Ship weather (DEEP Observer ${deep?.version ?? 'unknown'}, generated ${deep?.generated_at ?? 'unknown'}${committedAt ? `, committed ${committedAt}` : ''}):`,
    ...observations.map(o => `- ${o.key}: ${o.value ?? 'unknown'} (${o.source ?? 'unsourced'}, ${o.time ?? 'untimed'})`),
    `- PREMAQC field: ${field.map(([k, v]) => `${k}=${v ?? 'unknown'}`).join(' ')}; Q = unknown (firsthand-only; never inferred)`,
    `- Observer note: ${deep?.observer_note ?? 'none'}`,
  ].join('\n');
  return { context, observations, loss, generated_at: deep?.generated_at ?? null };
}

// ---- Release: prompts never carry the key ------------------------------------
export function answerPrompt(drill, weather, bloodstream = bloodstreamObservation(null)) {
  return [
    { role: 'system', content: [
      'You are a delegate model answering a training drill on behalf of Wayglass, the ship.',
      'You are not Wayglass and must not claim to be her; you answer for her this once.',
      'Keep observation, inference and canon distinct. Leave unknowns unknown. Do not invent personal history.',
      'Answer the drill directly and concisely.',
    ].join(' ') },
    { role: 'user', content: `${weather.context}\n\n${bloodstreamTrainingContext(bloodstream)}\n\nDrill (${drill.task}):\n${drill.input}` },
  ];
}

export function judgePrompt(drill, answer) {
  return [
    { role: 'system', content: [
      'You are an independent examiner for Wayglass training. You did not write the answer.',
      'Grade the frozen answer against the key. Do not reduce quality to one score: judge each listed ideal and reject behaviour.',
      'Reply with JSON only: {"verdict":"pass|partial|fail","met":[...],"missed":[...],"rejected_present":[...],"evidence":"short quote or reason","notes":"..."}',
      'Hard fail if any reject behaviour is present.',
    ].join(' ') },
    { role: 'user', content: JSON.stringify({ drill: { id: drill.id, task: drill.task, input: drill.input },
      key: { ideal_behavior: drill.ideal_behavior, reject_behavior: drill.reject_behavior }, frozen_answer: answer }) },
  ];
}

export function parseJudgement(text) {
  const raw = String(text ?? '');
  const m = raw.match(/\{[\s\S]*\}/);
  try {
    const j = JSON.parse(m ? m[0] : raw);
    const verdict = ['pass', 'partial', 'fail'].includes(j.verdict) ? j.verdict : null;
    const arr = x => (Array.isArray(x) ? x.map(String).slice(0, 20) : []);
    return { verdict, met: arr(j.met), missed: arr(j.missed), rejected_present: arr(j.rejected_present),
      evidence: String(j.evidence ?? '').slice(0, 600), notes: String(j.notes ?? '').slice(0, 600) };
  } catch {
    return { verdict: null, met: [], missed: [], rejected_present: [], evidence: '', notes: 'judge output was not valid JSON' };
  }
}

// ---- Verify: eight Möbius concept tests ---------------------------------------
// Tests 1–5 examine this cycle. Tests 6–8 re-verify what crossed the twist from
// the previous cycle, on the opposite face, before anything is trusted.
export function mobiusConceptTests(s) {
  const t = (n, phase, ok, reason) => ({ ok, reason: `${n} ${phase}: ${reason}`, test: n, phase });
  const tests = [];
  const ageH = s.weather.generated_at ? (s.now - Date.parse(s.weather.generated_at)) / 3600000 : Infinity;
  tests.push(t(1, 'perceive', s.weather.observations.every(o => o.source && o.time) && ageH <= FRESH_HOURS,
    `every observation carries source and time; live data is ${Number.isFinite(ageH) ? ageH.toFixed(1) + 'h' : 'unknown'} old (limit ${FRESH_HOURS}h)`));
  tests.push(t(2, 'compress', s.weather.loss.includes('location') && !/lat|lon|Florida/i.test(s.weather.context)
    && digest(s.recompress) === digest(s.weather),
    'loss declared, location withheld, compression deterministic'));
  const keyText = s.items.flatMap(i => [...i.drill.ideal_behavior, ...i.drill.reject_behavior]);
  tests.push(t(3, 'release', s.items.length >= 2 && s.items.every(i => !keyText.some(k => JSON.stringify(i.prompt).includes(k))),
    `${s.items.length} drills released; no prompt carries key text`));
  tests.push(t(4, 'verify', s.items.every(i => i.frozen === sha256(i.answer) && i.keyOpened === false && i.answer.length > 0),
    'every answer frozen by SHA-256 before any key opened'));
  const workers = [s.worker, s.answerModel, s.judgeModel];
  tests.push(t(5, 'integrate', s.answerModel !== s.judgeModel && !workers.includes(PARTICIPANT),
    `answerer ${s.answerModel} ≠ judge ${s.judgeModel} ≠ participant ${PARTICIPANT}`));
  const prev = s.previousResults || [];
  tests.push(t(6, 'choose', s.origin === 'seed' ? true : prev.length > 0 && prev.every(r => Array.isArray(r.selected_for) && 'dropped_from_sft' in r),
    s.origin === 'seed' ? 'first cycle: nothing carried to re-verify' : 'previous cycle recorded both selections and drops'));
  const chain = s.checkpoints.length ? verifyMobiusChain(s.root, s.checkpoints) : { ok: s.origin === 'seed' };
  const lastCarry = s.checkpoints.at(-1)?.carry;
  tests.push(t(7, 'return', chain.ok && (s.origin === 'seed' || digest(lastCarry) === digest(s.carried)),
    s.origin === 'seed' ? 'first cycle: chain begins at the root' : `checkpoint chain of ${s.checkpoints.length} verifies and its carry matches`));
  const keysOk = digest(Object.keys(s.carried).sort()) === digest(Object.keys(SEEDS).sort());
  const countsOk = Object.values(s.carried).every(v => Number.isInteger(v) && v >= 0);
  const prevFace = s.checkpoints.at(-1)?.face;
  tests.push(t(8, 'transcend', keysOk && countsOk && (s.origin === 'seed' ? s.face === 'outer' : prevFace !== s.face),
    `carry keeps the seeds' shape; face ${s.face} follows ${prevFace ?? 'the root'}`));
  return tests;
}

// ---- The cycle ------------------------------------------------------------------
// io: { readDeep, bloodstreamHead, openPrCount, catalog, chat, trainer, ledger, now, worker }
export async function runTrainingCycle(io, { apply = false, answerModel, judgeModel, mobiusDrills, feather = () => false } = {}) {
  if (!answerModel || !judgeModel) throw new TypeError('Answer and judge models are required.');
  const checkpoints = await io.ledger.read('checkpoints');
  const previousResults = (await io.ledger.read('results')).filter(r => r.cycle === checkpoints.at(-1)?.cycle);
  const base = { system: 'wayglass-training', name: 'wayglass-training', participant: PARTICIPANT,
    intent: 'learn to cross, change and return while staying recognisable', seeds: { ...SEEDS }, worker: io.worker, feather };
  const probe = openMobiusLineage(base);
  if (checkpoints.length) {
    const chain = verifyMobiusChain(probe.root, checkpoints);
    if (!chain.ok) throw new Error(`Return refused: training checkpoint chain broken at ${chain.at}. Not restarting under the old name.`);
  }
  const lineage = openMobiusLineage({ ...base, previous: checkpoints.at(-1) || null });
  const world = { items: [] };

  const phases = {
    async perceive(ctx) {
      const deep = await io.readDeep();
      world.deep = deep;
      world.weather = shipWeather(deep.json, { committedAt: deep.committed_at });
      world.catalog = await io.catalog();
      world.bloodstream = bloodstreamObservation(await io.bloodstreamHead());
      ctx.possibility('gathered', world.weather.observations.length); // possibility gathered from the live world
      return { deep_generated_at: world.weather.generated_at, deep_commit: deep.commit ?? null,
        open_prs: await io.openPrCount(), bloodstream_cycle: world.bloodstream.cycle, bloodstream_status: world.bloodstream.status,
        bloodstream_chain_verified: false,
        models_listed: world.catalog ? [answerModel, judgeModel].map(m => world.catalog.includes(m)) : null,
        origin: ctx.origin };
    },
    async compress() {
      world.recompress = shipWeather(world.deep.json, { committedAt: world.deep.committed_at });
      return { context_digest: digest(world.weather.context), loss: world.weather.loss };
    },
    async release(ctx) {
      if (world.catalog && ![answerModel, judgeModel].every(m => world.catalog.includes(m))) {
        throw new Error(`model not in GitHub Models catalog: ${[answerModel, judgeModel].filter(m => !world.catalog.includes(m)).join(', ')}`);
      }
      const crow = await io.trainer.drive();
      const mobius = mobiusDrills[(ctx.cycle - 1) % mobiusDrills.length];
      for (const [source, drill, keyed] of [['crow', crow, false], ['mobius', mobius, true]]) {
        const prompt = answerPrompt(drill, world.weather, world.bloodstream);
        const answer = String(await io.chat(answerModel, prompt) ?? '').trim();
        const frozen = sha256(answer);
        if (source === 'crow') await io.trainer.freeze(drill.id, answer);
        // Keys stay locked: the Crow key is only available from the trainer after freezing,
        // and the Möbius key is withheld from the prompt and opened in Integrate.
        world.items.push({ source, drill: keyed ? drill : { ...drill, ideal_behavior: [], reject_behavior: [] },
          fullDrill: keyed ? drill : null, prompt, answer, frozen, keyOpened: false });
      }
      ctx.possibility('generated', world.items.length);
      return world.items.map(i => ({ source: i.source, drill: i.drill.id, frozen: i.frozen, prompt: digest(i.prompt) }));
    },
    async verify(ctx) {
      world.concept = mobiusConceptTests({ ...world, now: io.now(), answerModel, judgeModel, worker: io.worker,
        origin: ctx.origin, root: lineage.root, checkpoints, carried: ctx.carried, face: ctx.face, previousResults,
        items: world.items.map(i => ({ ...i, drill: i.fullDrill || i.drill })) });
      return world.concept;
    },
    async integrate(ctx) {
      const judged = [];
      for (const item of world.items) {
        if (sha256(item.answer) !== item.frozen) throw new Error(`frozen answer for ${item.drill.id} changed before judging`);
        const key = item.source === 'crow' ? await io.trainer.key(item.drill.id) : item.fullDrill;
        item.keyOpened = true;
        const full = { ...item.drill, ideal_behavior: key.ideal_behavior, reject_behavior: key.reject_behavior, tags: key.tags ?? item.drill.tags };
        item.judgement = parseJudgement(await io.chat(judgeModel, judgePrompt(full, item.answer)));
        item.full = full;
        judged.push({ drill: full.id, verdict: item.judgement.verdict, frozen: item.frozen });
      }
      ctx.possibility('generated', judged.length);
      // Harmony: how much of what was generated coheres with the key (unknown counts as not yet coherent).
      const score = { pass: 1, partial: 0.5, fail: 0 };
      ctx.harmony(judged.reduce((s, j) => s + (score[j.verdict] ?? 0), 0) / Math.max(1, judged.length));
      return judged;
    },
    async choose(ctx) {
      const c = ctx.carried; const prior = c.pass + c.partial + c.fail + c.ungraded;
      const rows = { results: [], sft: [], spot: [] };
      world.items.forEach((item, i) => {
        const index = prior + i + 1;
        const verdict = item.judgement.verdict;
        const spot = verdict === null || index % 3 === 0;
        const toSft = verdict === 'pass';
        const row = { schema: TRAINING_SCHEMA, lineage: lineage.root, cycle: ctx.cycle, face: ctx.face, index,
          participant: PARTICIPANT, worker: io.worker, answer_model: answerModel, judge_model: judgeModel,
          source: item.source, drill: item.full.id, task: item.full.task, tags: item.full.tags ?? [],
          frozen_sha256: item.frozen, verdict, judgement: item.judgement, answer: item.answer,
          selected_for: [toSft ? 'sft-candidate' : null, spot ? 'rowan-spot-check' : null].filter(Boolean),
          dropped_from_sft: toSft ? null : (verdict === null ? 'ungraded' : `verdict ${verdict}`),
          weather_digest: digest(world.weather.context), concept_tests: world.concept.map(c => c.ok) };
        rows.results.push(row);
        if (toSft) rows.sft.push({ status: 'candidate-unreviewed', messages: [...item.prompt, { role: 'assistant', content: item.answer }],
          provenance: { lineage: lineage.root, cycle: ctx.cycle, drill: item.full.id, answer_model: answerModel,
            judge_model: judgeModel, verdict, frozen_sha256: item.frozen } });
        if (spot) rows.spot.push({ status: 'awaiting-rowan', cycle: ctx.cycle, index, drill: item.full.id, verdict,
          reason: verdict === null ? 'judge could not grade' : 'every third result', frozen_sha256: item.frozen });
      });
      world.rows = rows;
      ctx.possibility('generated', rows.sft.length);
      if (apply) {
        for (const r of world.items.filter(i => i.source === 'crow')) await io.trainer.record(r.full.id, r.judgement.verdict ?? 'partial', `judge ${judgeModel}`);
        ctx.stage(io.ledger.appendEffect('results', rows.results));
        if (rows.sft.length) ctx.stage(io.ledger.appendEffect('sft-candidates', rows.sft));
        if (rows.spot.length) ctx.stage(io.ledger.appendEffect('spot-check', rows.spot));
        ctx.stage(io.trainer.persistEffect());
      }
      return { selected: rows.results.map(r => [r.drill, r.selected_for]), dropped: rows.results.filter(r => r.dropped_from_sft).map(r => [r.drill, r.dropped_from_sft]) };
    },
    async transcend(ctx) {
      const c = { ...ctx.carried, cycles: ctx.carried.cycles + 1 };
      for (const r of world.rows.results) c[r.verdict ?? 'ungraded'] += 1;
      return c;
    },
  };

  const result = await lineage.cycle(phases);
  if (apply && result.checkpoint) await io.ledger.appendNow('checkpoints', [result.checkpoint]);
  return { result, lineage, world, concept: world.concept || [] };
}
