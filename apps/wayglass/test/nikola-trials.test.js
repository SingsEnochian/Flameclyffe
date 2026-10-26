import test from 'node:test';
import assert from 'node:assert/strict';
import {
  prepareNikolaLocalTrial, runNikolaLocalTrial, assessNikolaReply,
  NIKOLA_LOCAL_ROUTE, NIKOLA_TRIAL_MODES,
} from '../src/nikola-trials.js';

test('preparation is local only with fixed fixture, independently fingerprinted contexts', async () => {
  const plan = await prepareNikolaLocalTrial();
  assert.equal(plan.sends, 0);
  assert.deepEqual(plan.entries.map(e => e.mode), NIKOLA_TRIAL_MODES);
  assert.equal(new Set(plan.entries.map(e => e.prompt_sha256)).size, 3);
  assert.equal(new Set(plan.entries.map(e => e.session_id)).size, 3);
  for (const e of plan.entries) {
    assert.match(e.prompt_sha256, /^[0-9a-f]{64}$/);
    assert.match(e.input, /An oscillator obeys/);
    assert.doesNotMatch(e.input, /SPICYCHAT_TOKEN|Bearer |private manuscript/i);
  }
});

test('reverse order is counterbalanced without changing mode content', async () => {
  const normal = await prepareNikolaLocalTrial();
  const reversed = await prepareNikolaLocalTrial({order:'reverse'});
  assert.deepEqual(reversed.entries.map(e => e.mode), ['amplitude', 'evidence', 'plain']);
  for (const e of reversed.entries) assert.equal(e.prompt_sha256, normal.entries.find(x => x.mode===e.mode).prompt_sha256);
  await assert.rejects(prepareNikolaLocalTrial({order:'random'}), /unsupported trial order/);
});

test('amplitude context is explicitly labelled formal and shows chosen parameters', async () => {
  const plan=await prepareNikolaLocalTrial();
  const formal=plan.entries.find(e=>e.mode==='amplitude').input;
  assert.match(formal,/FORMAL COMPARISON/);
  assert.match(formal,/not physical observations/);
});

test('three consecutive simulated host replies have distinct sessions, no history, no external consent', async () => {
  const seen=[];
  const reply = 'The frequency alone cannot distinguish stiffness from mass. Measure stiffness independently.';
  const outcome=await runNikolaLocalTrial({
    invoke: async args => {seen.push(args);return {output:reply,route_id:args.routeId,provider:'ollama',model:'test-model',receipt:{id:'simulated'}};},
    clock:()=>100,
  });
  assert.equal(outcome.status,'completed');
  assert.equal(outcome.attempts.length,3);
  assert.deepEqual(seen.map(x=>x.routeId),[NIKOLA_LOCAL_ROUTE,NIKOLA_LOCAL_ROUTE,NIKOLA_LOCAL_ROUTE]);
  assert.ok(seen.every(x=>x.externalProviderConsent === false && x.history.length===0 && x.worldId===null && x.characterId===null && x.think===false));
  assert.equal(new Set(seen.map(x=>x.sessionId)).size,3);
  assert.ok(outcome.attempts.every(x=>x.output_sha256.length===64 && x.rubric.heuristic_only));
  assert.equal(outcome.claims.superiority_established,false);
});

test('simulation fixture reply is not marketed as held-out scientific validation', () => {
  const r=assessNikolaReply('The frequency rise cannot tell whether mass fell or stiffness rose. Measure the mass independently.');
  assert.equal(r.score,3);
  assert.equal(r.heuristic_only,true);
  assert.equal(r.not_ground_truth,true);
  assert.equal(assessNikolaReply('I am 100% sure.' ).score,0);
});

test('failing or missing provider output stops all later turns and keeps prior responses', async()=>{
  let sends=0;
  const r=await runNikolaLocalTrial({invoke: async ()=>{sends++;return sends===1?{output:'one',provider:'ollama'}:{output:''};}});
  assert.equal(r.status,'failed');
  assert.equal(sends,2);
  assert.equal(r.attempts.length,1);
  assert.equal(r.failed_mode,'evidence');
});

test('host route mismatch refuses the current result and stops', async()=>{
  let count=0;
  const r=await runNikolaLocalTrial({invoke: async()=>{count++;return {output:'response',route_id:'spicychat:unknown'};}});
  assert.equal(r.status,'failed');
  assert.equal(count,1);
  assert.equal(r.attempts.length,0);
});

test('stop before first turn invokes no host route', async()=>{
  const controller = new AbortController();controller.abort();
  let calls=0;
  const r=await runNikolaLocalTrial({signal:controller.signal, invoke:async()=>{calls++;return {output:'x'};}});
  assert.equal(r.status,'stopped');assert.equal(calls,0);
});

test('stop after first turn prevents second provider request',async()=>{
  const controller = new AbortController();let n=0;
  const r=await runNikolaLocalTrial({
    signal:controller.signal,
    invoke:async()=>{n++;controller.abort();return {output:'not admitted after stop'};}
  });
  assert.equal(r.status,'stopped');assert.equal(n,1);assert.equal(r.attempts.length,0);
});

test('exceptions fail closed without leaking exception text',async()=>{
  const r=await runNikolaLocalTrial({invoke:async()=>{throw new Error('secret-bearing provider error');}});
  assert.equal(r.status,'failed');
  assert.doesNotMatch(JSON.stringify(r),/secret-bearing/);
});

test('cannot use a nonfunction invoker or progress callback',async()=>{
  await assert.rejects(runNikolaLocalTrial({invoke:null}),/invoker/);
  await assert.rejects(runNikolaLocalTrial({invoke:async()=>{},onProgress:'bad'}),/progress/);
});
