// Render Wayglass-selected Wyrdrune image parameters with a safe vector
// instrument. No external image assets, generated markup or HTML injection.
const NS='http://www.w3.org/2000/svg';
const svgNode=(doc,name,attrs={})=>{
 const el=doc.createElementNS(NS,name);
 for(const [key,value] of Object.entries(attrs))el.setAttribute(key,String(value));
 return el;
};
function clamp(x,min,max){return typeof x==='number'&&Number.isFinite(x)
  ?Math.max(min,Math.min(max,x)):min}
export function createWayglassImage(score,doc=document){
 if(!score||score.kind!=='image')throw new TypeError('An attributed Wyrdrune image score is required.');
 const hue=clamp(score.hue,0,360),spread=clamp(score.spread,.1,1),
   depth=clamp(score.depth,0,1);
 const h2=(hue+88)%360,h3=(hue+182)%360;
 const svg=svgNode(doc,'svg',{viewBox:'0 0 640 400',width:'640',height:'400',
   role:'img','aria-label':'Wayglass Wyrdrune image: two luminous reciprocal ribbons crossing within a field of concentric worlds.'});
 const back=svgNode(doc,'rect',{x:0,y:0,width:640,height:400,rx:36,
   fill:'hsl('+Math.round(h3)+' 29% 9%)'});
 svg.append(back);
 const centre=svgNode(doc,'g',{transform:'translate(320 200)'});
 for(let k=0;k<6;k++){
   const r=42+k*29*spread+depth*28;
   centre.append(svgNode(doc,'ellipse',{cx:0,cy:0,rx:r*1.65,ry:r*.72,
    fill:'none',stroke:'hsl('+Math.round((hue+k*12)%360)+' 52% '+(45+k*4)+'%)',
    'stroke-width':k===0?1.8:1,opacity:(.19+k*.09).toFixed(3),
    transform:'rotate('+(k*23+depth*52)+')'}));
 }
 const reach=115+spread*95;
 const thickness=5+spread*6;
 const pathA='M '+(-reach)+' 0 C '+(-reach*.8)+' '+(-145-depth*30)
   +' '+(-reach*.25)+' '+(-155-depth*35)+' 0 0 C '+(reach*.25)+' '+(155+depth*35)
   +' '+(reach*.8)+' '+(145+depth*30)+' '+reach+' 0';
 const pathB='M '+(-reach)+' 0 C '+(-reach*.8)+' '+(145+depth*30)
   +' '+(-reach*.25)+' '+(155+depth*35)+' 0 0 C '+(reach*.25)+' '+(-155-depth*35)
   +' '+(reach*.8)+' '+(-145-depth*30)+' '+reach+' 0';
 for(const [idx,path] of [pathA,pathB].entries()){
   centre.append(svgNode(doc,'path',{d:path,stroke:'hsl('+Math.round(idx?h2:hue)+' 82% 67%)',
     fill:'none','stroke-width':thickness,'stroke-linecap':'round',opacity:idx?.75:.89}));
 }
 centre.append(svgNode(doc,'circle',{cx:0,cy:0,r:8+depth*12,
  fill:'hsl('+Math.round(h2)+' 81% 77%)',opacity:.82}));
 svg.append(centre);
 return svg;
}
export function createWayglassSoundPlayer({scope=globalThis}={}){
 let ctx=null,oscillators=[];
 function stop(){
  for(const osc of oscillators){try{osc.stop()}catch{}try{osc.disconnect()}catch{}}
  oscillators=[];
  if(ctx){const closing=ctx;ctx=null;try{void closing.close()}catch{}}
 }
 async function play(score){
  if(!score||score.kind!=='sound'||score.autoplay!==false)
    throw new TypeError('Only a user-invoked Wyrdrune sound score may play.');
  stop();
  const Ctx=scope.AudioContext||scope.webkitAudioContext;
  if(!Ctx)throw new Error('The device has no supported audio synthesiser.');
  const root=clamp(score.fundamental,120,880);
  const interval=clamp(score.interval,1,2);
  const texture=clamp(score.texture,0,1);
  const silenceMs=score.lead_silence_ms??0;
  if(typeof silenceMs!=='number'||!Number.isFinite(silenceMs)||silenceMs<0||silenceMs>4000)
    throw new RangeError('Wyrdrune scored silence must be 0–4000 milliseconds');
  const context=new Ctx();ctx=context;
  await context.resume?.();
  // WebAudio scheduling owns time. No timer, no busy wait, and no autoplay.
  const t=context.currentTime+silenceMs/1000;
  const vol=context.createGain();
  vol.gain.setValueAtTime(0,t);
  vol.gain.linearRampToValueAtTime(.017,t+.18);
  vol.gain.setValueAtTime(.017,t+1.6);
  vol.gain.linearRampToValueAtTime(0,t+2.5);
  vol.connect(context.destination);
  for(const [freq,kind,mix] of [[root,'sine',1],[root*interval,'triangle',texture*.45+.1]]){
    const osc=context.createOscillator();
    osc.type=kind;osc.frequency.value=freq;
    const gain=context.createGain();gain.gain.value=mix;
    osc.connect(gain);gain.connect(vol);osc.start(t);osc.stop(t+2.55);
    oscillators.push(osc);
  }
  return {started:true,duration_seconds:2.55+silenceMs/1000,
    silence_seconds:silenceMs/1000,mono:true,max_gain:.017};
 }
 return Object.freeze({play,stop,dispose:stop});
}
