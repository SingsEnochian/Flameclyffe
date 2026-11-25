import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreWonderMedia} from '../src/wyrdrune-wonder-media.js';
const open={kind:'wyrdrune.wonder/v0.1',question:'What may emerge?',answer:{wtl:'unknown'},status:'open'};
test('Wonder media is reproducible and silent until requested',()=>{
 const a=scoreWonderMedia(open),b=scoreWonderMedia(open);
 assert.deepEqual(a,b);
 assert.equal(a.image.kind,'image');
 assert.equal(a.sound.autoplay,false);
 assert.equal(a.sound.status,'unplayed');
 assert.equal(a.sound.enabled,false);
 assert.equal(a.semanticGlyph,null);
});
test('Wonder media rejects closed or ungrounded values',()=>{
 assert.throws(()=>scoreWonderMedia({...open,status:'answered'}),TypeError);
 assert.throws(()=>scoreWonderMedia({...open,question:''}),TypeError);
});
