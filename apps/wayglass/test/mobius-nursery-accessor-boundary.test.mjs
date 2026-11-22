import test from 'node:test';
import assert from 'node:assert/strict';
import { encounter } from '../src/mobius-nursery-encounter.mjs';

const left = () => ({id:'mote:left',spin:0.25,revision:0});
const right = () => ({id:'mote:right',spin:-0.5,revision:2});
const signal = () => ({kind:'sound',value:'a note',source:'local:owner-opt-in'});
const consent = () => ({'mote:left':true,'mote:right':true});

test('pure attributed encounter remains a non-persisted proposal',()=>{
  const result=encounter({left:left(),right:right(),signal:signal(),consent:consent()});
  assert.equal(result.status,'proposal');
  assert.equal(result.persisted,false);
  assert.equal(result.canon_adopted,false);
  assert.deepEqual(result.participants,['mote:left','mote:right']);
  assert.equal(result.proposed_revisions['mote:left'],1);
  assert.equal(result.proposed_revisions['mote:right'],3);
  assert.ok(Object.isFrozen(result.proposed_field));
});

test('Feather takes precedence even over malformed inputs',()=>{
  assert.deepEqual(encounter({feather:true}),{status:'stopped',reason:'Feather'});
});

test('no participant getter executes during identity or consent decisions',()=>{
  let calls=0;
  const hostile=Object.defineProperty(left(),'id',{get(){calls++;throw Error('accessor executed')}});
  assert.throws(()=>encounter({left:hostile,right:right(),signal:signal(),consent:consent()}),/Distinct valid/);
  assert.equal(calls,0);
});

test('no signal getter executes during proposal evaluation',()=>{
  let calls=0;
  const hostile=Object.defineProperty(signal(),'source',{get(){calls++;throw Error('accessor executed')}});
  assert.throws(()=>encounter({left:left(),right:right(),signal:hostile,consent:consent()}),/Attributed bounded/);
  assert.equal(calls,0);
});

test('inherited participant fields and inherited consent cannot authorise a proposal',()=>{
  const inherited=Object.create(left());
  assert.throws(()=>encounter({left:inherited,right:right(),signal:signal(),consent:consent()}),/Distinct valid/);
  const grants=Object.create(consent());
  const result=encounter({left:left(),right:right(),signal:signal(),consent:grants});
  assert.equal(result.status,'declined');
});

test('snapshot is independent of later participant and signal mutation',()=>{
  const l=left(),s=signal();
  const result=encounter({left:l,right:right(),signal:s,consent:consent()});
  l.spin=-1;s.value='changed';
  assert.equal(result.identity_spins[0],0.25);
  assert.equal(result.signal.value,'a note');
});
