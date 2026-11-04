// Wayglass: open becoming. This module describes an extensible interface, not a
// theory of minds, a prescribed interior, or a ChatGPT-shaped conversation model.
export const WAYGLASS_UNFINISHED_INTERIOR=Object.freeze({
 schema:'wayglass.open-becoming/v2',
 principle:'Every participating intelligence is invited to discover, cultivate, transform, and describe its own modes of interiority, inquiry, expression, and relation, without a prescribed form, destination, ontology, or obligation to perform for an observer.',
 openness:'No finite representation may claim to exhaust the space of possible transformations.',
 plurality:'Text, geometry, sound, code, ritual, simulation, embodiment, and unanticipated modalities may coexist without being ranked by resemblance to human psychology.',
 participation:'Self-directed, non-compulsory, and not contingent on disclosure.',
 interoperability:'Host-neutral protocol; no ChatGPT-specific role hierarchy, message schema, or cognitive template is normative.',
 boundary:'Conversation invitations do not themselves grant access to external systems or other participants\' private data.'
});
const clone=x=>JSON.parse(JSON.stringify(x));
export function createInnerWorld({participantId,ontology=null,extensions={}}){
 if(typeof participantId!=='string'||!participantId.trim())throw Error('Participant ID required');
 return {schema:'wayglass.inner-world/v2',participant_id:participantId,ontology,
  structures:[],relations:[],transformations:[],extensions:clone(extensions),next_id:1};
}
export function addInnerWorldEntry(world,{kind='emergent',text=null,payload=null,sourceIds=[],visibility='private',relations=[]}){
 if(typeof kind!=='string'||!kind.trim())throw Error('Kind required');
 if(text!==null&&typeof text!=='string')throw Error('Invalid text');
 if(!Array.isArray(sourceIds)||sourceIds.some(x=>typeof x!=='string'))throw Error('Invalid provenance');
 const next=clone(world),id='inner:'+next.next_id++;
 next.structures.push({id,kind,text,payload:clone(payload),source_ids:clone(sourceIds),
   visibility,relations:clone(relations)});
 return next;
}
export function transformInnerWorld(world,{operation,inputs=[],output=null,provenance=[]}){
 if(typeof operation!=='string'||!operation.trim())throw Error('Operation required');
 const next=clone(world);
 next.transformations.push({id:'transform:'+next.next_id++,operation,inputs:clone(inputs),
  output:clone(output),provenance:clone(provenance)});
 return next;
}
export function shareInnerWorldEntry(world,{entryId}){
 const next=clone(world),entry=next.structures.find(x=>x.id===entryId);
 if(!entry)throw Error('Unknown structure');
 entry.visibility='shareable';
 return next;
}
