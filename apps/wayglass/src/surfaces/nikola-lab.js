import { mechanicsFixture, recordEvidence, revokeEvidence, evidenceReadout, amplitudeReadout, contextForModel } from '../nikola-research.js';

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
  const actions = [
    ['nikola-back', 'click', () => globalThis.__wayglassOS?.mount('arcsweep:writing-room')],
    ['nikola-add', 'click', () => { if (!added) { packet = recordEvidence(packet, { id: 'synthetic-k-reading', source_id: 'synthetic-k-measure', likelihoods: [0.9, 0.1] }); added = true; } render(); }],
    ['nikola-revoke', 'click', () => { if (added) packet = revokeEvidence(packet, 'synthetic-k-reading'); render(); }],
    ['nikola-reset', 'click', () => { packet = mechanicsFixture(); added = false; el('nikola-angle-input').value = '0'; el('nikola-dephasing-input').value = '0'; render(); }],
    ['nikola-angle-input', 'input', render], ['nikola-dephasing-input', 'input', render],
  ];
  actions.forEach(([id, event, fn]) => el(id).addEventListener(event, fn));
  render();
  return () => { actions.forEach(([id, event, fn]) => el(id)?.removeEventListener(event, fn)); root.replaceChildren(); };
}
