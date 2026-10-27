import { mechanicsFixture, recordEvidence, revokeEvidence, evidenceReadout, amplitudeReadout, contextForModel } from '../nikola-research.js';
import { mountQuantumConsole } from '../quantum-sim.js';
import { runNikolaLocalTrial, NIKOLA_LOCAL_ROUTE } from '../nikola-trials.js';
import { invokeWayglassRoute, listWayglassRoutes } from '../route-client.js';

/** Deliberately browser-local. No model requests, credentials, recording, or persistence. */
export async function mountNikolaResearchSurface(root) {
  let packet = mechanicsFixture();
  root.innerHTML = `<section class="wg-surface" data-surface="nikola-lab">
    <nav class="wg-deck-nav glass-panel" aria-label="Wayglass rooms"><button type="button" class="glass-chip" id="nikola-back">Writing Room</button><span class="glass-chip active" aria-current="page">Nikola Research</span></nav>
    <header class="wg-surface-head glass-panel"><div><p class="eyebrow">WAYGLASS · NIKOLA OBSERVATORY · N-003</p><h1>Inquiry Packet Laboratory</h1><p class="lede">Discover the structure. Retain the alternatives. Test the explanation. Entirely local and ephemeral.</p></div></header>
    <section class="glass-panel" style="padding:1.4rem;display:grid;gap:1rem" aria-label="Research instrument">
      <p><strong>Research question:</strong> An oscillator obeys f ∝ √(k/m). Its frequency rises. Does that observation distinguish stiffness from mass?</p>
      <p id="nikola-sources">Only synthetic teaching observations. No private material, no provider calls, no canon writes.</p>
      <div style="display:flex;gap:.8rem;flex-wrap:wrap"><button type="button" class="glass-chip" id="nikola-add">Introduce synthetic stiffness measurement</button><button type="button" class="glass-chip" id="nikola-revoke">Revoke that observation</button><button type="button" class="glass-chip" id="nikola-reset">Reset</button></div>
      <label>Context rotation (chosen, not inferred) <output id="nikola-angle">0°</output> <input type="range" id="nikola-angle-input" min="0" max="90" value="0" step="1" /></label>
      <label>Simulated dephasing <output id="nikola-dephasing">0%</output> <input type="range" id="nikola-dephasing-input" min="0" max="100" value="0" step="5" /></label>
      <div role="status" aria-live="polite" id="nikola-readout" style="white-space:pre-wrap"></div>
      <details><summary>View model-ready context (no invocation)</summary><pre id="nikola-context" style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:18rem;overflow:auto"></pre></details>
      <section class="glass-panel" aria-label="Nikola upward spiral instrument" style="padding:1rem;display:grid;gap:.7rem">
        <h2>N-006 · Compression → Release → Next Compression 🌀</h2>
        <p>Pure, deterministic calculations on public synthetic inputs. Frequency alone leaves infinitely many compatible combinations. Admit one independent measurement and inspect the renewed inference and replay receipt.</p>
        <div style="display:flex;gap:.6rem;flex-wrap:wrap">
          <button type="button" class="glass-chip" id="nikola-spiral-start">Compress synthetic frequency</button>
          <button type="button" class="glass-chip" id="nikola-spiral-advance" disabled>Release independent measurement</button>
          <button type="button" class="glass-chip" id="nikola-spiral-echo" disabled>Test duplicate-origin echo</button>
          <button type="button" class="glass-chip" id="nikola-spiral-reset">Reset spiral</button>
        </div>
        <p role="status" aria-live="polite" id="nikola-spiral-status">No cycle recorded. No inference sent to a model.</p>
        <pre id="nikola-spiral-readout" style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:23rem;overflow:auto">Compression awaits an explicit click.</pre>
        <p class="tiny">Distinct from PREMAQC computational probabilities: this oscillator is a dimensional physics example. Replayed hashes validate calculation integrity, not sensor authenticity, consciousness, canon or physical Fold.</p>
      </section>
      <section class="glass-panel" aria-label="Nikola 27-turn compression release challenge" style="padding:1rem;display:grid;gap:.7rem">
        <h2>N-007 · UPWARD × 27 🌀</h2>
        <p>Three arcs × nine explicitly bounded turns. Public synthetic evidence only. Every transition is replayed and fingerprinted. A contradiction remains a contradiction.</p>
        <div style="display:flex;flex-wrap:wrap;gap:.6rem">
          <button type="button" class="glass-chip" id="nikola-27-run">Run 27 synthetic turns</button>
          <button type="button" class="glass-chip" id="nikola-27-stop" disabled>Feather · Stop 27-cycle run</button>
          <button type="button" class="glass-chip" id="nikola-27-reset">Clear trial display</button>
        </div>
        <p role="status" aria-live="polite" id="nikola-27-status">27-cycle experiment not invoked. No model or network calls.</p>
        <details><summary>Inspect all replayed turn receipts</summary><pre id="nikola-27-receipts" style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:24rem;overflow:auto">No synthetic results yet.</pre></details>
        <p class="tiny">27 recorded computational steps do not certify 27 empirical discoveries. Independent source families are caller-declared; hashes prove computational integrity, not external sensor authenticity.</p>
      </section>
      <section class="glass-panel" aria-label="Nikola local model trial" style="padding:1rem;display:grid;gap:.7rem">
        <h2>N-004 · Local model comparison</h2>
        <p>Only a public synthetic mechanics problem. Three separate fresh turns through the existing Wayglass host, with no automatic external fallback. This does not train model weights.</p>
        <label for="nikola-trial-order">Context order
          <select id="nikola-trial-order"><option value="forward">Plain → Evidence → Amplitude</option><option value="reverse">Amplitude → Evidence → Plain</option></select>
        </label>
        <div style="display:flex;flex-wrap:wrap;gap:.7rem">
          <button type="button" class="glass-chip" id="nikola-trial-run">Run 3-turn local Ollama trial</button>
          <button type="button" class="glass-chip" id="nikola-trial-stop" disabled>Feather · Stop trial</button>
        </div>
        <p id="nikola-trial-status" role="status" aria-live="polite">Not invoked. Nothing has been sent.</p>
        <details><summary>Trial answers and frozen fingerprints</summary><pre id="nikola-trial-results" style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:22rem;overflow:auto">No trial results.</pre></details>
        <p class="tiny">The rubric is a simple text heuristic, not held-out scientific validation. A host response does not independently attest the model's identity. All results are ephemeral.</p>
      </section>
      <p class="tiny">Bayesian values depend on declared synthetic likelihoods. Amplitude results are formal, not physical quantum measurements or assertions about consciousness. Nikola's research seat has no additional authority.</p>
    </section></section>`;
  const disposeQuantum=mountQuantumConsole(root);
  const el = (id) => root.querySelector(`#${id}`);
  const set = (id, content) => { el(id).textContent = content; };
  let added = false;
  const render = () => {
    const angleDegrees = Number(el('nikola-angle-input').value);
    const dephasingPercent = Number(el('nikola-dephasing-input').value);
    const evidence = evidenceReadout(packet);
    const amplitude = amplitudeReadout(packet, { angle: angleDegrees * Math.PI / 180, dephasing: dephasingPercent / 100 });
    set('nikola-angle', `${angleDegrees}°`);
    set('nikola-dephasing', `${dephasingPercent}%`);
    const pct = (value) => value === null ? 'undetermined' : value.map((n) => `${(n * 100).toFixed(1)}%`).join(' / ');
    set('nikola-readout', `Classical posterior H_k / H_m: ${pct(evidence.probability)}\nFormal amplitude readout H_k / H_m: ${pct(amplitude.probability)}\nAdmitted evidence: ${evidence.included.join(', ') || 'none'}\nExcluded evidence: ${evidence.excluded.map((v) => `${v.id} (${v.reason})`).join(', ') || 'none'}`);
    set('nikola-context', contextForModel(packet, { mode: 'evidence' }).text);
    set('nikola-sources', 'All observations are synthetic fixtures. Stiffness measurement ' + (added ? 'introduced' : 'not introduced') + '. No LLM or external connection.');
  };
  // N-006 loads the canonical Math Spine companion only when its own
  // explicit research button is invoked. It does not change N-003 packet state.
  let spiral = null;
  let spiralBusy = false;
  let spiralModule = null;
  let spiralMeasurementCount = 0;
  const n6 = id => el('nikola-spiral-'+id);
  const showSpiral = (label, data) => {
    n6('status').textContent = label;
    n6('readout').textContent = typeof data === 'string' ? data : JSON.stringify(data,null,2);
    n6('advance').disabled = !spiral || spiralBusy;
    n6('echo').disabled = !spiral || spiralBusy;
  };
  const spiralActions = [];
  async function mutateSpiral(action) {
    if (spiralBusy || disposed) return;
    spiralBusy = true;
    n6('advance').disabled = true;
    n6('echo').disabled = true;
    n6('start').disabled = true;
    n6('status').textContent = 'Replaying the mathematical instrument…';
    try {
      spiralModule ??= await import('../../../starwell/src/math-spine/nikola-upward-spiral.js');
      if (disposed) return;
      if (action === 'start') {
        spiral = await spiralModule.createNikolaSpiral({
          baseline:{stiffness:12,stiffness_unit:'N/m',mass:3,mass_unit:'kg'},
          frequencyRatio:1.5,
          source:{id:'synthetic-frequency',family:'synthetic-frequency-family',kind:'synthetic'}
        });
        spiralMeasurementCount = 0;
      } else {
        if (!spiral) throw new Error('Compress the observation first.');
        const index = spiralMeasurementCount;
        const echo = action === 'echo';
        const echoFamily = index === 0
          ? 'synthetic-frequency-family'
          : 'synthetic-measurement-family-' + (index - 1);
        if (!echo) spiralMeasurementCount += 1;
        spiral = await spiralModule.advanceNikolaSpiral(spiral,{
          measurement:{kind:'stiffness',value:24,unit:'N/m'},
          source: echo
            ? {id:'synthetic-k-echo-'+spiral.rounds.length,family:echoFamily,kind:'synthetic'}
            : {id:'synthetic-k-independent-'+index,family:'synthetic-measurement-family-'+index,kind:'synthetic'}
        });
      }
      const replay = await spiralModule.replayNikolaSpiral(spiral);
      if (disposed) return;
      showSpiral('Compression/release replay verified. '+spiral.rounds.length+' bounded rounds; all source evidence is synthetic.',
        {replay,latest_receipt:spiral.rounds.at(-1)||null,next_operation:'compression-of-release'});
    } catch (error) {
      if (!disposed) showSpiral('Spiral held: '+error.message, 'No new externally verified observation.');
    } finally {
      spiralBusy = false;
      if (!disposed) {
        n6('start').disabled = false;
        n6('advance').disabled = !spiral || spiral.rounds.length >= 27;
        n6('echo').disabled = !spiral || spiral.rounds.length >= 27;
      }
    }
  }
  function clearSpiral() {
    spiral=null;
    spiralMeasurementCount=0;
    n6('status').textContent='Spiral reset. No evidence retained or sent.';
    n6('readout').textContent='Compression awaits an explicit click.';
    n6('advance').disabled=true;n6('echo').disabled=true;
  }
  for (const [name,handler] of [
    ['start',()=>void mutateSpiral('start')],
    ['advance',()=>void mutateSpiral('advance')],
    ['echo',()=>void mutateSpiral('echo')],
    ['reset',clearSpiral],
  ]) {
    n6(name).addEventListener('click',handler);
    spiralActions.push([name,handler]);
  }

  // N-007 is a deliberately bounded local stress protocol over the N-006
  // deterministic Math Spine instrument. It never invokes a language model.
  let run27Controller = null;
  let run27Busy = false;
  let run27Version = 0;
  const r27 = name => el('nikola-27-'+name);
  async function start27() {
    if (run27Busy || disposed) return;
    const version=++run27Version;
    run27Busy=true;
    const controller=new AbortController();
    run27Controller=controller;
    r27('run').disabled=true;r27('stop').disabled=false;
    r27('status').textContent='Verifying the fixed three-arc scientific protocol…';
    r27('receipts').textContent='Preparing the synthetic spiral.';
    try {
      const {runNikola27}=await import('../../../starwell/src/math-spine/nikola-spiral-27.js');
      if(controller.signal.aborted || disposed || version!==run27Version) return;
      const outcome=await runNikola27({
        signal:controller.signal,
        onStep: mark => {
          if(disposed || version!==run27Version) return;
          r27('status').textContent='Cycle '+mark.cycle+'/27 · '+mark.arc+
            ' · '+mark.status+' · replay verified';
        },
      });
      if(disposed || version!==run27Version) return;
      r27('status').textContent=outcome.status==='completed'
        ? '27/27 replayed. '+outcome.admitted+' admitted, '+outcome.held+
          ' shared-origin echoes held. Contradictions '+(outcome.conflicts_present?'preserved':'not observed')+'.'
        : 'Feather stop after '+outcome.completed+
          ' verified turns. Partial computational receipts preserved in this display.';
      r27('receipts').textContent=JSON.stringify({
        schema:outcome.schema,status:outcome.status,completed:outcome.completed,
        phase:outcome.phase,admitted:outcome.admitted,held:outcome.held,
        conflicts_present:outcome.conflicts_present,
        epistemic_state:outcome.epistemic_state,
        head_sha256:outcome.final_head_sha256,
        next_question:outcome.next_question,
        final_projection:outcome.state.projection,
        turns:outcome.timeline,
      },null,2);
    } catch(error) {
      if(!disposed && version===run27Version)
        r27('status').textContent='27-cycle experiment failed validation. No successful run claimed: '+error.message;
    } finally {
      if(version===run27Version) {
        run27Busy=false;run27Controller=null;
        if(!disposed){r27('run').disabled=false;r27('stop').disabled=true;}
      }
    }
  }
  function stop27(){
    run27Controller?.abort();
    r27('status').textContent='Feather stop requested. Any completed turns remain replay-checkable.';
  }
  function clear27(){
    ++run27Version;run27Controller?.abort();run27Controller=null;run27Busy=false;
    r27('status').textContent='Trial display cleared; no synthetic receipts persisted.';
    r27('receipts').textContent='No synthetic results yet.';
    r27('run').disabled=false;r27('stop').disabled=true;
  }
  const events27=[['run',start27],['stop',stop27],['reset',clear27]];
  events27.forEach(([name,handler])=>r27(name).addEventListener('click',handler));

  let trialController = null;
  let trialRunning = false;
  let disposed = false;
  const trialStatus = el('nikola-trial-status');
  const trialRun = el('nikola-trial-run');
  const trialStop = el('nikola-trial-stop');
  async function runLocalTrial() {
    if (trialRunning || disposed) return;
    trialRunning = true;
    trialController = new AbortController();
    const signal = trialController.signal;
    trialRun.disabled = true;
    trialStop.disabled = false;
    el('nikola-trial-results').textContent = 'No completed trial yet.';
    trialStatus.textContent = 'Verifying that Wayglass exposes a configured local Ollama route…';
    try {
      const catalogue = await listWayglassRoutes();
      if (signal.aborted || disposed) return;
      const permitted = (catalogue.routes || []).some(route =>
        route.route_id === NIKOLA_LOCAL_ROUTE && route.configured !== false && route.capabilities?.local === true);
      if (!permitted) {
        trialStatus.textContent = 'Held: local Ollama route not explicitly configured and marked local. No model turns sent.';
        return;
      }
      trialStatus.textContent = 'Local route declared ready. Starting three independent synthetic turns…';
      const outcome = await runNikolaLocalTrial({
        order: el('nikola-trial-order').value,
        signal,
        // This existing host interface carries any actual inference. The trial adds no new provider.
        invoke: args => invokeWayglassRoute({
          ...args, fetchImpl: (url, options) => fetch(url, { ...options, signal }),
        }),
        onProgress: state => { if (!disposed) trialStatus.textContent =
          'Received '+state.finished+' of '+state.total+' synthetic route responses ('+state.mode+').'; },
      });
      if (disposed) return;
      trialStatus.textContent = outcome.status === 'completed'
        ? 'Three host responses returned. Compare results; provider identity is self-reported, not attested.'
        : outcome.status === 'stopped'
          ? 'Feather stop: no further trial requests.'
          : 'Trial held at '+outcome.failed_mode+'. No fallback route used.';
      // Only synthetic fixture model answers; do not persist to a browser store or Supabase.
      el('nikola-trial-results').textContent = JSON.stringify(outcome, null, 2);
    } catch {
      if (!disposed) trialStatus.textContent = signal.aborted
        ? 'Feather stop acknowledged.' : 'Local route preflight failed. No external route selected.';
    } finally {
      trialRunning = false;
      trialController = null;
      if (!disposed) { trialRun.disabled = false; trialStop.disabled = true; }
    }
  }
  const stopTrial = () => { trialController?.abort(); trialStatus.textContent = 'Feather stop: browser request aborted; server-side model cancellation is not yet verified.'; };
  trialRun.addEventListener('click', runLocalTrial);
  trialStop.addEventListener('click', stopTrial);

  const actions = [
    ['nikola-back', 'click', () => globalThis.__wayglassOS?.mount('arcsweep:writing-room')],
    ['nikola-add', 'click', () => { if (!added) { packet = recordEvidence(packet, { id: 'synthetic-k-reading', source_id: 'synthetic-k-measure', likelihoods: [0.9, 0.1] }); added = true; } render(); }],
    ['nikola-revoke', 'click', () => { if (added) packet = revokeEvidence(packet, 'synthetic-k-reading'); render(); }],
    ['nikola-reset', 'click', () => { packet = mechanicsFixture(); added = false; el('nikola-angle-input').value = '0'; el('nikola-dephasing-input').value = '0'; render(); }],
    ['nikola-angle-input', 'input', render], ['nikola-dephasing-input', 'input', render],
  ];
  actions.forEach(([id, event, fn]) => el(id).addEventListener(event, fn));
  render();
  return () => { disposeQuantum(); disposed = true; ++run27Version; run27Controller?.abort(); events27.forEach(([name,handler])=>r27(name)?.removeEventListener('click',handler)); spiralActions.forEach(([id,handler])=>n6(id)?.removeEventListener('click',handler)); trialController?.abort(); trialRun.removeEventListener('click', runLocalTrial); trialStop.removeEventListener('click', stopTrial); actions.forEach(([id, event, fn]) => el(id)?.removeEventListener(event, fn)); root.replaceChildren(); };
}
