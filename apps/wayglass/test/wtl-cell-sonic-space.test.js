import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sonicPitch,transposeRatio,projectAudible} from '../src/wtl-cell-sonic-space.js';
test('microtonal pitches retain non-semitone precision and provenance',()=>{
 const p=sonicPitch(440.125,{timbre:'triangle'});
 const q=transposeRatio(p,7,6);
 assert.equal(q.hz,440.125*7/6);
 assert.equal(q.timbre,'triangle');
 assert.equal(projectAudible(q).originalHz,q.hz);
});
test('inaudible frequencies project without erasing source',()=>{
 const low=projectAudible(sonicPitch(0.001));
 const high=projectAudible(sonicPitch(1000000000));
 assert.ok(low.audibleHz>=40&&low.audibleHz<=16000);
 assert.ok(high.audibleHz>=40&&high.audibleHz<=16000);
 assert.equal(low.originalHz,0.001);
 assert.throws(()=>sonicPitch(-1));
 assert.throws(()=>transposeRatio(sonicPitch(440),0,2));
});
