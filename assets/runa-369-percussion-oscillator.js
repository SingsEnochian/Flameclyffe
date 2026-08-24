'use strict';

/* Runa 3·6·9 Percussion v0.3 · Hearthgate Math v1.8
 * 3 = GROUND/CALL, 6 = WEAVE/RESPONSE, 9 = CROSS/RELEASE.
 * Phase state is part of the State/Gate Address and is orchestrated by Wardenclyffe.
 * v0.3 adds the executable repeating percussion clock.
 */
(function(global){
  const VERSION='0.3.0',MATH_SPINE='hearthgate.math-spine/v1.8';
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(Number(x))?Number(x):a));
  const DEFAULT_LANES=Object.freeze([
    Object.freeze({id:'three',count:3,role:'ground-call',route:'left',tone_key:'memory',waveform:'sine',gain:0.040,modulation_depth:0.42,accent:[1,.62,.78]}),
    Object.freeze({id:'six',count:6,role:'weave-response',route:'centre',tone_key:'root',waveform:'triangle',gain:0.032,modulation_depth:0.36,accent:[1,.52,.72,.58,.84,.64]}),
    Object.freeze({id:'nine',count:9,role:'cross-release',route:'return',tone_key:'anchor',waveform:'sine',gain:0.026,modulation_depth:0.32,accent:[1,.46,.62,.54,.76,.58,.88,.52,.70]})
  ]);

  function resolveMappedTone(registry,key){
    const t=typeof registry?.get==='function'?registry.get(key):typeof registry==='function'?registry(key):registry?.[key];
    const f=Number(t?.frequency??t?.frequency_hz??t?.carrier_frequency_hz??t);
    if(!Number.isFinite(f)||f<=0)throw new Error(`RUNA_369_UNMAPPED_FREQUENCY:${key}`);
    return Object.freeze({key,frequency:f,label:t?.label||t?.name||key,source:t?.source||t?.registry||'canonical-frequency-registry'});
  }

  function buildStepPattern(lane,cycleSeconds){
    const step=cycleSeconds/lane.count;
    return Object.freeze(Array.from({length:lane.count},(_,i)=>Object.freeze({step:i+1,starts_at_seconds:i*step,duration_seconds:step,accent:clamp(lane.accent?.[i]??.7),phase_radians:(2*Math.PI*i)/lane.count})));
  }

  function compile369Percussion({frequencyRegistry,lanes=DEFAULT_LANES,cycleSeconds=3,masterGain=1,phase=0,stateAddress=null,stratum=null,lineage=null,sourceReceipt=null}={}){
    const duration=Math.max(.25,Number(cycleSeconds)||3),gainScale=clamp(masterGain),phaseOffset=Number(phase)||0;
    const layers=lanes.map(l=>{
      const tone=resolveMappedTone(frequencyRegistry,l.tone_key);
      return Object.freeze({
        id:`runa-369-${l.id}`,label:`Runa ${l.count} · ${l.role}`,family:'runa-369-percussion',role:l.role,count:l.count,pulse_rate_hz:l.count/duration,
        frequency:tone.frequency,route:l.route,gain:clamp(l.gain*gainScale,0,l.gain),waveform:l.waveform,ampMod:l.count/duration,modulationDepth:clamp(l.modulation_depth),
        claimLabel:'runa-369-v18',pattern:buildStepPattern(l,duration),phase_offset:phaseOffset,
        metadata:{tone_key:tone.key,tone_source:tone.source,state_address:stateAddress,stratum,lineage,math_spine:MATH_SPINE}
      });
    });
    const temporal=global.HearthgateMathV18?.temporal369?.(phaseOffset)||null;
    return Object.freeze({schema:'runa.percussion-369-plan/v0.3',version:VERSION,math_spine:MATH_SPINE,renderer_target:'wardenclyffe-then-mobius',cycle_seconds:duration,cycle_signature:'3:6:9',temporal_address:temporal,state_address:stateAddress,stratum,lineage,layers:Object.freeze(layers),provenance:{source_receipt:sourceReceipt,math_spine:MATH_SPINE,frequency_policy:'canonical-mapped-lineage'}});
  }

  function applyHeimdallModulation(plan,h={}){
    if(!plan?.layers)throw new TypeError('3·6·9 plan required.');
    const phi=clamp(h?.phi??h?.controls?.fold_phi??0),us=clamp(h?.controls?.relational_participation??h?.diagnostics?.participation?.us??h?.diagnostics?.participation?.US??0),obs=clamp(h?.controls?.observation_coherence??0),real=clamp(h?.controls?.realisation??0);
    const layers=plan.layers.map(l=>{
      let w=1;
      if(l.count===3)w=1-.3*phi;
      if(l.count===6)w=.8+.25*phi+.15*obs;
      if(l.count===9)w=.65+.35*phi+.25*us+.15*real;
      return Object.freeze({...l,gain:clamp(l.gain*w,0,.07),modulationDepth:clamp(l.modulationDepth+.18*phi+(l.count===9?.18*us:0)+.12*obs,0,.9),metadata:{...l.metadata,fold_phi:phi,relational_participation:us,observation_coherence:obs,realisation:real}});
    });
    return Object.freeze({...plan,schema:'runa.percussion-369-heimdall-plan/v0.3',layers:Object.freeze(layers),heimdall:{phi,us,observation_coherence:obs,realisation:real},math_spine:MATH_SPINE});
  }

  function pulse(bus,layer,step){
    if(!bus?.tone)throw new TypeError('Möbius Audio Bus with tone() is required.');
    const stepSpan=Number(step?.duration_seconds)||0.2;
    const duration=Math.max(.045,Math.min(.16,stepSpan*.34));
    const accent=clamp(step?.accent??.7,.1,1);
    const gain=clamp((Number(layer.gain)||.02)*accent,0,.08);
    bus.tone({frequency:Number(layer.frequency),route:layer.route||'centre',gain,type:layer.waveform||'sine',duration});
  }

  function startClock(bus,plan,{onPulse=null}={}){
    if(!plan?.layers)throw new TypeError('3·6·9 plan required.');
    if(!bus?.tone)throw new TypeError('Möbius Audio Bus with tone() is required.');
    const cycleSeconds=Math.max(.25,Number(plan.cycle_seconds)||3);
    let active=true;
    const timers=new Set();
    let cycleIndex=0;

    function later(fn,ms){
      const id=setTimeout(()=>{timers.delete(id);if(active)fn();},Math.max(0,ms));
      timers.add(id);
      return id;
    }

    function scheduleCycle(){
      if(!active)return;
      const cycleStart=performance.now();
      for(const layer of plan.layers){
        for(const step of layer.pattern||[]){
          later(()=>{
            pulse(bus,layer,step);
            onPulse?.({cycle:cycleIndex,lane:layer.id,count:layer.count,role:layer.role,step:step.step,accent:step.accent,frequency:layer.frequency,route:layer.route,time_ms:performance.now()});
          },Number(step.starts_at_seconds||0)*1000);
        }
      }
      cycleIndex+=1;
      const elapsed=performance.now()-cycleStart;
      later(scheduleCycle,Math.max(1,cycleSeconds*1000-elapsed));
    }

    scheduleCycle();
    return Object.freeze({
      schema:'runa.percussion-369-runtime/v0.3',
      plan,
      stop(){active=false;for(const id of timers)clearTimeout(id);timers.clear();},
      get active(){return active;}
    });
  }

  function toMobiusSpec(plan){
    return Object.freeze({id:`runa-369-${Date.now()}`,label:'Runa 3·6·9 Temporal Lattice',schema:'mobius.layered-spec/runa-369-v0.3',math_spine:MATH_SPINE,layers:plan.layers.map(l=>({...l})),runa_369:{cycle_seconds:plan.cycle_seconds,temporal_address:plan.temporal_address,state_address:plan.state_address,stratum:plan.stratum,lineage:plan.lineage,heimdall:plan.heimdall||null,provenance:plan.provenance}});
  }

  global.Runa369Percussion=Object.freeze({VERSION,MATH_SPINE,DEFAULT_LANES,resolveMappedTone,buildStepPattern,compile369Percussion,applyHeimdallModulation,pulse,startClock,toMobiusSpec});
})(typeof globalThis!=='undefined'?globalThis:window);
