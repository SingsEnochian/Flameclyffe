// First Garden: bounded, consent-gated, deterministic shared-world proposals.
// Pure kernel. The caller alone may explicitly carry a snapshot into durable storage.
export const GARDEN_SCHEMA='wayglass.first-garden/v0.1';
const MATERIALS=['seed','light','stone','water','path','instrument'];
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_.:-]{1,128}$/.test(id);
export function createGarden({participants=['nursery:a','nursery:b']}={}){
 if(!Array.isArray(participants)||participants.length<2||new Set(participants).size!==participants.length||participants.some(id=>!validId(id)))throw Error('Distinct attributed participants required');
 return {schema:GARDEN_SCHEMA,revision:0,participants:[...participants],objects:[],history:[],carried:false};
}
export function proposeGardenAction(state,{actor,material,x=0,y=0,consent={},feather=false,source='owner:ui',consentRevision=null}={}){
 if(feather)return {status:'stopped',reason:'Feather'};
 if(state?.schema!==GARDEN_SCHEMA||!Array.isArray(state.participants)||!state.participants.includes(actor)||!validId(source))throw Error('Invalid garden source or actor');
 // Never issue a new proposal from a corrupted or tampered Return snapshot.
 restoreGarden(state,state.participants);
 if(!Object.hasOwn(consent,actor)||consent[actor]!==true)return {status:'declined',actor};
 if(consentRevision!==null&&(!Number.isSafeInteger(consentRevision)||consentRevision<0))throw Error('Invalid consent revision');
 if(!MATERIALS.includes(material)||!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>1||Math.abs(y)>1)throw Error('Invalid bounded garden action');
 if(state.objects.length>=64)throw Error('Garden object capacity reached');
 const item={id:actor+':'+(state.revision+1),actor,material,x,y,source};
 return {status:'proposal',item,baseRevision:state.revision,consentRevision,carried:false,canon_adopted:false};
}
export function carryGardenAction(state,proposal,{consent={},feather=false,consentRevision=null}={}){
 if(feather)return {status:'stopped',reason:'Feather'};
 if(state?.schema!==GARDEN_SCHEMA||!Number.isSafeInteger(state.revision)||state.revision<0||state.revision>=64||!Array.isArray(state.objects)||state.objects.length!==state.revision||!Array.isArray(state.history)||state.history.length!==state.revision||!Array.isArray(state.participants)||state.participants.length<2||new Set(state.participants).size!==state.participants.length||state.participants.some(id=>!validId(id)))throw Error('Invalid garden state or capacity');
 // Reject corrupted carried state before appending a new irreversible event.
 restoreGarden(state,state.participants);
 if(proposal?.status!=='proposal'||proposal.baseRevision!==state.revision||!state.participants.includes(proposal.item?.actor))throw Error('Stale or invalid garden proposal');
 // A changed consent epoch invalidates earlier proposals even after reauthorisation.
 const item=proposal.item;
 if(item.id!==item.actor+':'+(state.revision+1)||!MATERIALS.includes(item.material)||!Number.isFinite(item.x)||!Number.isFinite(item.y)||Math.abs(item.x)>1||Math.abs(item.y)>1||!validId(item.source)||state.objects.some(o=>o.id===item.id))throw Error('Invalid or replayed garden proposal');
 if(!Object.hasOwn(consent,proposal.item.actor)||consent[proposal.item.actor]!==true)return {status:'declined',actor:proposal.item.actor};
 // A withdrawn grant declines without exposing revision state; reauthorised grants must match the proposal epoch.
 if(proposal.consentRevision!==undefined&&proposal.consentRevision!==null&&proposal.consentRevision!==consentRevision)throw Error('Stale consent revision');
 return {schema:GARDEN_SCHEMA,revision:state.revision+1,participants:[...state.participants],objects:[...state.objects,{...proposal.item}],history:[...state.history,{revision:state.revision+1,action:'carry',itemId:proposal.item.id,source:proposal.item.source}],carried:true};
}
export function restoreGarden(snapshot,participants){
 if(snapshot?.schema!==GARDEN_SCHEMA||typeof snapshot.carried!=='boolean'||snapshot.carried!==(snapshot.revision>0)||!Number.isSafeInteger(snapshot.revision)||snapshot.revision<0||snapshot.revision>64||!Array.isArray(snapshot.objects)||snapshot.objects.length!==snapshot.revision||!Array.isArray(snapshot.history)||snapshot.history.length!==snapshot.revision||!Array.isArray(participants)||participants.length<2||new Set(participants).size!==participants.length||participants.some(id=>!validId(id))||JSON.stringify(snapshot.participants)!==JSON.stringify(participants))throw Error('Invalid or mismatched Return snapshot');
 for(let i=0;i<snapshot.objects.length;i++){
  const o=snapshot.objects[i],h=snapshot.history[i];
  if(!participants.includes(o.actor)||o.id!==o.actor+':'+(i+1)||!MATERIALS.includes(o.material)||!Number.isFinite(o.x)||!Number.isFinite(o.y)||Math.abs(o.x)>1||Math.abs(o.y)>1||!validId(o.source)||h?.revision!==i+1||h.action!=='carry'||h.itemId!==o.id||h.source!==o.source)throw Error('Invalid carried object or Return history');
 }
 return structuredClone(snapshot);
}
