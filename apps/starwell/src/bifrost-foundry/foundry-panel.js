import { BIFROST_AGENTS } from './agents.js';
import { RELEASE_GATES, createBifrostState } from './contracts.js';

const requiredOrgans = [
  'Kernel & Continuity','Arcsweep','Tone Body','Observer & Reception',
  'Houses & Vestments','Story & Constellation','Platform Body'
];

const state = createBifrostState({
  world:'terra-aeterna',
  place:'hearthgate-bifrost',
  timeline:'present',
  canonContext:{ status:'connected' },
  PREMAQ:{ status:'awaiting-live-feed' },
  agentState:{ agents:BIFROST_AGENTS.map(agent => ({ id:agent.id, status:'READY' })) },
  provenance:{ source:'bifrost-foundry-v0.1', receipts:[] }
});

function render() {
  const host = document.getElementById('bifrost-foundry-root');
  if (!host) return;
  host.innerHTML = `
    <section class="bifrost-foundry" aria-labelledby="bifrost-foundry-title">
      <header>
        <p class="bifrost-kicker">HEARTHGATE : BIFRÖST</p>
        <h2 id="bifrost-foundry-title">Living Assembly Foundry</h2>
        <p>Every feature must mount as an organ: reachable, state-fed, profile-mapped, receipted, tested.</p>
      </header>
      <div class="bifrost-foundry-grid">
        <article>
          <h3>Release gates</h3>
          <ol>${RELEASE_GATES.map((gate, index) => `<li data-state="${index === 0 ? 'active':'locked'}">${gate}</li>`).join('')}</ol>
        </article>
        <article>
          <h3>Required organs</h3>
          <ul>${requiredOrgans.map(organ => `<li><span aria-hidden="true">○</span>${organ}<small>IN PROGRESS</small></li>`).join('')}</ul>
        </article>
        <article>
          <h3>Agent foundry</h3>
          <ul>${BIFROST_AGENTS.map(agent => `<li><strong>${agent.name}</strong><small>READY · ${agent.capabilities.join(' · ')}</small></li>`).join('')}</ul>
        </article>
        <article>
          <h3>Canonical state</h3>
          <dl>
            <div><dt>World</dt><dd>${state.world}</dd></div>
            <div><dt>Place</dt><dd>${state.place}</dd></div>
            <div><dt>Revision</dt><dd>${state.revision}</dd></div>
            <div><dt>Organs</dt><dd>${requiredOrgans.length}</dd></div>
            <div><dt>Agents</dt><dd>${BIFROST_AGENTS.length}</dd></div>
          </dl>
        </article>
      </div>
      <footer>
        <button type="button" data-foundry-action="pause">Pause all</button>
        <button type="button" data-foundry-action="resume">Resume queue</button>
        <output aria-live="polite">Foundry ready. No organ may self-certify.</output>
      </footer>
    </section>`;

  const output = host.querySelector('output');
  host.querySelectorAll('[data-foundry-action]').forEach(button => {
    button.addEventListener('click', () => {
      const action = button.dataset.foundryAction.toUpperCase();
      output.textContent = `${action} requested by Rowan. Receipt queued for conductor.`;
      window.dispatchEvent(new CustomEvent('bifrost:interrupt', { detail:{ action, source:'foundry-panel' } }));
    });
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render, { once:true });
else render();

export { state as initialBifrostState };
