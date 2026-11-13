import './mythience-crossing.css';
import {wayglassMythienceJourney} from '../mythience-journey.js';
import {mountMythienceMembraneScene} from '../mythience-membrane-scene.js';
import {createMythienceSensory} from '../mythience-sensory.js';
import {proposeMythienceCrossing,proposeMythienceHybrid,clearMythience} from '../mythience-client.js';

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
  const journey=wayglassMythienceJourney();
  const sensory=createMythienceSensory();
  let lastReading=null;
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
    '<label>Ability source universe (optional)<input name="ability_source" maxlength="100" placeholder="Current origin if blank"></label>',
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
    '<label><input type="checkbox" name="first_consent"> First parent ability opts into hybridisation</label>',
    '<label><input type="checkbox" name="second_consent"> Second parent ability opts into hybridisation</label>',
    '</fieldset>',
    '<div class="wg-mythience-actions"><button type="submit" class="send-jewel">Ask Wyrdrune</button>',
    '<button type="button" class="glass-chip" data-mythience-hybrid disabled>Weave hybrid from two encounters</button>',
    '<button type="button" class="glass-chip" data-mythience-carry disabled>Carry this possibility (preview)</button>',
    '<button type="button" class="glass-chip" data-mythience-hear disabled>Hear the membrane</button>',
    '<button type="button" class="glass-chip" data-mythience-feel disabled>Feel the threshold</button>',
    '<button type="button" class="glass-chip" data-mythience-feather>🪽 Feather</button>',
    '<button type="button" class="glass-chip" data-mythience-reset>New journey</button></div>',
    '<p class="tiny" role="status" aria-live="polite" data-mythience-status>Waiting for an invitation. Nothing crosses automatically.</p>',
    '</form>',
    '<section class="glass-panel wg-mythience-outcome" aria-label="Mythience crossing preview">',
    '<h2>Between the worlds</h2>',
    '<div class="wg-mythience-worlds"><canvas class="wg-mythience-cosmos" data-mythience-cosmos tabindex="0" role="slider" aria-label="Tune Shifting with a finger, Pencil or arrow keys" aria-valuemin="0" aria-valuemax="100" aria-valuenow="90" aria-valuetext="90 percent Shifting"></canvas><div class="wg-mythience-world wg-mythience-origin" data-mythience-origin>Origin</div>',
    '<div class="wg-mythience-membrane" data-mythience-membrane></div>',
    '<div class="wg-mythience-world wg-mythience-destination" data-mythience-destination>Destination</div></div>',
    '<p data-mythience-reading>What might pass through, and what must remain distinct?</p>',
    '<div data-mythience-receipt class="wg-mythience-receipt" role="log" aria-live="polite"></div>',
    '<section class="wg-mythience-lineage" aria-label="Traveller continuity"><h3>Carried possibilities</h3>',
    '<p data-mythience-lineage aria-live="polite">Nothing carried yet. Proposals await your choice.</p></section>',
    '<p class="tiny">Only a candidate returns. Withness preserves the source and refusal. The traveller, route membrane and host world remain separate lineages.</p>',
    '<button type="button" class="glass-chip" data-wayglass-room="wayglass:living-watercolor">See the Living Watercolour</button>',
    '</section></div></section>'
  ].join('');
  const form=root.querySelector('[data-mythience-form]');
  const status=root.querySelector('[data-mythience-status]');
  const reading=root.querySelector('[data-mythience-reading]');
  const receipt=root.querySelector('[data-mythience-receipt]');
  const lineage=root.querySelector('[data-mythience-lineage]');
  const membrane=root.querySelector('[data-mythience-membrane]');
  const cosmos=root.querySelector('[data-mythience-cosmos]');
  const shiftSlider=form.elements.shifting;
  const fieldValues=()=>Object.fromEntries(controls.map(([key])=>[key,Number(form.elements[key].value)]));
  const scene=mountMythienceMembraneScene(cosmos,{onShift:value=>{
    shiftSlider.value=String(value);
    form.querySelector('[data-value="shifting"]').textContent=value.toFixed(2);
    cosmos.setAttribute('aria-valuenow',String(Math.round(value*100)));
    cosmos.setAttribute('aria-valuetext',Math.round(value*100)+' percent Shifting');
    scene.setFields(fieldValues());
    invalidateProposal();
  }});
  scene.setFields(fieldValues());
  const updateWorldLabels=()=>{
    const from=form.elements.origin.value.trim()||'Origin';
    const to=form.elements.destination.value.trim()||'Destination';
    root.querySelector('[data-mythience-origin]').textContent=from;
    root.querySelector('[data-mythience-destination]').textContent=to;
    scene.setWorlds(from,to);
  };
  updateWorldLabels();
  for(const name of ['origin','destination'])form.elements[name].addEventListener('input',updateWorldLabels);
  const button=form.querySelector('[type=submit]');
  const hybridButton=root.querySelector('[data-mythience-hybrid]');
  const carryButton=root.querySelector('[data-mythience-carry]');
  const hearButton=root.querySelector('[data-mythience-hear]');
  const feelButton=root.querySelector('[data-mythience-feel]');
  function invalidateProposal(){
    if(!active)return;
    if(controller){controller.abort();controller=null;button.disabled=false;
      hybridButton.disabled=journey.snapshot().abilities.length<2;}
    journey.discard();sensory.stop();lastReading=null;
    carryButton.disabled=true;hearButton.disabled=true;feelButton.disabled=true;
    receipt.textContent='';
    status.textContent='Fields changed. Invite Wyrdrune again to receive a new proposal.';
    scene.setFields(fieldValues());
  }
  form.addEventListener('input',invalidateProposal);
  form.addEventListener('change',invalidateProposal);
  for(const slider of form.querySelectorAll('input[type=range]')){
    slider.addEventListener('input',()=>{
      form.querySelector('[data-value="'+slider.name+'"]').textContent=Number(slider.value).toFixed(2);
      scene.setFields(fieldValues());
      if(slider.name==='shifting'){
        cosmos.setAttribute('aria-valuenow',String(Math.round(Number(slider.value)*100)));
        cosmos.setAttribute('aria-valuetext',Math.round(Number(slider.value)*100)+' percent Shifting');
      }
    });
  }
  function renderLineage(){
    const state=journey.snapshot();
    if(!state.abilities.length){lineage.textContent='Nothing carried yet. Proposals await your choice.';return;}
    const latest=state.lineage.slice(-4).map(item=>item.ability.id+' from '+
      item.ability.origin_universe+(item.kind==='hybrid'?' (hybrid of '+item.parent_refs.map(p=>p.id).join(' + ')+')':'')).join(' · ');
    lineage.textContent=state.traveller_id+' · '+state.abilities.length+' carried possibilities · '+latest+
      ' · Session preview only, never canon.';
  }
  function render(result){
    if(result.status==='denied'){
      lastReading=null;hearButton.disabled=true;feelButton.disabled=true;sensory.stop();
      reading.textContent='The threshold refused this encounter. A refusal is a meaningful return.';
      receipt.textContent=result.reason||'Crossing declined';
      membrane.style.setProperty('--membrane-open','0');
      scene.setOutcome({permeability:0,expression:0});
      return;
    }
    const c=result.candidate;
    lastReading={expression:c.expression,permeability:c.permeability??c.expression};
    hearButton.disabled=false;feelButton.disabled=false;
    if(Array.isArray(c.parents)){
      membrane.style.setProperty('--membrane-open',String(clamp(c.expression)));
      scene.setOutcome({permeability:c.expression,expression:c.expression});
      reading.textContent='A third ability has been proposed from '+c.parents.map(p=>p.id+' ('+p.origin_universe+')').join(' and ')+'.';
      receipt.textContent='Hybrid '+c.id+' · Expression '+Math.round(c.expression*100)+'% · Synergy '+Math.round(c.synergy*100)+'% · Eightfold receipts '+result.phase_receipts.length+' · No canon commit';
      return;
    }
    membrane.style.setProperty('--membrane-open',String(clamp(c.permeability)));
    scene.setOutcome({permeability:c.permeability,expression:c.expression});
    reading.textContent='A proposed translation of '+c.ability.id+' from '+c.ability.origin_universe+
      ' into '+c.to+' has expression '+Math.round(c.expression*100)+'%. Identity and provenance remain intact.';
    receipt.innerHTML='<p><strong>Withness:</strong> candidate only, no actual crossing or canon change</p>'+
      '<p>Membrane '+Math.round(c.permeability*100)+'% · Translation '+Math.round(c.expression*100)+
      '% · Cost '+c.cost.toFixed(3)+' · Previous experiences '+c.previous_experiences+'</p>'+
      '<p>Source '+esc(String(result.source_hash).slice(0,22))+
      ' · Eightfold phases '+result.phase_receipts.length+
      ' · Return '+esc(result.return_marker?.status||'proposal-only')+'</p>';
  }
  // Only explicitly carried previews survive room changes. Pending proposals do not.
  journey.discard();
  const arrival=journey.snapshot();
  if(arrival.traveller_id)form.elements.traveller.value=arrival.traveller_id;
  renderLineage();
  hybridButton.disabled=arrival.abilities.length<2;
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!active||controller)return;
    const data=new FormData(form);
    const id=key=>String(data.get(key)||'').trim();
    const field=Object.fromEntries(controls.map(([key])=>[key,Number(data.get(key))]));
    const origin=id('origin'),destination=id('destination');
    if(origin===destination){status.textContent='Choose two distinct universes.';return;}
    const current=journey.snapshot();
    if(current.traveller_id&&current.traveller_id!==id('traveller')){
      status.textContent='This journey belongs to '+current.traveller_id+'. Choose New journey to change traveller.';
      return;
    }
    const requestBody={
      traveller_id:id('traveller'),origin_universe:origin,destination_universe:destination,
      ability:{id:id('ability'),origin_universe:id('ability_source')||origin,modality:id('modality')},
      history:current.history,field,
      consent:{traveller:data.has('traveller_consent'),origin:data.has('origin_consent'),
        destination:data.has('destination_consent')},
      event_id:'encounter:'+String(++serial),
    };
    lastReading=null;hearButton.disabled=true;feelButton.disabled=true;sensory.stop();
    const flight=new AbortController();controller=flight;button.disabled=true;hybridButton.disabled=true;carryButton.disabled=true;
    status.textContent='Inviting Wyrdrune to evaluate the membrane…';
    try{
      const result=await request({request:requestBody,seeds:current.seeds,signal:flight.signal});
      if(!active||controller!==flight||flight.signal.aborted)return;
      journey.offer(result,{traveller_id:id('traveller')});
      render(result);
      status.textContent=result.status==='candidate-returned'?'Candidate returned. No crossing committed.':'Threshold refused.';
      carryButton.disabled=result.status!=='candidate-returned';
    }catch(error){
      if(active&&controller===flight)status.textContent=flight.signal.aborted?'Feather: paused.':error.message;
    }finally{if(controller===flight){controller=null;if(active){button.disabled=false;
      hybridButton.disabled=journey.snapshot().abilities.length<2;}}}
  });
  hybridButton.addEventListener('click',async()=>{
    const current=journey.snapshot();
    if(!active||controller||current.abilities.length<2)return;
    if(current.traveller_id!==String(form.elements.traveller.value).trim()){
      status.textContent='The traveller has changed. Start a new journey before weaving.';return;
    }
    const data=new FormData(form),field=Object.fromEntries(
      ['intention','shifting','resonance','compatibility'].map(k=>[k,Number(data.get(k))]));
    const [first,second]=current.abilities.slice(-2);
    lastReading=null;hearButton.disabled=true;feelButton.disabled=true;sensory.stop();
    const flight=new AbortController();controller=flight;hybridButton.disabled=true;button.disabled=true;carryButton.disabled=true;
    status.textContent='Wyrdrune is examining an emergent third correspondence…';
    try{
      const result=await proposeMythienceHybrid({request:{
        traveller_id:String(data.get('traveller')||'').trim(),
        destination_universe:String(data.get('destination')||'').trim(),first,second,field,
        consent:{traveller:data.has('traveller_consent'),first:data.has('first_consent'),
          second:data.has('second_consent'),destination:data.has('destination_consent')},
        event_id:'encounter:hybrid'+String(++serial),
      },seeds:current.seeds,signal:flight.signal});
      if(!active||controller!==flight||flight.signal.aborted)return;
      journey.offer(result,{traveller_id:current.traveller_id});
      render(result);
      status.textContent=result.status==='candidate-returned'?'Third correspondence proposed. No canon committed.':'Hybrid invitation refused.';
      carryButton.disabled=result.status!=='candidate-returned';
    }catch(error){if(active&&controller===flight)status.textContent=flight.signal.aborted?'Feather: paused.':error.message;}
    finally{if(controller===flight){controller=null;if(active){button.disabled=false;
      hybridButton.disabled=journey.snapshot().abilities.length<2;}}}
  });
  carryButton.addEventListener('click',()=>{
    if(!active||controller)return;
    try{
      const state=journey.carry();
      carryButton.disabled=true;
      hybridButton.disabled=state.abilities.length<2;
      status.textContent='Carried in this preview only: '+state.abilities.at(-1).id+
        '. '+state.abilities.length+' abilities, '+state.history.length+' experiences. No canon commit.';
      renderLineage();
    }catch(error){status.textContent=error.message;}
  });
  hearButton.addEventListener('click',async()=>{
    if(!active||!lastReading)return;
    const outcome=await sensory.hear(lastReading);
    if(active)status.textContent=outcome.played?'Wyrdrune-derived tone played on request.':outcome.reason;
  });
  feelButton.addEventListener('click',()=>{
    if(!active||!lastReading)return;
    const outcome=sensory.feel(lastReading);
    status.textContent=outcome.felt?'Threshold haptic played on request.':outcome.reason||'Haptics unavailable.';
  });
  root.querySelector('[data-mythience-feather]').addEventListener('click',()=>{
    controller?.abort();controller=null;journey.discard();sensory.stop();lastReading=null;
    hearButton.disabled=true;feelButton.disabled=true;
    button.disabled=false;carryButton.disabled=true;
    hybridButton.disabled=journey.snapshot().abilities.length<2;
    status.textContent='Feather: paused. Uncarried proposals set aside; carried previews remain.';
  });
  root.querySelector('[data-mythience-reset]').addEventListener('click',()=>{
    controller?.abort();controller=null;journey.reset();serial=0;hybridButton.disabled=true;carryButton.disabled=true;
    sensory.stop();lastReading=null;hearButton.disabled=true;feelButton.disabled=true;
    clearMythience();renderLineage();membrane.style.setProperty('--membrane-open','0');scene.setFields(fieldValues());
    reading.textContent='A fresh possibility. Nothing has been carried forward.';
    receipt.textContent='';status.textContent='New journey, no adopted history.';button.disabled=false;
  });
  root.querySelectorAll('[data-wayglass-room]').forEach(el=>el.addEventListener('click',()=>globalThis.__wayglassOS?.mount(el.dataset.wayglassRoom)));
  return Object.freeze({surface_id:'wayglass:mythience-crossing',destroy(){
    active=false;controller?.abort();journey.discard();scene.destroy();void sensory.destroy();
  }});
}
