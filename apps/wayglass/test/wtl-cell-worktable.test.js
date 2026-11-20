import test from 'node:test';
import assert from 'node:assert/strict';
import {createCellEcology} from '../src/wtl-cell-ecology.js';
import {createCellWorktables} from '../src/wtl-cell-worktable.js';

async function nursery(){
  const eco=createCellEcology({maxCells:24,seed:11,radius:3,mutationRate:.8,autonomousFusion:true});
  eco.plant('a','explorer',0,0);
  eco.plant('b','explorer',1,0);
  for(let i=0;i<15;i++){eco.step();await eco.turn();}
  return eco;
}

test('a selected cell score becomes an executable program shared by named cells and distinct visitors',async()=>{
  const eco=await nursery();
  const before=eco.snapshot();
  const program=before.worktables[0];
  const origin=before.projectDecisions.find(decision=>decision.id===program.id);
  assert.equal(program.author.id,origin.winner);
  assert.equal(program.score,origin.revision.source);
  assert.match(program.source,/mobius scoped/);
  const play={id:program.id,note:52,visitorId:'guest-one',expectedRevision:0,expectedSession:program.session};
  assert.deepEqual(await eco.playProgram({...play,expectedSession:'previous-colony'}),{status:'changed'});
  const first=eco.playProgram(play);
  assert.deepEqual(await eco.playProgram({...play,visitorId:'guest-two'}),{status:'changed'});
  const result=await first;
  assert.equal(result.status,'committed');
  const [visitor,peer]=result.turn.actions;
  assert.deepEqual(visitor.actor,{kind:'visitor',id:'guest-one'});
  assert.equal(peer.actor.kind,'cell');
  assert.equal(peer.actor.name,before.names[peer.actor.id]);
  assert.equal(peer.joined,true);
  assert.equal(peer.offered,visitor.output.note);
  assert.equal(peer.source_hash,visitor.source_hash);
  assert.equal(eco.snapshot().mobius[peer.actor.id].heard_since_turn,before.mobius[peer.actor.id].heard_since_turn+1);
  const second=await eco.playProgram({...play,note:60,visitorId:'guest-two',expectedRevision:1});
  assert.deepEqual(second.turn.actions[0].actor,{kind:'visitor',id:'guest-two'});
  assert.equal(second.turn.revision,2);
  assert.deepEqual(eco.snapshot().worktables[0].carry,second.turn.actions.at(-1).carry);
});

test('a cell can pass and Feather invalidates an in-flight turn even after immediate resume',async()=>{
  const programs=createCellWorktables();
  programs.publish({id:'project-1',author:{id:'a',name:'A'},score:'tone 48\nrest 4\necho 2',reviewers:[]});
  const lowEnergy=()=>[{id:'a',name:'A',voice:.7,willingness:.1}];
  const played=await programs.play({id:'project-1',note:48,visitorId:'guest',expectedRevision:0,generation:1,
    expectedSession:programs.snapshot()[0].session,peers:lowEnergy,signal:{aborted:false}});
  const [first,passed]=played.turn.actions;
  assert.equal(passed.joined,false);
  assert.equal(passed.output,null);
  assert.deepEqual(passed.carry,first.carry);
  const eco=await nursery();
  const program=eco.snapshot().worktables[0];
  const move={id:program.id,note:48,visitorId:'guest',expectedRevision:0,expectedSession:program.session};
  assert.deepEqual(await eco.playProgram({...move,note:Infinity}),{status:'invalid'});
  const running=eco.playProgram(move);
  eco.feather();
  eco.resume();
  assert.deepEqual(await running,{status:'feather-stopped'});
  assert.deepEqual(eco.snapshot().worktables[0],program);
  assert.equal((await eco.playProgram(move)).status,'committed');
});
