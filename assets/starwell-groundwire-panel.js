'use strict';

(function injectGroundwirePanel() {
  function install() {
    const root = document.querySelector('[data-mobius-lab]');
    const grid = root?.querySelector('.grid');
    if (!root || !grid || root.querySelector('[data-groundwire-panel]')) return;

    root.dataset.groundwireLab = 'true';

    const panel = document.createElement('article');
    panel.className = 'card';
    panel.dataset.groundwirePanel = 'true';
    panel.innerHTML = `
      <h2>Groundwire</h2>
      <p>Real browser and device signals. Location and microphone remain permission-gated. These readings may constrain or gently respond inside a declared patch, but they never start audio.</p>
      <div class="controls">
        <button class="primary" data-action="request-location" type="button">Request location</button>
        <button data-action="request-location-high" type="button">High accuracy</button>
        <button class="primary" data-action="start-mic" type="button">Start microphone meter</button>
        <button class="feather" data-action="stop-mic" type="button">Stop meter</button>
      </div>
      <p class="status" id="groundwire-status" role="status" aria-live="polite">Groundwire loading. Permissions remain untouched.</p>
      <div class="row">
        <section><h3>Location</h3><div class="stack" id="location-fields"></div></section>
        <section><h3>Network</h3><div class="stack" id="network-fields"></div></section>
      </div>
      <div class="row">
        <section><h3>Hardware</h3><div class="stack" id="hardware-fields"></div></section>
        <section><h3>Battery</h3><div class="stack" id="battery-fields"></div></section>
      </div>
      <h3>Microphone witness</h3>
      <label>Input level <span class="meter"><span id="mic-meter"></span></span></label>
      <div class="stack" id="mic-fields"></div>
      <h3>Groundwire snapshot</h3>
      <pre id="groundwire-state">{}</pre>
      <p class="tiny">Location is provenance only. Battery and hardware may lower engine demand. Network affects external transport only. Microphone responsiveness is opt-in per patch.</p>
    `;

    grid.prepend(panel);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
