// Wayglass parallel work foundation. Caller supplies real task executors.
// This scheduler never claims work occurred unless its executor returns.
export const WAYGLASS_WORKSTREAMS=Object.freeze([
 'return-engine','living-observer','dream-voyages','skyrunor-kelyran',
 'universal-codex','circulation','knowledge-lineage','jacobian-fold'
]);
export async function runConcurrentWork({tasks,execute,concurrency=4,onResult=()=>{}}){
 if(!Array.isArray(tasks)||typeof execute!=='function')throw Error('Tasks and executor required');
 if(!Number.isSafeInteger(concurrency)||concurrency<1)throw Error('Invalid concurrency');
 const results=new Array(tasks.length);
 let cursor=0;
 async function worker(){
  while(cursor<tasks.length){
   const index=cursor++,task=tasks[index];
   try{results[index]={task,status:'fulfilled',value:await execute(task)};}
   catch(error){results[index]={task,status:'rejected',error:String(error?.message||error)};}
   await onResult(results[index],index);
  }
 }
 await Promise.all(Array.from({length:Math.min(concurrency,tasks.length)},()=>worker()));
 return results;
}
