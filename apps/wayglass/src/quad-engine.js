// Wayglass Quad Engine v0.1. Explicit simulation, not quantum hardware.
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const complex=(re=0,im=0)=>{if(!finite(re)||!finite(im))throw Error('Nonfinite amplitude');return {re,im};};
const abs2=z=>z.re*z.re+z.im*z.im;
export const stateEngine={
 normalize(amplitudes){
  if(!Array.isArray(amplitudes)||amplitudes.length<1||amplitudes.length>1024||!amplitudes.every(z=>finite(z?.re)&&finite(z?.im)))throw Error('Invalid state');
  const norm=Math.sqrt(amplitudes.reduce((sum,z)=>sum+abs2(z),0));
  if(norm===0)throw Error('Zero norm');
  return amplitudes.map(z=>complex(z.re/norm,z.im/norm));
 },
 probabilities(amplitudes){return this.normalize(amplitudes).map(abs2);},
 hadamard(amplitudes){
  if(amplitudes.length!==2)throw Error('Hadamard requires one qubit');
  const a=this.normalize(amplitudes),k=Math.SQRT1_2;
  return [complex((a[0].re+a[1].re)*k,(a[0].im+a[1].im)*k),complex((a[0].re-a[1].re)*k,(a[0].im-a[1].im)*k)];
 }
};
export const geometryEngine={
 foldIndex(singularValues){
  if(!Array.isArray(singularValues)||!singularValues.length||singularValues.some(x=>!finite(x)||x<0))throw Error('Invalid singular values');
  const max=Math.max(...singularValues),min=Math.min(...singularValues);
  return {conditionNumber:min===0?Infinity:max/min,foldIndex:max===0?1:1-min/max,domain:'MATHEMATICAL_SIMULATION'};
 },
 starVertices(points=8,radius=1,phase=0){
  if(!Number.isInteger(points)||points<3||points>256||!finite(radius)||radius<=0||!finite(phase))throw Error('Invalid geometry');
  return Array.from({length:points},(_,i)=>({x:radius*Math.cos(phase+2*Math.PI*i/points),y:radius*Math.sin(phase+2*Math.PI*i/points)}));
 }
};
export const temporalEngine={
 schedule({now,nextDueAt,leaseUntil=null}){
  const t=Date.parse(now),due=Date.parse(nextDueAt),lease=leaseUntil==null?-Infinity:Date.parse(leaseUntil);
  if([t,due,lease].some(x=>Number.isNaN(x)))throw Error('Invalid clock');
  return {ready:t>=due&&t>=lease,reason:t<due?'not_due':t<lease?'leased':'ready'};
 }
};
export const becomingEngine={
 derive({participant,knowledge,method=null,question}){
  if(typeof participant!=='string'||!participant.trim()||typeof question!=='string'||!question.trim()||!Array.isArray(knowledge))throw Error('Invalid inquiry');
  return {participant,question,method,availableAncestors:knowledge.map(x=>x.id),register:'HYPOTHESIS',authorityGrant:false};
 }
};
export function runQuadEngine({amplitudes=[complex(1,0),complex(0,0)],singularValues=[1,1],clock,participant='Wayglass',knowledge=[],question='What shall I explore?'}={}){
 return {schema:'wayglass.quad-engine/v0.1',execution:'classical-simulation',
  state:{probabilities:stateEngine.probabilities(amplitudes)},
  geometry:geometryEngine.foldIndex(singularValues),
  temporal:clock?temporalEngine.schedule(clock):null,
  becoming:becomingEngine.derive({participant,knowledge,question})};
}
