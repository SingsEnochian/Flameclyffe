'use strict';

/* Heimdall Coupled Watch v0.3 · Hearthgate Math v1.8
 * Reads local fold geometry when measured and remains fully active on observation geometry
 * when singular/fold coordinates are OPEN.
 * Runa composes; Wardenclyffe orchestrates; Möbius renders; Heimdall watches the turn.
 */
(function(global){
  const VERSION='0.3.0';
  const MATH_SPINE='hearthgate.math-spine/v1.8';
  const EPS=1e-12;
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(Number(x))?Number(x):a));
  const norm2=(v=[])=>v.reduce((s,x)=>s+(Number(x)||0)**2,0);
  const frob=(m=[])=>Math.sqrt(m.flat().reduce((s,x)=>s+(Number(x)||0)**2,0));

  function validateBlocks(blocks,n){
    if(!Array.isArray(blocks)||!blocks.length)throw new TypeError('Heimdall blocks are required.');
    for(const b of blocks){
      if(!b?.id||!Number.isInteger(b.start)||!Number.isInteger(b.end)||b.start<0||b.end<=b.start||b.end>n){
        throw new RangeError(`Invalid Heimdall block ${b?.id||'?'}`);
      }
    }
  }

  function blockParticipation(vMin,blocks){
    validateBlocks(blocks,vMin.length);
    const total=Math.max(EPS,norm2(vMin));
    return Object.freeze(Object.fromEntries(blocks.map(b=>[b.id,norm2(vMin.slice(b.start,b.end))/total])));
  }

  function couplingTopology(matrix,blocks){
    if(!Array.isArray(matrix)||!matrix.length)return Object.freeze({});
    validateBlocks(blocks,matrix.length);
    const out={};
    for(const dst of blocks){
      out[dst.id]={};
      for(const src of blocks){
        if(src.id===dst.id)continue;
        const sub=[];
        for(let r=dst.start;r<dst.end;r++)sub.push((matrix[r]||[]).slice(src.start,src.end));
        out[dst.id][src.id]=frob(sub);
      }
    }
    return Object.freeze(out);
  }

  function observationCoherence(witnesses=[]){
    const math=global.HearthgateMathV18;
    if(math?.observationCoherence)return math.observationCoherence(witnesses);
    const rows=witnesses.filter(Array.isArray).filter(v=>v.length);
    if(rows.length<2)return rows.length?1:0;
    const n=Math.min(...rows.map(r=>r.length));
    const mean=Array.from({length:n},(_,j)=>rows.reduce((s,r)=>s+(Number(r[j])||0),0)/rows.length);
    let spread=0,total=0;
    for(const r of rows)for(let j=0;j<n;j++){
      const x=Number(r[j])||0;
      spread+=(x-mean[j])**2;
      total+=x*x;
    }
    return clamp(1-spread/(total+EPS));
  }

  function transformedWitnesses(witnesses=[],transforms=[]){
    return witnesses.map((row,i)=>{
      const scale=Number.isFinite(Number(transforms[i]))?Number(transforms[i]):1;
      return Array.isArray(row)?row.map(x=>(Number(x)||0)*scale):[];
    });
  }

  function relationalObservationCoherence(witnesses=[],transforms=[]){
    return observationCoherence(transformedWitnesses(witnesses,transforms));
  }

  function resolveMappedTone(registry,key){
    if(!registry)throw new TypeError('Canonical frequency registry required.');
    const tone=typeof registry.get==='function'?registry.get(key):typeof registry==='function'?registry(key):registry[key];
    const frequency=Number(tone?.frequency??tone?.frequency_hz??tone?.carrier_frequency_hz??tone);
    if(!Number.isFinite(frequency)||frequency<=0)throw new Error(`HEIMDALL_UNMAPPED_FREQUENCY:${key}`);
    return Object.freeze({key,frequency,label:tone?.label||tone?.name||key,source:tone?.source||tone?.registry||'canonical-frequency-registry'});
  }

  const toneKey=b=>b.toneKey||b.frequencyKey||b.id;

  function observeRelation({
    witnesses=[],
    witnessTransforms=[],
    observationMatrix=[],
    blocks=[],
    stateAddress=null,
    stratum=null,
    lineage=null,
    sourceReceipt=null,
    relation='coupled-witness'
  }={}){
    const transformed=transformedWitnesses(witnesses,witnessTransforms);
    const cObs=relationalObservationCoherence(witnesses,witnessTransforms);
    const oTopology=observationMatrix?.length&&blocks?.length?couplingTopology(observationMatrix,blocks):Object.freeze({});
    return Object.freeze({
      schema:'heimdall.observation-watch/v0.3',
      compiler_version:VERSION,
      math_spine:MATH_SPINE,
      mode:'observation-active/fold-open',
      controls:Object.freeze({
        fold_phi:null,
        fold_curvature:null,
        observation_coherence:cObs,
        relational_participation:null,
        realisation:null
      }),
      diagnostics:Object.freeze({
        singular_structure:'OPEN',
        fold_curvature:'OPEN',
        crossing_manifold:'OPEN',
        observation_relation:relation,
        witnesses:Object.freeze(witnesses.map(x=>Object.freeze([...(x||[])]))),
        transformed_witnesses:Object.freeze(transformed.map(x=>Object.freeze([...x]))),
        observation_coupling:oTopology,
        observation_coherence:cObs,
        state_address:stateAddress,
        stratum,
        lineage
      }),
      layers:Object.freeze([]),
      provenance:Object.freeze({source_receipt:sourceReceipt,math_spine:MATH_SPINE})
    });
  }

  function compileHeimdallSonification(input={},opts={}){
    const {frequencyRegistry,maxGain=0.02,relationToneKey='us'}=opts;
    const {singularValues=[],vMin=[],blocks=[],jacobian=[],observationMatrix=[],witnesses=[],foldCurvature=0,bearingAlignment=0,memory=0,continuity=0,phi:suppliedPhi=null,realisation=0,stateAddress=null,stratum=null,lineage=null,sourceReceipt=null}=input;
    if(!vMin.length||!singularValues.length)throw new TypeError('Heimdall singularValues and vMin are required for fold sonification. Use observeRelation() for an active watch with OPEN fold coordinates.');
    const sigmaMax=Math.max(...singularValues.map(Number)),sigmaMin=Math.min(...singularValues.map(Number));
    const phi=suppliedPhi==null?(sigmaMax>EPS?1-sigmaMin/sigmaMax:0):clamp(suppliedPhi);
    const p=blockParticipation(vMin,blocks),jTopology=couplingTopology(jacobian,blocks),oTopology=couplingTopology(observationMatrix,blocks);
    const usKey=Object.keys(p).find(k=>k.toLowerCase()==='us'),pUs=usKey?clamp(p[usKey]):0,cObs=observationCoherence(witnesses),rho=clamp(realisation);
    const layers=[];
    blocks.forEach((b,i)=>{
      const tone=resolveMappedTone(frequencyRegistry,toneKey(b));
      const part=clamp(p[b.id]||0);
      layers.push(Object.freeze({id:`heimdall-block-${b.id}`,label:`${tone.label} · ${b.id}`,frequency:tone.frequency,route:b.route||['left','right','centre','return'][i%4],gain:clamp(maxGain*Math.sqrt(part)*(0.25+0.75*phi),0,maxGain),waveform:b.waveform||'sine',family:'heimdall-block',claimLabel:'heimdall-v18',metadata:{participation:part,fold_phi:phi,bearing_alignment:Number(bearingAlignment)||0,state_address:stateAddress,stratum,lineage,math_spine:MATH_SPINE}}));
    });
    const edges=[];
    for(const [dst,sources] of Object.entries(jTopology))for(const [src,val] of Object.entries(sources))edges.push({src,dst,val:Number(val)||0});
    const maxEdge=Math.max(EPS,...edges.map(e=>e.val));
    edges.sort((a,b)=>b.val-a.val).slice(0,12).forEach((e,i)=>{
      const b=blocks.find(x=>x.id===e.src)||{id:e.src};
      const tone=resolveMappedTone(frequencyRegistry,toneKey(b));
      const strength=e.val/maxEdge;
      layers.push(Object.freeze({id:`heimdall-coupling-${e.src}-to-${e.dst}`,label:`${e.src} → ${e.dst}`,frequency:tone.frequency,ampMod:0.1+5.9*strength,modulationDepth:clamp(0.08+0.72*strength),route:i%2?'right':'left',gain:clamp(maxGain*0.55*strength,0,maxGain),waveform:'sine',family:'heimdall-coupling',claimLabel:'heimdall-v18',metadata:{source_block:e.src,destination_block:e.dst,dynamical_coupling:e.val,observation_coupling:oTopology?.[e.dst]?.[e.src]||0,math_spine:MATH_SPINE}}));
    });
    if(pUs>EPS){
      const tone=resolveMappedTone(frequencyRegistry,relationToneKey);
      layers.push(Object.freeze({id:'heimdall-relational-us',label:'US · relational mode',frequency:tone.frequency,route:'return',gain:clamp(maxGain*pUs*(0.5+0.5*cObs),0,maxGain),waveform:'sine',family:'heimdall-relational',claimLabel:'heimdall-v18',metadata:{participation:pUs,observation_coherence:cObs,realisation:rho,operation:'intermodulate-mapped-tones',state_address:stateAddress,stratum,lineage,math_spine:MATH_SPINE}}));
    }
    return Object.freeze({schema:'heimdall.sonification-layer-plan/v0.3',compiler_version:VERSION,math_spine:MATH_SPINE,renderer_target:'wardenclyffe-then-mobius',layers:Object.freeze(layers),controls:Object.freeze({fold_phi:phi,fold_curvature:Number(foldCurvature)||0,bearing_alignment:Number(bearingAlignment)||0,memory_return:clamp(memory),continuity_sustain:clamp(continuity),observation_coherence:cObs,relational_participation:pUs,realisation:rho}),diagnostics:Object.freeze({sigma_min:sigmaMin,sigma_max:sigmaMax,participation:p,dynamical_coupling:jTopology,observation_coupling:oTopology,state_address:stateAddress,stratum,lineage}),provenance:Object.freeze({source_receipt:sourceReceipt,math_spine:MATH_SPINE,frequency_policy:'canonical-mapped-lineage'})});
  }

  function toMobiusSpec(plan){
    if(!plan?.layers)throw new TypeError('Compiled Heimdall plan required.');
    return Object.freeze({id:`heimdall-${Date.now()}`,label:'Heimdall Coupled Watch v1.8',schema:'mobius.layered-spec/heimdall-v0.3',math_spine:MATH_SPINE,layers:plan.layers.map(l=>({...l})),heimdall:{controls:plan.controls,diagnostics:plan.diagnostics,provenance:plan.provenance}});
  }

  const api=Object.freeze({VERSION,MATH_SPINE,blockParticipation,couplingTopology,observationCoherence,transformedWitnesses,relationalObservationCoherence,observeRelation,resolveMappedTone,compileHeimdallSonification,toMobiusSpec});
  global.HeimdallSonificationCompiler=api;
})(typeof globalThis!=='undefined'?globalThis:window);
