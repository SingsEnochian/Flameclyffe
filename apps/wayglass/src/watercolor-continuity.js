import {leaveWayglassWorld, recoverWayglassDeparture} from './route-client.js';

export const WATERCOLOR_CONTINUITY_SCHEMA='wayglass.watercolor-conversation/v1';
export const WATERCOLOR_LOCAL_KEY='wayglass.watercolor.conversation/v1';
export const MAX_TRANSCRIPT_BYTES=262144;
export const MAX_TRANSCRIPT_TURNS=64;
const MODES=new Set(['dream','plan','stage','suggest','play','work','narrate','grow']);
const STORAGE_ID=/^[a-f0-9]{64}$/;
const clone=value=>structuredClone(value);
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const object=(value,name)=>{if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(name+' must be an object');return value;};
const identifier=(value,name,max=180)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw new TypeError('A bounded '+name+' is required');return value;};
const text=(value,name,max)=>{if(typeof value!=='string'||value.length>max)throw new TypeError('Invalid '+name);return value;};
const safeRevision=value=>{if(!Number.isSafeInteger(value)||value<0)throw new TypeError('Invalid transcript revision');return value;};

function jsonCopy(value){
 let nodes=0;
 function inspect(v,depth=0){
  if(++nodes>16000||depth>18)throw new RangeError('Transcript structure exceeds its limit');
  if(v===null||typeof v==='string'||typeof v==='boolean')return;
  if(typeof v==='number'&&Number.isFinite(v))return;
  if(typeof v!=='object')throw new TypeError('Transcript must contain exact JSON data');
  if(Array.isArray(v)){
   if(v.length>16000)throw new RangeError('Transcript array exceeds its limit');
   for(let i=0;i<v.length;i++){if(!Object.hasOwn(v,i))throw new TypeError('Sparse transcript array');inspect(v[i],depth+1);}
  }else{
   if(Object.getPrototypeOf(v)!==Object.prototype&&Object.getPrototypeOf(v)!==null)throw new TypeError('Transcript must contain plain records');
   for(const key of Object.keys(v))inspect(v[key],depth+1);
  }
 }
 inspect(value);
 const raw=JSON.stringify(value);
 if(new TextEncoder().encode(raw).length>MAX_TRANSCRIPT_BYTES)throw new RangeError('Transcript exceeds its byte limit; preserve this conversation before starting another');
 return JSON.parse(raw);
}
function turn(value,sessionId){
 const item=jsonCopy(object(value,'Turn'));
 const request=object(item.request,'Turn request'),response=object(item.response,'Turn response');
 if(!MODES.has(request.mode))throw new TypeError('Unknown watercolor mode');
 text(request.authorText,'author text',12000);
 identifier(request.routeId,'requested route');
 if(request.sessionId!==undefined&&request.sessionId!==sessionId)throw new Error('Turn session does not match this conversation');
 if(!['wayglass.watercolor-model-turn/v1','wayglass.route-turn/v0.1'].includes(response.schema))throw new TypeError('Attributable model response schema required');
 const output=response.schema==='wayglass.watercolor-model-turn/v1'?response.text:response.output;
 text(output,'response text',12000);if(!output.trim())throw new TypeError('A returned response is required');
 identifier(response.route_id,'returned route');identifier(response.provider,'returned provider');identifier(response.model,'returned model');
 const receipt=object(response.receipt,'Model receipt');
 identifier(receipt.observation_id||receipt.response_id||receipt.receipt_id,'response evidence reference',240);
 return item;
}
function transcript(value){
 const data=jsonCopy(object(value,'Conversation'));
 if(data.schema!==WATERCOLOR_CONTINUITY_SCHEMA)throw new TypeError('Unsupported watercolor conversation schema');
 identifier(data.session_id,'session ID');safeRevision(data.revision);
 if(!Array.isArray(data.turns)||data.turns.length>MAX_TRANSCRIPT_TURNS)throw new RangeError('Conversation turn count exceeds its limit');
 if(data.revision!==data.turns.length)throw new Error('Conversation revision does not match its preserved turns');
 return {schema:WATERCOLOR_CONTINUITY_SCHEMA,session_id:data.session_id,revision:data.revision,turns:data.turns.map(item=>turn(item,data.session_id))};
}
function ownedRecord(value){return {kind:'wayglass-watercolor-conversation',schema:WATERCOLOR_CONTINUITY_SCHEMA,description:'Living Watercolor conversation with exact request, route response and evidence metadata.',conversation:value};}
function fromDeparture(result,{worldId,participantId,storageId=null}){
 object(result,'Host departure');
 if(result.schema!=='wayglass.departure/v0.1'||result.world_id!==worldId||result.participant_id!==participantId)throw new Error('Host departure binding mismatch');
 const packet=object(result.continuation_packet,'Continuation packet');
 if(packet.schema!=='wayglass.continuation-packet/v0.1'||packet.world_id!==worldId||packet.participant_id!==participantId)throw new Error('Host continuation binding mismatch');
 const stop=object(result.stop_receipt,'Stop receipt');
 if(stop.schema!=='wayglass.stop-receipt/v0.1'||stop.world_id!==worldId||stop.participant_id!==participantId)throw new Error('Host stop receipt binding mismatch');
 if(storageId!==null&&result.recovered_storage_id!==storageId)throw new Error('Host returned a different storage reference');
 const records=Array.isArray(packet.active_work)?packet.active_work.filter(r=>r?.kind==='wayglass-watercolor-conversation'&&r?.schema===WATERCOLOR_CONTINUITY_SCHEMA):[];
 if(records.length!==1)throw new Error('A single preserved watercolor conversation is required');
 return transcript(records[0].conversation);
}

// Persistence is always explicit. Browser custody and host fsync custody remain
// separately labelled; neither this transcript nor its text grants authority.
export function createWatercolorContinuity({sessionId=null,storage,leave=leaveWayglassWorld,recover=recoverWayglassDeparture}={}){
 let current=transcript({schema:WATERCOLOR_CONTINUITY_SCHEMA,session_id:sessionId??('wc-'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36))),revision:0,turns:[]});
 let scope='session',checkpoint=null,savedContent=null,generation=0,replacements=0;
 function snapshot(){return freeze(clone({...current,scope,checkpoint,dirty:savedContent!==JSON.stringify(current),history_window_messages:16}));}
 function browserStorage(){const selected=storage===undefined?globalThis.localStorage:storage;if(!selected||typeof selected.setItem!=='function'||typeof selected.getItem!=='function')throw new Error('Browser conversation storage is unavailable');return selected;}
 const api={
  append(value){
   if(current.turns.length>=MAX_TRANSCRIPT_TURNS)throw new RangeError('Conversation is at its turn limit; save it before starting another');
   const entry=turn(value,current.session_id);
   const next=transcript({...current,revision:current.revision+1,turns:[...current.turns,entry]});
   current=next;generation++;return snapshot();
  },
  history(){
   const messages=[];
   for(const item of current.turns){
    if(item.request.authorText.trim())messages.push({role:'user',content:item.request.authorText});
    messages.push({role:'assistant',content:item.response.schema==='wayglass.watercolor-model-turn/v1'?item.response.text:item.response.output});
   }
   return freeze(clone(messages.slice(-16)));
  },
  snapshot,
  saveLocal(){
   const target=browserStorage(),raw=JSON.stringify(current);target.setItem(WATERCOLOR_LOCAL_KEY,raw);
   if(target.getItem(WATERCOLOR_LOCAL_KEY)!==raw)throw new Error('Browser conversation storage did not confirm the saved data');
   scope='local-browser';savedContent=raw;
   return freeze({schema:'wayglass.watercolor-storage-receipt/v1',scope,persisted:true,storage_key:WATERCOLOR_LOCAL_KEY,session_id:current.session_id,revision:current.revision,turn_count:current.turns.length});
  },
  recoverLocal(){
   const raw=browserStorage().getItem(WATERCOLOR_LOCAL_KEY);
   if(typeof raw!=='string'||!raw)throw new Error('No saved watercolor conversation in this browser');
   if(new TextEncoder().encode(raw).length>MAX_TRANSCRIPT_BYTES)throw new RangeError('Stored conversation exceeds its byte limit');
   let parsed;try{parsed=JSON.parse(raw);}catch{throw new Error('Saved watercolor conversation is not valid JSON');}
   const next=transcript(parsed);current=next;generation++;replacements++;scope='local-browser';checkpoint=null;savedContent=JSON.stringify(next);return snapshot();
  },
  async saveHost(options={}){
   const worldId=identifier(options.worldId,'world ID'),participantId=identifier(options.participantId,'participant ID');
   identifier(options.stopPoint,'stop point',1000);identifier(options.nextOwner,'next owner',240);
   if(!Array.isArray(options.identityDeclarations)||!options.identityDeclarations.length)throw new TypeError('Explicit identity declarations are required for host continuity');
   const captured=clone(current),capturedReplacements=replacements;
   const declaredWork=options.activeWork??[];if(!Array.isArray(declaredWork))throw new TypeError('Active work must be an array');
   if(declaredWork.some(r=>r?.kind==='wayglass-watercolor-conversation'))throw new TypeError('Duplicate watercolor conversation record');
   const refs=options.provenanceRefs??[];if(!Array.isArray(refs))throw new TypeError('Provenance references must be an array');
   const last=captured.turns.at(-1)?.response;
   const routeId=options.routeId??last?.route_id??null;
   const result=await leave({...options,worldId,participantId,routeId,
    activeWork:[...declaredWork,ownedRecord(captured)],
    provenanceRefs:[...refs,'wayglass-watercolor-session:'+captured.session_id],
   });
   const stored=fromDeparture(result,{worldId,participantId});
   const custody=result.storage_receipt;
   if(!custody||custody.schema!=='wayglass.storage-receipt/v0.1'||custody.persisted!==true||custody.durability!=='local-file-fsync'||!STORAGE_ID.test(custody.storage_id)||custody.departure_receipt_id!==result.stop_receipt.receipt_id)throw new Error('Host did not return a durable storage receipt');
   if(JSON.stringify(stored)!==JSON.stringify(captured))throw new Error('Host preserved a different watercolor conversation');
   // A response may arrive while a save is in flight. Keep the newer local
   // transcript and identify that the checkpoint contains an earlier revision.
   if(current.session_id===captured.session_id&&replacements===capturedReplacements){checkpoint={storageId:custody.storage_id,worldId,participantId};scope='host-fsync';savedContent=JSON.stringify(captured);}
   return freeze({schema:'wayglass.watercolor-storage-receipt/v1',scope:'host-fsync',persisted:true,session_id:captured.session_id,revision:captured.revision,turn_count:captured.turns.length,checkpoint:{storageId:custody.storage_id,worldId,participantId},storage_receipt:clone(custody)});
  },
  async recoverHost({storageId,worldId,participantId,...options}={}){
   if(typeof storageId!=='string'||!STORAGE_ID.test(storageId))throw new TypeError('A host storage receipt ID is required');
   identifier(worldId,'world ID');identifier(participantId,'participant ID');
   const started=generation,result=await recover({...options,storageId,worldId,participantId});
   const next=fromDeparture(result,{worldId,participantId,storageId});
   if(generation!==started)throw new Error('Conversation changed while recovery was pending; restored evidence was not applied');
   current=next;generation++;replacements++;scope='host-fsync';checkpoint={storageId,worldId,participantId};savedContent=JSON.stringify(next);return snapshot();
  },
 };
 return Object.freeze(api);
}
