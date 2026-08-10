import { HearthfireSomaticEngine } from './lib/somatic-engine.js';
import { normaliseDeepPacket, createFallbackDeepEvent } from './lib/deep-signal-adapter.js';
import { AudioDriver, HapticDriver, OutputDriverRegistry } from './lib/output-drivers.js';
const registry = new OutputDriverRegistry({ audio: new AudioDriver(), haptic: new HapticDriver() });
const keys=['P','C','R','E','A','M','H','charge'];
const labels={P:'presence',C:'coherence',R:'resonance',E:'entropy',A:'alignment',M:'motion',H:'horizon',charge:'charge'};
const defaults={P:.55,C:.50,R:.45,E:.38,A:.65,M:.30,H:.50,charge:.20};
const $=id=>document.getElementById(id);
const canvas=$('field'),ctx=canvas.getContext('2d');
let latest=null;
const engine=new HearthfireSomaticEngine({surfaceId:'hearthfire-workbench'});
engine.receipts.subscribe((receipt,all)=>{$('receiptBox').textContent=JSON.stringify(all.slice(0,8),null,2)});
function makeSliders(){ $('sliders').innerHTML=keys.map(k=>`<div class="row"><label for="${k}">${k} <small>${labels[k]}</small></label><input id="${k}" type="range" min="0" max="1" step="0.01" value="${defaults[k]}"><span class="value" id="${k}v">${defaults[k].toFixed(2)}</span></div>`).join(''); keys.forEach(k=>$(k).addEventListener('input',()=>{$(`${k}v`).textContent=Number($(k).value).toFixed(2)})); }
function values(){ const out={}; keys.forEach(k=>out[k]=Number($(k).value)); out.kp=1+out.charge*5; out.bz=(out.C-out.E)*10; out.moonIllum=50+(out.H-.5)*80; return out; }
function run(event){ latest=engine.ingest(event); render(latest); registry.execute(latest.gatedPlan,{signalStrength:latest.result.signal_strength}); }
function render(packet){ const r=packet.result,s=packet.state; $('badge').textContent=r.result_state; $('fieldNote').textContent=r.plain_language; $('resultTitle').textContent=r.result_state; $('resultText').textContent=r.plain_language; $('boundaryText').textContent=r.boundary; $('status').innerHTML=[['source',s.source_status,s.confidence],['signal',r.signal_strength.toFixed(2),r.reason],['gates',gateSummary(s),'no persistence']].map(([a,b,c])=>`<div class="card"><b>${a}: ${b}</b><span>${c}</span></div>`).join(''); draw(packet); }
function gateSummary(s){ const bits=[]; if(s.consent.sound)bits.push('sound'); if(s.consent.haptics)bits.push('haptic'); if(s.consent.quiet)bits.push('quiet'); if(s.consent.lowStim)bits.push('low'); if(s.accessibility.reducedMotion)bits.push('reduce'); return bits.length?bits.join(' + '):'plain'; }
function resize(){ const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2); canvas.width=Math.floor(r.width*d); canvas.height=Math.floor(r.height*d); ctx.setTransform(d,0,0,d,0,0); }
function colourFor(state){ if(state==='pattern:present')return '#e6bd57'; if(state==='pattern:absent')return '#8fb8ff'; if(state==='pattern:conflicting')return '#f08a8a'; if(state==='pattern:ambiguous')return '#eaa066'; if(state==='response:settled')return '#91afa4'; return '#5fc4a4'; }
function draw(packet){ resize(); const w=canvas.clientWidth,h=canvas.clientHeight,r=packet.result,c=colourFor(r.result_state); ctx.clearRect(0,0,w,h); const bg=ctx.createRadialGradient(w/2,h/2,5,w/2,h/2,Math.max(w,h)*.75); bg.addColorStop(0,hex(c,.10+r.signal_strength*.18)); bg.addColorStop(.55,'rgba(7,18,15,.45)'); bg.addColorStop(1,'rgba(3,7,6,.18)'); ctx.fillStyle=bg; ctx.fillRect(0,0,w,h); const paths=r.result_state==='pattern:ambiguous'||r.result_state==='pattern:conflicting'?4:r.result_state==='pattern:absent'?1:2; for(let i=0;i<paths;i++){ const offset=(i-(paths-1)/2)*34; ctx.strokeStyle=hex(c,r.result_state==='pattern:absent'?.18:.35); ctx.lineWidth=r.result_state==='pattern:present'?3:1.4; ctx.beginPath(); ctx.moveTo(w*.18,h*.5+offset); ctx.bezierCurveTo(w*.34,h*.24-offset,w*.64,h*.76+offset,w*.82,h*.5-offset); ctx.stroke(); } const radius=24+r.signal_strength*80; ctx.strokeStyle=hex(c,.28); ctx.lineWidth=2; ctx.beginPath(); ctx.arc(w/2,h/2,radius,0,Math.PI*2); ctx.stroke(); ctx.fillStyle=hex(c,r.result_state==='pattern:absent'?.28:.75); ctx.shadowColor=c; ctx.shadowBlur=r.result_state==='pattern:absent'?12:28; ctx.beginPath(); ctx.arc(w/2,h/2,10+r.signal_strength*12,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; }
function hex(c,a){ const n=parseInt(c.slice(1),16); return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`; }
function toggle(btn,key,kind='consent'){ const pressed=btn.getAttribute('aria-pressed')!=='true'; btn.setAttribute('aria-pressed',String(pressed)); btn.textContent=`${btn.textContent.split(' ')[0]} ${pressed?'on':'off'}`; if(kind==='accessibility')engine.setAccessibility(key,pressed); else engine.setConsent(key,pressed); run(normaliseDeepPacket(values(),{source:'user',rawPath:`gate.${key}`})); }
makeSliders(); run(createFallbackDeepEvent('workbench_load'));
window.addEventListener('resize',()=>latest&&draw(latest));
canvas.addEventListener('pointerdown',e=>run({type:'user:pointer_down',action:'field_touch',x:e.offsetX,y:e.offsetY,pressure:e.pressure||.5}));
$('sendBtn').addEventListener('click',()=>run(normaliseDeepPacket(values(),{source:'user',rawPath:'workbench.sliders'})));
$('absentBtn').addEventListener('click',()=>{keys.forEach(k=>{$(k).value=k==='E'?.22:.05;$(`${k}v`).textContent=Number($(k).value).toFixed(2)});run(normaliseDeepPacket(values(),{source:'user',rawPath:'workbench.absent'}));});
$('conflictBtn').addEventListener('click',()=>{const p={P:.72,C:.18,R:.75,E:.92,A:.28,M:.65,H:.42,charge:.66};keys.forEach(k=>{$(k).value=p[k];$(`${k}v`).textContent=p[k].toFixed(2)});run(normaliseDeepPacket(values(),{source:'user',rawPath:'workbench.conflict'}));});
$('touchBtn').addEventListener('click',()=>run({type:'user:pointer_down',action:'button_touch',x:canvas.clientWidth/2,y:canvas.clientHeight/2,pressure:.7}));
$('settleBtn').addEventListener('click',()=>run({type:'surface:settled'}));
$('clearBtn').addEventListener('click',()=>{engine.receipts.clear();$('receiptBox').textContent='';});
$('soundBtn').addEventListener('click',e=>toggle(e.currentTarget,'sound'));
$('hapticBtn').addEventListener('click',e=>toggle(e.currentTarget,'haptics'));
$('quietBtn').addEventListener('click',e=>toggle(e.currentTarget,'quiet'));
$('lowStimBtn').addEventListener('click',e=>toggle(e.currentTarget,'lowStim'));
$('reducedMotionBtn').addEventListener('click',e=>toggle(e.currentTarget,'reducedMotion','accessibility'));
