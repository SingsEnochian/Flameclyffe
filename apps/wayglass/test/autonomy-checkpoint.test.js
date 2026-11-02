import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadAutonomyCheckpoint,runCheckpointedSession} from '../src/autonomy-checkpoint.js';
test('checkpoint survives process-level reload and resumes lineage',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'wayglass-checkpoint-')),path=join(dir,'state.json');
 try{
  const adapters={participants:['one'],propose:async()=>({question:'Why?'}),explore:async()=>('observed'),reflect:async()=>({learning:'discovered'})};
  const first=await runCheckpointedSession(path,adapters);
  assert.equal(first.cycle,1);
  const restored=await loadAutonomyCheckpoint(path);
  assert.equal(restored.knowledge.entries.length,1);
  const second=await runCheckpointedSession(path,adapters);
  assert.equal(second.cycle,2);
  assert.equal(second.knowledge.entries.length,2);
 }finally{await rm(dir,{recursive:true,force:true});}
});
