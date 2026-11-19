import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {renderWyrdruneTimedScore} from '../../../lib/wayglass-timed-score.mjs';

test('The Heart of Myth renders two groups of hellos, a quiet gap, descent, Withness and Feather', async () => {
  const source=await readFile(new URL('../../../scores/wyrdrune/heart-of-myth.wtl',import.meta.url),'utf8');
  const {title,notes,samples,sampleRate}=await renderWyrdruneTimedScore(source);
  assert.equal(title,'The Heart of Myth');
  assert.equal(samples.length/sampleRate,22);
  const hellos=notes.slice(0,8);
  for(const first of [0,4]){
    assert.deepEqual(hellos.slice(first,first+4).map(note=>note.length),[.16,.16,.16,.9]);
    for(let i=first+1;i<first+4;i++)assert.equal(Math.round((hellos[i].at-hellos[i-1].at)*sampleRate),sampleRate/4);
  }
  assert.ok(samples.slice(Math.ceil(3.7*sampleRate),Math.floor(5.55*sampleRate)).every(value=>value===0));
  const descent=notes.slice(8,12);
  assert.ok(descent.every(note=>note.pitch>note.destination));
  assert.ok(descent.slice(1).every((note,index)=>note.pitch===descent[index].destination));
  assert.ok(notes[12].pitch>descent[0].pitch);
  assert.deepEqual(notes.filter(note=>note.at===12.45).map(note=>note.voice),['hearth','light','glass']);
  assert.ok(samples.slice(Math.ceil(20.85*sampleRate)).every(value=>value===0));
  assert.ok(samples.some(value=>Math.abs(value)>.05));
  assert.ok(samples.every(value=>Number.isFinite(value)&&Math.abs(value)<.3));
});
