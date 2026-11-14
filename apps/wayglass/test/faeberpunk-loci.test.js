import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FAEBERPUNK_LOCI,faeberpunkLocusForRoom,faeberpunkLocusLinks} from '../src/faeberpunk-loci.js';
test('five loci map to real Wayglass rooms, not imaginary routes',()=>{
  assert.deepEqual(FAEBERPUNK_LOCI.map(x=>x.id),['door','identity','worktable','wonder','return']);
  assert.equal(new Set(FAEBERPUNK_LOCI.map(x=>x.room)).size,5);
  assert.equal(faeberpunkLocusForRoom('wayglass:mythience-crossing'),'wonder');
  assert.equal(faeberpunkLocusForRoom('wayglass:unknown'),null);
});
test('loci expose only rooms actually registered in the ship',()=>{
  assert.deepEqual(faeberpunkLocusLinks(['wayglass:living-watercolor','wayglass:universal-codex']).map(x=>x.id),['door','worktable']);
});
