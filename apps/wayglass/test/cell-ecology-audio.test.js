import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CELL_ECOLOGY_AUDIO_SCHEMA, prepareCellAcousticReturn, playCellReturn,
} from '../src/cell-ecology-audio.js';

const receipt=()=>({
  schema:'wayglass.cell-exchange/v0.1',status:'delivered-in-memory',
  message:'typed observation, never put into tones',
  acoustic:{
    encoding:'marker-and-open-status-only',
    request:{schema:'wyrdrune.acoustic-frame/v0.1',kind:1,
      sender:2,recipient:3,marker:369,resolution:'open'},
    reply:{schema:'wyrdrune.acoustic-frame/v0.1',kind:2,
      sender:3,recipient:2,marker:369,resolution:'open'},
  },
});
test('genuine native WTL addresses Return and ACK and embeds the existing 3Hz beat',async()=>{
  const done=await prepareCellAcousticReturn(receipt());
  assert.equal(done.schema,CELL_ECOLOGY_AUDIO_SCHEMA);
  assert.equal(done.received.length,2);
  assert.equal(done.received[0].sender,2);
  assert.equal(done.received[1].sender,3);
  assert.equal(done.received[1].marker,369);
  assert.equal(done.withness_beat_hz,3);
  assert.equal(done.spoken_text_encoded,false);
  assert.equal(done.physical_device_transfer_verified,false);
});
test('unauthorised or mismatched acoustic receipts refuse playback',async()=>{
  const wrong=receipt();wrong.acoustic.reply.marker=370;
  await assert.rejects(prepareCellAcousticReturn(wrong),/acknowledgement/i);
  await assert.rejects(prepareCellAcousticReturn({}),/verified/i);
  const feather=new AbortController();feather.abort();
  await assert.rejects(prepareCellAcousticReturn(receipt(),{signal:feather.signal}),/abort/i);
});
test('local sound begins only through explicit playback and never accesses the microphone',async()=>{
  let starts=0,resumes=0,closed=0,captures=0;
  class Audio {
    state='suspended';
    destination={};
    async resume(){this.state='running';resumes++}
    createBuffer(channels,length){return {copyToChannel(chunk){assert.equal(chunk.length,length);}}}
    createGain(){return {gain:{value:0},connect(){}}}
    createBufferSource(){
      const self={onended:null,connect(){},disconnect(){},start(){
        starts++;setImmediate(()=>self.onended?.());
      },stop(){self.onended?.()}};
      return self;
    }
    async close(){closed++;this.state='closed'}
  }
  const scope={AudioContext:Audio,navigator:{mediaDevices:{getUserMedia(){captures++}}}};
  assert.equal(starts,0);
  const played=await playCellReturn(receipt(),{scope});
  assert.equal(played.played,true);
  assert.equal(starts,1);assert.equal(resumes,1);assert.equal(closed,1);
  assert.equal(captures,0);
});
