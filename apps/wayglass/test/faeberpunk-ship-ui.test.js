import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('ship helm integrates actual loci, active state, accessible navigation and Feather',()=>{
 const main=read('../src/main.js');
 assert.match(main,/faeberpunkLocusLinks\(surfaces\)/);
 assert.match(main,/setAttribute\('aria-current','page'\)/);
 assert.match(main,/navigateAndFocus\(button\.dataset\.locusRoom\)/);
 assert.match(main,/wayglassSomaticSound\.feather\(\)/);
 assert.match(main,/aria-label','Wayglass five-locus passages'/);
});
test('global Feather reaches Mythience without implicitly releasing it',()=>{
 const scene=read('../src/surfaces/mythience-crossing.js');
 assert.match(scene,/globalThis\.addEventListener\('wayglass:feather',onShipFeather\)/);
 assert.match(scene,/controller\?\.abort\(\)/);
 assert.match(scene,/sensory\.stop\(\)/);
 assert.match(scene,/removeEventListener\('wayglass:feather',onShipFeather\)/);
});
test('material pass retains reduced motion, reduced transparency and visible focus',()=>{
 const css=read('../src/faeberpunk.css');
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/prefers-reduced-transparency:reduce/);
 assert.match(css,/forced-colors:active/);
 assert.match(css,/:focus-visible/);
});
