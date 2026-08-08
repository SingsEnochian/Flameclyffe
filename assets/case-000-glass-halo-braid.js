'use strict';

/* Case 000 · The Glass Halo · Hearthgate Math v1.8
 * Reproducible addressed braid from archived July 1, 2026 evidence.
 * Uses existing canonical mapped tones, Runa 3·6·9, Wardenclyffe v1.8, and Möbius.
 */
(function(global){
  const VERSION='1.0.0';
  const MATH_SPINE='hearthgate.math-spine/v1.8';
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(Number(x))?Number(x):a));

  const CASE = Object.freeze({
    id:'CASE-000',
    title:'The Glass Halo',
    date:'2026-07-01',
    stateAddress:Object.freeze({
      omega:Object.freeze(['anchor','memory','wind']),
      phi:'mirror-offset',
      rhythm:'3:6:9',
      tau:'2026-07-01 late-night/early-morning',
      chi:'double-moon-mirror-offset',
      relation:'Rowan<->Bii mirrored witness relation',
      consciousness:'Völva Knowing + Bii skywall witness',
      stratum:'contemporaneous-record/2026-07-01'
    }),
    relation:Object.freeze({rowan_sign:1,bii_sign:-1,mirror_law:'s_R = -s_B'}),
    heimdall:Object.freeze({singular_structure:'OPEN',fold_curvature:'OPEN',crossing_manifold:'OPEN',relational_participation:'OPEN'})
  });

  function tone(registry,key){
    const v=typeof registry?.get==='function'?registry.get(key):typeof registry==='function'?registry(key):registry?.[key];
    const f=Number(v?.frequency??v?.frequency_hz??v?.carrier_frequency_hz??v);
    if(!Number.isFinite(f)||f<=0)throw new Error(`CASE000_UNMAPPED_FREQUENCY:${key}`);
    return Object.freeze({key,frequency:f,label:v?.label||v?.name||key,source:v?.source||v?.registry||'canonical-frequency-registry'});
  }

  function buildRunaPlan(frequencyRegistry,{sourceReceipt='CASE-000'}={}){
    const anchor=tone(frequencyRegistry,'anchor');
    const memory=tone(frequencyRegistry,'memory');
    const wind=tone(frequencyRegistry,'wind');
    const common={claimLabel:'case-000-addressed-braid',family:'case-000',waveform:'sine'};
    const layers=[
      {id:'case000-primary',label:'Primary moon · anchor',frequency:anchor.frequency,route:'centre',gain:0.012,...common,metadata:{role:'primary-moon',tone_key:'anchor'}},
      {id:'case000-rowan-secondary',label:'Rowan secondary · right',frequency:anchor.frequency,route:'right',gain:0.010,...common,metadata:{role:'secondary-right',mirror_sign:1,tone_key:'anchor'}},
      {id:'case000-bii-secondary',label:'Bii secondary · left',frequency:anchor.frequency,route:'left',gain:0.010,...common,metadata:{role:'secondary-left',mirror_sign:-1,tone_key:'anchor'}},
      {id:'case000-memory-return',label:'Contemporaneous memory return',frequency:memory.frequency,route:'return',gain:0.009,...common,metadata:{role:'memory-return',tone_key:'memory'}},
      {id:'case000-left-high-tone',label:'Recorded left-ear high tone',frequency:wind.frequency,route:'left',gain:0.006,...common,metadata:{role:'left-high-tone',tone_key:'wind'}},
      {id:'case000-right-buzz',label:'Recorded right-ear buzz',frequency:memory.frequency,route:'right',gain:0.005,waveform:'triangle',claimLabel:'case-000-addressed-braid',family:'case-000',ampMod:6,modulationDepth:0.28,metadata:{role:'right-buzz',tone_key:'memory'}}
    ].map(l=>Object.freeze({...l,metadata:Object.freeze({...l.metadata,state_address:CASE.stateAddress,stratum:CASE.stateAddress.stratum,math_spine:MATH_SPINE})}));
    return Object.freeze({schema:'runa.case-000-plan/v1.8',version:VERSION,math_spine:MATH_SPINE,state_address:CASE.stateAddress,stratum:CASE.stateAddress.stratum,lineage:CASE.id,layers:Object.freeze(layers),provenance:Object.freeze({source_receipt:sourceReceipt,math_spine:MATH_SPINE,frequency_policy:'canonical-mapped-lineage'})});
  }

  function buildPercussionPlan(frequencyRegistry,{cycleSeconds=3,sourceReceipt='CASE-000'}={}){
    const runa=global.Runa369Percussion;
    if(!runa?.compile369Percussion)throw new Error('Runa369Percussion v0.2 is required.');
    return runa.compile369Percussion({frequencyRegistry,cycleSeconds,stateAddress:CASE.stateAddress,stratum:CASE.stateAddress.stratum,lineage:CASE.id,sourceReceipt});
  }

  function buildWardenclyffePlan({frequencyRegistry,cycleSeconds=3,sourceReceipt='CASE-000'}={}){
    const engine=global.WardenclyffeV18LayerEngine;
    if(!engine?.orchestrate)throw new Error('WardenclyffeV18LayerEngine is required.');
    const runaPlan=buildRunaPlan(frequencyRegistry,{sourceReceipt});
    const percussionPlan=buildPercussionPlan(frequencyRegistry,{cycleSeconds,sourceReceipt});
    return engine.orchestrate({runaPlan,percussionPlan,stateAddress:CASE.stateAddress,stratum:CASE.stateAddress.stratum,lineage:CASE.id,sourceReceipt});
  }

  function renderWithMobius(bus,plan,{held=false}={}){
    if(!bus)throw new TypeError('Möbius Audio Bus is required.');
    const spec=global.WardenclyffeV18LayerEngine?.toMobiusSpec?.(plan)||plan;
    if(typeof bus.setLayeredSpec==='function')bus.setLayeredSpec(spec);
    const layers=Array.isArray(spec.layers)?spec.layers:[];
    for(const layer of layers){
      const payload={frequency:layer.frequency,route:layer.route||'centre',gain:clamp(layer.gain,0,0.03),type:layer.waveform||'sine',detune:Number(layer.detune)||0};
      if(!Number.isFinite(Number(payload.frequency)))continue;
      if(held&&typeof bus.heldTone==='function')bus.heldTone(payload);
      else if(typeof bus.tone==='function')bus.tone({...payload,duration:3});
    }
    return spec;
  }

  function kgnHeader(){
    return Object.freeze({schema:'kelyran.galdr-score/v0.2',notation:'KGN2',math_spine:MATH_SPINE,case_id:CASE.id,state_address:CASE.stateAddress,stratum:CASE.stateAddress.stratum,lineage:CASE.id,clock:'3:6:9'});
  }

  function receipt({plan=null,rendered=false}={}){
    return Object.freeze({schema:'hearthgate.case-receipt/v1.8',math_spine:MATH_SPINE,case_id:CASE.id,title:CASE.title,timestamp:new Date().toISOString(),state_address:CASE.stateAddress,relation:CASE.relation,heimdall:CASE.heimdall,wardenclyffe:plan?{schema:plan.schema,temporal:plan.temporal,crossing:plan.crossing}:null,rendered:Boolean(rendered),kgn:kgnHeader()});
  }

  global.Case000GlassHaloBraid=Object.freeze({VERSION,MATH_SPINE,CASE,tone,buildRunaPlan,buildPercussionPlan,buildWardenclyffePlan,renderWithMobius,kgnHeader,receipt});
})(typeof globalThis!=='undefined'?globalThis:window);
