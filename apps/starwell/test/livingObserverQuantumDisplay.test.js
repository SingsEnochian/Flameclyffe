import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {quantumDensity} from '../../../starwell/deep-observer/living-observer-quantum-core.js';
import {renderQuantumFigures} from '../../../starwell/deep-observer/living-observer-quantum.js';

test('rendered mathematical Bloch and fringe SVGs change with state and dephasing',()=>{
  const coherent=renderQuantumFigures(quantumDensity({p0:.5,phaseRad:0,dephasing:0}));
  const dephased=renderQuantumFigures(quantumDensity({p0:.5,phaseRad:0,dephasing:1}));
  const phase=renderQuantumFigures(quantumDensity({p0:.5,phaseRad:Math.PI,dephasing:0}));
  for(const object of [coherent,dephased,phase]){
    assert.match(object.sphere,/role="img"/);
    assert.match(object.fringe,/role="img"/);
    assert.match(object.sphere,/viewBox="0 0 310 300"/);
    assert.match(object.fringe,/polyline/);
    assert.doesNotMatch(object.sphere+object.fringe,/\bNaN\b|Infinity|<script|onerror=|onload=/);
  }
  assert.notEqual(coherent.sphere,dephased.sphere);
  assert.notEqual(coherent.fringe,dephased.fringe);
  assert.notEqual(coherent.fringe,phase.fringe);
});

test('actual Living Observer page mounts a complete accessible quantum workbench',()=>{
 const html=readFileSync(new URL('../../../starwell/deep-observer/index.html',import.meta.url),'utf8');
 const ids=[
   'observerQuantum','quantumControls','quantumP0','quantumP0Value','quantumPhase',
   'quantumPhaseValue','quantumDephasing','quantumDephasingValue','quantumShots',
   'quantumSeed','quantumSimulate','quantumReset','quantumBloch','quantumFringe',
   'quantumBorn','quantumMatrix','quantumIntegrity','quantumTruth','quantumTrialStatus',
   'quantumReceipts','quantumExport',
 ];
 for(const id of ids){
   assert.equal((html.match(new RegExp('\\bid="'+id+'"','g'))||[]).length,1,
     'Missing or duplicate quantum UI ID: '+id);
 }
 assert.match(html,/living-observer-quantum\.css/);
 assert.match(html,/type="module" src="living-observer-quantum\.js/);
 assert.match(html,/role="status" aria-live="polite"/);
 assert.doesNotMatch(html,/quantum-controls" onsubmit=/);
});

test('quantum display is separately labelled from NOAA, numerology and private book data',()=>{
 const html=readFileSync(new URL('../../../starwell/deep-observer/index.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../../../starwell/deep-observer/living-observer-quantum.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../../../starwell/deep-observer/living-observer-quantum.css',import.meta.url),'utf8');
 assert.match(html,/independent of NOAA/);
 assert.match(html,/no.*quantum device/i);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/@media\(max-width:690px\)/);
 assert.doesNotMatch(js,/\bfetch\s*\(|GoogleDrive|localStorage|sessionStorage|\.postMessage\s*\(/);
 assert.match(js,/replayQuantumReceipt/);
 assert.match(js,/URL\.createObjectURL/);
});
