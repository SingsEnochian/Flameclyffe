/**
 * The ship is its own visualisation surface. This mounts one common living
 * ecology projection behind all ship UI, never in a competing visualiser page.
 * Simulation isn't authoritative runtime health, memory or a conscious agent.
 */
import {LivingShipEcology} from '../ship-visualiser/ship-ecology.js';
import {ShipSensorySpine} from './ship-sensory-spine.js';

const STORE='wayglass.ship.visual-ecology/v0.1';
const QUIET='wayglass.ship.visual-quiet/v0.1';
const visualWorld={ 'terra-aeterna':175,luna:198,starsong:271,
  'hearthweave-foundation':148,kelyran:190,custom:180 };
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const freezeAlpha=(e)=>.16+.6*e.history;
function paint(canvas,model,{width,height}){
 const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)return;
 ctx.clearRect(0,0,width,height);
 const hue=visualWorld[model.worldId]??177;
 const rad=Math.min(width,height);
 const field=model.field;
 for(let i=0;i<field.length;i++){
  if(field[i]<.015)continue;
  const x=(i%12+.5)/12*width,y=(Math.floor(i/12)+.5)/8*height;
  const gradient=ctx.createRadialGradient(x,y,0,x,y,rad*.15);
  gradient.addColorStop(0,'hsla('+hue+',80%,65%,'+(field[i]*.095)+')');
  gradient.addColorStop(1,'hsla('+hue+',80%,45%,0)');
  ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(x,y,rad*.15,0,Math.PI*2);ctx.fill();
 }
 for(const [a,b] of model.bonds){
  const left=model.entities[a],right=model.entities[b];
  ctx.beginPath();ctx.moveTo(left.x*width,left.y*height);
  ctx.lineTo(right.x*width,right.y*height);
  ctx.strokeStyle='hsla('+hue+',72%,72%,.22)';ctx.lineWidth=.65;
  ctx.stroke();
 }
 for(const item of model.entities){
  const x=item.x*width,y=item.y*height;
  const radius=1.7+item.history*3+model.excitation*.5;
  ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);
  ctx.fillStyle='hsla('+((hue+item.hue*38)%360)+',75%,80%,'+freezeAlpha(item)+')';
  ctx.fill();
 }
}
function worldTint(doc,model){
 const root=doc.documentElement;
 const tone=visualWorld[model.worldId]??177;
 root.style.setProperty('--wg-ship-hue',String(tone));
 root.style.setProperty('--wg-ship-memory',model.field.reduce((sum,x)=>sum+x,0)/model.field.length+'');
 root.style.setProperty('--wg-ship-excitation',String(model.excitation));
 root.dataset.wayglassShip='visual-simulation';
}
export function mountLivingShipSurface({
 doc=globalThis.document,
 spine=new ShipSensorySpine(),
 storage=globalThis.localStorage,
 seed=137,
}={}){
 if(!doc?.body||!doc.defaultView){spine.close();return()=>{};}
 const win=doc.defaultView;
 const key=STORE+':'+win.location.pathname;
 let model=new LivingShipEcology({seed});
 try{const saved=JSON.parse(storage?.getItem(key)||'null');if(saved)model=LivingShipEcology.restore(saved);}catch{}
 const motion=win.matchMedia?.('(prefers-reduced-motion: reduce)');
 const contrast=win.matchMedia?.('(forced-colors: active)');
 let quiet=false;
 try{quiet=storage?.getItem(QUIET)==='yes';}catch{}
 const canvas=doc.createElement('canvas');
 canvas.className='wayglass-living-tissue';
 canvas.setAttribute('aria-hidden','true');
 canvas.setAttribute('role','presentation');
 doc.body.prepend(canvas);
 const panel=doc.createElement('div');panel.className='wayglass-living-control';
 const caption=doc.createElement('span');caption.className='wayglass-living-caption';
 caption.textContent='Ship ecology · local visual simulation';
 const toggle=doc.createElement('button');toggle.type='button';
 toggle.className='wayglass-living-toggle';
 panel.append(caption,toggle);doc.body.append(panel);
 const updateToggle=()=>{
   const subdued=quiet||motion?.matches||contrast?.matches;
   canvas.hidden=subdued;
   toggle.textContent=quiet?'Resume visual ecology':'Quiet visuals';
   toggle.setAttribute('aria-pressed',String(quiet));
   toggle.setAttribute('aria-label',quiet?'Resume simulated ship visuals':'Quiet simulated ship visuals');
   if(subdued)doc.documentElement.style.removeProperty('--wg-ship-excitation');
   else worldTint(doc,model);
 };
 toggle.addEventListener('click',()=>{
   quiet=!quiet;
   try{storage?.setItem(QUIET,quiet?'yes':'no');}catch{}
   updateToggle();
 });
 const onVisualPreference=()=>updateToggle();
 motion?.addEventListener?.('change',onVisualPreference);
 contrast?.addEventListener?.('change',onVisualPreference);
 let frame=0,last=0,stepsSinceSave=0,closed=false;
 function save(){
  try{storage?.setItem(key,JSON.stringify(model.snapshot()));}catch{}
 }
 const resize=()=>{
  const cssW=Math.max(1,win.innerWidth),cssH=Math.max(1,win.innerHeight);
  const pixelRatio=Math.min(win.devicePixelRatio||1,1.5);
  const w=Math.round(cssW*pixelRatio),h=Math.round(cssH*pixelRatio);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 };
 const update=(time)=>{
   if(closed)return;
   frame=win.requestAnimationFrame(update);
   if(time-last<180)return;
   last=time;
   const animated=!quiet&&!motion?.matches&&!contrast?.matches&&!doc.hidden;
   if(!animated)return;
   model.step(1);stepsSinceSave++;
   worldTint(doc,model);
   resize();
   paint(canvas,model,{width:canvas.width,height:canvas.height});
   if(stepsSinceSave>=24){stepsSinceSave=0;save();}
 };
 const stop=()=>{
  if(closed)return;
  closed=true;
  if(frame)win.cancelAnimationFrame(frame);
  save();
  unsubscribe();
  motion?.removeEventListener?.('change',onVisualPreference);
  contrast?.removeEventListener?.('change',onVisualPreference);
  canvas.remove();panel.remove();
  doc.documentElement.removeAttribute('data-wayglass-ship');
  for(const k of ['--wg-ship-hue','--wg-ship-memory','--wg-ship-excitation'])doc.documentElement.style.removeProperty(k);
  spine.close();
 };
 const unsubscribe=spine.subscribe(signal=>{
   if(!model.observe(signal,{now:Date.now()}))return;
   worldTint(doc,model);
   save();
   if(quiet||motion?.matches||contrast?.matches)return;
   resize();paint(canvas,model,{width:canvas.width,height:canvas.height});
 });
 const onPageHide=()=>stop();
 win.addEventListener('pagehide',onPageHide,{once:true});
 updateToggle();
 if(!quiet&&!motion?.matches&&!contrast?.matches){resize();paint(canvas,model,{width:canvas.width,height:canvas.height});}
 frame=win.requestAnimationFrame(update);
 return stop;
}
if(typeof document!=='undefined'&&document.body)mountLivingShipSurface({doc:document});
