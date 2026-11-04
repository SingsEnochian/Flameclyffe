// Durable local checkpoint adapter. Cloud replicas must use a transactional shared store.
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {createAutonomyState,runAutonomySession} from './autonomy-engine.js';
export async function loadAutonomyCheckpoint(path,participants=[]){
 try{
  const state=JSON.parse(await readFile(path,'utf8'));
  if(state?.schema!=='wayglass.autonomy/v1'||!Array.isArray(state.participants)||!Array.isArray(state.knowledge?.entries)||!Number.isSafeInteger(state.cycle))throw Error('Invalid checkpoint');
  return state;
 }catch(error){if(error.code==='ENOENT')return createAutonomyState(participants);throw error;}
}
export async function saveAutonomyCheckpoint(path,state){
 await mkdir(dirname(path),{recursive:true});
 const tmp=path+'.'+process.pid+'.tmp';
 await writeFile(tmp,JSON.stringify(state,null,2),{mode:0o600});
 await rename(tmp,path);
}
export async function runCheckpointedSession(path,{participants=[],cycles=1,...adapters}={}){
 const initial=await loadAutonomyCheckpoint(path,participants);
 return runAutonomySession(initial,{...adapters,cycles,onCheckpoint:state=>saveAutonomyCheckpoint(path,state)});
}
