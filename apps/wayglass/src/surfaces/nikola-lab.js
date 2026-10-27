import { mechanicsFixture, recordEvidence, revokeEvidence, evidenceReadout, amplitudeReadout, contextForModel } from '../nikola-research.js';
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
  return () => { disposed = true; trialController?.abort(); trialRun.removeEventListener('click', runLocalTrial); trialStop.removeEventListener('click', stopTrial); actions.forEach(([id, event, fn]) => el(id)?.removeEventListener(event, fn)); root.replaceChildren(); };
}
