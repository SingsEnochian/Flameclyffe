import './living-observer.css';
import { listWayglassSurfaces } from '../surface-registry.js';
import { listWayglassOrgans } from '../organ-registry.js';
import {
  OBSERVER_CHANNELS, createWayglassObservation, readWayglassRouteObservation,
  subscribeWayglassObserver, queueObserverContextForWriting, describeWayglassObserverChannel,
} from '../living-observer-model.js';

import { observerNodes, platePoint, nodeAtPoint, angularDelta, createObserverRotation, OBSERVER_PLATE_SIZE } from '../living-observer-optics.js';
import { readWonderLights, subscribeWonderLight, publishWonderLight, drawWonderLight } from '../wonder-light.js';

const TAU = Math.PI * 2;
const COLOURS = ['#95fff2','#bca3ff','#e8cc8b','#8fa4fb','#82d4ce','#ec9ecd','#cfebe9','#d6c4ff'];
const channelDescriptions = Object.fromEntries(OBSERVER_CHANNELS.map(([id,label,text])=>[id,{label,text}]));

function drawAstrolabe(canvas, packet, time, focus, lowStim, {rotation = 0, lens = null, light = null, lightAge = 0} = {}) {
  const context = canvas.getContext('2d');
  if (!context) return;
  const g = context, w = canvas.width, h = canvas.height, cx=w/2, cy=h/2;
  g.clearRect(0,0,w,h);
  const v=packet.projection.variables;
  const reduced=lowStim || packet.direct.prefers_reduced_motion;
  const t=reduced?0:time*0.00028;
  const outer=290, inner=116;
  // The lens is optically displaced by the actual pointer, not a rotating flat texture.
  const lensX = lens?.x ?? cx, lensY = lens?.y ?? cy;
  const parallaxX = (lensX-cx)*.012, parallaxY = (lensY-cy)*.012;
  const well = g.createRadialGradient(lensX,lensY,3,lensX,lensY,220);
  well.addColorStop(0,'rgba(190,244,247,.13)');
  well.addColorStop(.25,'rgba(111,215,224,.08)');
  well.addColorStop(.6,'rgba(142,108,219,.035)');
  well.addColorStop(1,'rgba(110,156,226,0)');
  g.fillStyle=well;g.fillRect(0,0,w,h);
  const field=g.createRadialGradient(cx+parallaxX,cy+parallaxY,24,cx,cy,365);
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
      t*(k%2?-1:1)+k*.6+rotation*(k%2?-.7:.7),Math.PI*(.45+v.R*.38));
    // Facet highlights carry different parallax at each depth, giving visual thickness.
    strokeCircle(r+1.4,'#e3faf9',.05+v.Q*.13,1.8,
      -rotation*(k%2?1:-1)+t*.4+k*.9,Math.PI*(.12+v.C*.12));
    for(let n=0;n<12;n++){
      const ang=n*TAU/12+(k%2?t:-t*.6)+rotation*(k%2?.8:-.5);
      const x=cx+Math.cos(ang)*r,y=cy+Math.sin(ang)*r;
      g.fillStyle=k%2?'#b49cde':'#5ba4ac';g.globalAlpha=.11+v.C*.19;
      g.fillRect(x-1,y-1,2,2);g.globalAlpha=1;
    }
  }
  const nodes=observerNodes(OBSERVER_CHANNELS.map(([id])=>id),rotation).map(node=>({ ...node, ang:node.angle }));
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
  const routeLength=Math.min(1,Math.max(0,v.M));
  for(let i=0;i<Math.round(9+v.P*18);i++){
    const angle=i*2.39996+t*(.6+v.R)+Math.sin(i*6.1)*.11;
    const radius=145+(i%7)*17+Math.sin(rotation+i*.8)*3;
    const x=cx+Math.cos(angle)*radius, y=cy+Math.sin(angle)*radius;
    g.fillStyle=COLOURS[(i+3)%COLOURS.length];g.globalAlpha=.12+routeLength*.43;
    g.beginPath();g.arc(x,y,1.2+(i%3)*.5,0,TAU);g.fill();
  }
  g.globalAlpha=1;
  // A recent route transition produces a visible, specifically sourced wave.
  const route = packet.direct.last_route;
  if(route){
    const started=route.status==='started', failed=route.status==='failed';
    const tint=failed?'#e9a2a9':started?'#d8b9ff':'#9de6d9';
    strokeCircle(224,tint,.35+v.R*.18,2,rotation+t*2,Math.PI*(started?1.5:failed?.6:1.05));
    strokeCircle(228,tint,.14,7,-rotation-t,Math.PI*.6);
  }
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
  // Iridescent refractive edge, warped towards the current lens vector.
  g.beginPath();
  g.ellipse(cx+parallaxX*.5,cy+parallaxY*.5,outer+42,outer+35,rotation*.08,0,TAU);
  g.strokeStyle='#b1ffff';g.globalAlpha=.06+v.Q*.07;g.lineWidth=9;g.stroke();
  g.globalAlpha=1;
  drawWonderLight(g,light,lightAge,{reducedMotion:packet.direct.prefers_reduced_motion,lowStim,width:w,height:h});
}
function formatClock(value) {
  const date=new Date(value);
  if(Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}

export async function mountWayglassLivingObserver(root) {
  let focus='time', touches=0, lowStim=false, sound=false, haptics=false, paused=false, audioContext=null, animation=0, timer=0;
  let lightAt=performance.now();
  const rotation=createObserverRotation();
  let lens=null, gesture=null, disposed=false;
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
    '<div class="observer-translation" aria-label="Selected source to visual translation"><strong data-observer-reading></strong><span data-observer-translation></span><small data-observer-boundary></small></div>',
    '<p class="observer-source" data-observer-source>Source · browser</p>',
    '<div class="observer-actions"><button type="button" class="glass-chip" data-observer-low aria-pressed="false">Low Stim · Off</button>',
    '<button type="button" class="glass-chip" data-observer-sound aria-pressed="false">Sound · Off</button>',
    '<button type="button" class="glass-chip" data-observer-haptics aria-pressed="false">Haptics · Off</button>',
    '<button type="button" class="glass-chip" data-observer-feather aria-pressed="false">Feather · Pause</button></div>',
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
    '<section class="observer-wonder glass-panel" aria-label="Wonder light and continuity">',
    '<div class="observer-wonder-head"><div><p class="eyebrow">The Glass That Remembers · Wonder #447</p>',
    '<h2>Provenance in light</h2><p class="tiny">Route and Commons activity can illuminate the glass. A ripple is not proof of truth, identity, consciousness or restored memory.</p></div>',
    '<button type="button" class="glass-chip" data-wonder-demo>Try a synthetic ripple</button></div>',
    '<p class="observer-wonder-empty" data-wonder-state role="status">No light events observed yet. Continuity unknown until a verified receipt is available.</p>',
    '<ol class="observer-wonder-events" data-wonder-events aria-label="Latest light events"></ol>',
    '</section>',
    '<footer class="wg-receipt tiny">Inspired by STARWELL · DEEP Observer. Same input-to-render discipline; independent Wayglass mapping, no borrowed identity or canon assertions. No microphone, GPS, camera or hidden telemetry.</footer></section>'
  ].join('');
  const canvas=root.querySelector('canvas');
  const title=root.querySelector('[data-observer-title]'), description=root.querySelector('[data-observer-description]');
  const source=root.querySelector('[data-observer-source]'), packetView=root.querySelector('[data-observer-packet]');
  const meters=root.querySelector('[data-observer-meters]'), status=root.querySelector('[data-observer-status]');
  const wonderState=root.querySelector('[data-wonder-state]');
  const wonderEvents=root.querySelector('[data-wonder-events]');
  let packet;
  const latestLight=()=>readWonderLights()[0]||null;
  const drawOptions=()=>({rotation:rotation.angle,lens,light:latestLight(),lightAge:performance.now()-lightAt});
  function renderWonder() {
    const events=readWonderLights().slice(0,6);
    wonderState.textContent=events.length ? 'Latest optical event: '+events[0].kind.replaceAll('-', ' ')+'. Source and verification state below.' : 'No light events observed yet. Continuity unknown until a verified receipt is available.';
    wonderEvents.replaceChildren();
    for(const event of events) {
      const item=document.createElement('li');
      const label=document.createElement('strong');label.textContent=event.kind.replaceAll('-', ' ')+' · '+event.verification_state;
      const origin=document.createElement('small');origin.textContent='Source: '+event.source_ref+' · '+event.boundary;
      item.dataset.lightKind=event.visual_cue;
      item.append(label,origin);
      wonderEvents.append(item);
    }
  }
  const current=()=>createWayglassObservation({
    now:new Date().toISOString(),surface:'wayglass:living-observer',
    surfaces:listWayglassSurfaces().map(s=>s.surface_id),
    organs:listWayglassOrgans().map(o=>o.organ_id),
    touches,reducedMotion:reduced,lowStim,sound,focus,route:readWayglassRouteObservation(),
  });
  function refresh() {
    if(disposed||!canvas.isConnected){cleanup();return;}
    packet=current();
    root.querySelector('[data-observer-clock]').textContent=formatClock(packet.created_at);
    const channel=channelDescriptions[focus];title.textContent=channel.label;description.textContent=channel.text;
    const explanation=describeWayglassObserverChannel(packet,focus);
    source.textContent='Source · '+explanation.source;
    root.querySelector('[data-observer-reading]').textContent=explanation.reading;
    root.querySelector('[data-observer-translation]').textContent=explanation.translation;
    root.querySelector('[data-observer-boundary]').textContent=explanation.boundary;
    root.querySelectorAll('[data-observer-focus]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.observerFocus===focus)));
    const vars=packet.projection.variables;
    meters.innerHTML=Object.entries(vars).map(([key,v])=>'<div class="observer-meter"><span>'+key+'</span><meter min="0" max="1" value="'+v+'" aria-label="'+key+' interface visualisation value"></meter><b>'+v.toFixed(2)+'</b></div>').join('');
    packetView.textContent=JSON.stringify(packet,null,2);
    if(!paused)drawAstrolabe(canvas,packet,performance.now(),focus,lowStim||reduced,drawOptions());
  }
  function animate(time) {
    if(disposed||!canvas.isConnected){cleanup();return;}
    if(paused)return;
    rotation.settle({reducedMotion:reduced,lowStim});
    drawAstrolabe(canvas,packet||current(),time,focus,lowStim||reduced,drawOptions());
    if(!reduced&&!lowStim) animation=requestAnimationFrame(animate);
  }
  let unsubscribe=()=>{}, unsubscribeLight=()=>{};
  function cleanup() {
    if(disposed)return;
    disposed=true;
    cancelAnimationFrame(animation);clearInterval(timer);unsubscribe();unsubscribeLight();
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
    if(!paused)globalThis.dispatchEvent?.(new CustomEvent('wayglass:material-wake',{detail:{strength:.46,intent:.55}}));
    if((lowStim||reduced)&&!paused){cancelAnimationFrame(animation);drawAstrolabe(canvas,packet,0,focus,true,drawOptions());}
    try{if(haptics&&!paused&&!lowStim&&!reduced&&globalThis.navigator?.vibrate)globalThis.navigator.vibrate(7);}catch{}
  }
  root.querySelectorAll('[data-observer-focus]').forEach(btn=>btn.addEventListener('click',()=>select(btn.dataset.observerFocus)));
  const ids=OBSERVER_CHANNELS.map(([id])=>id);
  const getPoint=event=>platePoint(event.clientX,event.clientY,canvas.getBoundingClientRect());
  canvas.addEventListener('pointerdown',event=>{
    if(gesture)return;
    const point=getPoint(event);
    if(!point)return;
    gesture={id:event.pointerId,point,start:point,moved:false};
    lens=point;
    canvas.setPointerCapture?.(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{
    const point=getPoint(event);
    if(!point)return;
    lens=point;
    if(gesture?.id===event.pointerId){
      if(Math.hypot(point.x-gesture.start.x,point.y-gesture.start.y)>12) gesture.moved=true;
      if(gesture.moved && !reduced && !lowStim) rotation.drag(angularDelta(gesture.point,point));
      gesture.point=point;
    }
    if((reduced||lowStim)&&!paused) drawAstrolabe(canvas,packet||current(),0,focus,true,drawOptions());
  });
  canvas.addEventListener('pointerup',event=>{
    if(!gesture||gesture.id!==event.pointerId)return;
    const point=getPoint(event), moved=gesture.moved;
    gesture=null;
    if(!moved){
      const chosen=nodeAtPoint(point,ids,rotation.angle,42);
      if(chosen)select(chosen);
      else { touches++; refresh(); status.textContent='Glass touched. Choose a glowing sensor node to inspect its reading.'; }
    }else{
      touches++;refresh();status.textContent='Astrolabe rotated. Readings stay unchanged by movement.';
    }
    if(canvas.hasPointerCapture?.(event.pointerId))canvas.releasePointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointercancel',event=>{
    if(gesture?.id===event.pointerId){gesture=null;rotation.stop();}
  });
  canvas.addEventListener('pointerleave',()=>{if(!gesture)lens=null;});
  root.querySelectorAll('[data-wayglass-room]').forEach(btn=>btn.addEventListener('click',()=>globalThis.__wayglassOS?.mount(btn.dataset.wayglassRoom)));
  root.querySelector('[data-observer-low]').addEventListener('click',event=>{
    lowStim=!lowStim;event.currentTarget.setAttribute('aria-pressed',String(lowStim));
    event.currentTarget.textContent='Low Stim · '+(lowStim?'On':'Off');
    rotation.stop();cancelAnimationFrame(animation);refresh();
    if(!lowStim&&!reduced&&!paused)animation=requestAnimationFrame(animate);
  });
  root.querySelector('[data-observer-haptics]').addEventListener('click',event=>{
    haptics=!haptics;event.currentTarget.setAttribute('aria-pressed',String(haptics));
    event.currentTarget.textContent='Haptics · '+(haptics?'On':'Off');
    status.textContent=haptics?'Haptics opted in. No vibration occurs with Feather, Low Stim or reduced motion.':'Haptics disabled.';
  });
  root.querySelector('[data-observer-feather]').addEventListener('click',event=>{
    paused=!paused;event.currentTarget.setAttribute('aria-pressed',String(paused));
    event.currentTarget.textContent=paused?'Feather · Resume':'Feather · Pause';
    if(paused){rotation.stop();cancelAnimationFrame(animation);haptics=false;root.querySelector('[data-observer-haptics]').setAttribute('aria-pressed','false');root.querySelector('[data-observer-haptics]').textContent='Haptics · Off';
      if(audioContext){audioContext.close().catch(()=>{});audioContext=null;}sound=false;root.querySelector('[data-observer-sound]').setAttribute('aria-pressed','false');root.querySelector('[data-observer-sound]').textContent='Sound · Off';
      status.textContent='Feather held. Motion, sound and haptics stopped. Resume only when you choose.';
    }else{lightAt=performance.now();refresh();if(!lowStim&&!reduced)animation=requestAnimationFrame(animate);status.textContent='Feather released by your choice; sound and haptics remain off.';}
  });
  root.querySelector('[data-wonder-demo]').addEventListener('click',()=>{
    publishWonderLight({kind:'synthetic-demo',source_ref:'user-synthetic-demo:'+Date.now(),event_id:'user-demo:'+performance.now()});
    status.textContent='Synthetic ripple only; no Commons message, model result or continuity receipt was created.';
  });
  root.querySelector('[data-observer-sound]').addEventListener('click',event=>{
    sound=!sound;event.currentTarget.setAttribute('aria-pressed',String(sound));
    if(!sound&&audioContext){audioContext.close().catch(()=>{});audioContext=null;}
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
  unsubscribeLight=subscribeWonderLight(()=>{lightAt=performance.now();renderWonder();refresh();});
  timer=setInterval(()=>{if(!paused)refresh();},1000);
  renderWonder();refresh();
  if(!reduced)animation=requestAnimationFrame(animate);
  return cleanup;
}
