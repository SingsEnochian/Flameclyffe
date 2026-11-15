import test from 'node:test';
import assert from 'node:assert/strict';
import {CYPHER_PACES,DEFAULT_CYPHER_PACE,cypherRunOptions,nativeRunOptions,
  paceFor,readCypherPace,writeCypherPace} from '../src/cypher-pace.js';

test('unhurried translation is the default and can be changed deliberately',()=>{
 assert.equal(DEFAULT_CYPHER_PACE,'slow');
 assert.ok(paceFor('slow').frameMs>paceFor('swift').frameMs);
 assert.ok(paceFor('slow').steps>paceFor('steady').steps);
 assert.ok(nativeRunOptions('slow').lingerMs>nativeRunOptions('swift').lingerMs);
 assert.ok(cypherRunOptions('slow').staggerCapMs>=8000);
 assert.deepEqual(Object.keys(CYPHER_PACES),['slow','steady','swift']);
});
test('choice persists only as tempo; no WTL source is ever stored',()=>{
 const values=new Map();
 const scope={sessionStorage:{
  getItem:key=>values.get(key)||null,
  setItem:(key,value)=>values.set(key,value),
 }};
 assert.equal(readCypherPace(scope),'slow');
 assert.equal(writeCypherPace('steady',scope),'steady');
 assert.equal(readCypherPace(scope),'steady');
 assert.equal(values.size,1);
 assert.deepEqual([...values.values()],['steady']);
 assert.equal(writeCypherPace('evil',scope),'slow');
 assert.equal(readCypherPace(scope),'slow');
 assert.equal(readCypherPace({sessionStorage:{getItem(){throw Error('disabled')}}}),'slow');
});
