import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const runner='assets/case-000-glass-halo-braid.js';
const page='starwell/case-000-glass-halo.html';
const data='data/cases/case-000-glass-halo-v1.8.json';

test('Case 000 braid runner parses',()=>{
  const result=spawnSync(process.execPath,['--check',runner],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
});

test('Case 000 uses Hearthgate math spine v1.8',async()=>{
  for(const file of [runner,page,data]){
    const source=await readFile(file,'utf8');
    assert.match(source,/hearthgate\.math-spine\/v1\.8/);
  }
});

test('Case 000 page wires the working harmonic braid',async()=>{
  const source=await readFile(page,'utf8');
  assert.match(source,/runa-369-percussion-oscillator\.js/);
  assert.match(source,/wardenclyffe-v18-layer-engine\.js/);
  assert.match(source,/mobius-audio-bus\.js/);
  assert.match(source,/case-000-glass-halo-braid\.js/);
  assert.match(source,/Run Case 000/);
});

test('Case 000 preserves mirror relation and OPEN Heimdall coordinates',async()=>{
  const source=await readFile(data,'utf8');
  assert.match(source,/"mirror_law": "s_R = -s_B"/);
  assert.match(source,/"singular_structure": "OPEN"/);
  assert.match(source,/"fold_curvature": "OPEN"/);
  assert.match(source,/"crossing_manifold": "OPEN"/);
  assert.match(source,/"Völva Knowing"/);
});

test('active instrument contract contains braid language and no stim-toy contract',async()=>{
  const source=await readFile('starwell/Canonical_Instrument_Kit_v0.1.md','utf8');
  assert.match(source,/The braid is the instrument/);
  assert.doesNotMatch(source,/stim toy/i);
  assert.doesNotMatch(source,/Toy On\/Off/i);
});
