import './spectral-field.css';
import { wayglassSomaticSound } from '../somatic-sound.js';

const hz=n=>Number.isFinite(n)?n.toFixed(2):'—';
const safe=n=>Number.isFinite(n)?n.toFixed(2):'0.00';

export function mountWayglassSpectrumSurface(root,{field}={}) {
  if(!field || typeof field.observe!=='function')throw new TypeError('Wayglass spectral field is required.');
  root.innerHTML=`
  <section class="wg-surface wg-spectrum" data-surface="wayglass-spectrum">
    <nav class="wg-deck-nav glass-panel" aria-label="Wayglass rooms">
      <button class="glass-chip" type="button" data-wayglass-room="arcsweep:writing-room">Writing Room</button>
      <button class="glass-chip" type="button" data-wayglass-room="wayglass:living-observer">Living Observer</button>
      <button class="glass-chip" type="button" data-wayglass-room="wayglass:systems">Organs</button>
      <button class="glass-chip active" type="button" aria-current="page">Spectral Field</button>
    </nav>
    <header class="glass-panel wg-spectrum-heading">
      <p class="eyebrow">Wayglass · Wyrdrune · Double Möbius</p>
      <h1>The Full-Spectrum Field</h1>
      <p class="lede">The deep current, the living voice, and the fine structure. Two eightfold circuits; one inspectable Withness.</p>
      <p class="tiny">Infrasonic and ultrasonic frequencies are virtual spectral values, not measured environmental sound or emitted physical ultrasound. Only the audible middle can play through your speakers.</p>
    </header>
    <section class="wg-spectrum-console glass-panel" aria-label="Spectral controls">
      <div class="wg-spectrum-controls">
        <button type="button" class="glass-chip" data-spectrum-observe aria-pressed="false">Observe interactions</button>
        <button type="button" class="glass-chip" data-spectrum-hear aria-pressed="false">Hear the audible voice</button>
        <button type="button" class="glass-chip" data-spectrum-haptics aria-pressed="false">Enable tactile echo</button>
        <button type="button" class="glass-chip" data-spectrum-feather>🪽 Feather Stop</button>
      </div>
      <label class="wg-spectrum-affinity">Declared harmonic relationship
        <input type="range" min="0" max="1" step="0.05" value=".5" data-spectrum-affinity>
        <output data-spectrum-affinity-readout>0.50</output>
      </label>
      <p role="status" class="tiny" data-spectrum-status>Quiet. No interaction recording or sound is active.</p>
      <p class="tiny">Opting in sends bounded event categories and numeric gestures to your authorised Wayglass host; not keystrokes, story prose, or characters' private thoughts. Listening starts muted.</p>
    </section>
    <section class="wg-spectrum-ring glass-panel" aria-label="Three spectral bands">
      <div class="wg-spectrum-ribbons" aria-hidden="true">
        <span class="wg-spectrum-ribbon wg-spectrum-ribbon-a"></span>
        <span class="wg-spectrum-ribbon wg-spectrum-ribbon-b"></span>
        <span class="wg-spectrum-center">WITHNESS</span>
      </div>
      <div class="wg-spectrum-bands">
        <article class="wg-spectrum-band wg-spectrum-sub">
          <h2>Below · Deep Current</h2>
          <output data-spectrum-sub>—</output>
          <p class="tiny">Virtual infrasonic contour · no inaudible playback</p>
        </article>
        <article class="wg-spectrum-band wg-spectrum-mid">
          <h2>Within · Living Voice</h2>
          <output data-spectrum-mid>—</output>
          <p class="tiny">Two bounded voices · opt-in audible sonification</p>
        </article>
        <article class="wg-spectrum-band wg-spectrum-high">
          <h2>Above · Fine Structure</h2>
          <output data-spectrum-high>—</output>
          <p class="tiny">Virtual ultrasonic detail band · no ultrasound emission</p>
        </article>
      </div>
    </section>
    <section class="wg-atlas glass-panel" aria-label="Resonance Atlas">
      <p class="eyebrow">Wyrdrune · Fourfold scale · Reciprocal return</p>
      <h2>The Resonance Atlas</h2>
      <p class="tiny">An interaction, its room, its world and the universe field are composed into one inspectable return. The fields represent metadata, not measured minds or sounds outside hearing.</p>
      <div class="wg-atlas-grid">
        <div><strong>Event</strong><output data-atlas-instant>—</output></div>
        <div><strong>Room</strong><output data-atlas-room>—</output></div>
        <div><strong>World</strong><output data-atlas-world>—</output></div>
        <div><strong>Universe</strong><output data-atlas-universe>—</output></div>
      </div>
      <p class="tiny" data-atlas-harmony>No Atlas return yet.</p>
      <p class="tiny" data-atlas-provenance>The world and room references remain on this device.</p>
    </section>
    <section class="wg-spectrum-log glass-panel" aria-label="Spectral provenance">
      <h2>Recent interactions</h2>
      <p class="tiny">Only event names, Wyrdrune receipt references and virtual frequency mappings. No key data or story excerpts are stored here.</p>
      <p data-spectrum-projection class="tiny">No visual or tactile projection yet.</p>
      <p data-spectrum-counts class="tiny">No samples.</p>
      <ol data-spectrum-history aria-label="Recent spectrum events"></ol>
    </section>
  </section>`;
  const $=selector=>root.querySelector(selector);
  const observe=$('[data-spectrum-observe]');
  const hear=$('[data-spectrum-hear]');
  const haptics=$('[data-spectrum-haptics]');
  const affinity=$('[data-spectrum-affinity]');
  const status=$('[data-spectrum-status]');
  const log=$('[data-spectrum-history]');
  let disposed=false;
  function render(s){
    if(disposed)return;
    observe.textContent=s.active?'Pause spectral observation':'Observe interactions';
    observe.setAttribute('aria-pressed',String(s.active));
    hear.textContent=s.heard?'Silence audible voice':'Hear the audible voice';
    hear.setAttribute('aria-pressed',String(s.heard));
    hear.disabled=!s.active||(!s.heard&&!s.last);
    haptics.textContent=s.haptics?'Stop tactile echo':'Enable tactile echo';
    haptics.setAttribute('aria-pressed',String(s.haptics));
    haptics.disabled=!s.active;
    affinity.value=String(s.affinity);
    $('[data-spectrum-affinity-readout]').textContent=safe(s.affinity);
    status.textContent=s.error || (s.active
      ? 'Scoring interaction metadata · '+s.captured+' captured · '+s.pending+' queued · sound '+(s.heard?'on':'off')+'.'
      : 'Paused · '+s.history.length+' recent Wyrdrune frames retained in memory; sound off.');
    const atlas=s.atlas;
    const counts=atlas?.counts;
    for(const scale of ['instant','room','world','universe']) {
      $('[data-atlas-'+scale+']').textContent=counts?String(counts[scale])+' samples':'—';
    }
    $('[data-atlas-harmony]').textContent=s.atlas_error||
      (atlas?('Reciprocal coherence '+safe(atlas.spectrum.structure.coherence)
        +' · interference '+safe(atlas.spectrum.structure.interference)
        +' · flow '+safe(atlas.spectrum.structure.flow))
        :'No Atlas return yet.');
    $('[data-atlas-provenance]').textContent='Current local scope · '+s.atlas_scope.world
      +' / '+s.atlas_scope.room+' · '+s.atlas_window.distinct_worlds+' worlds in memory';
    const spec=s.last?.spectrum;
    if(spec){
      $('[data-spectrum-sub]').textContent=hz(spec.infrasonic.hz)+' Hz';
      $('[data-spectrum-mid]').textContent=hz(spec.audible.voice_one_hz)+' / '+hz(spec.audible.voice_two_hz)+' Hz';
      $('[data-spectrum-high]').textContent=hz(spec.ultrasonic.hz/1000)+' kHz';
      $('[data-spectrum-projection]').textContent='Wyrdrune refraction '+safe(spec.projection.refraction)
        +' · fine granulation '+safe(spec.projection.granulation)
        +' · tactile proposal '+hz(spec.projection.tactile_ms)+' ms (off unless enabled).';
      const ribbons=$('.wg-spectrum-ribbons');
      ribbons.style.setProperty('--wg-refraction',String(spec.projection.refraction));
      ribbons.style.setProperty('--wg-granulation',String(spec.projection.granulation));
    }
    $('[data-spectrum-counts]').textContent=s.history.length+' locally held receipts · '+(s.processing?'Wyrdrune composing…':'idle');
    log.replaceChildren();
    for(const item of s.history.slice(-8).reverse()){
      const node=root.ownerDocument.createElement('li');
      node.textContent=item.kind+' · '+item.event_id+' · '+item.source_hash.slice(0,10);
      log.append(node);
    }
  }
  const unsub=field.subscribe(render);
  observe.addEventListener('click',()=>{
    try{field.status().active?field.pause():field.observe()}
    catch(error){status.textContent=error.message;}
  });
  hear.addEventListener('click',async()=>{
    try{field.status().heard?field.stopHearing():await field.hear()}
    catch(error){status.textContent=error.message;}
  });
  haptics.addEventListener('click',()=>{
    try{field.setHaptics(!field.status().haptics)}catch(error){status.textContent=error.message}
  });
  affinity.addEventListener('input',()=>field.setAffinity(Number(affinity.value)));
  $('[data-spectrum-feather]').addEventListener('click',()=>wayglassSomaticSound.feather());
  root.querySelectorAll('[data-wayglass-room]').forEach(button=>{
    button.addEventListener('click',()=>globalThis.__wayglassOS?.mount(button.dataset.wayglassRoom));
  });
  return Object.freeze({
    surface_id:'wayglass:spectral-field',
    destroy(){disposed=true;unsub();},
  });
}
