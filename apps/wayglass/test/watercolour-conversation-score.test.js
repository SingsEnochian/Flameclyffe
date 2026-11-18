import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {composeWatercolourConversation} from '../../../lib/wayglass-conversation-score.mjs';

const source=await readFile(new URL('../../../scores/wyrdrune/watercolour-conversation.wtl',import.meta.url),'utf8');
const turns=Array.from({length:18},(_,i)=>({
  request:{authorText:'Watercolour thought '+i},
  response:{output:'It answers in a different rhythm '+i},
}));
const draft='The last line is still being written.';

test('the full conversation determines the score, including early turns and long older model replies',async()=>{
  const text='Water and light. '.repeat(320)+'Withness.';
  const history=structuredClone(turns);
  history[0].response.output=text;
  const original=await composeWatercolourConversation(source,{turns:history,draft});
  assert.equal(original.inputCount,37);
  assert.equal(original.notes.length,80);
  assert.equal(original.samples.length/original.sampleRate,43);

  history[0].response.output=text.replace('Withness.','A descending sweep.');
  const changed=await composeWatercolourConversation(source,{turns:history,draft});
  assert.notDeepEqual(changed.notes.slice(0,10),original.notes.slice(0,10));
  assert.deepEqual(changed.notes.slice(10),original.notes.slice(10));
  const editedDraft=await composeWatercolourConversation(source,{turns:history,draft:'A different final line.'});
  assert.deepEqual(editedDraft.notes.slice(0,70),changed.notes.slice(0,70));
  assert.notDeepEqual(editedDraft.notes.slice(70),changed.notes.slice(70));
});

test('a reply and an unsent draft can each be scored without a named piece or a host',async()=>{
  const reply=await composeWatercolourConversation(source,{turns:[{response:{text:'A heart of myth wakes.'}}]});
  const written=await composeWatercolourConversation(source,{turns:[],draft});
  assert.equal(reply.inputCount,1);
  assert.equal(written.inputCount,1);
  assert.equal(reply.notes[0].level,0);
  assert.equal(written.notes[1].level,0);
  await assert.rejects(composeWatercolourConversation(source,{turns:[],draft:' '}),/Write something/);
});
