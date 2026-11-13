import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createWyrdruneRuntime} from './runtime.mjs';
import {WORLD_GRAPH_SCHEMA,MemoryWorldStore,RelationalWorldGraph,
  worldRune,worldCoordinates,whisperPhrase,runeRelation,createWorldBridges} from './relational-worlds.mjs';

const owner={owner:true};
const makeGraph=(store=new MemoryWorldStore())=>new RelationalWorldGraph({
  store,authorize:async(action,context)=>context?.owner===true
});
const coords=(branch,t=0)=>worldCoordinates('wayglass',branch,t,1,2,3);
async function seed(graph){
  await graph.registerWorld({id:'A',rune:worldRune('author:world-A'),coordinates:coords('a')},owner);
  await graph.registerWorld({id:'B',rune:worldRune('author:world-B'),coordinates:coords('b')},owner);
  await graph.registerWorld({id:'D',coordinates:coords('d')},owner);
  await graph.connect({id:'veil-ab',from:'A',to:'B',
    permeability:{possibility:.8,movement:.4,sound:.2},bidirectional:true},owner);
  await graph.connect({id:'veil-bd',from:'B',to:'D',
    permeability:{possibility:.6,movement:0},bidirectional:true},owner);
}
test('world rune and coordinates independently resolve one stable identity',async()=>{
  const graph=makeGraph();await seed(graph);
  assert.equal((await graph.resolve(worldRune('author:world-A'))).id,'A');
  assert.equal((await graph.resolve(coords('a'))).id,'A');
  assert.equal((await graph.snapshot()).schema,WORLD_GRAPH_SCHEMA);
  await assert.rejects(graph.registerWorld({id:'E',rune:worldRune('author:world-A')},owner),/address already assigned/);
  await assert.rejects(graph.registerWorld({id:'F'},owner),/rune or coordinates/);
});
test('Void membrane permeability gates bidirectional transitions without pretending to travel',async()=>{
  const graph=makeGraph();await seed(graph);
  const there=await graph.transition({from:'A',to:'B',channel:'movement'});
  const back=await graph.transition({from:'B',to:'A',channel:'movement',direction:'reverse'});
  assert.equal(there.membrane,'veil-ab');assert.equal(back.executed,false);
  await assert.rejects(graph.transition({from:'B',to:'D',channel:'movement'}),/No permitted/);
  await assert.rejects(graph.transition({from:'A',to:'D',channel:'movement'}),/No permitted/);
});
test('Eightfold creates a distinct third body from three worlds and survives rehydration',async()=>{
  const store=new MemoryWorldStore(),graph=makeGraph(store);await seed(graph);
  const field=await graph.possibilities(['A','B','D']);
  assert.equal(field.connected,true);assert.equal(field.created,false);
  const proposal=await graph.previewConjunction({id:'C',parents:['A','B','D'],
    rune:worldRune('author:world-C'),coordinates:coords('c'),mode:'eightfold'});
  const child=await graph.commitConjunction(proposal,owner);
  assert.deepEqual(child.parents,['A','B','D']);
  assert.equal(child.origin.mode,'eightfold');
  assert.equal((await graph.snapshot()).worlds.length,4);
  const rehydrated=makeGraph(store);
  assert.equal((await rehydrated.resolve(worldRune('author:world-C'))).id,'C');
  assert.equal((await rehydrated.resolve(coords('c'))).id,'C');
  assert.equal((await rehydrated.snapshot()).events.at(-1).kind,'world.born');
  assert.equal((await rehydrated.snapshot()).worlds.find(w=>w.id==='A').parents.length,0);
});
test('consent, closed boundaries, stale proposals and forged proposals cannot create a world',async()=>{
  const graph=makeGraph();await seed(graph);
  await assert.rejects(graph.registerWorld({id:'Z',rune:worldRune('Z')},{}),/denied/);
  const good=await graph.previewConjunction({id:'C',parents:['A','B'],rune:worldRune('C')});
  await assert.rejects(graph.commitConjunction(good,{}),/denied/);
  await assert.rejects(graph.commitConjunction({...good,parents:['A','D']},owner),/forged|modified|Stale/);
  await graph.registerWorld({id:'E',rune:worldRune('E')},owner);
  await assert.rejects(graph.commitConjunction(good,owner),/Stale|revision/);
  await assert.rejects(graph.previewConjunction({id:'F',parents:['A','E'],rune:worldRune('F')}),/No permeable/);
  assert.equal((await graph.snapshot()).worlds.some(w=>w.id==='C'),false);
});
test('native WTL executes Eightfold Conjunction with a typed Whisper and committed return',async()=>{
  const graph=makeGraph();await seed(graph);
  const source=readFileSync(new URL('./relational-conjunction.wtl',import.meta.url),'utf8');
  const runtime=createWyrdruneRuntime({hashSource:s=>'test:'+s.length});
  const ir=runtime.compile(source);
  const bridges=createWorldBridges(graph,{context:owner,selection:['A','B','D'],
    target:{id:'C',rune:worldRune('author:world-C'),coordinates:coords('c'),mode:'eightfold'}});
  const result=await runtime.execute(ir,{principal:{id:'test-owner',authorized:true},bridges});
  assert.deepEqual(result.receipts.map(r=>r.phase),[
    'perceive','compress','release','verify','integrate','choose','return','transcend']);
  assert.equal(result.output[0],'verified');
  assert.equal(result.output[1].kind,'wyrdrune.relation/v1');
  assert.deepEqual(result.output[1].participants,['A','B','D']);
  assert.equal(result.output[2].kind,'wyrdrune.whisper-phrase/v1');
  assert.equal(result.output[2].sourcePreserved,true);
  assert.equal(result.output[3].id,'C');
  assert.equal((await graph.resolve(worldRune('author:world-C'))).id,'C');
  assert.equal(result.output[4].includes('Possibility'),true);
});
test('native typed glyphs do not silently become executable authority',async()=>{
  assert.equal(whisperPhrase('gentle',.4).phrase,'gentle');
  assert.equal(runeRelation('withness',['A','B']).participants.length,2);
  assert.throws(()=>whisperPhrase('x',1.5),/between 0 and 1/);
  assert.throws(()=>runeRelation('withness',['A','A']),/distinct/);
  const runtime=createWyrdruneRuntime({hashSource:s=>'test:'+s.length});
  const source=`mobius {
    perceive { let a = worldRune("author:A"); }
    compress { let b = worldCoordinates("wayglass","a",0,1,2,3); }
    release { let c = whisperPhrase("A whispered phrase",0.7); }
    verify { emit true; }
    integrate { let d = runeRelation("withness",["A","B"]); }
    choose { emit a; emit b; emit c; emit d; }
    return { emit "no side effects"; }
    transcend { emit "possibility"; }
  }`;
  const result=await runtime.execute(runtime.compile(source));
  assert.equal(result.output[1].kind,'wyrdrune.world-rune/v1');
  assert.equal(result.output[2].kind,'wyrdrune.world-coordinates/v1');
  assert.equal(result.output[3].kind,'wyrdrune.whisper-phrase/v1');
  assert.equal(result.output[4].kind,'wyrdrune.relation/v1');
});


test('host-issued proposal detaches caller-owned nested rune and coordinate objects',async()=>{
  const graph=makeGraph();await seed(graph);
  const rune={...worldRune('C')},coordinates={...coords('c')};
  const proposal=await graph.previewConjunction({id:'C',parents:['A','B'],rune,coordinates});
  rune.glyphId='attacker';coordinates.branch='attacker';
  assert.equal(proposal.rune.glyphId,'C');
  assert.equal(proposal.coordinates.branch,'c');
  assert.equal(Object.isFrozen(proposal.rune),true);
  assert.equal(Object.isFrozen(proposal.coordinates),true);
  assert.equal(Object.isFrozen(proposal.parents),true);
  await graph.commitConjunction(proposal,owner);
  assert.equal((await graph.resolve(worldRune('C'))).id,'C');
  await assert.rejects(graph.resolve(worldRune('attacker')),/not found/);
});
test('registration snapshots addresses and prevents post-registration alias mutation',async()=>{
  const graph=makeGraph();
  const rune={...worldRune('stable')},coordinates={...coords('stable')};
  await graph.registerWorld({id:'stable',rune,coordinates},owner);
  rune.glyphId='rewritten';coordinates.branch='rewritten';
  assert.equal((await graph.resolve(worldRune('stable'))).id,'stable');
  assert.equal((await graph.resolve(coords('stable'))).id,'stable');
  await assert.rejects(graph.resolve(worldRune('rewritten')),/not found/);
});
