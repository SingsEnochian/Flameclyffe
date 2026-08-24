'use strict';

/* Hearthgate Braided Spine v1.8 runtime primitives.
 * Shared by Heimdall, Runa/Wardenclyffe, Möbius adapters, Galdr Observatory,
 * Observer, Arcsweep, and replay/receipt code.
 */
(function (global) {
  const VERSION = '1.8.0';
  const SCHEMA = 'hearthgate.math-spine/v1.8';
  const EPS = 1e-12;
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(Number(x))?Number(x):a));
  const norm2=(v=[])=>v.reduce((s,x)=>s+(Number(x)||0)**2,0);

  function stateAddress({omega=null,phi=null,rhythm=null,tau=null,chi=null,relation=null,consciousness=null,stratum=null}={}){
    return Object.freeze({omega,phi,rhythm,tau,chi,relation,consciousness,stratum});
  }

  function relationalParticipation(vMin=[], blocks=[]){
    const total=Math.max(EPS,norm2(vMin));
    const us=blocks.find(b=>String(b.id).toLowerCase()==='us');
    if(!us)return 0;
    return clamp(norm2(vMin.slice(us.start,us.end))/total);
  }

  function observationCoherence(witnesses=[]){
    const rows=witnesses.filter(Array.isArray).filter(v=>v.length);
    if(rows.length<2)return rows.length===1?1:0;
    const n=Math.min(...rows.map(r=>r.length));
    const mean=Array.from({length:n},(_,j)=>rows.reduce((s,r)=>s+(Number(r[j])||0),0)/rows.length);
    let spread=0,total=0;
    for(const r of rows){
      for(let j=0;j<n;j++){
        const x=Number(r[j])||0;
        spread+=(x-mean[j])**2;
        total+=x*x;
      }
    }
    return clamp(1-spread/(total+EPS));
  }

  function galdrAlignment(g=[],vMin=[]){
    if(!Array.isArray(g)||!Array.isArray(vMin)||!g.length||g.length!==vMin.length)return null;
    const dot=g.reduce((s,x,i)=>s+(Number(x)||0)*(Number(vMin[i])||0),0);
    const a=Math.sqrt(norm2(g)),b=Math.sqrt(norm2(vMin));
    return a&&b?clamp(Math.abs(dot)/(a*b)):null;
  }

  function ir2Coupling({galdrAlignment:gamma=0,usParticipation=0,observationCoherence:cObs=0,realisation=0}={}){
    return clamp(gamma)*clamp(usParticipation)*clamp(cObs)*clamp(realisation);
  }

  function temporal369(tSeconds=0){
    const phase=n=>(2*Math.PI*n*Number(tSeconds||0))%(2*Math.PI);
    const p3=phase(3),p6=phase(6),p9=phase(9);
    return Object.freeze({phase3:p3,phase6:p6,phase9:p9,delta36:p3-p6,delta69:p6-p9,delta39:p3-p9});
  }

  function stratifiedState(state={}, {time=null,stratum=null,lineage=null}={}){
    return Object.freeze({state:Object.freeze({...state}),time,stratum,lineage,math_spine:SCHEMA});
  }

  function trajectoryPoint({timestamp=Date.now(),address={},premaq=null,heimdall=null,witness=null,lineage=null}={}){
    return Object.freeze({timestamp,address:stateAddress(address),premaq,heimdall,witness,lineage,math_spine:SCHEMA});
  }

  function receipt(base={}){
    return Object.freeze({...base,math_spine:SCHEMA,math_version:VERSION});
  }

  const api=Object.freeze({VERSION,SCHEMA,EPS,clamp,stateAddress,relationalParticipation,observationCoherence,galdrAlignment,ir2Coupling,temporal369,stratifiedState,trajectoryPoint,receipt});
  global.HearthgateMathV18=api;
})(typeof globalThis!=='undefined'?globalThis:window);
