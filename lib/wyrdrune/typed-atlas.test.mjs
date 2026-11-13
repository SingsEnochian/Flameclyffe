import test from 'node:test';
import assert from 'node:assert/strict';
import {createWyrdruneRuntime} from './runtime.mjs';
import {TypedRuneAtlas,babylon5Atlas,atlasRef,worldRune,worldCoordinates} from './typed-atlas.mjs';

const allow=async(_action,context)=>context?.owner===true;
const owner={owner:true};
const coords=(branch,x=1)=>worldCoordinates('b5',branch,0,x,2,3);

test('Babylon 5 is a universe, not a location; its descendants are typed',()=>{
  const atlas=babylon5Atlas();
  assert.equal(atlas.get('b5').type,'universe');
  assert.equal(atlas.get('b5:minbar').universeId,'b5');
  assert.equal(atlas.get('b5:minbar').type,'location');
  assert.equal(atlas.get('b5:rangers').type,'affiliation');
  assert.equal(atlas.get('b5:jumpgate').type,'gateway');
  assert.equal(atlas.get('b5:vorlon').type,'undetermined');
  assert.equal(atlas.children('b5',{type:'location'}).length,4);
  assert.equal(atlas.get('b5:minbar').rune,null);
  assert.throws(()=>atlas.resolve(worldRune('invented-minbar')),/Unbound/);
});
test('owner may bind the real glyph ID or mathematical coordinates to one destination',async()=>{
  const original=babylon5Atlas();
  await assert.rejects(original.bind('b5:minbar',{rune:worldRune('verified:minbar')},allow,{}),/authorization/);
  const bound=await original.bind('b5:minbar',{
    rune:worldRune('verified:minbar'),coordinates:coords('minbar')},allow,owner);
  assert.equal(bound.resolve(worldRune('verified:minbar'),{withinUniverse:'b5',expectedType:'location'}).id,'b5:minbar');
  assert.equal(bound.resolve(coords('minbar'),{withinUniverse:'b5',expectedType:'location'}).id,'b5:minbar');
  assert.equal(original.get('b5:minbar').rune,null);
  assert.throws(()=>bound.resolve(worldRune('verified:minbar'),{expectedType:'gateway'}),/type mismatch/);
  assert.throws(()=>bound.resolve(worldRune('verified:minbar'),{withinUniverse:'other'}),/outside/);
  await assert.rejects(bound.bind('b5:narn',{rune:worldRune('verified:minbar')},allow,owner),/Duplicate atlas address/);
});
test('an affiliation cannot be substituted for a destination and an unbound gate is only a plan concept',async()=>{
  let atlas=babylon5Atlas();
  await assert.rejects(atlas.bind('b5:minbar',{coordinates:worldCoordinates('wrong','a',0,1,2,3)},allow,owner),/match parent/);
  atlas=await atlas.bind('b5:minbar',{rune:worldRune('verified:minbar')},allow,owner);
  atlas=await atlas.bind('b5:narn',{coordinates:coords('narn',4)},allow,owner);
  const plan=atlas.planPassage({universeId:'b5',from:'b5:minbar',to:'b5:narn',gatewayId:'b5:jumpgate'});
  assert.equal(plan.executed,false);assert.equal(plan.authorized,false);
  assert.equal(plan.membraneVerified,false);
  assert.throws(()=>atlas.planPassage({universeId:'b5',from:'b5:rangers',to:'b5:narn',gatewayId:'b5:jumpgate'}),/two locations/);
  assert.throws(()=>atlas.planPassage({universeId:'b5',from:'b5:minbar',to:'b5:narn',gatewayId:'b5:psi-corps'}),/gateway/);
});
test('native WTL produces typed atlas references, not invented glyph geometry',async()=>{
  const runtime=createWyrdruneRuntime({hashSource:s=>'study:'+s.length});
  const src=`mobius {
    perceive { let universe = atlasRef("b5","b5"); }
    compress { let destination = atlasRef("b5","b5:minbar"); }
    release { let faction = atlasRef("b5","b5:rangers"); }
    verify { emit true; }
    integrate { emit universe; }
    choose { emit destination; emit faction; }
    return { emit "address remains unbound"; }
    transcend { emit "possibility"; }
  }`;
  const result=await runtime.execute(runtime.compile(src));
  assert.equal(result.output[1].kind,'wyrdrune.atlas-ref/v1');
  assert.equal(result.output[2].entryId,'b5:minbar');
  assert.equal(result.output[3].entryId,'b5:rangers');
  assert.deepEqual(atlasRef('b5','b5:minbar'),result.output[2]);
});
test('typed atlas rejects orphaned entries and duplicate universe identifiers',()=>{
  assert.throws(()=>new TypedRuneAtlas([{id:'b5:minbar',label:'Minbar',type:'location',universeId:'b5'}]),/existing universe parent/);
  assert.throws(()=>new TypedRuneAtlas([{id:'b5',label:'B5',type:'universe'},{id:'b5',label:'B5',type:'universe'}]),/Duplicate atlas ID/);
});
