// Wayglass Field Instrument v0.1: explicitly illustrative softened potential,
// not a general-relativistic metric or geodesic integrator.
// All numerical derivatives use the same displacement function as the display.
export const FIELD_SCHEMA = 'wayglass.field-instrument/v0.1';
const finite=(v,name)=>{if(typeof v!=='number'||!Number.isFinite(v))throw new TypeError(name+' must be finite');return v;};
function modelOptions(value={}){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('Options must be an object');
 const {softening=0.15,strength=1,displacementScale=0.1,derivativeStep=0.0005}=value;
 for(const [name,v] of Object.entries({softening,strength,displacementScale,derivativeStep}))finite(v,name);
 if(softening<0.01||softening>5||strength<0||strength>10)throw new RangeError('Invalid model parameter');
 if(displacementScale<0||displacementScale>1)throw new RangeError('Invalid displacement scale');
 if(derivativeStep<0.000001||derivativeStep>0.1)throw new RangeError('Invalid derivative step');
 return {softening,strength,displacementScale,derivativeStep};
}
export function validateSources(sources){
 if(!Array.isArray(sources)||sources.length>16)throw new RangeError('Field source count must be 0..16');
 const ids=new Set();
 return Array.from(sources,(s)=>{
  if(!s||typeof s.id!=='string'||!s.id||ids.has(s.id))throw new TypeError('Unique source id required');
  ids.add(s.id);
  const x=finite(s.x,'source x'),y=finite(s.y,'source y'),mass=finite(s.mass,'mass');
  if(Math.abs(x)>10||Math.abs(y)>10||mass<0||mass>100)throw new RangeError('Source out of bounds');
  return {id:s.id,x,y,mass};
 });
}
export function potential(x,y,sources,opts={}){
 finite(x,'x');finite(y,'y');
 const {softening,strength}=modelOptions(opts);
 return validateSources(sources).reduce((sum,s)=>sum-strength*s.mass/Math.hypot(x-s.x,y-s.y,softening),0);
}
export function gradient(x,y,sources,opts={}){
 finite(x,'x');finite(y,'y');
 const {softening,strength}=modelOptions(opts);
 const list=validateSources(sources);
 return list.reduce((v,s)=>{
  const dx=x-s.x,dy=y-s.y,r2=dx*dx+dy*dy+softening*softening;
  const f=strength*s.mass/(r2*Math.sqrt(r2));
  v.x+=dx*f;v.y+=dy*f;return v;
 },{x:0,y:0});
}
export function displacement(x,y,sources,opts={}){
 const {displacementScale:scale}=modelOptions(opts),g=gradient(x,y,sources,opts);
 return {x:x-scale*g.x,y:y-scale*g.y};
}
export function jacobian(x,y,sources,opts={}){
 const {derivativeStep:h}=modelOptions(opts);
 const xp=displacement(x+h,y,sources,opts),xm=displacement(x-h,y,sources,opts);
 const yp=displacement(x,y+h,sources,opts),ym=displacement(x,y-h,sources,opts);
 const a=(xp.x-xm.x)/(2*h),c=(xp.y-xm.y)/(2*h),b=(yp.x-ym.x)/(2*h),d=(yp.y-ym.y)/(2*h);
 const determinant=a*d-b*c;
 // Hypot avoids squaring magnitudes; det / sigmaMax avoids cancellation in
 // (trace - discriminant) for a small second singular value.
 const sigmaMax=(Math.hypot(a+d,c-b)+Math.hypot(a-d,c+b))/2;
 const sigmaMin=sigmaMax===0?0:Math.abs(determinant)/sigmaMax;
 const singular=sigmaMin<1e-12;
 return {matrix:[[a,b],[c,d]],determinant,singularValues:[sigmaMax,sigmaMin],
   conditionNumber:singular?Infinity:sigmaMax/sigmaMin,
   foldIndex:singular?Infinity:Math.log10(Math.max(1,sigmaMax/sigmaMin)),
   conditionStatus:singular?'singular-at-instrument-resolution':'finite',singularTolerance:1e-12,
   orientationReversed:determinant<0,
   model:'illustrative-softened-potential',units:'normalized-scene-coordinates',derivativeStep:h};
}
export function instrumentSnapshot({x=0,y=0,sources=[],options={}}={}){
 const opts=modelOptions(options),safe=validateSources(sources),p=potential(x,y,safe,opts),g=gradient(x,y,safe,opts);
 const transformed=displacement(x,y,safe,opts),j=jacobian(x,y,safe,opts);
 // Snapshots are JSON-safe: null means unbounded only with the explicit status.
 const serialJacobian={...j,conditionNumber:Number.isFinite(j.conditionNumber)?j.conditionNumber:null,
   foldIndex:Number.isFinite(j.foldIndex)?j.foldIndex:null};
 return {schema:FIELD_SCHEMA,kind:'simulation',model:'illustrative-softened-potential',
   point:{x,y},sources:safe,options:opts,potential:p,gradient:g,transformed,jacobian:serialJacobian};
}

