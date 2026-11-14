import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {touchWayglass} from '../src/first-touch-client.js';
import {watercolorSnapshot} from '../src/watercolor-bridge.js';
import firstTouchDemo from '../../../lib/wayglass-first-touch-demo.cjs';

const principal={id:'house:steward',authorized:true};
const fixed=new Date('2026-11-13T20:00:00.000Z');

test('FAEpank touch button reaches authorised Wyrdrune host route then paints a real Return',async()=>{
 const host=await firstTouchDemo.runFirstTouch({principal,mode:'repair',touch:.5,now:fixed});
 const calls=[];
 const before=watercolorSnapshot().events.length;
 const result=await touchWayglass({mode:'repair',touch:.5,fetchImpl:async(url,options)=>{
   calls.push({url,options});
   return {ok:true,status:200,json:async()=>host};
 }});
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,'/api/v1/wayglass/wyrdrune/first-touch');
 assert.equal(calls[0].options.method,'POST');
 assert.equal(calls[0].options.credentials,'same-origin');
 assert.deepEqual(JSON.parse(calls[0].options.body),{mode:'repair',touch:.5});
 assert.equal(result.host.status,'connected-sandbox-preview');
 assert.equal(result.projection.status,'projected');
 assert.equal(watercolorSnapshot().events.length,before+1);
 assert.equal(watercolorSnapshot().events.at(-1).kind,'fold:witness');
});

test('no fake host result, auth failure or incorrect simulation provenance can publish pigment',async()=>{
 const count=watercolorSnapshot().events.length;
 await assert.rejects(touchWayglass({fetchImpl:async()=>({
   ok:false,status:401,json:async()=>({error:'House Steward sign-in required'}),
 })}),/sign-in/);
 await assert.rejects(touchWayglass({fetchImpl:async()=>({
   ok:true,status:200,json:async()=>({schema:'wayglass.integrated-voyage/v0.1'}),
 })}),/misleading/);
 assert.equal(watercolorSnapshot().events.length,count);
});

test('client blocks untrusted mode and intensity before any request',async()=>{
 let called=false;
 const f=async()=>{called=true;throw new Error('should not call');};
 await assert.rejects(touchWayglass({mode:'production',fetchImpl:f}),/Unknown/);
 await assert.rejects(touchWayglass({touch:NaN,fetchImpl:f}),/Touch intensity/);
 assert.equal(called,false);
});

test('FAEpank panel is a real keyboard-operable, screen-reader-labelled control',()=>{
 const src=readFileSync(new URL('../src/surfaces/living-watercolor.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/faeberpunk.css',import.meta.url),'utf8');
 assert.match(src,/<button id="wc-first-touch" type="button"/);
 assert.match(src,/aria-live="polite"/);
 assert.match(src,/data-wc-touch-mode="repair"/);
 assert.match(src,/data-wc-touch-mode="expand"/);
 assert.match(src,/listen\(touchOrb,'click'/);
 assert.match(src,/touchAbort\?\.abort\(\)/);
 assert.match(css,/@media\(max-width:900px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.wc-faepunk-orb:active/);
});
