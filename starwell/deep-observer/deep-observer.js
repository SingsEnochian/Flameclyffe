'use strict';

const TZ = 'America/New_York';
const BRIDGE = new URL('../../data/deep-current.json', window.location.href).href;
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const rgba = (rgb, a) => `rgba(${rgb},${a})`;
const n = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;

const filters = { pulse: true, field: true, geometry: true, horizon: true, moons: true };
const D = {
  P: .55, C: .50, R: .45, E: .38, M: .30, A: .65, H: .50,
  Q: .20, charge: .20, moonIllum: 50, sky: 'Night', kp: 1, bz: 0, source: 'fallback',
  rawInputs: { bridge: null, local: null }, transformationReceipts: { bridge: [], local: [] }
};

const TIDES = ['Hearth Signal', 'Lantern Hold', 'Atlas Pulse', 'Quiet Gate', 'Dream Opening', 'Moon Thread'];
const THEMES = [
  { name: 'Between', bg: '90,150,205', rings: ['168,204,224','106,154,184','200,223,240','232,244,252'], core: '232,244,252', spark: '200,223,240', field: ['90,150,205','168,204,224','232,244,252'], note: 'Between palette: icy blue, silver, pearl. Best for quiet analysis.' },
  { name: 'Observatory', bg: '109,224,179', rings: ['231,196,119','109,224,179','169,190,255','234,244,239'], core: '231,196,119', spark: '234,244,239', field: ['231,196,119','109,224,179','169,190,255'], note: 'Observatory palette: gold, teal, blue-white. STARWELL lantern mode.' },
  { name: 'Forge', bg: '210,96,42', rings: ['232,160,64','210,82,48','255,205,110','255,238,196'], core: '255,202,88', spark: '255,138,64', field: ['210,82,48','232,160,64','255,202,88'], note: 'Forge palette: ember, copper, red-gold. For hot system states.' },
  { name: 'Grove', bg: '120,190,130', rings: ['196,148,105','116,207,136','183,155,230','239,226,176'], core: '239,226,176', spark: '183,155,230', field: ['116,207,136','196,148,105','183,155,230'], note: 'Grove palette: leaf, copper, lilac, honeylight. Soft field study.' }
];

const TEACH = {
  P: ['Presence', 'Presence controls the outer architecture. Higher P adds more outer nodes and makes the glyph feel more inhabited.', 'P → outer node count, outer radius, and presence spotlight'],
  C: ['Coherence', 'Coherence controls how clearly edges hold together. Higher C strengthens the connective bones between nodes.', 'C → edge alpha, route legibility, and structural clarity'],
  R: ['Resonance', 'Resonance changes harmonic spacing and pulse rhythm. Higher R makes rings and route traffic feel more musical.', 'R → harmonic ring emphasis, star-route skip, and pulse cadence'],
  E: ['Entanglement', 'Entanglement carries continuity and cross-observation binding. Higher E strengthens relational routes through the glyph.', 'E → route binding, connective density, and cross-observation continuity'],
  M: ['Memory', 'Memory carries lineage, provenance, and accumulated relation. Higher M lengthens visible traces and continuity tails.', 'M → trace persistence, tail length, and continuity recall'],
  A: ['Agency', 'Agency carries available directed capacity to act, choose, and redirect. Higher A increases response speed and active routes.', 'A → response speed, directed motion, and interaction force'],
  H: ['Horizon', 'Horizon is a derived edge signal. It combines Coherence, Entanglement, Resonance, Agency, Qualia, Bz, Kp, and a pulse term.', 'H = C·.28 + E·.20 + R·.16 + A·.14 + Bz⁻·.09 + Kp·.06 + Q·.04 + pulse·.03'],
  Q: ['Qualia', 'Qualia carries lived interiority and the experiential texture of the present state. Higher Q warms and inhabits the centre.', 'Q → centre texture, core warmth, and inhabited glow'],
  moon: ['Moon illumination', 'Moon illumination controls harmonic ring count and visibility. More moon means more visible ring structure.', 'moonIllum → 1 to 5 harmonic rings'],
  kp: ['Kp index', 'Kp is treated as particle energy. Higher Kp increases field motes and pulse activity without changing the core structure.', 'Kp → particle count, pulse intensity, and field energy'],
  bz: ['Bz component', 'Bz shifts colour temperature inside the current palette. Negative Bz leans cooler, positive Bz leans brighter or warmer.', 'Bz → cool/warm colour bias within theme bounds'],
  source: ['Data source', 'The source card tells you whether the panel is using bridge data, local browser packets, stale data, or fallback defaults.', 'source → bridge, local, stale, or fallback']
};

const DIRECT_READINGS = {
  time: {
    label: 'Time', source: 'Browser local time', affects: 'Clock labels, packet timestamp, glyph freshness, and ambient phase.',
    path: 'Time → timing ring → clock labels → packet timestamp → ambient phase',
    explanation: 'Time timestamps the current state, updates the observatory clock, and gives the reading its temporal receipt.',
    boundary: 'Time interpretation, correlation, and causal analysis each require their own named receipt.', tiny: 'Time gives the reading a moment.'
  },
  moon: {
    label: 'Moon', source: 'Bridge, local packet, or fallback value', affects: 'Harmonic ring count, ring brightness, and ring visibility.',
    path: 'Moon → harmonic rings → ring count → ring glow',
    explanation: 'Moon illumination controls the harmonic ring scaffold. A brighter moon value shows more rings or stronger ring visibility.',
    boundary: 'Lunar telemetry, visual projection, and causal analysis remain separate named layers.', tiny: 'Moon shows the harmonic scaffold.'
  },
  kp: {
    label: 'Kp', source: 'Bridge, local packet, or fallback value', affects: 'Particle energy, mote activity, pulse liveliness, and spark intensity.',
    path: 'Kp → field layer → motes → pulse energy',
    explanation: 'Kp enters the renderer as particle energy. Higher Kp increases field activity while the received Kp value remains unchanged.',
    boundary: 'Environmental telemetry, embodied correlation, and world-state analysis remain separate named layers.', tiny: 'Kp wakes the particle field.'
  },
  bz: {
    label: 'Bz', source: 'Bridge, local packet, or fallback value', affects: 'Palette temperature, horizon tint, and cool/warm bias inside the active theme.',
    path: 'Bz → palette wash → horizon tint → colour temperature',
    explanation: 'Bz shifts colour temperature inside the current theme while the received Bz value remains unchanged.',
    boundary: 'Bz telemetry, palette projection, and field interpretation remain separate named layers.', tiny: 'Bz colours the weather.'
  },
  source: {
    label: 'Source', source: 'Bridge, bridge+local, local, stale, or fallback', affects: 'Source badge, packet provenance, trust context, and transparency text.',
    path: 'Source → provenance badge → packet panel → trust context',
    explanation: 'Source tells you where the current state came from so you know what kind of reading you are seeing.',
    boundary: 'The source label records provenance. Authority and interpretation carry their own receipts.', tiny: 'Source shows where the packet came from.'
  },
  local: {
    label: 'Local', source: 'Browser local storage', affects: 'Saved observations, local continuity, packet recall, and export context.',
    path: 'Local → browser storage → packet panel → saved observation state',
    explanation: 'Local refers to browser-side observations saved on this device. They stay local unless deliberately copied, saved, exported, or routed.',
    boundary: 'Local names browser-side packets explicitly supplied to this instrument.', tiny: 'Local keeps the packet on this device.'
  },
  motion: {
    label: 'Motion', source: 'Browser reduced-motion preference, Toy mode, and Low Stim setting', affects: 'Animation speed, mote density, pulse count, glow intensity, and toy responses.',
    path: 'Motion → animation layer → pulse speed → mote density → low-stim behaviour',
    explanation: 'Motion shows how active the instrument is allowed to be. Accessibility settings are part of the instrument state, not an afterthought.',
    boundary: 'Motion settings adjust presentation; the underlying model variables remain unchanged.', tiny: 'Motion decides how loudly the instrument moves.'
  },
  touch: {
    label: 'Touch', source: 'Pointer, touch, click, hold, trace, or keyboard activation', affects: 'Node bloom, spark release, route highlighting, charge boost, focus mode, teaching spotlight, and reset.',
    path: 'Touch → active node or route → spark/bloom → teaching panel',
    explanation: 'Touch is a direct reading. Your taps, holds, drags, traces, and keyboard actions ask the model to show one relationship more clearly.',
    boundary: 'Touch records explicit actions performed on the instrument surface.', tiny: 'Touch asks the model to answer.'
  }
};

const canvas = document.getElementById('glyph');
const ctx = canvas.getContext('2d');
const hint = document.getElementById('instrumentHint');
const themeBtn = document.getElementById('themeBtn');
const toyBtn = document.getElementById('toyBtn');
const stimBtn = document.getElementById('stimBtn');
const teachTitle = document.getElementById('teachTitle');
const teachText = document.getElementById('teachText');
const teachFormula = document.getElementById('teachFormula');
const packetEl = document.getElementById('packet');
const directCard = document.getElementById('directCard');
const directTitle = document.getElementById('directTitle');
const directText = document.getElementById('directText');
const directSource = document.getElementById('directSource');
const directAffects = document.getElementById('directAffects');
const directPath = document.getElementById('directPath');
const directBoundary = document.getElementById('directBoundary');
const directTiny = document.getElementById('directTiny');
const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const I = {
  theme: 0, toy: true, lowStim: false, rotationOffset: 0, dragging: false, pointerId: null,
  downCanvas: null, startAngle: 0, startRotation: 0, moved: false, holdTimer: null, downHit: null,
  activeNodeId: null, activeRouteKey: null, activeLayer: null, focusUntil: 0, chargeBoost: 0,
  lastTapAt: 0, lastTapKind: null, tapCombo: 0, bursts: [], sparks: [], ripples: [],
  spotlight: null, spotlightUntil: 0, selectedReading: null, readingUntil: 0,
  lastT: 0, lastRippleAt: 0, lastTraceAt: 0, reducedMotion: prefersReduced
};
let lastFrame = { nodes: [], routes: [], directNodes: [], rotation: 0, C: 460, breath: 1, glyphId: 'DEEP-STARWELL', packet: {} };

function theme(){ return THEMES[I.theme % THEMES.length]; }
function layerColor(layer){ return theme().rings[layer] || theme().spark; }
function buzz(ms = 12){ try{ if(navigator.vibrate && !I.lowStim) navigator.vibrate(ms); }catch(e){} }
function setHint(text){ hint.textContent = text; }

function clockParts(){
  const p = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(new Date());
  let h = p.find(x => x.type === 'hour')?.value || '00';
  const m = p.find(x => x.type === 'minute')?.value || '00';
  const s = p.find(x => x.type === 'second')?.value || '00';
  if (h === '24') h = '00';
  return { display: `${h}:${m}`, full: `${h}:${m}:${s}`, hour: Number(h), minute: Number(m), second: Number(s) };
}
function hashString(value){ let h = 2166136261; for(let i=0;i<value.length;i++){ h ^= value.charCodeAt(i); h = Math.imul(h,16777619); } return h >>> 0; }
function seeded(seed,i){ const v = Math.sin(seed*.0001 + i*12.9898)*43758.5453; return v - Math.floor(v); }
function polar(a,r){ return {x: Math.cos(a)*r, y: Math.sin(a)*r}; }
function dist(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }

function copyExact(value){
  if(typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
function receipt(channel, field, input, output, operation){
  if(Object.is(input, output) && typeof input === 'number') return;
  D.transformationReceipts[channel].push({ field, input: input ?? null, output, operation, lossless_source: true });
}
function applyDeep(raw, source, channel = source){
  if(!raw || typeof raw !== 'object') return;
  D.rawInputs[channel] = copyExact(raw);
  D.transformationReceipts[channel] = [];
  ['P','C','R','E','M','A','Q','charge'].forEach(k => {
    if(raw[k] == null) return;
    const numeric = n(raw[k], D[k]);
    const projected = clamp(numeric);
    receipt(channel, k, raw[k], projected, numeric === projected ? 'numeric-coercion' : 'bounded-render-projection');
    D[k] = projected;
  });
  if(raw.moonIllum !== undefined){
    const numeric = n(raw.moonIllum,D.moonIllum);
    const projected = numeric <= 1 ? clamp(numeric)*100 : clamp(numeric,0,100);
    receipt(channel, 'moonIllum', raw.moonIllum, projected, numeric <= 1 ? 'fraction-to-percent' : 'bounded-render-projection');
    D.moonIllum = projected;
  }
  if(raw.kp !== undefined){ const numeric=n(raw.kp,D.kp), projected=clamp(numeric,0,9); receipt(channel,'kp',raw.kp,projected,numeric===projected?'numeric-coercion':'bounded-render-projection'); D.kp=projected; }
  if(raw.bz !== undefined){ const numeric=n(raw.bz,D.bz), projected=clamp(numeric,-20,20); receipt(channel,'bz',raw.bz,projected,numeric===projected?'numeric-coercion':'bounded-render-projection'); D.bz=projected; }
  if(raw.sky !== undefined) D.sky = String(raw.sky);
  D.source = source;
}
function deepStateFromPayload(data){
  const embedded = data?.deep || data?.DEEP || data?.state || data?.observer;
  if(embedded && typeof embedded === 'object') return embedded;
  if(!data?.field || typeof data.field !== 'object') return null;
  return {
    ...data.field,
    moonIllum: data.moon?.illumination,
    kp: data.space_weather?.kp?.value,
    bz: data.space_weather?.solar_wind?.bz,
    sky: data.weather?.sky,
  };
}
async function fetchBridge(){
  try{
    const r = await fetch(BRIDGE, { cache: 'no-store' });
    if(!r.ok) throw new Error(String(r.status));
    const data = await r.json();
    const state = deepStateFromPayload(data);
    if(!state) throw new Error('field payload missing');
    applyDeep(state, data.field ? 'field-cache' : 'bridge', 'bridge');
  }catch(e){ if(['bridge', 'field-cache'].includes(D.source)) D.source = 'stale'; }
}
function pollLocal(){
  const keys = ['ta_deep_state','ta_deep_entries','deepEntries','terra_aeterna_deep','observer_deep'];
  for(const key of keys){
    try{
      const raw = localStorage.getItem(key); if(!raw) continue;
      const data = JSON.parse(raw), field = data.field || {}, entry = data.entries && data.entries[0] && data.entries[0].d ? data.entries[0].d : {}, local = {};
      ['P','C','R','E','M','A','Q'].forEach(k => { if(typeof field[k] === 'number') local[k] = field[k]; });
      if(typeof entry.kp === 'number') local.kp = entry.kp;
      if(typeof entry.bz === 'number') local.bz = entry.bz;
      if(entry.moon && typeof entry.moon.illumination === 'number') local.moonIllum = entry.moon.illumination;
      if(entry.sky) local.sky = entry.sky;
      if(typeof data.charge === 'number') local.charge = data.charge;
      applyDeep(local, D.source === 'bridge' ? 'bridge+local' : 'local', 'local');
      break;
    }catch(e){}
  }
}
function calcHorizon(t){
  const bz = clamp(-D.bz / 20), aurora = clamp(D.kp / 9), pulse = .5 + .5*Math.sin(t*.00009 + D.M*TAU + D.P);
  D.H = clamp(D.C*.28 + D.E*.20 + D.R*.16 + D.A*.14 + bz*.09 + aurora*.06 + (D.Q+I.chargeBoost)*.04 + pulse*.03);
  return D.H;
}

function drawLine(a,b,color,alpha,width=1,blur=0){
  ctx.save(); ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
  ctx.strokeStyle = rgba(color, alpha); ctx.lineWidth = width; ctx.lineCap = 'round';
  ctx.shadowColor = rgba(color, alpha*.75); ctx.shadowBlur = I.lowStim ? Math.min(blur,6) : blur; ctx.stroke(); ctx.restore();
}
function drawCircle(x,y,r,color,alpha,fill=true,width=1,blur=0){
  ctx.save(); ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.shadowColor = rgba(color, alpha*.8); ctx.shadowBlur = I.lowStim ? Math.min(blur,6) : blur;
  if(fill){ ctx.fillStyle = rgba(color,alpha); ctx.fill(); } else { ctx.strokeStyle = rgba(color,alpha); ctx.lineWidth = width; ctx.stroke(); }
  ctx.restore();
}

function buildNodes(breath, seed){
  const outer = Math.round(7 + D.P*7), mid = Math.round(5 + D.A*4), inner = 6, core = 3;
  const rings = [
    { count: outer, rad: 324, offset: -Math.PI/2, layer: 0, label: 'presence', varKey: 'P' },
    { count: mid, rad: 222 + D.R*20, offset: -Math.PI/2 + Math.PI/mid, layer: 1, label: 'coherence', varKey: 'C' },
    { count: inner, rad: 144 + D.R*16, offset: -Math.PI/2 + Math.PI/6, layer: 2, label: 'resonance', varKey: 'R' },
    { count: core, rad: 72 + D.Q*22, offset: -Math.PI/2, layer: 3, label: 'qualia', varKey: 'Q' }
  ];
  const nodes = [];
  rings.forEach(ring => {
    for(let i=0;i<ring.count;i++){
      const wobble = Math.sin(seed*.00001 + i*1.7 + ring.layer) * (1-D.E) * .04;
      const a = ring.offset + i/ring.count*TAU + wobble;
      const rad = ring.rad * breath;
      const p = polar(a, rad);
      nodes.push({...p, a, rad, ringCount:ring.count, layer:ring.layer, i, id:`L${ring.layer}N${i}`, label:ring.label, varKey:ring.varKey, hit:28-ring.layer*2});
    }
  });
  return nodes;
}
function buildDirectNodes(){
  const order = ['time','moon','kp','bz','source','local','motion','touch'];
  const radius = 410;
  return order.map((key,i) => {
    const a = -Math.PI/2 + i/order.length*TAU;
    const p = polar(a, radius);
    return { key, id:`D-${key}`, x:p.x, y:p.y, a, layer: 9, label:DIRECT_READINGS[key].label, varKey:key, hit:34 };
  });
}
function ring(nodes, layer){ return nodes.filter(node => node.layer === layer); }
function route(a,b,color,kind,key,vars){ return { a,b,color,kind,key:`${kind}-${key}`,layers:[a.layer,b.layer],vars:vars || [a.varKey,b.varKey] }; }
function buildRoutes(nodes, directNodes){
  const routes = [], outer = ring(nodes,0), mid = ring(nodes,1), inner = ring(nodes,2), tri = ring(nodes,3), skip = Math.max(2, Math.round(2 + D.R*4));
  outer.forEach((node,i)=>routes.push(route(node, outer[(i+1)%outer.length], layerColor(0), 'outer-ring', i, ['P','C'])));
  mid.forEach((node,i)=>routes.push(route(node, mid[(i+1)%mid.length], layerColor(1), 'mid-ring', i, ['C','A'])));
  inner.forEach((node,i)=>routes.push(route(node, inner[(i+1)%inner.length], layerColor(2), 'inner-ring', i, ['R','C'])));
  tri.forEach((node,i)=>routes.push(route(node, tri[(i+1)%tri.length], layerColor(3), 'triad', i, ['Q','A'])));
  outer.forEach((node,i)=>{ if(seeded(outer.length*99,i)<D.C || i%2===0) routes.push(route(node, outer[(i+skip)%outer.length], layerColor(0), 'outer-star', i, ['P','R','C'])); });
  mid.forEach((node,i)=>routes.push(route(node, mid[(i+2)%mid.length], layerColor(1), 'mid-star', i, ['C','R'])));
  inner.forEach((node,i)=>routes.push(route(node, inner[(i+2)%inner.length], layerColor(2), 'inner-star', i, ['R'])));
  mid.forEach((node,i)=>routes.push(route(node, outer[Math.round(i*outer.length/mid.length)%outer.length], theme().spark, 'radial', i, ['C','P'])));
  tri.forEach((node,i)=>routes.push(route(node, inner[(i*2)%inner.length], theme().spark, 'core-spoke', i, ['Q','R'])));

  const byKey = Object.fromEntries(directNodes.map(d => [d.key, d]));
  const toOuter = idx => outer[idx % outer.length] || outer[0];
  if(byKey.time) routes.push(route(byKey.time, toOuter(0), '232,244,252', 'direct-time', 0, ['time']));
  if(byKey.moon) routes.push(route(byKey.moon, toOuter(Math.round(outer.length*.15)), layerColor(1), 'direct-moon', 0, ['moon']));
  if(byKey.kp) routes.push(route(byKey.kp, toOuter(Math.round(outer.length*.25)), layerColor(2), 'direct-kp', 0, ['kp']));
  if(byKey.bz) routes.push(route(byKey.bz, toOuter(Math.round(outer.length*.38)), theme().spark, 'direct-bz', 0, ['bz']));
  if(byKey.source) routes.push(route(byKey.source, toOuter(Math.round(outer.length*.50)), theme().spark, 'direct-source', 0, ['source']));
  if(byKey.local) routes.push(route(byKey.local, toOuter(Math.round(outer.length*.62)), layerColor(1), 'direct-local', 0, ['local']));
  if(byKey.motion) routes.push(route(byKey.motion, toOuter(Math.round(outer.length*.75)), layerColor(2), 'direct-motion', 0, ['motion']));
  if(byKey.touch) routes.push(route(byKey.touch, toOuter(Math.round(outer.length*.88)), layerColor(3), 'direct-touch', 0, ['touch']));
  return routes;
}
function routeAlpha(r){
  if(r.kind.startsWith('direct-')) return .10;
  if(r.kind.includes('star')) return .04 + D.C*.10 + D.E*.08;
  if(r.kind === 'radial') return .04 + D.C*.05 + D.E*.05;
  if(r.kind === 'core-spoke') return .10 + D.C*.12;
  if(r.kind === 'triad') return .34 + D.C*.18;
  return .18 + D.C*.18;
}
function routeWidth(r){ if(r.kind.startsWith('direct-')) return 1; if(r.kind==='triad') return 1.35; if(r.kind.includes('star')) return .85; if(r.kind==='radial') return .7; return 1.2; }
function focusDim(r,now){
  const live = now < I.focusUntil && (I.activeRouteKey || I.activeNodeId || I.activeLayer !== null);
  if(!live) return 1;
  if(I.activeRouteKey && r.key === I.activeRouteKey) return 1.8;
  if(I.activeLayer !== null && r.layers.includes(I.activeLayer)) return 1.25;
  if(I.activeNodeId && (r.a.id === I.activeNodeId || r.b.id === I.activeNodeId)) return 1.55;
  return .25;
}
function meterBoost(r,now){
  if(now > I.spotlightUntil || !I.spotlight) return 1;
  if(r.vars && r.vars.includes(I.spotlight)) return 2.15;
  if(I.spotlight === 'H' && (r.layers.includes(0) || r.kind === 'outer-ring')) return 2.1;
  return .55;
}
function readingBoost(r, now){
  if(now > I.readingUntil || !I.selectedReading) return 1;
  if(r.vars && r.vars.includes(I.selectedReading)) return 2.35;
  return r.kind.startsWith('direct-') ? .45 : 1;
}

function spawnSpark(r,count=1){ if(!I.toy) return; for(let j=0;j<count;j++) I.sparks.push({a:r.a,b:r.b,color:r.color,t:seeded(performance.now(),j)*.2,speed:.004+D.A*.012+(D.kp/9)*.006+Math.random()*.007,age:0,life:900+D.M*900+Math.random()*700,size:2+Math.random()*2.5}); }
function addBurst(x,y,color=theme().spark,count=14,life=720){ if(!I.toy) return; I.bursts.push({x,y,color,count:I.lowStim?Math.ceil(count*.45):count,life,age:0,seed:Math.random()*9999}); }
function addRipple(x,y,r,color=theme().spark,life=900){ if(!I.toy && I.lowStim) return; I.ripples.push({x,y,r,age:0,life,color}); }
function updateToy(dt){
  I.chargeBoost *= Math.pow(.94,dt/16);
  I.sparks.forEach(s=>{ s.t += s.speed*dt/(I.reducedMotion||I.lowStim?42:16); s.age += dt; });
  I.bursts.forEach(b=>b.age += dt); I.ripples.forEach(r=>r.age += dt);
  I.sparks = I.sparks.filter(s=>s.age<s.life && s.t<=1.06); I.bursts = I.bursts.filter(b=>b.age<b.life); I.ripples = I.ripples.filter(r=>r.age<r.life);
}
function drawToys(){
  I.sparks.forEach(s=>{ const p=clamp(s.t,0,1), tail=clamp(p-.12,0,1), start={x:s.a.x+(s.b.x-s.a.x)*tail,y:s.a.y+(s.b.y-s.a.y)*tail}, end={x:s.a.x+(s.b.x-s.a.x)*p,y:s.a.y+(s.b.y-s.a.y)*p}, fade=1-s.age/s.life; drawLine(start,end,s.color,.28*fade,5,18); drawLine(start,end,s.color,.72*fade,1.6,8); drawCircle(end.x,end.y,s.size,s.color,.8*fade,true,1,12); });
  I.bursts.forEach(b=>{ const p=clamp(b.age/b.life), fade=1-p; for(let i=0;i<b.count;i++){ const a=seeded(b.seed,i)*TAU, rad=(12+seeded(b.seed,i+50)*48)*p, wig=Math.sin(p*TAU+i)*7*p; drawCircle(b.x+Math.cos(a)*(rad+wig), b.y+Math.sin(a)*(rad+wig), 1.5+seeded(b.seed,i+100)*2.2, b.color, .5*fade, true, 1, 6); } });
  I.ripples.forEach(r=>{ const p=clamp(r.age/r.life), alpha=(1-p)*.46; drawCircle(r.x,r.y,r.r+p*42,r.color,alpha,false,1.4+p*2,14); });
}
function drawPulseLines(t,horizon,routes){
  if(!filters.pulse) return;
  const pulseRoutes = routes.filter(r=>r.kind.includes('star')||r.kind==='core-spoke'||r.kind==='mid-ring');
  ctx.save(); ctx.globalCompositeOperation='lighter';
  const active = I.lowStim ? 3 : Math.max(5, Math.round(5 + D.R*8 + D.kp*.35));
  for(let i=0;i<active;i++){
    const r=pulseRoutes[i%pulseRoutes.length], phase=(t*(.00007+D.A*.0001)+i/active)%1, tail=.12+D.M*.12+horizon*.08;
    const p0=clamp(phase-tail,0,1), p1=phase, s={x:r.a.x+(r.b.x-r.a.x)*p0,y:r.a.y+(r.b.y-r.a.y)*p0}, e={x:r.a.x+(r.b.x-r.a.x)*p1,y:r.a.y+(r.b.y-r.a.y)*p1};
    drawLine(s,e,r.color,.18+horizon*.1,4.5,16); drawLine(s,e,r.color,.46+horizon*.1,1.2,7);
  }
  ctx.restore();
}
function drawTimePulsePath(now, routes){
  if(I.selectedReading !== 'time' || now > I.readingUntil) return;
  const fade = clamp((I.readingUntil - now)/2400);
  const timeRoutes = routes.filter(r => r.vars && r.vars.includes('time'));
  timeRoutes.forEach(r => { drawLine(r.a,r.b,'232,244,252',.38*fade,10,22); drawLine(r.a,r.b,'232,244,252',.9*fade,2,10); });
  drawCircle(0,0,392,'232,244,252',.32*fade,false,2,20);
}

function buildPacket(time,glyphId){
  return { timestamp:new Date().toISOString(), localTime:time.full, source:D.source, glyphId, theme:theme().name, selectedReading:I.selectedReading,
    rawInputs:copyExact(D.rawInputs), transformationReceipts:copyExact(D.transformationReceipts),
    deep:{P:D.P,C:D.C,R:D.R,E:D.E,M:D.M,A:D.A,Q:D.Q,H:D.H,charge:D.charge,moonIllum:D.moonIllum,kp:D.kp,bz:D.bz,sky:D.sky},
    directReadings:{time:'browser local time',moon:'bridge/local/fallback',kp:'bridge/local/fallback',bz:'bridge/local/fallback',source:D.source,local:'browser local storage',motion:'browser/user setting',touch:'pointer/touch/keyboard event'},
    mapping:{P:'outer node count',C:'edge clarity',R:'harmonic spacing and pulse cadence',E:'route binding and connective density',M:'trace persistence and continuity tails',A:'response speed and directed motion',Q:'centre texture and inhabited glow',H:'derived horizon edge signal',charge:'local touch bloom',moonIllum:'harmonic ring count',kp:'particle energy',bz:'palette temperature'} };
}

function draw(t){
  pollLocal(); const dt=Math.min(48,t-(I.lastT||t)); I.lastT=t; updateToy(dt);
  const W=canvas.width, C=W/2; ctx.clearRect(0,0,W,W);
  const time=clockParts(), horizon=calcHorizon(t), breath=.78+D.P*.12+horizon*.035, baseRot=t*.00007*(.65+D.R), totalRot=baseRot+I.rotationOffset, now=performance.now(), pal=theme(), hash=hashString('DEEP|'+Math.floor(Date.now()/60000)+'|'+TZ+'|'+pal.name+'|'+D.source), glyphId='DEEP-'+hash.toString(16).toUpperCase().padStart(8,'0');
  ctx.save(); ctx.translate(C,C); ctx.rotate(totalRot); lastFrame.rotation=totalRot; lastFrame.C=C; lastFrame.breath=breath; lastFrame.glyphId=glyphId;
  const bg=ctx.createRadialGradient(0,0,0,0,0,430); bg.addColorStop(0,rgba(pal.bg,.08)); bg.addColorStop(.56,'rgba(12,28,38,.34)'); bg.addColorStop(1,'rgba(2,5,12,.86)'); ctx.beginPath(); ctx.arc(0,0,430,0,TAU); ctx.fillStyle=bg; ctx.fill();
  if(filters.moons){ const ringCount=Math.round(1+(D.moonIllum/100)*4); for(let i=0;i<ringCount;i++){ const r=(78+i*62)*breath; ctx.beginPath(); ctx.arc(0,0,r,0,TAU); ctx.strokeStyle=rgba(i%2?layerColor(1):layerColor(0),.14+D.moonIllum/100*.08); ctx.lineWidth=i===ringCount-1&&filters.horizon?2+horizon*2.8:1.05; ctx.setLineDash(i%2?[7,15]:[]); ctx.stroke(); ctx.setLineDash([]); } }
  const nodes=buildNodes(breath,hash), directNodes=buildDirectNodes(), routes=buildRoutes(nodes,directNodes); lastFrame.nodes=nodes; lastFrame.directNodes=directNodes; lastFrame.routes=routes;
  if(filters.geometry){ routes.forEach(r=>{ const boost=focusDim(r,now)*meterBoost(r,now)*readingBoost(r,now); drawLine(r.a,r.b,r.color,routeAlpha(r)*boost,routeWidth(r)*(boost>1?1.5:1),boost>1?14:6); }); }
  if(filters.field){ const count=I.lowStim?9:Math.round(14+D.kp*2.2); for(let i=0;i<count;i++){ const a=i/count*TAU+t*.00004, rad=(88+i*(I.lowStim?24:12)+Math.sin(t*.0009+i)*8)*breath, color=pal.field[i%pal.field.length]; drawCircle(Math.cos(a)*rad,Math.sin(a)*rad,1.4+(i%4)*.45,color,.16+D.kp*.013,true,1,4); } }
  drawPulseLines(t,horizon,routes); drawTimePulsePath(now,routes); drawToys();
  if(filters.horizon){ for(let i=0;i<(I.lowStim?7:18);i++){ const p=(t*.000035+i*.061)%1, a=i/(I.lowStim?7:18)*TAU+t*.000045, rad=(360+p*42)*breath, alpha=(1-p)*(.045+horizon*.10); drawCircle(Math.cos(a)*rad,Math.sin(a)*rad,1.6+horizon*3,layerColor(2),alpha,true,1,6); } }
  nodes.forEach((node,i)=>{ const phase=.5+.5*Math.sin(t*.001+i*.73), color=layerColor(node.layer), selected=(node.id===I.activeNodeId&&now<I.focusUntil)||(I.spotlight&&node.varKey===I.spotlight&&now<I.spotlightUntil), radius=(node.layer===0?7:node.layer===1?6:node.layer===2?5.2:6.4)+phase*(node.layer===3?2.4:1.3)+D.A*1.2+(selected?3.2:0); drawCircle(node.x,node.y,radius*2.7,color,.10+D.Q*.05+(selected?.08:0),true,1,selected?24:14); drawCircle(node.x,node.y,radius+2,'2,5,12',.96,true,1,0); drawCircle(node.x,node.y,radius,color,selected?.95:.78,true,1,selected?24:14); drawCircle(node.x,node.y,Math.max(2.1,radius*.42),'2,5,12',.9,true,1,0); });
  directNodes.forEach(d=>{ const active=I.selectedReading===d.key&&now<I.readingUntil, color=active?'231,196,119':'168,204,224'; drawCircle(d.x,d.y,13,color,active?.32:.13,true,1,active?16:8); drawCircle(d.x,d.y,6,'2,5,12',.95,true); drawCircle(d.x,d.y,6,color,active?.9:.55,false,1.2,active?14:5); });
  ctx.rotate(-totalRot*.8); const coreBoost=D.Q+I.chargeBoost, glow=ctx.createRadialGradient(0,0,0,0,0,78+D.Q*32+I.chargeBoost*70); glow.addColorStop(0,'rgba(234,244,239,.95)'); glow.addColorStop(.27,rgba(pal.core,.42)); glow.addColorStop(.58,rgba(pal.bg,.18)); glow.addColorStop(1,rgba(pal.bg,0)); ctx.beginPath(); ctx.arc(0,0,78+D.Q*32+I.chargeBoost*70,0,TAU); ctx.fillStyle=glow; ctx.fill(); drawCircle(0,0,14+coreBoost*8,pal.core,.95,true,1,16+I.chargeBoost*35); drawCircle(0,0,4+coreBoost*3,'234,244,239',.86,true,1,10); ctx.restore();
  const packet=buildPacket(time,glyphId); lastFrame.packet=packet;
  document.getElementById('heroClock').textContent='DEEP Observer · STARWELL Time '+time.full; document.getElementById('glyphId').textContent=glyphId; document.getElementById('tideName').textContent=TIDES[hash%TIDES.length];
  document.getElementById('mP').textContent='P '+D.P.toFixed(2); document.getElementById('mC').textContent='C '+D.C.toFixed(2); document.getElementById('mR').textContent='R '+D.R.toFixed(2); document.getElementById('mE').textContent='E '+D.E.toFixed(2); document.getElementById('mM').textContent='M '+D.M.toFixed(2); document.getElementById('mA').textContent='A '+D.A.toFixed(2); document.getElementById('mH').textContent='H '+D.H.toFixed(2); document.getElementById('mQ').textContent='Q '+D.Q.toFixed(2); document.getElementById('mMoon').textContent='Moon '+Math.round(D.moonIllum)+'%'; document.getElementById('mKp').textContent='Kp '+D.kp.toFixed(1); document.getElementById('mBz').textContent='Bz '+D.bz.toFixed(1); document.getElementById('mSource').textContent=D.source;
  packetEl.textContent=JSON.stringify(packet,null,2); document.querySelectorAll('.meter').forEach(m=>m.classList.toggle('active',m.dataset.meter===I.spotlight&&now<I.spotlightUntil)); document.querySelectorAll('.sensor-node').forEach(btn=>btn.classList.toggle('active',btn.dataset.reading===I.selectedReading&&now<I.readingUntil)); requestAnimationFrame(draw);
}

function canvasPoint(evt){ const rect=canvas.getBoundingClientRect(), scale=canvas.width/rect.width; return {x:(evt.clientX-rect.left)*scale,y:(evt.clientY-rect.top)*scale}; }
function toInstrumentPoint(p){ const x=p.x-lastFrame.C, y=p.y-lastFrame.C, c=Math.cos(lastFrame.rotation), s=Math.sin(lastFrame.rotation); return {x:x*c+y*s,y:-x*s+y*c}; }
function findNode(pt){ let best=null,bestD=Infinity; [...lastFrame.nodes, ...lastFrame.directNodes].forEach(node=>{ const d=Math.hypot(pt.x-node.x,pt.y-node.y); if(d<node.hit&&d<bestD){ best=node; bestD=d; } }); return best; }
function segmentDistance(p,a,b){ const vx=b.x-a.x,vy=b.y-a.y,wx=p.x-a.x,wy=p.y-a.y,c1=vx*wx+vy*wy,c2=vx*vx+vy*vy,t=c2?clamp(c1/c2):0,px=a.x+vx*t,py=a.y+vy*t; return Math.hypot(p.x-px,p.y-py); }
function findRoute(pt){ let best=null,bestD=Infinity; lastFrame.routes.forEach(r=>{ const d=segmentDistance(pt,r.a,r.b); if(d<18&&d<bestD){ best=r; bestD=d; } }); return best; }
function hitAt(pt){ const d=Math.hypot(pt.x,pt.y); if(d<72)return{type:'centre'}; const node=findNode(pt); if(node && node.id.startsWith('D-')) return {type:'direct', direct:node}; if(node)return{type:'node',node}; const r=findRoute(pt); if(r)return{type:'route',route:r}; return{type:'space',point:pt}; }

function setTeach(key){ const data=TEACH[key]||TEACH.P; I.spotlight=key; I.spotlightUntil=performance.now()+2600; teachTitle.textContent=data[0]; teachText.textContent=data[1]; teachFormula.textContent=data[2]; setHint('Teaching spotlight: '+data[0]+'. Watch the corresponding glyph layer brighten.'); addRipple(0,0,key==='P'?320:key==='H'?360:key==='moon'?220:key==='Q'?82:170,theme().spark,900); buzz(10); }
function setDirectReading(key){
  const d=DIRECT_READINGS[key]; if(!d) return;
  I.selectedReading=key; I.readingUntil=performance.now()+3200; I.spotlight=key; I.spotlightUntil=performance.now()+2600;
  directTitle.textContent=d.label; directText.textContent=d.explanation; directSource.innerHTML='<b>Source:</b> '+d.source; directAffects.innerHTML='<b>Affects:</b> '+d.affects; directPath.textContent=d.path; directBoundary.textContent=d.boundary; directTiny.textContent=d.tiny;
  setHint('Direct reading: '+d.label+'. Follow the pulse path: '+d.path+'.'); buzz(12);
  const route = lastFrame.routes.find(r=>r.vars&&r.vars.includes(key)); if(route) spawnSpark(route, key==='time'?3:2);
  addRipple(0,0,key==='time'?392:key==='moon'?230:key==='kp'?340:key==='bz'?360:210,theme().spark, key==='time'?1300:900);
  if(key==='time'){
    document.body.classList.remove('time-pulse-on'); void document.body.offsetWidth; document.body.classList.add('time-pulse-on'); setTimeout(()=>document.body.classList.remove('time-pulse-on'),2500);
  }
  if(key==='motion'){
    setHint('Motion is a direct interface state. Toy and Low Stim show how presentation can quiet without changing the model.');
  }
}
function resetInstrument(){ I.rotationOffset=0; I.activeNodeId=null; I.activeRouteKey=null; I.activeLayer=null; I.focusUntil=0; I.spotlight=null; I.spotlightUntil=0; I.selectedReading=null; I.readingUntil=0; I.sparks=[]; I.bursts=[]; I.ripples=[]; I.chargeBoost=.18; addRipple(0,0,115,theme().spark,900); setHint('Reset to centre. The teaching instrument is back in full view.'); buzz(18); }
function handleTap(hit,pt,now){
  const sameKind=hit.type===I.lastTapKind; if(now-I.lastTapAt<520&&sameKind) I.tapCombo+=1; else I.tapCombo=1;
  const deliberateReset=(hit.type==='centre'||hit.type==='space')&&now-I.lastTapAt<310&&sameKind; if(deliberateReset){ resetInstrument(); I.lastTapAt=0; I.lastTapKind=null; I.tapCombo=0; return; }
  I.lastTapAt=now; I.lastTapKind=hit.type;
  if(hit.type==='direct'){ setDirectReading(hit.direct.key); return; }
  if(hit.type==='centre'){ I.chargeBoost=clamp(I.chargeBoost+.18,0,.78); setTeach('Q'); addBurst(0,0,theme().core,16+I.tapCombo*3,760); return; }
  if(hit.type==='node'){ I.activeNodeId=hit.node.id; I.activeLayer=hit.node.layer; I.focusUntil=now+1800; setTeach(hit.node.varKey); const color=layerColor(hit.node.layer); addBurst(hit.node.x,hit.node.y,color,12+I.tapCombo*2,720); lastFrame.routes.filter(r=>r.a.id===hit.node.id||r.b.id===hit.node.id).slice(0,5).forEach(r=>spawnSpark(r,1)); return; }
  if(hit.type==='route'){ I.activeRouteKey=hit.route.key; I.activeLayer=null; I.focusUntil=now+1800; spawnSpark(hit.route,3); const key=hit.route.vars&&hit.route.vars[0]?hit.route.vars[0]:'C'; DIRECT_READINGS[key]?setDirectReading(key):setTeach(key); addRipple((hit.route.a.x+hit.route.b.x)/2,(hit.route.a.y+hit.route.b.y)/2,18,hit.route.color,820); return; }
  addBurst(pt.x,pt.y,theme().spark,I.tapCombo>2?18:7,650); setHint(I.tapCombo>2?'Rapid field taps detected. Spark scatter approved.':'Empty field touched. A small teaching shimmer answered.'); buzz(6);
}

canvas.addEventListener('pointerdown',evt=>{ canvas.setPointerCapture(evt.pointerId); canvas.classList.add('dragging'); const p=canvasPoint(evt),inst=toInstrumentPoint(p),hit=hitAt(inst); I.dragging=true; I.pointerId=evt.pointerId; I.downCanvas=p; I.startAngle=Math.atan2(p.y-lastFrame.C,p.x-lastFrame.C); I.startRotation=I.rotationOffset; I.moved=false; I.downHit=hit; clearTimeout(I.holdTimer); I.holdTimer=setTimeout(()=>{ if(!I.moved&&I.dragging){ const h=I.downHit; if(h.type==='direct'){ setDirectReading(h.direct.key); setHint('Holding '+DIRECT_READINGS[h.direct.key].label+'. Translation path held open.'); } else if(h.type==='node'){ I.activeNodeId=h.node.id; I.activeLayer=h.node.layer; I.focusUntil=performance.now()+2800; setTeach(h.node.varKey); setHint('Holding '+h.node.label+'. Listening mode opened.'); } else if(h.type==='route'){ I.activeRouteKey=h.route.key; I.focusUntil=performance.now()+2800; spawnSpark(h.route,2); setHint('Holding path. The instrument isolated that route.'); } buzz(20); } },480); });
canvas.addEventListener('pointermove',evt=>{ if(!I.dragging||evt.pointerId!==I.pointerId)return; const p=canvasPoint(evt); if(dist(p,I.downCanvas)>7){ I.moved=true; clearTimeout(I.holdTimer); const a=Math.atan2(p.y-lastFrame.C,p.x-lastFrame.C); I.rotationOffset=I.startRotation+(a-I.startAngle); const inst=toInstrumentPoint(p),ringRad=Math.hypot(inst.x,inst.y),now=performance.now(); if(now-I.lastRippleAt>180&&ringRad>115&&ringRad<390){ I.lastRippleAt=now; addRipple(0,0,ringRad,layerColor(1),620); } const traced=findRoute(inst); if(traced&&now-I.lastTraceAt>240){ I.lastTraceAt=now; spawnSpark(traced,1); const key=traced.vars&&traced.vars[0]?traced.vars[0]:null; setHint('Trace caught. That route carried your spark'+(key?' and marked '+key+'.':'.')); } } });
canvas.addEventListener('pointerup',evt=>{ if(evt.pointerId!==I.pointerId)return; clearTimeout(I.holdTimer); canvas.classList.remove('dragging'); const p=canvasPoint(evt),inst=toInstrumentPoint(p),now=performance.now(); if(!I.moved)handleTap(hitAt(inst),inst,now); else setHint('Orb turned. You are handling the observer astrolabe directly.'); I.dragging=false; I.pointerId=null; });
canvas.addEventListener('pointercancel',()=>{ clearTimeout(I.holdTimer); canvas.classList.remove('dragging'); I.dragging=false; I.pointerId=null; });

document.querySelectorAll('[data-filter]').forEach(btn=>btn.addEventListener('click',()=>{ const key=btn.dataset.filter; filters[key]=!filters[key]; btn.setAttribute('aria-pressed',String(filters[key])); setHint(`${key} layer ${filters[key]?'woke up':'settled down'}.`); }));
document.querySelectorAll('[data-meter]').forEach(card=>{ const activate=()=>{ const key=card.dataset.meter; DIRECT_READINGS[key]?setDirectReading(key):setTeach(key); }; card.addEventListener('click',activate); card.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); activate(); } }); });
document.querySelectorAll('[data-reading]').forEach(btn=>{ const activate=()=>setDirectReading(btn.dataset.reading); btn.addEventListener('click',activate); btn.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); activate(); } }); });
themeBtn.addEventListener('click',()=>{ I.theme=(I.theme+1)%THEMES.length; themeBtn.textContent='Theme · '+theme().name; I.chargeBoost=.16; addBurst(0,0,theme().spark,18,760); addRipple(0,0,210,theme().spark,950); setHint(theme().note); buzz(18); });
toyBtn.addEventListener('click',()=>{ I.toy=!I.toy; toyBtn.textContent='Toy · '+(I.toy?'On':'Off'); toyBtn.setAttribute('aria-pressed',String(I.toy)); if(!I.toy){ I.bursts=[]; I.sparks=[]; I.ripples=[]; } setDirectReading('motion'); });
stimBtn.addEventListener('click',()=>{ I.lowStim=!I.lowStim; stimBtn.textContent='Low Stim · '+(I.lowStim?'On':'Off'); stimBtn.setAttribute('aria-pressed',String(I.lowStim)); if(I.lowStim){ I.bursts=[]; I.sparks=I.sparks.slice(0,3); I.ripples=I.ripples.slice(0,2); } setDirectReading('motion'); });
document.getElementById('copyPacket').addEventListener('click',async()=>{ try{ await navigator.clipboard.writeText(JSON.stringify(lastFrame.packet,null,2)); setHint('Packet copied to clipboard. Tiny data moth captured.'); }catch(e){ setHint('Clipboard copy was blocked. You can still select the packet text manually.'); } });
document.getElementById('saveLocal').addEventListener('click',()=>{ try{ const key='deep_observer_saved_packets', arr=JSON.parse(localStorage.getItem(key)||'[]'); arr.unshift(lastFrame.packet); localStorage.setItem(key,JSON.stringify(arr.slice(0,25))); setHint('Packet saved locally in this browser.'); setDirectReading('local'); }catch(e){ setHint('Local save failed. Browser storage may be blocked.'); } });

fetchBridge(); setInterval(fetchBridge,60000); requestAnimationFrame(draw);
