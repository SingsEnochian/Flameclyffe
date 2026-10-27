/**
 * Living Observer Quantum lens UI.
 * The visible instrument is a mathematical picture of a two-path qubit.
 * Separate from measured NOAA sky, geomancy, Qabalah or PREMAQC/Crow routes.
 */
import {
  quantumDensity,quantumFringe,makeQuantumReceipt,replayQuantumReceipt,
} from './living-observer-quantum-core.js';

const NS='observer.quantum-display/v1';
const el=id=>document.getElementById(id);
const f=x=>(Math.abs(x)<1e-10?0:x).toFixed(4);
const pct=x=>(100*x).toFixed(1)+'%';

function svgBloch(state){
  const {x,y,z}=state.bloch;
  // Orthographic-looking readable projection, not simulated light propagation.
  const px=152+82*(x+.4*y);
  const py=152+82*(.23*x-.36*y-z);
  const points=[
    ['z',152,56,152,248],
    ['x',71,167,233,137],
    ['y',124,184,180,120],
  ];
  const axes=points.map(([axis,x1,y1,x2,y2])=>
    '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="#8aabae" opacity=".75" stroke-width="1.3"/>'+
    '<text x="'+(x2+5)+'" y="'+(y2-2)+'" fill="#dfecdf" font-size="13">'+axis+'</text>').join('');
  return '<svg viewBox="0 0 310 300" role="img" aria-label="Bloch sphere mathematical projection of x='+
    f(x)+' y='+f(y)+' z='+f(z)+'"><circle cx="152" cy="152" r="95" fill="#092331" fill-opacity=".45" stroke="#c9b475" stroke-width="1.4"/>'+
    '<ellipse cx="152" cy="152" rx="95" ry="27" fill="none" stroke="#6cbfae" stroke-opacity=".5"/>'+
    '<ellipse cx="152" cy="152" rx="31" ry="95" fill="none" stroke="#6cbfae" stroke-opacity=".32"/>'+
    axes+'<line x1="152" y1="152" x2="'+f(px)+'" y2="'+f(py)+'" stroke="#ffcc88" stroke-width="4" stroke-linecap="round"/>'+
    '<circle cx="'+f(px)+'" cy="'+f(py)+'" r="7" fill="#f3c783" stroke="#0a1620" stroke-width="1"/>'+
    '<circle cx="152" cy="152" r="3" fill="#e3f3e8"/></svg>';
}
function svgFringe(state){
  const base=quantumFringe({p0:state.input.p0,dephasing:state.input.dephasing,samples:113});
  const width=500,height=244,x0=46,y0=17,xSpan=435,ySpan=194;
  const x=v=>x0+xSpan*v/(Math.PI*2);
  const y=v=>y0+ySpan*(1-v);
  const pts=base.points.map(p=>f(x(p.phaseRad))+','+f(y(p.probability_x_plus))).join(' ');
  const markerX=x(state.input.phaseRad),markerY=y(state.born.xPlus);
  return '<svg viewBox="0 0 '+width+' '+height+'" role="img" aria-label="Conditional X plus detection probability versus phase, dashed dephased reference">'+
    '<rect x="'+x0+'" y="'+y0+'" width="'+xSpan+'" height="'+ySpan+'" fill="#071925" stroke="#597782" stroke-width="1"/>'+
    '<line x1="'+x0+'" y1="'+y(.5)+'" x2="'+(x0+xSpan)+'" y2="'+y(.5)+'" stroke="#86adc9" stroke-dasharray="6 6" opacity=".8"/>'+
    '<polyline fill="none" stroke="#efc682" stroke-width="3" points="'+pts+'"/>'+
    '<line x1="'+f(markerX)+'" y1="'+y0+'" x2="'+f(markerX)+'" y2="'+(y0+ySpan)+'" stroke="#a7f1d3" stroke-dasharray="2 5"/>'+
    '<circle cx="'+f(markerX)+'" cy="'+f(markerY)+'" r="5.4" fill="#a7f1d3"/>'+
    '<g fill="#cededc" font-size="13"><text x="4" y="21">1</text><text x="5" y="'+f(y(.5)+4)+'">½</text>'+
    '<text x="5" y="'+f(y(0)+4)+'">0</text><text x="'+x0+'" y="232">0</text>'+
    '<text x="'+f(x(Math.PI)-11)+'" y="232">π</text><text x="'+f(x(Math.PI*2)-19)+'" y="232">2π</text></g></svg>';
}
export function renderQuantumFigures(state){
  if(state?.schema!=='observer.quantum-density-instrument/v1')throw new Error('Quantum UI: expected mathematical density state');
  return {sphere:svgBloch(state),fringe:svgFringe(state)};
}
function readSettings(){
  const p0=Number(el('quantumP0').value)/100;
  const phaseRad=Number(el('quantumPhase').value)*Math.PI/180;
  const dephasing=Number(el('quantumDephasing').value)/100;
  const shots=Number(el('quantumShots').value);
  const seed=Number(el('quantumSeed').value);
  return {p0,phaseRad,dephasing,shots,seed};
}
function init(){
  if(!el('observerQuantum'))return;
  const inputs=['quantumP0','quantumPhase','quantumDephasing','quantumShots','quantumSeed'];
  let last=null,busy=false;
  const resetReceipt=()=>{
    last=null;
    el('quantumReceipts').textContent='No detector trial run on these parameters.';
    el('quantumTrialStatus').textContent='Predictions are analytical. Detector counts require an explicit simulation click.';
    el('quantumExport').disabled=true;
  };
  const render=()=>{
    let state;
    try{state=quantumDensity(readSettings());}
    catch(e){el('quantumTrialStatus').textContent=e.message;return;}
    el('quantumP0Value').textContent=pct(state.input.p0);
    el('quantumPhaseValue').textContent=(state.input.phaseRad*180/Math.PI).toFixed(0)+'°';
    el('quantumDephasingValue').textContent=pct(state.input.dephasing);
    const g=renderQuantumFigures(state);
    el('quantumBloch').innerHTML=g.sphere;
    el('quantumFringe').innerHTML=g.fringe;
    el('quantumBorn').textContent=
      'Path |0⟩: '+pct(state.born.z0)+' · Path |1⟩: '+pct(state.born.z1)+'\n'+
      'X+ after ideal recombination: '+pct(state.born.xPlus)+'\n'+
      'X−: '+pct(state.born.xMinus)+' · Y+: '+pct(state.born.yPlus);
    const d=state.density_matrix;
    const complex=c=>f(c.re)+(c.im>=0?' + ':' − ')+f(Math.abs(c.im))+'i';
    el('quantumMatrix').textContent=
      'ρ = [ '+f(d.rho00.re)+' , '+complex(d.rho01)+' ]\n'+
      '    [ '+complex(d.rho10)+' , '+f(d.rho11.re)+' ]\n\n'+
      'Tr(ρ) = 1 · det(ρ) = '+f(d.determinant);
    el('quantumIntegrity').textContent=
      'Bloch radius '+f(state.bloch.radius)+' · purity '+f(state.coherence.purity)+
      ' · entropy '+f(state.coherence.von_neumann_entropy_bits)+' bits\n'+
      'Fringe visibility '+f(state.coherence.fringe_visibility)+
      ' · path predictability '+f(state.coherence.which_path_predictability)+
      ' · V²+P² = '+f(state.coherence.complementarity_sum_squares);
    el('quantumTruth').textContent=
      'All six invariants: '+(Object.values(state.mathematical_invariants).every(Boolean)?'verified algebraically':'FAILED')+
      '. No QPU, sensor, sky, historical document, consciousness or cosmological coupling was measured.';
  };
  inputs.forEach(id=>el(id).addEventListener(id==='quantumShots'?'change':'input',()=>{
    if(busy)return;
    resetReceipt();render();
  }));
  el('quantumSimulate').addEventListener('click',async()=>{
    if(busy)return;
    busy=true;el('quantumSimulate').disabled=true;
    el('quantumTrialStatus').textContent='Calculating and independently replaying synthetic detector receipts…';
    try{
      const packet=await makeQuantumReceipt(readSettings());
      const replay=await replayQuantumReceipt(packet);
      if(!replay.matched)throw new Error('Replay was not verified');
      last=packet;
      el('quantumTrialStatus').textContent=
        'Verified synthetic sample: '+packet.trial.plus+' X+ / '+packet.trial.minus+' X− of '+
        packet.trial.shots+' shots; expected '+pct(packet.trial.predicted_p_plus)+
        ', sampled '+pct(packet.trial.sampled_frequency_plus)+'. Seed '+packet.trial.seed+'.';
      el('quantumReceipts').textContent=JSON.stringify({receipt:packet,replay},null,2);
      el('quantumExport').disabled=false;
    }catch(e){
      resetReceipt();
      el('quantumTrialStatus').textContent='Cannot claim verified sample: '+e.message;
    }finally{busy=false;el('quantumSimulate').disabled=false;}
  });
  el('quantumReset').addEventListener('click',()=>{
    if(busy)return;
    el('quantumP0').value='50';el('quantumPhase').value='0';
    el('quantumDephasing').value='0';el('quantumShots').value='512';el('quantumSeed').value='104729';
    resetReceipt();render();
  });
  el('quantumExport').addEventListener('click',()=>{
    if(!last)return;
    const bytes=new Blob([JSON.stringify(last,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(bytes);
    const a=document.createElement('a');a.href=url;a.download='observer-quantum-synthetic-receipt.json';a.click();
    URL.revokeObjectURL(url);
  });
  window.LIVING_OBSERVER_QUANTUM={
    schema:NS,has_verified_local_receipt:()=>last!==null,
    snapshot:()=>quantumDensity(readSettings()),
    simulated_receipt:()=>last,
    restrictions:'no hardware measurement, no live QPU or cosmos coupling',
  };
  render();
}
if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
}
