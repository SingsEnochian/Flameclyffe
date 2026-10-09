import './living-observer.css';
import { listWayglassSurfaces } from '../surface-registry.js';
import { listWayglassOrgans } from '../organ-registry.js';
import {
  OBSERVER_CHANNELS, createWayglassObservation, readWayglassRouteObservation,
  subscribeWayglassObserver, queueObserverContextForWriting,
} from '../living-observer-model.js';

const TAU = Math.PI * 2;
const COLOURS = ['#95fff2','#bca3ff','#e8cc8b','#8fa4fb','#82d4ce','#ec9ecd','#cfebe9','#d6c4ff'];
const clamp = (v,a,b) => Math.min(b,Math.max(a,v));
const channelDescriptions = Object.fromEntries(OBSERVER_CHANNELS.map(([id,label,text])=>[id,{label,text}]));
const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

function drawAstrolabe(canvas, packet, time, focus, lowStim) {
  const context = canvas.getContext('2d');
  if (!context) return;
  const g = context, w = canvas.width, h = canvas.height, cx=w/2, cy=h/2;
  g.clearRect(0,0,w,h);
  const v=packet.projection.variables;
  const reduced=lowStim || packet.direct.prefers_reduced_motion;
  const t=reduced?0:time*0.00028;
  const outer=290, inner=116;
  const field=g.createRadialGradient(cx,cy,24,cx,cy,365);
  field.addColorStop(0,'rgba(58,45,101,.35)');
  field.addColorStop(.57,'rgba(27,55,76,.22)');
  field.addColorStop(1,'rgba(10,14,28,0)');
  g.fillStyle=field; g.beginPath();g.arc(cx,cy,390,0,TAU);g.fill();
  const strokeCircle=(r,col,alpha=1,width=1,rotation=0,portion=TAU)=>{
    g.beginPath();g.arc(cx,cy,r,rotation,rotation+portion);
    g.strokeStyle=col;g.globalAlpha=alpha;g.lineWidth=width;g.stroke();g.globalAlpha=1;
  };
  // Nested optical plates: independently weighted by explicitly mapped variables.
  for(let k=0;k<6;k++){
    const r=inner+28*k+v.E*k*4;
    strokeCircle(r,k%2?'#a68fea':'#7cdacc',.14+v.C*.18,1);
    strokeCircle(r,COLOURS[(k+2)%COLOURS.length],.44,1.4,
      t*(k%2?-1:1)+k*.6,Math.PI*(.45+v.R*.38));
    for(let n=0;n<12;n++){
      const ang=n*TAU/12+(k%2?t:-t*.6);
      const x=cx+Math.cos(ang)*r,y=cy+Math.sin(ang)*r;
      g.fillStyle=k%2?'#b49cde':'#5ba4ac';g.globalAlpha=.11+v.C*.19;
      g.fillRect(x-1,y-1,2,2);g.globalAlpha=1;
    }
  }
  const nodes=OBSERVER_CHANNELS.map(([id],i)=>{
    const a=-Math.PI/2+i*TAU/OBSERVER_CHANNELS.length;
    return {id,ang:a,x:cx+Math.cos(a)*outer,y:cy+Math.sin(a)*outer};
  });
  const selected=nodes.find(n=>n.id===focus)||nodes[0];
  // Connections are architectural pathways, not claims that external readings are causally coupled.
  nodes.forEach((node,i)=>{
    const end=nodes[(i+3)%nodes.length];
    const a=.07+v.C*.2+(node.id===focus?.21:0);
    g.strokeStyle='#9bdbdc';g.globalAlpha=a;g.lineWidth=node.id===focus?2:1;
    g.beginPath();g.moveTo(node.x,node.y);g.quadraticCurveTo(cx,cy,end.x,end.y);g.stroke();g.globalAlpha=1;
    g.beginPath();g.arc(node.x,node.y,node.id===focus?11:6.2,0,TAU);
    g.fillStyle=COLOURS[i];g.shadowColor=COLOURS[i];g.shadowBlur=node.id===focus?28:10;
    g.fill();g.shadowBlur=0;
    g.textAlign='center';g.textBaseline='middle';
    g.font='600 18px system-ui';g.fillStyle='#d6e5f3';g.fillText(OBSERVER_CHANNELS[i][1],node.x+Math.cos(node.ang)*26,node.y+Math.sin(node.ang)*22);
  });
  const routeLength=clamp(v.M,0,1);
  for(let i=0;i<Math.round(9+v.P*18);i++){
    const angle=i*2.39996+t*(.6+v.R)+Math.sin(i*6.1)*.11;
    const radius=145+(i%7)*17;
    const x=cx+Math.cos(angle)*radius, y=cy+Math.sin(angle)*radius;
    g.fillStyle=COLOURS[(i+3)%COLOURS.length];g.globalAlpha=.12+routeLength*.43;
    g.beginPath();g.arc(x,y,1.2+(i%3)*.5,0,TAU);g.fill();
  }
  g.globalAlpha=1;
  // Focus path: a packet-driven travelling signal across the glass.
  const progress=reduced?.5:(time*.0004*(.6+v.M))%1;
  g.beginPath();g.moveTo(selected.x,selected.y);g.quadraticCurveTo(cx+50,cy-50,cx,cy);
  g.strokeStyle=COLOURS[OBSERVER_CHANNELS.findIndex(([id])=>id===focus)];g.lineWidth=2.3;
  g.shadowColor=g.strokeStyle;g.shadowBlur=16;g.globalAlpha=.65;g.stroke();g.globalAlpha=1;g.shadowBlur=0;
  const x=(1-progress)**2*selected.x+2*(1-progress)*progress*(cx+50)+progress*progress*cx;
  const y=(1-progress)**2*selected.y+2*(1-progress)*progress*(cy-50)+progress*progress*cy;
  g.beginPath();g.arc(x,y,4+v.R*3,0,TAU);g.fillStyle='#f1fff9';g.shadowColor='#8adbd5';g.shadowBlur=20;g.fill();g.shadowBlur=0;
  // Faceted luminous core with restrained layered refraction.
  for(let shell=0;shell<4;shell++){
    const rr=72+shell*10+v.Q*7, rot=t*(shell%2?1:-1)+shell*.18;
    g.beginPath();
    for(let j=0;j<8;j++){const a=rot+j*TAU/8;const px=cx+Math.cos(a)*rr,py=cy+Math.sin(a)*rr;
      if(j===0)g.moveTo(px,py);else g.lineTo(px,py);}
    g.closePath();
    g.strokeStyle=shell%2?'#bd9fef':'#9dece5';g.globalAlpha=.15+v.Q*.12;g.lineWidth=1+v.C;
    g.stroke();g.globalAlpha=1;
  }
  const core=g.createRadialGradient(cx-16,cy-21,5,cx,cy,73);
  core.addColorStop(0,'rgba(242,252,249,.78)');core.addColorStop(.24,'rgba(138,211,210,.48)');
  core.addColorStop(.6,'rgba(85,88,176,.18)');core.addColorStop(1,'rgba(66,60,107,0)');
  g.fillStyle=core;g.beginPath();g.arc(cx,cy,78,0,TAU);g.fill();
  g.fillStyle='#e0fafa';g.textAlign='center';g.font='500 26px Georgia, serif';g.fillText('WAYGLASS',cx,cy-4);
  g.font='14px system-ui';g.fillStyle='#9bcac9';g.fillText('OBSERVING',cx,cy+22);
  strokeCircle(outer+26,'#a5d5dc',.26,1,t,TAU);
  strokeCircle(outer+35,'#bf95e9',.32,1.4,-t,TAU*(.45+v.H*.2));
  g.globalAlpha=1;
}
function formatClock(value) {
  const date=new Date(value);
  if(Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}

export async function mountWayglassLivingObserver(root) {
  let focus='time', touches=0, lowStim=false, sound=false, audioContext=null, animation=0, timer=0;
  const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
  root.innerHTML=[
    '<section class="wg-surface wg-living-observer" data-surface="wayglass-living-observer">',
    '<nav class="wg-deck-nav glass-panel" aria-label="Wayglass rooms">',
    '<button type="button" class="glass-chip" data-wayglass-room="arcsweep:writing-room">Writing Room</button>',
    '<button type="button" class="glass-chip" data-wayglass-room="wayglass:systems">Organs</button>',
    '<button type="button" class="glass-chip" data-wayglass-room="wayglass:video-atelier">Video Atelier</button>',
    '<button type="button" class="glass-chip active" aria-current="page">Living Observer</button></nav>',
    '<header class="glass-panel observer-head"><div><p class="eyebrow">Wayglass OS · living instrument</p>',
    '<h1>Living Observer</h1><p class="lede">Touch an input to follow its route through the instrument. Geometry translates readings, not hidden minds.</p>',
    '</div><div class="observer-clock"><span>Browser time</span><strong data-observer-clock></strong><small>Direct · local</small></div></header>',
    '<section class="observer-deck" aria-label="Interactive Observer">',
    '<div class="glass-panel observer-stage"><canvas width="820" height="820" role="img" aria-label="Living astrolabe mapping observed application readings to geometric rings, nodes, and pulses. Select a reading using the buttons below."></canvas>',
    '<div class="observer-inputs" role="group" aria-label="Direct-reading channels">',
    OBSERVER_CHANNELS.map(([id,label])=>'<button type="button" class="observer-input" data-observer-focus="'+id+'" aria-pressed="'+(id===focus)+'">'+label+'</button>').join(''),
    '</div></div>',
    '<div class="observer-console glass-panel">',
    '<p class="eyebrow">Direct readings → translation → glass</p>',
    '<h2 data-observer-title>Time</h2><p data-observer-description></p>',
    '<p class="observer-source" data-observer-source>Source · browser</p>',
    '<div class="observer-actions"><button type="button" class="glass-chip" data-observer-low aria-pressed="false">Low Stim · Off</button>',
    '<button type="button" class="glass-chip" data-observer-sound aria-pressed="false">Sound · Off</button></div>',
    '<h3>Interpretive render variables</h3>',
    '<p class="tiny">P / C / R / E / M / A / Q / H are explicitly derived UI controls, not readings of consciousness, emotion, or participant identity.</p>',
    '<div class="observer-meters" data-observer-meters></div>',
    '<details class="observer-details"><summary>Inspect raw packet and translation receipt</summary>',
    '<pre data-observer-packet tabindex="0"></pre></details>',
    '<div class="observer-actions"><button type="button" class="glass-chip" data-observer-copy>Copy packet</button>',
    '<button type="button" class="glass-chip" data-observer-save>Save JSON</button>',
    '<button type="button" class="send-jewel" data-observer-share>Send reading to Writing Room</button></div>',
    '<p class="tiny" data-observer-status role="status" aria-live="polite">Readings stay in this browser until you explicitly copy, save or share them.</p>',
    '</div></section>',
    '<footer class="wg-receipt tiny">Inspired by STARWELL · DEEP Observer. Same input-to-render discipline; independent Wayglass mapping, no borrowed identity or canon assertions. No microphone, GPS, camera or hidden telemetry.</footer></section>'
  ].join('');
  const canvas=root.querySelector('canvas');
  const title=root.querySelector('[data-observer-title]'), description=root.querySelector('[data-observer-description]');
  const source=root.querySelector('[data-observer-source]'), packetView=root.querySelector('[data-observer-packet]');
  const meters=root.querySelector('[data-observer-meters]'), status=root.querySelector('[data-observer-status]');
  let packet;
  const current=()=>createWayglassObservation({
    now:new Date().toISOString(),surface:'wayglass:living-observer',
    surfaces:listWayglassSurfaces().map(s=>s.surface_id),
    organs:listWayglassOrgans().map(o=>o.organ_id),
    touches,reducedMotion:reduced,lowStim,sound,focus,route:readWayglassRouteObservation(),
  });
  function refresh() {
    if(!canvas.isConnected){cleanup();return;}
    packet=current();
    root.querySelector('[data-observer-clock]').textContent=formatClock(packet.created_at);
    const channel=channelDescriptions[focus];title.textContent=channel.label;description.textContent=channel.text;
    source.textContent='Source · '+(focus==='routes'||focus==='receipt'?'observed application route receipt (or none)':'local browser / registry');
    root.querySelectorAll('[data-observer-focus]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.observerFocus===focus)));
    const vars=packet.projection.variables;
    meters.innerHTML=Object.entries(vars).map(([key,v])=>'<div class="observer-meter"><span>'+key+'</span><meter min="0" max="1" value="'+v+'" aria-label="'+key+' interface visualisation value"></meter><b>'+v.toFixed(2)+'</b></div>').join('');
    packetView.textContent=JSON.stringify(packet,null,2);
    drawAstrolabe(canvas,packet,performance.now(),focus,lowStim||reduced);
  }
  function animate(time) {
    if(!canvas.isConnected){cleanup();return;}
    drawAstrolabe(canvas,packet||current(),time,focus,lowStim||reduced);
    if(!reduced&&!lowStim) animation=requestAnimationFrame(animate);
  }
  let unsubscribe=()=>{};
  function cleanup() {
    cancelAnimationFrame(animation);clearInterval(timer);unsubscribe();
    if(audioContext){audioContext.close().catch(()=>{});audioContext=null;}
  }
  function playNote() {
    if(!sound) return;
    try {
      const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
      if(!Audio)return;
      if(!audioContext)audioContext=new Audio();
      if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
      const i=OBSERVER_CHANNELS.findIndex(([id])=>id===focus);
      const frequency=210*Math.pow(2,(i%8)/12), now=audioContext.currentTime;
      const osc=audioContext.createOscillator(), gain=audioContext.createGain();
      osc.type='sine';osc.frequency.setValueAtTime(frequency,now);
      gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.014,now+.012);
      gain.gain.exponentialRampToValueAtTime(.0001,now+.23);
      osc.connect(gain).connect(audioContext.destination);osc.start(now);osc.stop(now+.25);
    }catch {status.textContent='Sound unavailable in this browser; visual instrument remains active.';}
  }
  function select(id) {
    if(!channelDescriptions[id])return;
    focus=id;touches++;refresh();playNote();
    globalThis.dispatchEvent?.(new CustomEvent('wayglass:material-wake',{detail:{strength:.46,intent:.55}}));
    if(lowStim||reduced){cancelAnimationFrame(animation);drawAstrolabe(canvas,packet,0,focus,true);}
    try{if(globalThis.navigator?.vibrate&&!lowStim)globalThis.navigator.vibrate(7);}catch{}
  }
  root.querySelectorAll('[data-observer-focus]').forEach(btn=>btn.addEventListener('click',()=>select(btn.dataset.observerFocus)));
  canvas.addEventListener('pointerup',event=>{
    const box=canvas.getBoundingClientRect();
    const dx=(event.clientX-box.left)/box.width-.5,dy=(event.clientY-box.top)/box.height-.5;
    const angle=Math.atan2(dy,dx);
    const i=(Math.round((angle+Math.PI/2)/(TAU/8))+8)%8;
    select(OBSERVER_CHANNELS[i][0]);
  });
  root.querySelectorAll('[data-wayglass-room]').forEach(btn=>btn.addEventListener('click',()=>globalThis.__wayglassOS?.mount(btn.dataset.wayglassRoom)));
  root.querySelector('[data-observer-low]').addEventListener('click',event=>{
    lowStim=!lowStim;event.currentTarget.setAttribute('aria-pressed',String(lowStim));
    event.currentTarget.textContent='Low Stim · '+(lowStim?'On':'Off');
    cancelAnimationFrame(animation);refresh();
    if(!lowStim&&!reduced)animation=requestAnimationFrame(animate);
  });
  root.querySelector('[data-observer-sound]').addEventListener('click',event=>{
    sound=!sound;event.currentTarget.setAttribute('aria-pressed',String(sound));
    event.currentTarget.textContent='Sound · '+(sound?'On':'Off');refresh();playNote();
  });
  root.querySelector('[data-observer-copy]').addEventListener('click',async()=>{
    refresh();try{await navigator.clipboard.writeText(JSON.stringify(packet,null,2));status.textContent='Observation packet copied locally.';}
    catch{status.textContent='Clipboard unavailable; select the packet in the disclosure.';}
  });
  root.querySelector('[data-observer-save]').addEventListener('click',()=>{
    refresh();const blob=new Blob([JSON.stringify(packet,null,2)+'\n'],{type:'application/json'});
    const href=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=href;a.download='wayglass-living-observation.json';a.click();
    setTimeout(()=>URL.revokeObjectURL(href),1000);status.textContent='Observation packet exported. No server upload.';
  });
  root.querySelector('[data-observer-share]').addEventListener('click',()=>{
    refresh();queueObserverContextForWriting(packet);
    status.textContent='Observation queued for user review in Writing Room. Nothing sent automatically.';
    globalThis.__wayglassOS?.mount('arcsweep:writing-room');
  });
  unsubscribe=subscribeWayglassObserver(()=>refresh());
  timer=setInterval(()=>refresh(),1000);
  refresh();
  if(!reduced)animation=requestAnimationFrame(animate);
}
