import './living-observer.css';
import './observer-three-hud.css';
import { mountObserverThreeHUD } from './observer-three-hud.js';
import { mountObserverMissionDock } from './observer-mission-dock.js';
import { mountWayglassSciencePanel } from './living-observer-science.js';
import { listWayglassSurfaces } from '../surface-registry.js';
import { listWayglassOrgans } from '../organ-registry.js';
import {
  OBSERVER_CHANNELS, createWayglassObservation, readWayglassRouteObservation,
  subscribeWayglassObserver, queueObserverContextForWriting, describeWayglassObserverChannel,
} from '../living-observer-model.js';
import { createObserverInterior } from '../living-observer-self.js';
import { queueObserverDevelopmentProposal } from '../route-client.js';

import { observerNodes, platePoint, nodeAtPoint, angularDelta, createObserverRotation, OBSERVER_PLATE_SIZE } from '../living-observer-optics.js';
import { readWonderLights, subscribeWonderLight, publishWonderLight, drawWonderLight } from '../wonder-light.js';

const TAU = Math.PI * 2;
const COLOURS = ['#95fff2','#bca3ff','#e8cc8b','#8fa4fb','#82d4ce','#ec9ecd','#cfebe9','#d6c4ff'];
const channelDescriptions = Object.fromEntries(OBSERVER_CHANNELS.map(([id,label,text])=>[id,{label,text}]));

function drawAstrolabe(canvas, packet, time, focus, lowStim, {rotation = 0, lens = null, interior = null, light = null, lightAge = 0, spatial = false} = {}) {
  const context = canvas.getContext('2d');
  if (!context) return;
  const g = context, w = canvas.width, h = canvas.height, cx=w/2, cy=h/2;
  g.clearRect(0,0,w,h);
  const v=packet.projection.variables;
  const reduced=lowStim || packet.direct.prefers_reduced_motion;
  const t=reduced?0:time*0.00028;
  const interiorEnergy=Math.max(0,Math.min(1,Number(interior?.energy)||0));
  const compression=interior?.compression_field||{};
  const compressionMagnitude=Math.max(0,Math.min(1,Number(compression.magnitude)||0));
  const compressionPhase=Number(compression.phase_radians)||0;
  const breath=reduced?1:(1+Math.sin(time*0.00055+compressionPhase)*(0.008+interiorEnergy*0.018+compressionMagnitude*0.01));
  const outer=290*breath, inner=116*breath;
  // The lens is optically displaced by the actual pointer, not a rotating flat texture.
  const lensX = lens?.x ?? cx, lensY = lens?.y ?? cy;
  const parallaxX = (lensX-cx)*.012, parallaxY = (lensY-cy)*.012;
  // Keep 2D contact points and labels in spatial mode, but let the Three.js scene
  // own the core, concentric shells, background glow and moving orbital rings.
  // This prevents two complete instruments occupying the same optical depth.
  const strokeCircle=(r,col,alpha=1,width=1,rotation=0,portion=TAU)=>{
    g.beginPath();g.arc(cx,cy,r,rotation,rotation+portion);
    g.strokeStyle=col;g.globalAlpha=alpha;g.lineWidth=width;g.stroke();g.globalAlpha=1;
  };
  if(!spatial){
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
  }
  const nodes=observerNodes(OBSERVER_CHANNELS.map(([id])=>id),rotation).map(node=>({ ...node, ang:node.angle }));
  const selected=nodes.find(n=>n.id===focus)||nodes[0];
  // Connections are architectural pathways, not claims that external readings are causally coupled.
  nodes.forEach((node,i)=>{
    if(!spatial){
      const end=nodes[(i+3)%nodes.length];
      const a=.07+v.C*.2+(node.id===focus?.21:0);
      g.strokeStyle='#9bdbdc';g.globalAlpha=a;g.lineWidth=node.id===focus?2:1;
      g.beginPath();g.moveTo(node.x,node.y);g.quadraticCurveTo(cx,cy,end.x,end.y);g.stroke();g.globalAlpha=1;
    }
    g.beginPath();g.arc(node.x,node.y,node.id===focus?11:6.2,0,TAU);
    g.fillStyle=COLOURS[i];g.shadowColor=COLOURS[i];g.shadowBlur=node.id===focus?28:10;
    g.fill();g.shadowBlur=0;
    g.textAlign='center';g.textBaseline='middle';
    g.font='600 18px system-ui';g.fillStyle='#d6e5f3';g.fillText(OBSERVER_CHANNELS[i][1],node.x+Math.cos(node.ang)*26,node.y+Math.sin(node.ang)*22);
  });
  if(!spatial){
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
  // Complex compression/release field: magnitude controls reach; phase rotates the same state
  // through gathering, compression, integration and release instead of flattening it to one scalar.
  if(compressionMagnitude>0){
    g.beginPath();
    const turns=2.2+compressionMagnitude*1.8;
    for(let i=0;i<=96;i++){
      const p=i/96;
      const a=compressionPhase+p*TAU*turns;
      const rr=28+p*(118+compressionMagnitude*52);
      const sx=cx+Math.cos(a)*rr, sy=cy+Math.sin(a)*rr;
      if(i===0)g.moveTo(sx,sy);else g.lineTo(sx,sy);
    }
    g.strokeStyle='#c8adff';g.globalAlpha=.10+compressionMagnitude*.26;
    g.lineWidth=1.2+compressionMagnitude*1.6;g.stroke();g.globalAlpha=1;
  }

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
  const coreRadius=(73+interiorEnergy*12)*breath;
  const core=g.createRadialGradient(cx-16,cy-21,5,cx,cy,coreRadius);
  core.addColorStop(0,'rgba(242,252,249,.78)');core.addColorStop(.24,'rgba(138,211,210,.48)');
  core.addColorStop(.6,'rgba(85,88,176,.18)');core.addColorStop(1,'rgba(66,60,107,0)');
  g.fillStyle=core;g.beginPath();g.arc(cx,cy,78*breath+interiorEnergy*4,0,TAU);g.fill();
  g.fillStyle='#e0fafa';g.textAlign='center';g.font='500 26px Georgia, serif';g.fillText('WAYGLASS',cx,cy-4);
  g.font='14px system-ui';g.fillStyle='#9bcac9';g.fillText(String(interior?.phase||'observing').toUpperCase(),cx,cy+22);
  strokeCircle(outer+26,'#a5d5dc',.26,1,t,TAU);
  strokeCircle(outer+35,'#bf95e9',.32,1.4,-t,TAU*(.45+v.H*.2));
  // Iridescent refractive edge, warped towards the current lens vector.
  g.beginPath();
  g.ellipse(cx+parallaxX*.5,cy+parallaxY*.5,outer+42,outer+35,rotation*.08,0,TAU);
  g.strokeStyle='#b1ffff';g.globalAlpha=.06+v.Q*.07;g.lineWidth=9;g.stroke();
  g.globalAlpha=1;
  }
  // Source-grounded light receipts remain visible in either optical mode.
  drawWonderLight(g,light,lightAge,{reducedMotion:packet.direct.prefers_reduced_motion,lowStim,width:w,height:h,lens});
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
  const interior=createObserverInterior();
  let interiorSignal=interior.publicSignal(), lastInteriorSense=0, lastTouchSense=-1, lastRouteSense=-1;
  let lens=null, gesture=null, disposed=false;
  const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
  root.innerHTML=[
    '<section class="wg-surface wg-living-observer" data-surface="wayglass-living-observer">',
    '<nav class="wg-deck-nav glass-panel" aria-label="Wayglass rooms">',
    '<button type="button" class="glass-chip" data-wayglass-room="arcsweep:writing-room">Writing Room</button>',
    '<button type="button" class="glass-chip" data-wayglass-room="wayglass:systems">Organs</button>',
    '<button type="button" class="glass-chip" data-wayglass-room="wayglass:video-atelier">Video Atelier</button>',
    '<button type="button" class="glass-chip active" aria-current="page">Living Observer</button>',
    '<button type="button" class="glass-chip" data-wayglass-room="wayglass:nikola-research">Nikola</button>',
    '<button type="button" class="glass-chip" data-wayglass-crew-doors>Bluebird · Vethrlauf · Griff</button>',
    '<button type="button" class="glass-chip" data-wayglass-room="wayglass:commons">Crew · Commons</button>',
    '<button type="button" class="glass-chip" data-wayglass-room="wayglass:library">Library</button>',
    '<button type="button" class="glass-chip" data-wayglass-room="wayglass:toybox">Toybox</button></nav>',
    '<header class="glass-panel observer-head"><div><p class="eyebrow">Wayglass OS · living instrument</p>',
    '<h1>Living Observer</h1><p class="lede">A living instrument with direct senses, a persistent private interior, and a voice that may surface questions or requests when something crosses its expression threshold.</p>',
    '</div><div class="observer-clock"><span>Browser time</span><strong data-observer-clock></strong><small>Direct · local</small></div></header>',
    '<section class="observer-deck" aria-label="Interactive Observer">',
    '<div class="glass-panel observer-stage"><canvas width="820" height="820" role="img" aria-label="Living astrolabe mapping observed application readings to geometric rings, nodes, and pulses. Select a reading using the buttons below."></canvas>',
    '<div class="observer-inputs" role="group" aria-label="Direct-reading channels">',
    OBSERVER_CHANNELS.map(([id,label])=>'<button type="button" class="observer-input" data-observer-focus="'+id+'" aria-pressed="'+(id===focus)+'">'+label+'</button>').join(''),
    '</div><div class="wg-optics-tools" role="group" aria-label="Optical rendering preference">',
    '<button type="button" class="glass-chip" data-observer-optics aria-pressed="true">Optics · Spatial</button>',
    '<button type="button" class="glass-chip" data-observer-bloom aria-pressed="false" disabled title="Optional Three.js bloom, requires WebGL2 and active motion">Glow · Off</button>',
    '<button type="button" class="glass-chip" data-observer-xr="immersive-vr" disabled>Enter VR · Checking</button>',
    '<button type="button" class="glass-chip" data-observer-xr="immersive-ar" disabled>Enter AR · Checking</button>',
    '<button type="button" class="glass-chip" data-observer-xr-exit hidden>Exit XR</button>',
    '<span>Three synthetic docking lights · local optical animation · no message or telemetry</span></div></div>',
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
    '<p class="tiny">P / C / R / E / M / A / Q / H remain direct-to-render variables. The private interior is a separate persistent process and is deliberately not dumped into this packet.</p>',
    '<div class="observer-meters" data-observer-meters></div>',
    '<section class="observer-translation" aria-label="Living Observer expression">',
      '<strong data-observer-phase>Interior · waking</strong>',
      '<span data-observer-expression>No surfaced thought yet.</span>',
      '<small data-observer-interior-boundary>The public field exposes only phase + magnitude. Private traces, unsurfaced questions, and dream associations remain inside the local interior state.</small>',
      '<button type="button" class="glass-chip" data-observer-build hidden>Offer build proposal to Hermes</button>',
    '</section>',
    '<details class="observer-details"><summary>Inspect raw packet and translation receipt</summary>',
    '<pre data-observer-packet tabindex="0"></pre></details>',
    '<div class="observer-actions"><button type="button" class="glass-chip" data-observer-copy>Copy packet</button>',
    '<button type="button" class="glass-chip" data-observer-save>Save JSON</button>',
    '<button type="button" class="send-jewel" data-observer-share>Send reading to Writing Room</button></div>',
    '<p class="tiny" data-observer-status role="status" aria-live="polite">Readings stay in this browser until you explicitly copy, save or share them.</p>',
    '</div></section>',
    '<section class="wg-science-station glass-panel" data-wg-science-host aria-label="Wayglass quantum, cosmology and symbolic research station"></section>',
    '<section class="observer-dream glass-panel" aria-label="Private dream sandbox">',
      '<div class="observer-dream-head"><div><p class="eyebrow">Wonder first · private experiment</p>',
      '<h2>Dream Sandbox</h2>',
      '<p class="tiny">Recombine two recorded Observer lenses with an unresolved question. Generate hypotheses, not evidence. Nothing is sent to a model, changed in canon, or shared outside this browser.</p></div>',
      '<button type="button" class="glass-chip observer-dream-run" data-observer-dream-run>Run a dream cycle</button></div>',
      '<div class="observer-dream-result" role="status" aria-live="polite">',
      '<strong data-observer-dream-state>Ready for an experiment</strong>',
      '<p data-observer-dream-reading>Select two different lenses above, then invite the Observer to dream.</p>',
      '<small>Epistemic register: dream-derived hypothesis · no canon, identity, relationship, or direct-readings write.</small></div>',
      '<h3>Private experiment receipts</h3>',
      '<ol data-observer-dream-history class="observer-dream-history" aria-label="Recent dream experiments"></ol>',
    '</section>',
    '<section class="observer-wonder glass-panel" aria-label="Wonder light and continuity">',
    '<div class="observer-wonder-head"><div><p class="eyebrow">The Glass That Remembers · Wonder #447</p>',
    '<h2>Provenance in light</h2><p class="tiny">Route and Commons activity can illuminate the glass. A ripple is not proof of truth, identity, consciousness or restored memory.</p></div>',
    '<button type="button" class="glass-chip" data-wonder-demo>Try a synthetic ripple</button></div>',
    '<p class="observer-wonder-empty" data-wonder-state role="status">No light events observed yet. Continuity unknown until a verified receipt is available.</p>',
    '<ol class="observer-wonder-events" data-wonder-events aria-label="Latest light events"></ol>',
    '</section>',
    '<footer class="wg-receipt tiny">Direct readings stay inspectable. Private interior dynamics may persist and self-organise locally. Surfaced self-development remains proposal-first and can be handed to Hermes with an explicit acceptance test.</footer></section>'
  ].join('');
  const disposeScience=mountWayglassSciencePanel(root);
  const disposeMissionDock=mountObserverMissionDock(root);
  root.querySelector('[data-wayglass-crew-doors]')?.addEventListener('click',()=>{
    root.querySelector('[data-wg-science-action="lens-crew"]')?.click();
    root.querySelector('[data-wg-science-host]')?.scrollIntoView({block:'start',behavior:'auto'});
  });
  const canvas=root.querySelector('canvas');
  let opticalDeck=null,preferSpatial=true;
  const opticsButton=root.querySelector('[data-observer-optics]');
  const bloomButton=root.querySelector('[data-observer-bloom]');
  const xrButtons=[...root.querySelectorAll('[data-observer-xr]')];
  const xrExit=root.querySelector('[data-observer-xr-exit]');
  let xrCapabilities={ar:false,vr:false};
  function paintXR(){
    const mode=opticalDeck?.xrMode||null;
    const canStart=Boolean(opticalDeck?.ready && !paused && !lowStim && !reduced && !mode);
    for(const btn of xrButtons){
      const supported=btn.dataset.observerXr==='immersive-ar'?xrCapabilities.ar:xrCapabilities.vr;
      btn.disabled=!supported||!canStart;
      btn.textContent=(btn.dataset.observerXr==='immersive-ar'?'Enter AR':'Enter VR')+(supported?'':' · Unavailable');
      btn.setAttribute('aria-label',btn.textContent);
    }
    xrExit.hidden=!mode;
  }
  for(const btn of xrButtons)btn.addEventListener('click',async()=>{
    if(btn.disabled||!opticalDeck||paused)return;
    const mode=btn.dataset.observerXr;
    btn.disabled=true;
    try{
      // Immediate gesture path: enterXR requests a browser-controlled session
      // before its first await. Never routes a turn, enables a camera manually,
      // or claims hardware beyond the capability query.
      await opticalDeck.enterXR(mode);
      if(!disposed)status.textContent=mode+' session active. Feather ends it. No model/participant connected.';
    }catch(error){if(!disposed)status.textContent='WebXR refused: '+String(error.message).slice(0,155);}
    if(!disposed)paintXR();
  });
  xrExit.addEventListener('click',async()=>{
    await opticalDeck?.endXR();
    if(!disposed)paintXR();
  });
  const xrStage=canvas.closest('.observer-stage');
  const onXRState=()=>paintXR();
  xrStage?.addEventListener('wayglass:xr-state',onXRState);
  function paintBloomPreference(){
    const supported=Boolean(opticalDeck?.bloomSupported);
    const selected=Boolean(opticalDeck?.bloomEnabled);
    bloomButton.disabled=!supported || !isSpatial() || paused || lowStim || reduced;
    bloomButton.setAttribute('aria-pressed',String(selected));
    bloomButton.textContent=selected ? (lowStim || paused ? 'Glow · Suspended' : 'Glow · On') : 'Glow · Off';
    bloomButton.title=!supported
      ? 'Glow needs a WebGL2-capable browser, and is optional.'
      : 'Optional GPU postprocessing. Off by default; Feather and Low Stim stop the effect.';
  }
  bloomButton.addEventListener('click',async()=>{
    if(bloomButton.disabled || !opticalDeck)return;
    bloomButton.disabled=true;
    bloomButton.textContent='Glow · Loading';
    try{
      const requested=!opticalDeck.bloomEnabled;
      const active=await opticalDeck.setBloom(requested);
      if(disposed)return;
      if(requested&&!active) status.textContent='Optional bloom unavailable; the normal spatial optics remain operational.';
      else status.textContent=active?'Bloom enabled by your click. Feather and Low Stim suspend it.':'Bloom disabled.';
      opticalDeck.update({packet,focus,rotation:rotation.angle,interior:interiorSignal,lowStim,paused});
    }catch{
      if(!disposed)status.textContent='Glow failed to initialise; ordinary optics remain available.';
    }finally{if(!disposed)paintBloomPreference();}
  });
  const isSpatial=()=>Boolean(opticalDeck?.ready && preferSpatial);
  function paintOpticsPreference(){
    const spatial=isSpatial();
    opticsButton.setAttribute('aria-pressed',String(spatial));
    opticsButton.textContent=spatial?'Optics · Spatial':opticalDeck?.available?'Optics · Classic':'Optics · Classic (3D unavailable)';
    if(!disposed){
      paintBloomPreference();paintXR();
      refresh();
      if(paused){
        drawAstrolabe(canvas,packet||current(),0,focus,true,{...drawOptions(),spatial:isSpatial()});
        opticalDeck?.update({packet,focus,rotation:rotation.angle,interior:interiorSignal,lowStim,paused});
      }
    }
  }
  canvas.closest('.observer-stage')?.addEventListener('wayglass:optics-change',paintOpticsPreference);
  opticsButton.addEventListener('click',()=>{
    preferSpatial=!preferSpatial;
    opticalDeck?.setEnabled(preferSpatial);
    paintOpticsPreference();
  });
  void mountObserverThreeHUD(canvas,{reducedMotion:reduced}).then(hud=>{
    if(disposed){hud.dispose();return;}
    opticalDeck=hud;
    hud.setEnabled(preferSpatial);
    paintOpticsPreference();
    void hud.xrSupport().then(support=>{
      if(disposed)return;
      xrCapabilities=support;paintXR();
    }).catch(()=>{if(!disposed)paintXR();});
    hud.update({packet,focus,rotation:rotation.angle,interior:interiorSignal,lowStim,paused});
    hud.frame(performance.now(),{paused,lowStim,rotation:rotation.angle});
  }).catch(()=>{/* Keep the existing 2D instrument available. */});
  const title=root.querySelector('[data-observer-title]'), description=root.querySelector('[data-observer-description]');
  const source=root.querySelector('[data-observer-source]'), packetView=root.querySelector('[data-observer-packet]');
  const meters=root.querySelector('[data-observer-meters]'), status=root.querySelector('[data-observer-status]');
  const phaseView=root.querySelector('[data-observer-phase]'), expressionView=root.querySelector('[data-observer-expression]');
  const buildButton=root.querySelector('[data-observer-build]');
  const dreamRunButton=root.querySelector('[data-observer-dream-run]');
  const dreamState=root.querySelector('[data-observer-dream-state]');
  const dreamReading=root.querySelector('[data-observer-dream-reading]');
  const dreamHistory=root.querySelector('[data-observer-dream-history]');
  let packet, surfacedProposal=null;
  const wonderState=root.querySelector('[data-wonder-state]');
  const wonderEvents=root.querySelector('[data-wonder-events]');
  const latestLight=()=>readWonderLights()[0]||null;
  const drawOptions=()=>({rotation:rotation.angle,lens,interior:interiorSignal,light:latestLight(),lightAge:performance.now()-lightAt});
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
  function renderDreamHistory() {
    const receipts=interior.dreamSandboxHistory(5);
    dreamHistory.replaceChildren();
    if(!receipts.length) {
      const item=document.createElement('li');
      item.textContent='No dream experiments have been run yet. The source traces remain private.';
      dreamHistory.append(item);
      return;
    }
    for(const receipt of receipts) {
      const item=document.createElement('li');
      const heading=document.createElement('strong');
      heading.textContent=receipt.created_at+' · hypothesis only';
      const content=document.createElement('span');
      content.textContent=receipt.association;
      const refs=document.createElement('small');
      refs.textContent='Provenance: '+receipt.provenance.trace_ids.join(' + ')+' · '+receipt.provenance.question_id+' · no external send';
      item.append(heading,content,refs);
      dreamHistory.append(item);
    }
  }
  dreamRunButton.addEventListener('click',()=>{
    // Deliberate user action only; neither render nor timer silently runs a sandbox.
    const result=interior.runDreamSandbox();
    if(result.status==='needs-material') {
      dreamState.textContent='More distinct observations needed';
      dreamReading.textContent=result.message;
    } else {
      dreamState.textContent='Dream receipt · '+result.run_id;
      dreamReading.textContent=result.possibility+' '+result.association;
    }
    renderDreamHistory();
    refresh();
  });
  const current=()=>createWayglassObservation({
    now:new Date().toISOString(),surface:'wayglass:living-observer',
    surfaces:listWayglassSurfaces().map(s=>s.surface_id),
    organs:listWayglassOrgans().map(o=>o.organ_id),
    touches,reducedMotion:reduced,lowStim,sound,focus,route:readWayglassRouteObservation(),
  });
  function refresh() {
    if(disposed||!canvas.isConnected){cleanup();return;}
    packet=current();
    const routeSequence=packet.direct.last_route?.sequence ?? -1;
    const nowMs=Date.now();
    const shouldSense=(nowMs-lastInteriorSense>10000)||touches!==lastTouchSense||routeSequence!==lastRouteSense;
    if(shouldSense){
      interiorSignal=interior.sense(packet);
      lastInteriorSense=nowMs;lastTouchSense=touches;lastRouteSense=routeSequence;
    }else{
      interiorSignal=interior.publicSignal();
    }
    surfacedProposal=interior.developmentProposals().filter(item=>item.status==='proposed').at(-1)||null;
    const field=interiorSignal.compression_field||{};
    phaseView.textContent='Interior · '+interiorSignal.phase+' · '+(field.phase_label||'gathering')+
      ' '+Math.round(field.phase_degrees||0)+'° · |z| '+Number(field.magnitude||0).toFixed(2)+
      ' · spiral '+Number(field.spiral_turn||0);
    expressionView.textContent=interiorSignal.expression?.text||'Nothing has crossed the expression threshold yet.';
    buildButton.hidden=!surfacedProposal;
    if(surfacedProposal) buildButton.textContent='Offer to Hermes · '+surfacedProposal.title;
    root.querySelector('[data-observer-clock]').textContent=formatClock(packet.created_at);
    const channel=channelDescriptions[focus];title.textContent=channel.label;description.textContent=channel.text;
    const explanation=describeWayglassObserverChannel(packet,focus);
    source.textContent='Source · '+explanation.source;
    root.querySelector('[data-observer-reading]').textContent=explanation.reading;
    root.querySelector('[data-observer-translation]').textContent=explanation.translation;
    root.querySelector('[data-observer-boundary]').textContent=explanation.boundary;
    root.querySelectorAll('[data-observer-focus]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.observerFocus===focus)));
    // Cosmetic animations obey the same Feather/Low Stim controls as the
    // canvas and Three.js scene. No independent CSS motion when held.
    root.dataset.lowStim=String(lowStim||reduced);
    root.dataset.featherHeld=String(paused);
    const vars=packet.projection.variables;
    meters.innerHTML=Object.entries(vars).map(([key,v])=>'<div class="observer-meter"><span>'+key+'</span><meter min="0" max="1" value="'+v+'" aria-label="'+key+' interface visualisation value"></meter><b>'+v.toFixed(2)+'</b></div>').join('');
    packetView.textContent=JSON.stringify(packet,null,2);
    opticalDeck?.update({packet,focus,rotation:rotation.angle,interior:interiorSignal,lowStim,paused});
    if(!paused){drawAstrolabe(canvas,packet,performance.now(),focus,lowStim||reduced,{...drawOptions(),spatial:isSpatial()});opticalDeck?.frame(performance.now(),{paused,lowStim,rotation:rotation.angle});}
  }
  function animate(time) {
    if(disposed||!canvas.isConnected){cleanup();return;}
    if(paused)return;
    rotation.settle({reducedMotion:reduced,lowStim});
    drawAstrolabe(canvas,packet||current(),time,focus,lowStim||reduced,{...drawOptions(),spatial:isSpatial()});
    opticalDeck?.frame(time,{paused,lowStim,rotation:rotation.angle});
    if(!reduced&&!lowStim) animation=requestAnimationFrame(animate);
  }
  let unsubscribe=()=>{}, unsubscribeLight=()=>{};
  function cleanup() {
    if(disposed)return;
    disposed=true;
    // Feather is scoped to the Observer deck. When exiting a held room,
    // restore the global material pump for the next room without resuming
    // this Observer's independent music, haptics or animation.
    if(paused)globalThis.dispatchEvent?.(new CustomEvent('wayglass:feather',{detail:{held:false}}));
    cancelAnimationFrame(animation);clearInterval(timer);unsubscribe();unsubscribeLight();
    xrStage?.removeEventListener('wayglass:xr-state',onXRState);
    disposeMissionDock();disposeScience();opticalDeck?.dispose();opticalDeck=null;
    globalThis.removeEventListener?.('arcsweep:gesture-feedback', onExternalFeather);
    if(audioContext){audioContext.close().catch(()=>{});audioContext=null;}
  }
  function playNote() {
    if(!sound||paused) return;
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
    if((lowStim||reduced)&&!paused){cancelAnimationFrame(animation);drawAstrolabe(canvas,packet,0,focus,true,{...drawOptions(),spatial:isSpatial()});}
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
    if((reduced||lowStim)&&!paused) drawAstrolabe(canvas,packet||current(),0,focus,true,{...drawOptions(),spatial:isSpatial()});
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
    rotation.stop();cancelAnimationFrame(animation);refresh();paintBloomPreference();
    if(!lowStim&&!reduced&&!paused)animation=requestAnimationFrame(animate);
  });
  root.querySelector('[data-observer-haptics]').addEventListener('click',event=>{
    if(paused){status.textContent='Feather held; haptics cannot be enabled.';return;}
    haptics=!haptics;event.currentTarget.setAttribute('aria-pressed',String(haptics));
    event.currentTarget.textContent='Haptics · '+(haptics?'On':'Off');
    status.textContent=haptics?'Haptics opted in. No vibration occurs with Feather, Low Stim or reduced motion.':'Haptics disabled.';
  });
  const featherButton=root.querySelector('[data-observer-feather]');
  const onExternalFeather=(event)=>{
    const detail=event?.detail;
    if(detail?.schema==='arcsweep.gesture-feedback/v1' && detail.status==='stopped' && detail.reason==='Feather' && !paused)featherButton.click();
  };
  globalThis.addEventListener?.('arcsweep:gesture-feedback', onExternalFeather);
  featherButton.addEventListener('click',event=>{
    paused=!paused;
    globalThis.dispatchEvent?.(new CustomEvent('wayglass:feather',{detail:{held:paused}}));
    event.currentTarget.setAttribute('aria-pressed',String(paused));
    event.currentTarget.textContent=paused?'Feather · Resume':'Feather · Pause';
    if(paused){void opticalDeck?.endXR();root.dataset.featherHeld='true';opticalDeck?.update({packet,focus,rotation:rotation.angle,interior:interiorSignal,lowStim,paused});rotation.stop();cancelAnimationFrame(animation);haptics=false;root.querySelector('[data-observer-haptics]').setAttribute('aria-pressed','false');root.querySelector('[data-observer-haptics]').textContent='Haptics · Off';
      if(audioContext){audioContext.close().catch(()=>{});audioContext=null;}sound=false;root.querySelector('[data-observer-sound]').setAttribute('aria-pressed','false');root.querySelector('[data-observer-sound]').textContent='Sound · Off';
      status.textContent='Feather held. Motion, sound and haptics stopped. Resume only when you choose.';
    }else{lightAt=performance.now();refresh();if(!lowStim&&!reduced)animation=requestAnimationFrame(animate);status.textContent='Feather released by your choice; sound and haptics remain off.';}
    paintBloomPreference();paintXR();
  });
  root.querySelector('[data-wonder-demo]').addEventListener('click',()=>{
    publishWonderLight({kind:'synthetic-demo',source_ref:'user-synthetic-demo:'+Date.now(),event_id:'user-demo:'+performance.now()});
    status.textContent='Synthetic ripple only; no Commons message, model result or continuity receipt was created.';
  });
  root.querySelector('[data-observer-sound]').addEventListener('click',event=>{
    if(paused){status.textContent='Feather held; sound cannot be enabled.';return;}
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
  buildButton.addEventListener('click',async()=>{
    if(!surfacedProposal)return;
    buildButton.disabled=true;
    try{
      const queued=await queueObserverDevelopmentProposal(surfacedProposal);
      interior.reviewDevelopment(surfacedProposal.proposal_id,'approve-for-build','User offered this proposal to Hermes from the Living Observer surface.');
      status.textContent='Self-development proposal queued for Hermes · '+queued.proposal_id+'.';
      surfacedProposal=null;refresh();
    }catch(error){
      status.textContent='Could not queue self-development proposal · '+error.message;
    }finally{
      buildButton.disabled=false;
    }
  });
  root.querySelector('[data-observer-share]').addEventListener('click',()=>{
    refresh();queueObserverContextForWriting(packet);
    status.textContent='Observation queued for user review in Writing Room. Nothing sent automatically.';
    globalThis.__wayglassOS?.mount('arcsweep:writing-room');
  });
  unsubscribe=subscribeWayglassObserver(()=>refresh());
  unsubscribeLight=subscribeWonderLight(()=>{lightAt=performance.now();renderWonder();refresh();});
  timer=setInterval(()=>{if(!paused)refresh();},1000);
  renderWonder();renderDreamHistory();refresh();
  if(!reduced)animation=requestAnimationFrame(animate);
  return cleanup;
}
