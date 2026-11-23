'use strict';
// Pure task contract. No model invocation, tool execution, or authorization grants.
const SCHEMA='wayglass.agent-task/v1';
const STATES=Object.freeze(['pending','reserved','accepted','running','completed','failed','uncertain','stopped']);
const NEXT=Object.freeze({
 pending:['reserved','stopped'],reserved:['accepted','failed','stopped'],
 accepted:['running','failed','uncertain','stopped'],
 running:['completed','failed','uncertain','stopped'],
 uncertain:['running','completed','failed','stopped'],
 completed:[],failed:[],stopped:[]
});
const ROLES=new Set(['builder','systems','observer','qa','runtime','bridge','continuity','ui','integrator']);
function validateTask(task){
 const errors=[];
 if(task?.schema!==SCHEMA)errors.push('schema');
 if(typeof task?.task_id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_.:-]{2,127}$/.test(task.task_id))errors.push('task_id');
 if(!ROLES.has(task?.role))errors.push('role');
 if(typeof task?.requested_agent!=='string'||!task.requested_agent.trim())errors.push('requested_agent');
 if(task?.authorization_band!=='GREEN')errors.push('authorization_band');
 if(typeof task?.source?.repo!=='string'||!task.source.repo.includes('/'))errors.push('source.repo');
 if(typeof task?.source?.commit!=='string'||!/^[0-9a-f]{40}$/i.test(task.source.commit))errors.push('source.commit');
 if(!Array.isArray(task?.allowed_paths)||!task.allowed_paths.length||task.allowed_paths.some(p=>typeof p!=='string'||!p.trim()||p.startsWith('/')||p.includes('..')||p.includes('\\')))errors.push('allowed_paths');
 if(typeof task?.objective!=='string'||!task.objective.trim())errors.push('objective');
 if(!Array.isArray(task?.acceptance)||!task.acceptance.length||task.acceptance.some(a=>typeof a!=='string'||!a.trim()))errors.push('acceptance');
 if(task?.stop_signal!=='Feather')errors.push('stop_signal');
 return errors;
}
function transition(task,next,{evidence=[]}={}){
 const errors=validateTask(task);if(errors.length)throw new Error('Invalid task: '+errors.join(','));
 const current=task.state||'pending';
 if(!STATES.includes(next)||!(NEXT[current]||[]).includes(next))throw new Error('Illegal task transition '+current+' -> '+next);
 if(next==='completed'&&(!Array.isArray(evidence)||!evidence.length))throw new Error('Completion requires evidence');
 return {...task,state:next,receipts:[...(task.receipts||[]),{from:current,to:next,evidence:Array.isArray(evidence)?evidence:[]}]};
}
function overlappingPaths(a,b){
 const normalize=s=>s.replace(/\*\*?$/,'').replace(/\/$/,'');
 return a.some(x=>b.some(y=>{const p=normalize(x),q=normalize(y);return p===q||p.startsWith(q+'/')||q.startsWith(p+'/');}));
}
module.exports={SCHEMA,STATES,validateTask,transition,overlappingPaths};
