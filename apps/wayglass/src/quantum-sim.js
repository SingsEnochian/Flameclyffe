/**
 * Small exact single-qubit state-vector simulator for Nikola, N-017.
 * Quantum mechanics research is a computational model, NOT quantum hardware,
 * consciousness measurement, physical portals or universe traversal.
 */
export const QUANTUM_SIM_SCHEMA='wayglass.quantum-statevector/v1';
const SQRT2=Math.SQRT2;
const round=x=>Number(x.toFixed(12));
export function runQubitCircuit(gates=[],{basis='zero'}={}){
 if(!Array.isArray(gates)||gates.length>64)throw Error('At most 64 explicit quantum gates');
 if(!['zero','one'].includes(basis))throw Error('Unsupported basis');
 let a=basis==='zero'?[1,0]:[0,0],b=basis==='one'?[1,0]:[0,0];
 const snapshot=()=>Object.freeze({
  amplitude_zero:Object.freeze([...a].map(round)),
  amplitude_one:Object.freeze([...b].map(round)),
  probability_zero:round(a[0]*a[0]+a[1]*a[1]),
  probability_one:round(b[0]*b[0]+b[1]*b[1]),
 });
 const initial=snapshot();
 for(const gate of gates){
  if(gate==='H'){
   const x=[(a[0]+b[0])/SQRT2,(a[1]+b[1])/SQRT2];
   const y=[(a[0]-b[0])/SQRT2,(a[1]-b[1])/SQRT2];
   a=x;b=y;
  }else if(gate==='X'){[a,b]=[b,a]}
  else if(gate==='Z'){b=[-b[0],-b[1]]}
  else if(gate==='S'){b=[-b[1],b[0]]}
  else if(gate==='T'){
   const c=Math.SQRT1_2,si=c;
   b=[b[0]*c-b[1]*si,b[0]*si+b[1]*c];
  }else throw Error('Unknown quantum gate');
 }
 const result=snapshot();
 if(Math.abs(result.probability_zero+result.probability_one-1)>1e-9)
  throw Error('Normalization invariant failed');
 return Object.freeze({schema:QUANTUM_SIM_SCHEMA,kind:'local-statevector-simulation',
  basis,gates:Object.freeze([...gates]),initial,result,hardware:'none',
  physical_universe_access:false,measured:false,canon_commit:false});
}
export function mountQuantumConsole(root){
 const lab=root.querySelector('[data-surface="nikola-lab"]');
 if(!lab)return()=>{};
 const station=document.createElement('section');station.className='glass-panel wg-quantum-console';
 station.setAttribute('aria-label','Nikola computational quantum mechanics station');
 station.innerHTML=[
  '<h2>Quantum Lab · State-vector simulator</h2>',
  '<p>One ideal qubit. Mathematically exact gates before rounding. No quantum hardware, external universe access or model call.</p>',
  '<label>Initial basis <select data-quantum-basis><option value="zero">|0⟩</option><option value="one">|1⟩</option></select></label>',
  '<div data-quantum-gates role="group" aria-label="Quantum gates">',
   '<button type="button" data-gate="H">Hadamard H</button>',
   '<button type="button" data-gate="X">Pauli X</button>',
   '<button type="button" data-gate="Z">Pauli Z</button>',
   '<button type="button" data-gate="S">Phase S</button>',
   '<button type="button" data-gate="T">Phase T</button>',
   '<button type="button" data-reset>Reset circuit</button>',
  '</div>',
  '<output data-quantum-trial role="status">|0⟩ · no gates. Computational simulation idle.</output>',
  '<pre data-quantum-result></pre>',
 ].join('');
 const instrument=lab.querySelector('[aria-label="Research instrument"]');
 instrument?.append(station);
 const gates=[];const output=station.querySelector('[data-quantum-result]');
 const status=station.querySelector('[data-quantum-trial]');
 const basis=station.querySelector('[data-quantum-basis]');
 const render=()=>{
  const packet=runQubitCircuit(gates,{basis:basis.value});
  status.textContent='Simulated '+gates.length+' gates. P(|0⟩)='+packet.result.probability_zero+
    ', P(|1⟩)='+packet.result.probability_one+'. Hardware: none.';
  output.textContent=JSON.stringify(packet,null,2);
 };
 const onClick=e=>{
  const gate=e.target.closest?.('[data-gate]');
  if(gate&&station.contains(gate)){if(gates.length>=64)return;gates.push(gate.dataset.gate);render()}
  else if(e.target.closest?.('[data-reset]')){gates.length=0;render()}
 };
 const onBasis=()=>{gates.length=0;render()};
 station.addEventListener('click',onClick);basis.addEventListener('change',onBasis);
 render();
 return()=>{
  station.removeEventListener('click',onClick);basis.removeEventListener('change',onBasis);
  station.remove();
 };
}
