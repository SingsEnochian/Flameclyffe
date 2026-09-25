'use strict';

(function loadMobiusEngineeringConsole(){
  const root=document.querySelector('[data-mobius-lab]');
  if(!root||window.MobiusEngineeringConsole||document.querySelector('script[data-mobius-engineering-loader]')) return;
  const script=document.createElement('script');
  script.src='../assets/mobius-engineering-console.js?v=0.1.0';
  script.defer=true;
  script.dataset.mobiusEngineeringLoader='true';
  document.head.appendChild(script);
})();

(async function(){
  const live=window.ObservatoryLive;
  const root=document.querySelector('[data-mobius-lab]');
  if(!root) return;
  const grid=root.querySelector('.grid');
  if(!live){
    const card=document.createElement('article');
    card.className='card';
    card.dataset.panel='observatory';
    card.innerHTML='<p class="eyebrow" style="margin-bottom:.35rem">Context plane</p><h2>Live Observatory coupling</h2><p id="observatory-audio-status">Canonical Observatory client is unavailable. The audio engine remains local and usable; no projected context has been applied.</p><p class="tiny">Signal and context stay separate by design. Missing Observatory data does not silently alter the bus.</p>';
    grid?.prepend(card);
    return;
  }
  const card=document.createElement('article');
  card.className='card';
  card.dataset.panel='observatory';
  card.innerHTML='<p class="eyebrow" style="margin-bottom:.35rem">Context plane</p><h2>Live Observatory coupling</h2><p id="observatory-audio-status">Connecting to canonical audio and Temporal Twist data…</p><div class="stack"><label>Resonance preset<select id="live-resonance-preset"></select></label><label>Temporal horizon<select id="live-temporal-horizon"></select></label></div><pre id="live-observatory-receipt">{}</pre><p class="tiny">Context only: audio records are canonical/projected according to their live contract. Temporal horizons remain projected scenarios, not measurements, and do not touch the audible signal unless an explicit mapper is active.</p>';
  grid.prepend(card);
  const status=card.querySelector('#observatory-audio-status');
  const presetSelect=card.querySelector('#live-resonance-preset');
  const horizonSelect=card.querySelector('#live-temporal-horizon');
  const receipt=card.querySelector('#live-observatory-receipt');
  try{
    const [presetsResult,tonesResult,temporalResult]=await Promise.all([
      live.read('audio.resonance_presets'),
      live.read('flameclyffe.tones'),
      live.read('temporal.progression')
    ]);
    const presets=presetsResult.data||[];
    const tones=tonesResult.data||[];
    const horizons=temporalResult.data||[];
    for(const p of presets){const o=document.createElement('option');o.value=p.id;o.textContent=p.name||p.slug||'Unnamed preset';presetSelect.appendChild(o);}
    for(const h of horizons){const o=document.createElement('option');o.value=h.year;o.textContent=`${h.year} · ${h.label}`;horizonSelect.appendChild(o);}
    function selected(){
      const preset=presets.find(p=>String(p.id)===presetSelect.value)||presets[0]||null;
      const horizon=horizons.find(h=>String(h.year)===horizonSelect.value)||horizons[0]||null;
      const config={preset,horizon,tones,contracts:{preset:presetsResult.contract,tones:tonesResult.contract,temporal:temporalResult.contract},classification:{audio:presetsResult.contract.classification,temporal:temporalResult.contract.classification},updated_at:new Date().toISOString()};
      window.mobiusObservatoryConfig=config;
      receipt.textContent=JSON.stringify(config,null,2);
      window.dispatchEvent(new CustomEvent('mobius-observatory:config',{detail:config}));
    }
    presetSelect.addEventListener('change',selected);
    horizonSelect.addEventListener('change',selected);
    status.textContent=`Live Observatory · ${presets.length} presets · ${tones.length} tones · ${horizons.length} projected horizons`;
    selected();
  }catch(error){
    status.textContent=`Live context unavailable · ${error.message}`;
    receipt.textContent=JSON.stringify({error:error.message,fallback:false,signalPlane:'unchanged'},null,2);
  }
})();