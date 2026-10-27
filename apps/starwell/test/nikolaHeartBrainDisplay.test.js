import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deriveNikolaHeartBrain} from '../../../starwell/deep-observer/nikola-heart-brain.js';
import {formatNikolaPreview} from '../../../starwell/deep-observer/nikola-heart-brain-ui.js';

const html=readFileSync(new URL('../../../starwell/deep-observer/index.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../../../starwell/deep-observer/nikola-heart-brain-ui.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../../../starwell/deep-observer/nikola-heart-brain.css',import.meta.url),'utf8');

test('heart, brain, lenses, measurement controls and evidence trace are all mounted once',()=>{
 const ids=[
 'nikolaHeartBrain','nikolaHeart','nikolaBrain','nikolaBrainPrior',
 'nikolaBrainPriorValue','nikolaPhilosophy','nikolaSpirituality','nikolaReflections',
 'nikolaBrainAxes','nikolaBrainBoundary','nikolaBrainTrial','nikolaBrainClear',
 'nikolaBrainStatus','nikolaBrainReceipt','nikolaBrainExport',
 ];
 for(const id of ids){
   const n=(html.match(new RegExp('\\bid="'+id+'"','g'))||[]).length;
   assert.equal(n,1,'expected one '+id+', found '+n);
 }
 assert.match(html,/src="nikola-heart-brain-ui\.js\?v=heart-brain-v1"/);
 assert.match(html,/nikola-heart-brain\.css\?v=heart-brain-v1/);
 assert.match(html,/role="status" aria-live="polite"/);
 assert.match(html,/independent of NOAA/);
});

test('preview cites physics and qualitative lenses separately without pretending to infer spirituality',()=>{
 const frame=deriveNikolaHeartBrain({p0:.5,phaseRad:0,dephasing:.3,priorCoherent:.5});
 const p=formatNikolaPreview(frame);
 assert.match(p.heart,/analytic quantum state/);
 assert.match(p.brain,/Recommended next measurement: X/);
 assert.match(p.reflection,/PHILOSOPHY/);
 assert.match(p.reflection,/SPIRITUALITY/);
 assert.match(p.reflection,/never supply numerical likelihoods/);
});

test('a mathematically nonidentifiable state displays no invented information',()=>{
 const frame=deriveNikolaHeartBrain({p0:1,phaseRad:0,dephasing:.3});
 const p=formatNikolaPreview(frame);
 assert.match(p.brain,/none for this preparation/);
 assert.match(p.brain,/indistinguishable/);
});

test('source uses text-only DOM updates and no provider APIs, local storage or Drive calls',()=>{
 assert.doesNotMatch(js,/\bfetch\s*\(|localStorage|sessionStorage|Drive|WebSocket|\.postMessage\s*\(/);
 assert.match(js,/\.textContent=/);
 assert.doesNotMatch(js,/\.innerHTML/);
 assert.match(js,/replayNikolaHeartBrain/);
 assert.match(js,/disabled=true/);
 assert.match(css,/@media\(max-width:730px\)/);
 assert.match(css,/prefers-reduced-motion/);
});

test('heart-brain connection remains entirely within the existing Observer quantum section',()=>{
 const quantumStart=html.indexOf('id="observerQuantum"');
 const newStart=html.indexOf('id="nikolaHeartBrain"');
 const quantumEnd=html.indexOf('    <section class="legend"');
 assert.ok(quantumStart>=0&&newStart>quantumStart&&newStart<quantumEnd);
});
