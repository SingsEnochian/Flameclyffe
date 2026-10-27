/**
 * Nikola Heart/Brain visual organ, mounted in existing Living Observer.
 * User-invoked synthetic data only. No network or private accounts.
 */
import {
  deriveNikolaHeartBrain,runNikolaHeartBrainTrial,replayNikolaHeartBrain,
} from './nikola-heart-brain.js';
const el=id=>document.getElementById(id);
const pct=x=>(x*100).toFixed(2)+'%';
const fmt=x=>Number(x).toFixed(5);
function inputs(){
  return {
    p0:Number(el('quantumP0').value)/100,
    phaseRad:Number(el('quantumPhase').value)*Math.PI/180,
    dephasing:Number(el('quantumDephasing').value)/100,
    priorCoherent:Number(el('nikolaBrainPrior').value)/100,
    philosophy:el('nikolaPhilosophy').value,
    spirituality:el('nikolaSpirituality').value,
    shots:Number(el('quantumShots').value),
    seed:Number(el('quantumSeed').value),
  };
}
function probabilityBars(brain){
  const e=el('nikolaBrainAxes');
  e.replaceChildren();
  for(const a of brain.candidates){
    const card=document.createElement('article');
    const header=document.createElement('div');
    header.className='nikola-axis-heading';
    const name=document.createElement('strong');
    name.textContent=a.basis+' basis'+(a.basis===brain.recommended_basis?' · recommended':'');
    const gain=document.createElement('span');gain.textContent=fmt(a.expected_information_gain_bits)+' bits';
    header.append(name,gain);
    const plot=document.createElement('div');plot.className='nikola-axis-track';
    const stroke=document.createElement('div');stroke.className='nikola-axis-fill';
    stroke.style.width=(Math.max(0,Math.min(1,a.expected_information_gain_bits))*100).toFixed(2)+'%';
    plot.append(stroke);
    const text=document.createElement('p');
    text.textContent='P(+ | coherent) '+pct(a.p_plus_given_coherent)+
      ' · P(+ | dephased) '+pct(a.p_plus_given_dephased);
    card.append(header,plot,text);
    e.append(card);
  }
}
export function formatNikolaPreview(frame){
  return {
    heart:'The HEART computes: P(X+)='+pct(frame.heart.quantum.born.xPlus)+
      ', P(Y+)='+pct(frame.heart.quantum.born.yPlus)+
      ', P(Z+)='+pct(frame.heart.quantum.born.z0)+
      '; purity='+fmt(frame.heart.quantum.coherence.purity)+
      '; λ='+fmt(frame.heart.quantum.input.dephasing)+'.\n'+
      'Source: analytic quantum state, not a physical detector.',
    brain:'The BRAIN compares coherent (λ=0) with dephased (λ=1).\n'+
      'P(coherent)='+pct(frame.brain.prior.coherent)+
      ', P(dephased)='+pct(frame.brain.prior.dephased)+'.\n'+
      'Recommended next measurement: '+frame.brain.recommended_basis+
      ' basis; expected information gain '+fmt(frame.brain.maximum_information_gain_bits)+
      ' bits per ideal trial.\n'+
      'Intermediate decoherence, instrumentation errors and alternative explanations remain open.',
    reflection:'PHILOSOPHY · '+frame.heart.philosophy.title+
      '\n'+frame.heart.philosophy.question+
      '\n\nSPIRITUALITY · '+frame.heart.spirituality.title+
      '\n'+frame.heart.spirituality.question+
      '\n\nThese are interpretive questions. They never supply numerical likelihoods.',
  };
}
function init(){
  if(!el('nikolaHeartBrain'))return;
  let busy=false,last=null;
  const preview=()=>{
    try{
      const frame=deriveNikolaHeartBrain(inputs());
      const text=formatNikolaPreview(frame);
      el('nikolaHeart').textContent=text.heart;
      el('nikolaBrain').textContent=text.brain;
      el('nikolaReflections').textContent=text.reflection;
      el('nikolaBrainPriorValue').textContent=Number(el('nikolaBrainPrior').value)+'%';
      el('nikolaBrainBoundary').textContent=frame.brain.interpretation_boundary;
      probabilityBars(frame.brain);
    }catch(e){
      el('nikolaBrainStatus').textContent='Heart/brain held: '+e.message;
    }
  };
  const clear=()=>{
    last=null;
    el('nikolaBrainReceipt').textContent='No explicit synthetic trial has been run.';
    el('nikolaBrainExport').disabled=true;
    el('nikolaBrainStatus').textContent=
      'Ready for an explicitly invoked, deterministic thought experiment. No external measurements.';
  };
  const refresh=()=>{
    if(busy)return;
    clear();preview();
  };
  el('nikolaBrainPrior').addEventListener('input',refresh);
  for(const id of ['nikolaPhilosophy','nikolaSpirituality'])
    el(id).addEventListener('change',refresh);
  const quantumControls=el('quantumControls');
  if(quantumControls){
    quantumControls.addEventListener('input',refresh);
    quantumControls.addEventListener('change',refresh);
  }
  el('nikolaBrainTrial').addEventListener('click',async()=>{
    if(busy)return;
    busy=true;
    el('nikolaBrainTrial').disabled=true;
    const settings=inputs();
    el('nikolaBrainStatus').textContent='Running local synthetic trial and replaying receipt…';
    try{
      const receipt=await runNikolaHeartBrainTrial({...settings,basis:'auto'});
      const replay=await replayNikolaHeartBrain(receipt);
      if(!replay.matched)throw new Error('receipt replay mismatch');
      last=receipt;
      const {detector,update}=receipt;
      el('nikolaBrainStatus').textContent=
        'Local synthetic trial replayed. Basis '+detector.basis+
        ': '+detector.plus+' positive / '+detector.minus+
        ' negative of '+detector.shots+' simulated detections. '+
        (update.posterior?
          'Conditional posterior: coherent '+pct(update.posterior[0])+
          ', dephased '+pct(update.posterior[1])+'.':
          'Neither ideal endpoint model explains these counts.')+
        ' Nothing was physically measured.';
      el('nikolaBrainReceipt').textContent=JSON.stringify({
        evidence_type:'synthetic and local',
        sha256:receipt.sha256,
        experiment:{input:receipt.inputs,basis:detector.basis,
          counts:[detector.plus,detector.minus],model_probability:detector.model_probability_plus},
        result:update,
        source_and_permissions:receipt.provenance,
        replay,
        unresolved_alternatives:receipt.frame.brain.alternatives,
      },null,2);
      el('nikolaBrainExport').disabled=false;
    }catch(e){
      last=null;
      el('nikolaBrainExport').disabled=true;
      el('nikolaBrainStatus').textContent='No verified synthetic result: '+e.message;
    }finally{
      busy=false;el('nikolaBrainTrial').disabled=false;
    }
  });
  el('nikolaBrainClear').addEventListener('click',()=>{if(!busy)clear();});
  el('nikolaBrainExport').addEventListener('click',()=>{
    if(!last)return;
    const url=URL.createObjectURL(new Blob([JSON.stringify(last,null,2)],
      {type:'application/json'}));
    const a=document.createElement('a');
    a.href=url;a.download='nikola-heart-brain-synthetic-receipt.json';
    a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  window.NIKOLA_HEART_BRAIN={
    schema:'wayglass.nikola-heart-brain-ui/v1',
    snapshot:()=>deriveNikolaHeartBrain(inputs()),
    last_synthetic_receipt:()=>last,
    authority:'local, read-only mathematical experiment; no quantum hardware or personal data',
  };
  clear();preview();
}
if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
}
