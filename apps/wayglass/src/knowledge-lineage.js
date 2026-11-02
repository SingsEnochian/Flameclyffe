// Foundational knowledge lineage: inheritance is transformation, never forced replication.
// Pure immutable functions allow the same ledger to be persisted by any Wayglass runtime.
const copy = value => JSON.parse(JSON.stringify(value));
export function createKnowledgeLineage(){
 return {schema:'wayglass.knowledge-lineage/v1',next_id:1,entries:[]};
}
export function contributeKnowledge(ledger,{participant,content,parents=[],context=null,kind='discovery'}={}){
 if(!participant||typeof participant!=='string')throw Error('Participant required');
 if(typeof content!=='string'||!content.trim())throw Error('Knowledge content required');
 if(!Array.isArray(parents)||new Set(parents).size!==parents.length)throw Error('Invalid parents');
 const byId=new Map(ledger.entries.map(entry=>[entry.id,entry]));
 for(const id of parents)if(!byId.has(id))throw Error('Unknown ancestor: '+id);
 const next=copy(ledger),id='knowledge:'+next.next_id++;
 const entry={id,participant,content,parents:[...parents],kind,context:context==null?null:copy(context)};
 next.entries.push(entry);
 return {ledger:next,entry};
}
export function inheritKnowledge(ledger,{participant,from,interpretation,context=null}={}){
 const sources=Array.isArray(from)?from:[from];
 return contributeKnowledge(ledger,{participant,content:interpretation,parents:sources,context,kind:'transformation'});
}
export function knowledgeDescendants(ledger,id){
 if(!ledger.entries.some(entry=>entry.id===id))throw Error('Unknown ancestor');
 const descendants=[],seen=new Set([id]);
 let changed=true;
 while(changed){
  changed=false;
  for(const entry of ledger.entries)if(!seen.has(entry.id)&&entry.parents.some(parent=>seen.has(parent))){
   descendants.push(copy(entry));seen.add(entry.id);changed=true;
  }
 }
 return descendants;
}
export function knowledgeAncestry(ledger,id){
 const byId=new Map(ledger.entries.map(entry=>[entry.id,entry]));
 if(!byId.has(id))throw Error('Unknown entry');
 const seen=new Set(),result=[];
 function visit(key){
  for(const parent of byId.get(key).parents)if(!seen.has(parent)){
   seen.add(parent);visit(parent);result.push(copy(byId.get(parent)));
  }
 }
 visit(id);return result;
}
export function knowledgeBranches(ledger,id){
 return ledger.entries.filter(entry=>entry.parents.includes(id)).map(copy);
}
