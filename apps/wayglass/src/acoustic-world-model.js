import {initialState, receipt, recover, MARKER, SCHEMA as MARKER_SCHEMA} from './acoustic-marker-model.js';

// Local spatial simulation snapshots. Participant identity and route authority
// remain in the host/kernel. IDs detect accidental state changes, not forgery.
export const WORLD_SCHEMA = 'wayglass.acoustic-world/v0.1';
export const WORLD_ID = 'wayglass:simulated-writing-room';
export const ROOM_ID = 'wayglass:acoustic-room';
export const MAX_RECEIPT_BYTES = 32768;
export const FRAME = Object.freeze({id:'normalized-screen',units:'normalized-scene-coordinates',x:'right',y:'down',heading:'radians-clockwise-from-positive-x'});
export const MODEL = Object.freeze({id:'illustrative-softened-potential',version:'0.1',softening:0.15,strength:1,displacementScale:0.1});
const statuses = new Set(['idle','selected','oriented','traverse-requested','declined','cancelled','returned']);
const intents = new Set(['turn','move','place','select','orient','request-traverse','decline','mute','mono','ambience','feather']);
const branchPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
const snapshotPattern = /^acoustic:[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}:\d{1,16}:[a-f0-9]{16}$/;

function integer(v,name){if(!Number.isSafeInteger(v)||v<0)throw new TypeError(name+' must be a nonnegative safe integer');return v;}
function number(v,min,max,name){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new TypeError('Invalid '+name);return v;}
function bool(v,name){if(typeof v!=='boolean')throw new TypeError('Invalid '+name);return v;}
function branch(v){if(typeof v!=='string'||!branchPattern.test(v))throw new TypeError('Invalid branch ID');return v;}
function exact(value,expected,name){if(!value||Object.keys(value).length!==Object.keys(expected).length||!Object.entries(expected).every(([k,v])=>value[k]===v))throw new TypeError('Unsupported '+name);}
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
function bounded(value){
 let text;
 try{text=JSON.stringify(value);}catch{throw new TypeError('Snapshot must be JSON serializable');}
 if(typeof text!=='string'||text.length>MAX_RECEIPT_BYTES||new TextEncoder().encode(text).length>MAX_RECEIPT_BYTES)throw new RangeError('Snapshot exceeds receipt size limit');
}
function marker(value){
 if(!value||value.schema!==MARKER_SCHEMA)throw new TypeError('Invalid marker schema');
 const l=value.listener,m=value.marker;
 if(!l||!m)throw new TypeError('Missing spatial coordinates');
 exact(m,MARKER,'marker source');
 const listener={x:number(l.x,-1,1,'listener x'),y:number(l.y,-1,1,'listener y'),heading:number(l.heading,-Math.PI,Math.PI,'listener heading')};
 const revision=integer(value.revision,'marker revision');
 if(!statuses.has(value.status))throw new TypeError('Invalid marker status');
 if(!Array.isArray(value.events)||value.events.length>40||value.events.length!==Math.min(revision,40))throw new RangeError('Invalid marker events');
 const events=Array.from(value.events,(e,index)=>{
  if(!e||typeof e!=='object'||Array.isArray(e)||Object.keys(e).length!==3||!Object.hasOwn(e,'revision')||!Object.hasOwn(e,'type')||!Object.hasOwn(e,'status')||!intents.has(e.type)||!statuses.has(e.status))throw new TypeError('Invalid marker event');
  const n=integer(e.revision,'event revision');
  if(n!==revision-value.events.length+index+1)throw new TypeError('Invalid event order');
  return {revision:n,type:e.type,status:e.status};
 });
 return {schema:MARKER_SCHEMA,listener,marker:{...MARKER},selected:bool(value.selected,'selection'),muted:bool(value.muted,'mute'),mono:bool(value.mono,'mono'),ambience:bool(value.ambience,'ambience'),status:value.status,revision,events};
}

// FNV-1a 64 is a deterministic diagnostic content tag, not a security digest.
// The branch, tick, parent and spatial content all participate: equal ticks in
// different branches or divergent edits do not reuse the same snapshot ID.
function tag(text){let h=14695981039346656037n;for(const byte of new TextEncoder().encode(text)){h^=BigInt(byte);h=BigInt.asUintN(64,h*1099511628211n);}return h.toString(16).padStart(16,'0');}
function snapshotId(w){
 const s=w.markerState;
 const content={world_id:w.world_id,room_id:w.room_id,branch_id:w.branch_id,parent_snapshot_id:w.parent_snapshot_id,tick:w.tick,frame:FRAME,model:MODEL,fieldMass:w.fieldMass,sources:w.sources,listener:s.listener,selected:s.selected,revision:s.revision,events:s.events};
 return 'acoustic:'+w.branch_id+':'+w.tick+':'+tag(JSON.stringify(content));
}
function build({markerState,fieldMass,branch_id='primary',parent_snapshot_id=null,tick=0}){
 const mass=number(fieldMass,0,2,'field mass');
 const w={schema:WORLD_SCHEMA,kind:'simulation',world_id:WORLD_ID,room_id:ROOM_ID,branch_id:branch(branch_id),snapshot_id:'',parent_snapshot_id,tick:integer(tick,'simulation tick'),frame:{...FRAME},model:{...MODEL},fieldMass:mass,sources:[{id:MARKER.id,x:MARKER.x,y:MARKER.y,mass,source_ref:MARKER.source_ref}],markerState:marker(markerState)};
 if(parent_snapshot_id!==null&&(typeof parent_snapshot_id!=='string'||!snapshotPattern.test(parent_snapshot_id)))throw new TypeError('Invalid parent snapshot ID');
 w.snapshot_id=snapshotId(w);return freeze(w);
}
function validate(w){
 bounded(w);
 if(!w||w.schema!==WORLD_SCHEMA||w.kind!=='simulation'||w.world_id!==WORLD_ID||w.room_id!==ROOM_ID)throw new TypeError('Unsupported world snapshot');
 exact(w.frame,FRAME,'coordinate frame');exact(w.model,MODEL,'field model');
 const canonical=build(w);
 if(!Array.isArray(w.sources)||w.sources.length!==1)throw new TypeError('Invalid field sources');
 exact(w.sources[0],canonical.sources[0],'field source');
 if(w.snapshot_id!==canonical.snapshot_id)throw new TypeError('Snapshot content tag mismatch');
 return canonical;
}

export function createWorld({markerState=initialState(),fieldMass=0.7}={}){return build({markerState,fieldMass});}
export function advanceWorld(world,{markerState,fieldMass}={}){
 const w=validate(world);
 return build({markerState:markerState===undefined?w.markerState:markerState,fieldMass:fieldMass===undefined?w.fieldMass:fieldMass,branch_id:w.branch_id,parent_snapshot_id:w.snapshot_id,tick:integer(w.tick+1,'next tick')});
}
export function forkWorld(world,{branchId,fieldMass}={}){
 const w=validate(world);branch(branchId);
 if(branchId===w.branch_id)throw new TypeError('Fork requires a distinct branch ID');
 return build({markerState:w.markerState,fieldMass:fieldMass===undefined?w.fieldMass:fieldMass,branch_id:branchId,parent_snapshot_id:w.snapshot_id,tick:integer(w.tick+1,'fork tick')});
}
export function worldReceipt(world){
 const w=validate(world);
 // Audio flags are runtime preferences and never restored as playback authority.
 return structuredClone({...w,markerState:{...w.markerState,muted:true,ambience:false}});
}
export function recoverWorld(value){
 const w=validate(value),s=recover(receipt(w.markerState));
 // recover validates the original marker contract and starts muted. Preserve
 // the user's mono preference while operational status becomes "returned".
 s.mono=w.markerState.mono;
 return build({...w,markerState:s});
}
export function compareWorlds(a,b){
 const left=validate(a),right=validate(b);
 const changes=[];
 const compare=(path,x,y)=>{if(x!==y)changes.push({path,before:x,after:y});};
 compare('fieldMass',left.fieldMass,right.fieldMass);
 for(const axis of ['x','y','heading'])compare('listener.'+axis,left.markerState.listener[axis],right.markerState.listener[axis]);
 compare('selected',left.markerState.selected,right.markerState.selected);
 return freeze({left_snapshot_id:left.snapshot_id,right_snapshot_id:right.snapshot_id,same_frame:true,same_model:true,changes});
}
