import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');

test('four actual procedural material sources ship with the FAEberpunk build',()=>{
 for(const file of ['opal-membrane','labradorite-sheen','copper-etching','vellum-fibres']){
  const svg=read('../src/materials/'+file+'.svg');
  assert.match(svg,/<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg,/viewBox=/);
  assert.match(svg,/<filter /);
  assert.doesNotMatch(svg,/<script|<foreignObject|https?:\/\/(?!www\.w3\.org\/2000\/svg)/);
 }
 assert.match(read('../src/materials/opal-membrane.svg'),/feDisplacementMap/);
 assert.match(read('../src/materials/labradorite-sheen.svg'),/feTurbulence/);
 assert.match(read('../src/materials/copper-etching.svg'),/pattern id="brush"/);
 assert.match(read('../src/materials/vellum-fibres.svg'),/feTurbulence/);
});

test('visible composited opal membrane and material workstations replace desktop columns',()=>{
 const material=read('../src/faeberpunk-immersive.css');
 const main=read('../src/main.js');
 assert.match(main,/import '\.\/faeberpunk-immersive\.css';/);
 for(const file of ['opal-membrane','labradorite-sheen','copper-etching','vellum-fibres'])
  assert.ok(material.includes(file+'.svg'),file+' material must be wired into CSS');
 assert.match(material,/\.wc-surface \.wc-composition\s*\{\s*display:block;position:relative/);
 assert.match(material,/\.wc-surface \.wc-head\s*\{\s*position:absolute/);
 assert.match(material,/\.wc-surface \.wc-workbench\s*\{\s*position:absolute/);
 assert.match(material,/\.wc-surface \.wc-stage::before\s*\{/);
 assert.match(material,/mix-blend-mode:screen/);
 assert.match(material,/\.fae-manuscript-page\s*\{/);
 assert.match(material,/background-clip:padding-box,border-box/);
});

test('responsive, Feather and reduced-sensory contracts remain accessible',()=>{
 const material=read('../src/faeberpunk-immersive.css');
 assert.match(material,/@media\(max-width:1109px\)/);
 assert.match(material,/@media\(max-width:650px\)/);
 assert.match(material,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(material,/@media\(prefers-reduced-transparency:reduce\)/);
 assert.match(material,/@media\(forced-colors:active\)/);
 const ui=read('../src/surfaces/living-watercolor.js');
 assert.match(ui,/id="wc-first-touch"/);
 assert.match(ui,/id="wc-feather"/);
 assert.match(ui,/id="wc-fluid"/);
});
