import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { normalizedHighlight, MATERIAL_SURFACE_SELECTOR } from '../ship-ui/wayglass-material.js';

const textAt=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('ship instruments inherit one existing Wayglass UI/UX skin and reactive material layer',()=>{
 for(const folder of ['pilot-deck','code-loom','harmonic-keyboard']){
  const html=textAt('../'+folder+'/index.html');
  assert.match(html,/\.\.\/ship-ui\/wayglass-skin\.css/);
  assert.match(html,/\.\.\/ship-ui\/wayglass-material\.js/);
  assert.match(html,/type="module"/);
 }
});
test('glass skin remains decorative with meaningful interaction fallbacks',()=>{
 const css=textAt('../ship-ui/wayglass-skin.css');
 assert.match(css,/pointer-events:none/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/forced-colors/);
 assert.match(css,/focus-visible/);
 assert.match(css,/--wg-highlight-x/);
 assert.match(css,/--wg-abyss/);
 assert.match(css,/--wg-labradorite/);
 assert.match(MATERIAL_SURFACE_SELECTOR,/\.seat/);
});
test('material interaction stays bounded inside each surface',()=>{
 assert.deepEqual(normalizedHighlight(10,10,{left:0,top:0,width:100,height:100}),{x:10,y:10});
 assert.deepEqual(normalizedHighlight(500,-10,{left:0,top:0,width:100,height:100}),{x:100,y:0});
 assert.deepEqual(normalizedHighlight(3,6,{left:0,top:0,width:0,height:0}),{x:50,y:20});
});
