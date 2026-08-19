'use strict';

/* Wardenclyffe Layer Engine v1.8
 * Temporal/layer orchestration between Runa and Flameclyffe/Möbius.
 */
(function(global){
  const VERSION='1.8.1',MATH_SPINE='hearthgate.math-spine/v1.8';
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(Number(x))?Number(x):a));
  const finiteOrNull=v=>Number.isFinite(Number(v))?Number(v):null;

  function normalizeLayer(layer={},source='unknown'){
    return Object.freeze({
      ...layer,
      id:String(layer.id||`${source}-${Math.random().toString(36).slice(2)}`),
      family:layer.family||source,
      metadata:Object.freeze({...layer.metadata,source_engine:source,math_spine:MATH_SPINE})
    });
  }

  function temporalState({timeSeconds=0,cycleSeconds=1}={}){
    const math=global.HearthgateMathV18;
    const t=Number(timeSeconds)||0;
    const phase=math?.temporal369?.(t)||{phase3:(6*Math.PI*t)%(2*Math.PI),phase6:(12*Math.PI*t)%(2*Math.PI),phase9:(18*Math.PI*t)%(2*Math.PI)};
    return Object.freeze({...phase,cycle_seconds:Math.max(.001,Number(cycleSeconds)||1),math_spine:MATH_SPINE});
  }

  function orchestrate({runaPlan=null,heimdallPlan=null,percussionPlan=null,environmentLayers=[],galdrLayers=[],hapticLayers=[],stateAddress=null,stratum=null,lineage=null,timeSeconds=0,sourceReceipt=null}={}){
    const layers=[];
    for(const [plan,name] of [[runaPlan,'runa'],[heimdallPlan,'heimdall'],[percussionPlan,'runa-369']]){
      if(plan?.layers)for(const l of plan.layers)layers.push(normalizeLayer(l,name));
    }
    for(const l of environmentLayers)layers.push(normalizeLayer(l,'environment'));
    for(const l of galdrLayers)layers.push(normalizeLayer(l,'galdr'));
    for(const l of hapticLayers)layers.push(normalizeLayer(l,'haptic'));

    const h=heimdallPlan?.controls||heimdallPlan?.heimdall||{};
    const temporal=temporalState({timeSeconds,cycleSeconds:percussionPlan?.cycle_seconds||1});
    const rawFold=finiteOrNull(h.fold_phi??h.phi),rawCurvature=finiteOrNull(h.fold_curvature),rawUs=finiteOrNull(h.relational_participation??h.us),rawReal=finiteOrNull(h.realisation),rawObs=finiteOrNull(h.observation_coherence);
    const fold=rawFold==null?null:clamp(rawFold),curvature=rawCurvature==null?null:rawCurvature,obs=rawObs==null?null:clamp(rawObs),us=rawUs==null?null:clamp(rawUs),real=rawReal==null?null:clamp(rawReal);

    return Object.freeze({
      schema:'wardenclyffe.layer-orchestration/v1.8',version:VERSION,math_spine:MATH_SPINE,renderer_target:'flameclyffe-mobius',state_address:stateAddress,stratum,lineage,temporal,
      crossing:Object.freeze({fold_phi:fold,fold_curvature:curvature,fold_state:fold==null?'OPEN':'MEASURED',observation_coherence:obs,relational_participation:us,realisation:real,watch_mode:heimdallPlan?.mode||null}),
      layers:Object.freeze(layers.map(layer=>Object.freeze({...layer,metadata:Object.freeze({...layer.metadata,state_address:stateAddress,stratum,lineage,temporal})}))),
      haptics:Object.freeze(hapticLayers.map(x=>Object.freeze({...x,state_address:stateAddress,stratum,lineage,math_spine:MATH_SPINE}))),
      provenance:Object.freeze({source_receipt:sourceReceipt,math_spine:MATH_SPINE,runa:runaPlan?.provenance||null,heimdall:heimdallPlan?.provenance||null,percussion:percussionPlan?.provenance||null})
    });
  }

  function toMobiusSpec(plan){
    if(!plan?.layers)throw new TypeError('Wardenclyffe orchestration plan required.');
    return Object.freeze({id:`wardenclyffe-${Date.now()}`,label:'Wardenclyffe v1.8 · addressed harmonic braid',schema:'mobius.layered-spec/wardenclyffe-v1.8',math_spine:MATH_SPINE,state_address:plan.state_address,stratum:plan.stratum,lineage:plan.lineage,layers:plan.layers.map(l=>({...l})),wardenclyffe:{temporal:plan.temporal,crossing:plan.crossing,haptics:plan.haptics,provenance:plan.provenance}});
  }

  global.WardenclyffeV18LayerEngine=Object.freeze({VERSION,MATH_SPINE,normalizeLayer,temporalState,orchestrate,toMobiusSpec});
})(typeof globalThis!=='undefined'?globalThis:window);
