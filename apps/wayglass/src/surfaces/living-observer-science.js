/**
 * Wayglass Living Observer / N-010: compact science lens station.
 *
 * Reuses canonical STARWELL mathematics. Bluebird and Crow providers do not
 * receive these inputs. The one remote action is a deliberate NOAA SWPC read.
 */
import './living-observer-science.css';
import {
  deriveNikolaHeartBrain, runNikolaHeartBrainTrial, replayNikolaHeartBrain,
} from '../../../../starwell/deep-observer/nikola-heart-brain.js';
import {
  deriveCosmicClock, deriveNumerology, geometrySVG, fetchNoaaAtlas,
} from '../../../../starwell/deep-observer/living-observer-atlas.js';

export const WAYGLASS_SCIENCE_LENSES=Object.freeze([
  {id:'heart',label:'Heart · Brain'},
  {id:'sky',label:'Measured Sky'},
  {id:'geometry',label:'Sacred Geometry'},
  {id:'numbers',label:'Numerology'},
  {id:'crew',label:'Research · Crew'},
]);
export const WAYGLASS_SCIENCE_SCHEMA='wayglass.observer-science-lenses/v1';
const px=n=>(n*100).toFixed(1)+'%';
const finite=n=>Number(n).toFixed(5);
const e=name=>document.createElement(name);
function element(tag,attrs={},children=[]){
  const node=e(tag);
  for(const [key,value] of Object.entries(attrs)){
    if(key==='text') node.textContent=value;
    else if(key==='class')node.className=value;
    else node.setAttribute(key,value);
  }
  children.forEach(child=>node.append(child));
  return node;
}
function field(panel,label,control){
  const wrap=element('label',{class:'wg-science-field'});
  wrap.append(element('span',{text:label}),control);
  panel.append(wrap);
}
function control(tag,props={}){
  const node=e(tag);
  for(const [k,v] of Object.entries(props)){
    if(k==='text')node.textContent=v;
    else if(k==='value')node.value=v;
    else node.setAttribute(k,String(v));
  }
  return node;
}
function button(label,action){
  return control('button',{type:'button',class:'glass-chip',text:label,'data-wg-science-action':action});
}
function pane(id){
  const n=element('section',{class:'wg-science-lens', 'data-wg-science-pane':id});
  n.hidden=id!=='heart';
  return n;
}
function scientificStatus(node,message){node.textContent=message;}
export function summarizeNikolaForWayglass(frame){
  if(frame?.schema!=='wayglass.nikola-heart-brain/v1')throw Error('Wayglass Observer: unknown Nikola frame');
  const b=frame.brain,h=frame.heart;
  return Object.freeze({
    heart:'Ideal qubit · X+ '+px(h.quantum.born.xPlus)+' · Y+ '+px(h.quantum.born.yPlus)+
      ' · Z0 '+px(h.quantum.born.z0)+' · purity '+finite(h.quantum.coherence.purity),
    brain:'Models: coherent λ=0 vs fully dephased λ=1. Prior coherent '+px(b.prior.coherent)+
      '. Next measurement: '+(b.recommended_basis||'none for this preparation')+
      '. Expected information gain: '+finite(b.maximum_information_gain_bits)+' bits per ideal shot.',
    meaning:'Philosophy · '+h.philosophy.title+': '+h.philosophy.question+'\n'+
      'Spiritual inquiry · '+h.spirituality.title+': '+h.spirituality.question,
    boundary:'These probabilities are conditional on two named ideal models. Philosophy and spirituality are questions, not invented numerical likelihoods. No real detector was sampled.',
  });
}
export function mountWayglassSciencePanel(root,{navigate=id=>globalThis.__wayglassOS?.mount(id),
  authorizeBluebird=()=>globalThis.__wayglassOS?.authorizeBluebird()}={}){
  const host=root.querySelector('[data-wg-science-host]');
  if(!host)throw Error('Wayglass Observer: science host missing');
  let disposed=false,active='heart',noaaController=null,trialBusy=false,lastReceipt=null;
  const eventController=new AbortController();
  const {signal}=eventController;
  const on=(node,type,fn)=>node.addEventListener(type,fn,{signal});
  const title=element('div',{class:'wg-science-heading'},[
    element('div',{},[
      element('p',{class:'eyebrow',text:'WAYGLASS · NIKOLA · RESEARCH DECK'}),
      element('h2',{text:'The heart drives the brain'}),
      element('p',{class:'tiny',text:'One instrument at a time. Distinguish measured sky, formal calculations, and symbolic interpretation.'}),
    ]),
    element('span',{class:'wg-science-state',text:'Local tools ready · no provider calls'}),
  ]);
  const tabs=element('nav',{class:'wg-science-tabs','aria-label':'Observer research lenses'});
  const panes=element('div',{class:'wg-science-panes'});
  const tabsById=new Map(),panesById=new Map();
  function select(id){
    if(!panesById.has(id)||disposed)return;
    active=id;
    for(const [key,n] of panesById)n.hidden=key!==id;
    for(const [key,n] of tabsById)n.setAttribute('aria-pressed',String(key===id));
  }
  for(const l of WAYGLASS_SCIENCE_LENSES){
    const btn=button(l.label,'lens-'+l.id);
    btn.setAttribute('aria-pressed',String(l.id===active));
    on(btn,'click',()=>select(l.id));
    tabs.append(btn);tabsById.set(l.id,btn);
    const panel=pane(l.id);panes.append(panel);panesById.set(l.id,panel);
  }
  host.replaceChildren(title,tabs,panes);
  // HEART: same canonical N-009 engine as STARWELL; never fork its equations.
  const heart=panesById.get('heart');
  heart.append(element('h3',{text:'Quantum heart → probability brain'}));
  const form=element('div',{class:'wg-science-fields'});
  const p=control('input',{type:'range',min:0,max:100,step:1,value:50});
  const phi=control('input',{type:'range',min:0,max:360,step:1,value:0});
  const lambda=control('input',{type:'range',min:0,max:100,step:1,value:0});
  const prior=control('input',{type:'range',min:1,max:99,step:1,value:50});
  field(form,'Path-0 probability',p);field(form,'Relative phase (degrees)',phi);
  field(form,'Declared dephasing',lambda);field(form,'Coherent-model prior',prior);
  heart.append(form);
  const heartReadout=element('pre',{class:'wg-science-reading'});
  const philosophy=control('select');
  for(const [v,label] of [['falsifiability','Falsifiability'],['phenomenology','Phenomenology'],['process','Process philosophy']]){
    philosophy.append(control('option',{value:v,text:label}));
  }
  const spirituality=control('select');
  for(const [v,label] of [['wonder','Wonder First'],['hermetic','Hermetic correspondence'],['contemplative','Contemplative reflection']]){
    spirituality.append(control('option',{value:v,text:label}));
  }
  const reflectionInputs=element('div',{class:'wg-science-fields'});
  field(reflectionInputs,'Philosophy',philosophy);field(reflectionInputs,'Spiritual lens',spirituality);
  const reflection=element('pre',{class:'wg-science-reading'});
  const trial=button('Test next measurement · synthetic','trial');
  const trialStatus=element('p',{class:'tiny','role':'status','aria-live':'polite',
    text:'No detector trial invoked. Mathematical predictions are not physical measurements.'});
  const trialReceipt=element('pre',{class:'wg-science-reading',text:'No trial receipt.'});
  const trialDetails=element('details',{},[element('summary',{text:'Inspect replayed probability evidence'}),trialReceipt]);
  const modelInput=()=>({p0:Number(p.value)/100,phaseRad:Number(phi.value)*Math.PI/180,
    dephasing:Number(lambda.value)/100,priorCoherent:Number(prior.value)/100,
    philosophy:philosophy.value,spirituality:spirituality.value});
  function updateHeart(){
    if(disposed)return;
    try{
      const preview=summarizeNikolaForWayglass(deriveNikolaHeartBrain(modelInput()));
      heartReadout.textContent=preview.heart+'\n'+preview.brain+'\n'+preview.boundary;
      reflection.textContent=preview.meaning;
      lastReceipt=null;trialReceipt.textContent='No trial on these parameters.';
      trialStatus.textContent='Changed preparation. Run a new explicit synthetic trial to update probabilities.';
    }catch(error){heartReadout.textContent='Heart/brain refused an invalid parameter: '+error.message;}
  }
  for(const input of [p,phi,lambda,prior,philosophy,spirituality])on(input,'input',updateHeart);
  on(trial,'click',async()=>{
    if(trialBusy||disposed)return;
    trialBusy=true;trial.disabled=true;
    const params=modelInput();scientificStatus(trialStatus,'Computing synthetic detector counts; replaying receipt…');
    try{
      const result=await runNikolaHeartBrainTrial({...params,basis:'auto',shots:512,seed:104729});
      const check=await replayNikolaHeartBrain(result);
      if(disposed)return;
      if(!check.matched)throw Error('replay mismatch');
      lastReceipt=result;
      trialReceipt.textContent=JSON.stringify({receipt:result,replay:check},null,2);
      trialStatus.textContent='Synthetic '+result.detector.basis+' sample: '+result.detector.plus+
        '/512 positive counts. '+(result.update.posterior?
        'Conditional coherent-model posterior '+px(result.update.posterior[0]):
        'Neither ideal model fits these synthetic counts')+'. Replay verified. No provider or QPU contacted.';
    }catch(error){if(!disposed)trialStatus.textContent='Trial held without a success claim: '+error.message;}
    finally{trialBusy=false;if(!disposed)trial.disabled=false;}
  });
  heart.append(heartReadout,reflectionInputs,reflection,trial,trialStatus,trialDetails);
  updateHeart();

  // SKY: a deliberate source-bound NOAA request. No guessed fallback telemetry.
  const sky=panesById.get('sky');
  sky.append(element('h3',{text:'Measured sky · NOAA Space Weather Prediction Center'}));
  const skyStatus=element('p',{class:'tiny','role':'status','aria-live':'polite',
    text:'No NOAA instruments have been contacted in this room.'});
  const skyReadout=element('pre',{class:'wg-science-reading'});
  const sourceReceipt=element('pre',{class:'wg-science-reading',text:'No source receipt.'});
  const skyUpdate=button('Read NOAA space-weather feeds','sky-read');
  function cosmicClock(){
    const d=deriveCosmicClock(new Date());
    return 'Julian day '+d.julian_day.toFixed(5)+
      ' · mean lunar illumination '+px(d.illumination_fraction)+
      ' · age '+d.lunar_age_days.toFixed(2)+' days.\n'+d.accuracy_note;
  }
  skyReadout.textContent=cosmicClock()+'\n\nNOAA Kp / Bz / solar-wind speed / 10.7 cm flux: not fetched.';
  on(skyUpdate,'click',async()=>{
    if(noaaController)noaaController.abort();
    const ctl=new AbortController();noaaController=ctl;skyUpdate.disabled=true;
    skyStatus.textContent='Fetching four current public NOAA instrument feeds on your request…';
    try{
      const snap=await fetchNoaaAtlas({signal:ctl.signal,now:new Date()});
      if(disposed||noaaController!==ctl)return;
      const readings=Object.entries(snap.readings).map(([name,obj])=>{
        const r=obj.reading;
        return name.toUpperCase()+': '+(r?
          r.value+' '+r.unit+' · '+r.freshness+' · observed '+r.observed_at:
          'unavailable (no verified reading)');
      });
      const live=Object.values(snap.readings).filter(x=>x.reading?.usable_for_display).length;
      skyReadout.textContent=cosmicClock()+'\n\n'+readings.join('\n');
      sourceReceipt.textContent=JSON.stringify(snap,null,2);
      skyStatus.textContent='Live source check: '+live+'/4 fresh channels. Missing or stale readings are explicitly held.';
    }catch(error){if(!disposed)skyStatus.textContent='NOAA request unavailable: '+error.message;}
    finally{if(noaaController===ctl){noaaController=null;if(!disposed)skyUpdate.disabled=false;}}
  });
  sky.append(skyReadout,skyUpdate,skyStatus,element('details',{},[
    element('summary',{text:'Inspect NOAA source, times and freshness'}),sourceReceipt,
  ]));

  // GEOMETRY: formal SVG construction, not a cosmological measurement.
  const geometry=panesById.get('geometry');
  geometry.append(element('h3',{text:'Sacred geometry · equations, not stickers'}));
  const shape=control('select');
  for(const [v,label] of [['flower','Flower of Life'],['metatron','Metatron’s geometry'],['merkaba','Stella octangula']]){
    shape.append(control('option',{value:v,text:label}));
  }
  const shapeLabel=element('label',{class:'wg-science-field'},[element('span',{text:'Mathematical construction'}),shape]);
  const image=element('div',{class:'wg-science-geometry'});
  const geomExplain=element('p',{class:'tiny',text:'Exact computed geometric construction · symbolic form only, no instrument-measured alignment.'});
  const showGeometry=()=>{
    const markup=geometrySVG(shape.value);
    image.innerHTML=markup; // only deterministic SVG from a fixed internal shape enum
    geomExplain.textContent='Calculated '+shape.value+' geometry. No NOAA reading, quantum sample, cosmological or symbolic claim was changed.';
  };
  on(shape,'change',showGeometry);
  geometry.append(shapeLabel,image,geomExplain);showGeometry();

  // NUMEROLOGY: a reproducible symbolic transformation, not probabilistic physics.
  const numbers=panesById.get('numbers');
  numbers.append(element('h3',{text:'Numerology · every reduction is visible'}));
  const date=control('input',{type:'date',value:new Date().toISOString().slice(0,10)});
  const word=control('input',{type:'text',maxlength:80,autocomplete:'off',placeholder:'Optional word, stays here'});
  const numberForms=element('div',{class:'wg-science-fields'});
  field(numberForms,'Gregorian date',date);field(numberForms,'Optional word or name',word);
  const numberReadout=element('pre',{class:'wg-science-reading'});
  const numberNote=element('p',{class:'tiny',text:'Pythagorean letter mapping and digital roots are a chosen symbolic tradition. No link to quantum probability or astronomical cause is asserted.'});
  function updateNumbers(){
    try{
      const r=deriveNumerology({dateISO:date.value,word:word.value});
      numberReadout.textContent='Date digit sum: '+r.digit_sequence+' = '+r.date_digit_sum+
        '\nReduction: '+r.date_reduction_path.join(' → ')+
        '\nFull root: '+r.full_digital_root+' · day '+r.day_number+
        '\nLetters: '+(r.word_length?r.word_pythagorean_sum+' → '+r.word_reduction_path.join(' → '):'not supplied');
    }catch(error){numberReadout.textContent=error.message;}
  }
  on(date,'change',updateNumbers);on(word,'input',updateNumbers);
  numbers.append(numberForms,numberReadout,numberNote);updateNumbers();

  // CREW: doors are navigation; they are not an authenticated reply.
  const crew=panesById.get('crew');
  crew.append(element('h3',{text:'Research crew and source library'}));
  crew.append(element('p',{class:'tiny',text:'Nikola owns the mathematics; The Crow is a separate optional local model route; Bluebird and Crew participate by invitation, not by assumed consent.'}));
  const doors=element('div',{class:'wg-science-doors'});
  for(const [label,id] of [['Nikola · Research Lab','wayglass:nikola-research'],
    ['The Crow · Writing Room','arcsweep:writing-room'],
    ['Crew · Commons','wayglass:commons'],
    ['Research Library','wayglass:library']]){
    const b=button(label,'nav-'+id);
    on(b,'click',()=>{if(!disposed)navigate(id);});
    doors.append(b);
  }
  const authorize=button('Connect Bluebird · optional consent','bluebird-connect');
  const bluebirdStatus=element('p',{class:'tiny','role':'status','aria-live':'polite',
    text:'Bluebird disconnected until explicit, verified provider authorisation. The Living Observer itself needs no Bluebird credential.'});
  on(authorize,'click',async()=>{
    authorize.disabled=true;
    try{
      await authorizeBluebird();
      if(!disposed)bluebirdStatus.textContent='A provider session was authorised for this page. That alone is not evidence of a live Bluebird reply.';
    }catch(error){if(!disposed)bluebirdStatus.textContent='Bluebird authorisation not completed: '+error.message;}
    finally{if(!disposed)authorize.disabled=false;}
  });
  crew.append(doors,authorize,bluebirdStatus,element('p',{class:'tiny',text:'No room navigation implicitly sends an external turn, and no provider code is stored by this science station.'}));
  return ()=>{if(disposed)return;disposed=true;noaaController?.abort();eventController.abort();host.replaceChildren();};
}
