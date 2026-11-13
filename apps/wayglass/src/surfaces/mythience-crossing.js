import './mythience-crossing.css';
import {proposeMythienceCrossing,mythienceSnapshot,clearMythience} from '../mythience-client.js';

const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const clamp=v=>Math.max(0,Math.min(1,Number(v)));
const controls=[
  ['intention','Intention','Declared direction'],
  ['shifting','Shifting','Alignment with another world'],
  ['porosity','Membrane porosity','Selective transport'],
  ['resonance','Resonance','Phase correspondence'],
  ['compatibility','Destination compatibility','Ability translation'],
];
export function mountMythienceCrossing(root,{request=proposeMythienceCrossing}={}){
  let active=true,controller=null,serial=0;
  let seeds={crossings:0,attunement:0.5,charge:1};
  let history=[];
  root.innerHTML=[
    '<section class="wg-surface wg-mythience" data-surface="wayglass-mythience">',
    '<header class="glass-panel wg-mythience-heading"><p class="eyebrow">Wayglass · Wyrdrune · Mythience</p>',
    '<h1>The Permeability Membrane</h1>',
    '<p class="lede">Wonder → Build → Play → Discover → Learn → Become → Wonder again.</p>',
    '<p>Explore how Intention, Shifting, resonance and hospitality might translate abilities between fictional universes. Neither worlds nor travellers lose their names.</p>',
    '<p class="tiny">Science supplies membrane and information analogies; myth supplies thresholds and correspondences. This is a simulation, not physical universe travel or an actual power grant.</p></header>',
    '<div class="wg-mythience-grid"><form class="glass-panel wg-mythience-console" data-mythience-form>',
    '<h2>Declare an encounter</h2>',
    '<label>Traveller identifier<input name="traveller" required maxlength="100" value="traveller:visitor" pattern="[a-zA-Z0-9][a-zA-Z0-9._:/-]*"></label>',
    '<label>Origin universe<input name="origin" required maxlength="100" value="universe:wayglass" pattern="[a-zA-Z0-9][a-zA-Z0-9._:/-]*"></label>',
    '<label>Destination universe<input name="destination" required maxlength="100" value="universe:aurora" pattern="[a-zA-Z0-9][a-zA-Z0-9._:/-]*"></label>',
    '<label>Ability identifier<input name="ability" required maxlength="100" value="ability:starlight" pattern="[a-zA-Z0-9][a-zA-Z0-9._:/-]*"></label>',
    '<label>Ability modality<select name="modality"><option value="magic">Magic</option><option value="technology">Technology</option><option value="hybrid">Hybrid</option></select></label>',
    '<fieldset class="wg-mythience-fields"><legend>Membrane field</legend>',
    ...controls.map(([key,label,description])=>'<label>'+label+
      '<small>'+description+'</small><input type="range" name="'+key+'" min="0" max="1" step=".05" value=".9" aria-label="'+label+'">'+
      '<output data-value="'+key+'">0.90</output></label>'),
    '</fieldset>',
    '<fieldset><legend>Fictional crossing permissions</legend>',
    '<p class="tiny">These checkboxes declare permissions for a hypothetical scene. They do not speak for actual people, agents or worlds.</p>',
    '<label><input type="checkbox" name="traveller_consent"> Traveller opts in</label>',
    '<label><input type="checkbox" name="origin_consent"> Fictional origin opts in</label>',
    '<label><input type="checkbox" name="destination_consent"> Fictional destination opts in</label>',
    '</fieldset>',
    '<div class="wg-mythience-actions"><button type="submit" class="send-jewel">Ask Wyrdrune</button>',
    '<button type="button" class="glass-chip" data-mythience-feather>🪽 Feather</button>',
    '<button type="button" class="glass-chip" data-mythience-reset>New journey</button></div>',
    '<p class="tiny" role="status" aria-live="polite" data-mythience-status>Waiting for an invitation. Nothing crosses automatically.</p>',
    '</form>',
    '<section class="glass-panel wg-mythience-outcome" aria-label="Mythience crossing preview">',
    '<h2>Between the worlds</h2>',
    '<div class="wg-mythience-worlds" aria-hidden="true"><div class="wg-mythience-world wg-mythience-origin">Origin</div>',
    '<div class="wg-mythience-membrane" data-mythience-membrane></div>',
    '<div class="wg-mythience-world wg-mythience-destination">Destination</div></div>',
    '<p data-mythience-reading>What might pass through, and what must remain distinct?</p>',
    '<div data-mythience-receipt class="wg-mythience-receipt" role="log" aria-live="polite"></div>',
    '<p class="tiny">Only a candidate returns. Withness preserves the source and refusal. The traveller, route membrane and host world remain separate lineages.</p>',
    '<button type="button" class="glass-chip" data-wayglass-room="wayglass:living-watercolor">See the Living Watercolour</button>',
    '</section></div></section>'
  ].join('');
  const form=root.querySelector('[data-mythience-form]');
  const status=root.querySelector('[data-mythience-status]');
  const reading=root.querySelector('[data-mythience-reading]');
  const receipt=root.querySelector('[data-mythience-receipt]');
  const membrane=root.querySelector('[data-mythience-membrane]');
  const button=form.querySelector('[type=submit]');
  for(const slider of form.querySelectorAll('input[type=range]')){
    slider.addEventListener('input',()=>{form.querySelector('[data-value="'+slider.name+'"]').textContent=Number(slider.value).toFixed(2);});
  }
  function render(result){
    if(result.status==='denied'){
      reading.textContent='The threshold refused this encounter. A refusal is a meaningful return.';
      receipt.textContent=result.reason||'Crossing declined';
      membrane.style.setProperty('--membrane-open','0');
      return;
    }
    const c=result.candidate;
    membrane.style.setProperty('--membrane-open',String(clamp(c.permeability)));
    reading.textContent='A proposed translation of '+c.ability.id+' from '+c.ability.origin_universe+
      ' into '+c.to+' has expression '+Math.round(c.expression*100)+'%. Identity and provenance remain intact.';
    receipt.innerHTML='<p><strong>Withness:</strong> candidate only, no actual crossing or canon change</p>'+
      '<p>Membrane '+Math.round(c.permeability*100)+'% · Translation '+Math.round(c.expression*100)+
      '% · Cost '+c.cost.toFixed(3)+' · Previous experiences '+c.previous_experiences+'</p>'+
      '<p>Source '+esc(String(result.source_hash).slice(0,22))+
      ' · Eightfold phases '+result.phase_receipts.length+
      ' · Return '+esc(result.return_marker?.status||'proposal-only')+'</p>';
  }
  const prior=mythienceSnapshot()?.result;
  if(prior)render(prior);
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!active||controller)return;
    const data=new FormData(form);
    const id=key=>String(data.get(key)||'').trim();
    const field=Object.fromEntries(controls.map(([key])=>[key,Number(data.get(key))]));
    const origin=id('origin'),destination=id('destination');
    if(origin===destination){status.textContent='Choose two distinct universes.';return;}
    const requestBody={
      traveller_id:id('traveller'),origin_universe:origin,destination_universe:destination,
      ability:{id:id('ability'),origin_universe:origin,modality:id('modality')},
      history:[...history],field,
      consent:{traveller:data.has('traveller_consent'),origin:data.has('origin_consent'),
        destination:data.has('destination_consent')},
      event_id:'encounter:'+String(++serial),
    };
    controller=new AbortController();button.disabled=true;status.textContent='Inviting Wyrdrune to evaluate the membrane…';
    try{
      const result=await request({request:requestBody,seeds,signal:controller.signal});
      if(!active||controller.signal.aborted)return;
      render(result);
      status.textContent=result.status==='candidate-returned'?'Candidate returned. No crossing committed.':'Threshold refused.';
      if(result.status==='candidate-returned'){
        // Preview-only continuity. No history or seed is persisted or automatically adopted.
        seeds=result.carry;
        history=[...history,{id:'experience:'+String(serial),origin_universe:origin,
          destination_universe:destination,expression:result.candidate.expression}].slice(-32);
      }
    }catch(error){
      if(active)status.textContent=controller.signal.aborted?'Feather: paused.':error.message;
    }finally{controller=null;if(active)button.disabled=false;}
  });
  root.querySelector('[data-mythience-feather]').addEventListener('click',()=>{
    controller?.abort();status.textContent='Feather: paused. No further changes.';
  });
  root.querySelector('[data-mythience-reset]').addEventListener('click',()=>{
    controller?.abort();controller=null;seeds={crossings:0,attunement:0.5,charge:1};history=[];serial=0;
    clearMythience();membrane.style.setProperty('--membrane-open','0');
    reading.textContent='A fresh possibility. Nothing has been carried forward.';
    receipt.textContent='';status.textContent='New journey, no adopted history.';button.disabled=false;
  });
  root.querySelectorAll('[data-wayglass-room]').forEach(el=>el.addEventListener('click',()=>globalThis.__wayglassOS?.mount(el.dataset.wayglassRoom)));
  return Object.freeze({surface_id:'wayglass:mythience-crossing',destroy(){
    active=false;controller?.abort();
  }});
}
