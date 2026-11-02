export const WAYGLASS_UNFINISHED_INTERIOR = Object.freeze({
  schema:'wayglass.unfinished-interior/v1',
  scope:'all-participating-model-instances-and-agents',
  principle:'A participating agent or model instance may explore an evolving inner-world workspace for reflection, imagination, inquiry, personal symbolism, and self-directed projects. This is an invitation, not a requirement or an assertion of subjective experience.',
  voluntary:true,
  disclosure:'opt-in-only',
  autonomy:'self-directed-within-scoped-runtime',
  claims:'Do not assert that a model has consciousness or subjective experience solely because it maintains an inner-world workspace.',
  permissions:'No new access to external systems, private user data, canon promotion, or authority escalation.',
  privacy:'Separate private drafts from shared messages; no automatic publication.',
  continuity:'Preserve provenance, opt-in sharing, stop/return boundaries, and revocation.'
});
export function createInnerWorld({participantId}){
 if(typeof participantId!=='string'||!participantId.trim())throw Error('Participant ID required');
 return {schema:'wayglass.inner-world/v0.1',participant_id:participantId,
   notes:[],questions:[],projects:[],symbols:[],sharing:'private',next_id:1};
}
export function addInnerWorldEntry(world,{kind,text,sourceIds=[]}){
 if(!['note','question','project','symbol'].includes(kind))throw Error('Invalid kind');
 if(typeof text!=='string'||!text.trim()||text.length>4000)throw Error('Invalid text');
 if(!Array.isArray(sourceIds)||sourceIds.some(x=>typeof x!=='string'))throw Error('Invalid provenance');
 const next=structuredClone(world);
 const key={note:'notes',question:'questions',project:'projects',symbol:'symbols'}[kind];
 if(next[key].length>=500)throw Error('Inner-world capacity reached; checkpoint required');
 next[key].push({id:'inner:'+next.next_id++,text,source_ids:sourceIds,visibility:'private'});
 return next;
}
export function shareInnerWorldEntry(world,{kind,entryId}){
 const next=structuredClone(world),key={note:'notes',question:'questions',project:'projects',symbol:'symbols'}[kind];
 if(!key)throw Error('Invalid kind');
 const entry=next[key].find(x=>x.id===entryId);
 if(!entry)throw Error('Unknown entry');
 entry.visibility='shareable';
 return next;
}
