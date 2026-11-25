import test from 'node:test';
import assert from 'node:assert/strict';
import { encounter } from '../src/mobius-nursery-encounter.mjs';

const left = {id:'left',spin:0.25,revision:1};
const right = {id:'right',spin:-0.25,revision:2};
const signal = {kind:'word',value:'Wonder',source:'synthetic-test'};
const run = (consent, overrides={}) => encounter({left,right,signal,consent,...overrides});

test('two own consent grants produce bounded proposal and immutable receipts',()=>{
  const result=run({left:true,right:true});
  assert.equal(result.status,'proposal');
  assert.equal(result.persisted,false);
  assert.equal(result.canon_adopted,false);
  assert.ok(Object.isFrozen(result.proposed_revisions));
  assert.equal(result.proposed_revisions.left,2);
  assert.equal(result.proposed_revisions.right,3);
});
test('accessor consent never executes or authorises',()=>{
  let invoked=0;
  const consent={right:true};
  Object.defineProperty(consent,'left',{enumerable:true,get(){invoked++;return true;}});
  const result=run(consent);
  assert.equal(result.status,'declined');
  assert.equal(invoked,0);
  assert.ok(Object.isFrozen(result.participants));
});
test('prototype grants do not authorise and Feather wins',()=>{
  const consent=Object.create({left:true});
  consent.right=true;
  assert.equal(run(consent).status,'declined');
  assert.equal(run({left:true,right:true},{feather:true}).status,'stopped');
});
test('revision overflow is refused before generating a proposal',()=>{
  assert.throws(()=>run({left:true,right:true},{left:{...left,revision:Number.MAX_SAFE_INTEGER}}),/Distinct valid participants/);
});
