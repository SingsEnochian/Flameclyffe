// Wayglass Field Instrument v0.1: explicitly illustrative softened potential,
// not a general-relativistic metric or geodesic integrator.
// All numerical derivatives use the same displacement function as the display.
export const FIELD_SCHEMA = 'wayglass.field-instrument/v0.1';
const finite=(v,name)=>{if(typeof v!=='number'||!Number.isFinite(v))throw new TypeError(name+' must be finite');return v;};
export function validateSources(sources){
 if(!Array.isArray(sources)||sources.length>16)throw new RangeError('Field source count must be 0..16');
 const ids=new Set();
 return sources.map((s,i)=>{
  if(!s||typeof s.id!=='string'||!s.id||ids.has(s.id))throw new TypeError('Unique source id required');
  ids.add(s.id);
  const x=finite(s.x,'source x'),y=finite(s.y,'source y'),mass=finite(s.mass,'mass');
  if(Math.abs(x)>10||Math.abs(y)>10||mass<0||mass>100)throw new RangeError('Source out of bounds');
  return {id:s.id,x,y,mass};
 });
}
export function potential(x,y,sources,{softening=0.15,strength=1}={}){
 finite(x,'x');finite(y,'y');finite(softening,'softening');finite(strength,'strength');
 if(softening<0.01||softening>5||strength<0||strength>10)throw new RangeError('Invalid model parameter');
 return validateSources(sources).reduce((sum,s)=>sum-strength*s.mass/Math.hypot(x-s.x,y-s.y,softening),0);
}
export function gradient(x,y,sources,opts={}){
 finite(x,'x');finite(y,'y');
 const {softening=0.15,strength=1}=opts;
 if(softening<0.01||softening>5||strength<0||strength>10)throw new RangeError('Invalid model parameter');
 const list=validateSources(sources);
 return list.reduce((v,s)=>{
  const dx=x-s.x,dy=y-s.y,r2=dx*dx+dy*dy+softening*softening;
  const f=strength*s.mass/(r2*Math.sqrt(r2));
  v.x+=dx*f;v.y+=dy*f;return v;
 },{x:0,y:0});
}
export function displacement(x,y,sources,opts={}){
 const g=gradient(x,y,sources,opts),scale=opts.displacementScale??0.1;
 finite(scale,'displacementScale');if(scale<0||scale>1)throw new RangeError('Invalid displacement scale');
 return {x:x-scale*g.x,y:y-scale*g.y};
}
export function jacobian(x,y,sources,opts={}){
 const h=opts.derivativeStep??0.0005;
 finite(h,'derivativeStep');if(h<0.000001||h>0.1)throw new RangeError('Invalid derivative step');
 const xp=displacement(x+h,y,sources,opts),xm=displacement(x-h,y,sources,opts);
 const yp=displacement(x,y+h,sources,opts),ym=displacement(x,y-h,sources,opts);
 const a=(xp.x-xm.x)/(2*h),c=(xp.y-xm.y)/(2*h),b=(yp.x-ym.x)/(2*h),d=(yp.y-ym.y)/(2*h);
 const determinant=a*d-b*c,trace=a*a+b*b+c*c+d*d;
 const disc=Math.sqrt(Math.max(0,trace*trace-4*determinant*determinant));
 const sigmaMax=Math.sqrt(Math.max(0,(trace+disc)/2));
 const sigmaMin=Math.sqrt(Math.max(0,(trace-disc)/2));
 return {matrix:[[a,b],[c,d]],determinant,singularValues:[sigmaMax,sigmaMin],
   conditionNumber:sigmaMin<1e-12?Infinity:sigmaMax/sigmaMin,
   foldIndex:sigmaMin<1e-12?Infinity:Math.log10(Math.max(1,sigmaMax/sigmaMin)),
   orientationReversed:determinant<0,
   model:'illustrative-softened-potential',units:'normalized-scene-coordinates',derivativeStep:h};
}
export function instrumentSnapshot({x=0,y=0,sources=[],options={}}={}){
 const safe=validateSources(sources),p=potential(x,y,safe,options),g=gradient(x,y,safe,options);
 const transformed=displacement(x,y,safe,options),j=jacobian(x,y,safe,options);
 return {schema:FIELD_SCHEMA,kind:'simulation',model:'illustrative-softened-potential',
   point:{x,y},sources:safe,options:{...options},potential:p,gradient:g,transformed,jacobian:j};
}
