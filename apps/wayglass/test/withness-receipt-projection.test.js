import {test} from 'node:test';
import assert from 'node:assert/strict';
import {projectWithnessReceipts,WITHNESS_RECEIPT_SCHEMA} from '../src/withness-receipt-projection.js';
const receipt=(id,stage,disposition='pending',event_id='encounter:1')=>({
 schema:WITHNESS_RECEIPT_SCHEMA,receipt_id:id,event_id,stage,disposition,observed_at:'2026-11-14T00:00:00Z',
});
test('replayed identical receipt is idempotent',()=>{
 const a=receipt('r1','requested');
 const projected=projectWithnessReceipts([a,a]);
 assert.equal(projected.length,1);
 assert.equal(projected[0].receipts.length,1);
 assert.equal(projected[0].effective_adoption,false);
});
test('observation after Feather never grants adoption',()=>{
 const p=projectWithnessReceipts([receipt('r1','requested'),receipt('r2','observed','observed-not-adopted')]);
 assert.equal(p[0].observed,true);
 assert.equal(p[0].effective_adoption,false);
});
test('revocation supersedes earlier acceptance',()=>{
 const p=projectWithnessReceipts([receipt('r1','accepted','adopted'),receipt('r2','revoked','revoked')]);
 assert.equal(p[0].accepted,true);
 assert.equal(p[0].revoked,true);
 assert.equal(p[0].effective_adoption,false);
});
test('conflicting duplicate identity fails closed',()=>{
 assert.throws(()=>projectWithnessReceipts([
  receipt('r1','requested'),receipt('r1','accepted','adopted')
 ]),/Conflicting/);
});
