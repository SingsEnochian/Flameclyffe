// Deterministic simulated Writing Room, independent of browser audio.
export const SCHEMA = 'wayglass.acoustic-marker/v0.1';
export const MARKER = Object.freeze({id:'return-marker',x:0.7,y:-0.4,source_ref:'simulated:writing-room'});
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
export function initialState(){return {schema:SCHEMA,listener:{x:0,y:0,heading:0},marker:{...MARKER},selected:false,muted:true,mono:false,ambience:false,status:'idle',revision:0,events:[]};}
export function bearing(state){
 const {listener:l,marker:m}=state,dx=m.x-l.x,dy=m.y-l.y;
 const angle=wrap(Math.atan2(dy,dx)-l.heading),distance=Math.hypot(dx,dy);
 return {angle,degrees:Math.round(angle*180/Math.PI),distance,pan:clamp(Math.sin(angle),-1,1),gain:clamp(1/(1+distance*distance),0.1,1)};
}
export function transition(state,intent){
 if(!intent||typeof intent.type!=='string')throw new TypeError('Intent type required');
 const next=structuredClone(state);
 switch(intent.type){
 case 'turn': {const n=Number(intent.value);if(!Number.isFinite(n))throw new TypeError('Finite heading required');next.listener.heading=wrap(next.listener.heading+clamp(n,-Math.PI,Math.PI));break;}
 case 'move': {const n=Number(intent.value);if(!Number.isFinite(n))throw new TypeError('Finite movement required');const d=clamp(n,-0.25,0.25);next.listener.x=clamp(next.listener.x+Math.cos(next.listener.heading)*d,-1,1);next.listener.y=clamp(next.listener.y+Math.sin(next.listener.heading)*d,-1,1);break;}
 case 'place': {
  const {x,y}=intent;
  if(typeof x!=='number'||typeof y!=='number'||!Number.isFinite(x)||!Number.isFinite(y))throw new TypeError('Finite position required');
  if(Math.abs(x)>1||Math.abs(y)>1)throw new RangeError('Position out of bounds');
  next.listener.x=x;next.listener.y=y;break;
 }
 case 'select':next.selected=true;next.status='selected';break;
 case 'orient':next.status='oriented';break;
 case 'request-traverse':next.status='traverse-requested';break; // no authority to execute
 case 'decline':next.status='declined';break;
 case 'mute':next.muted=Boolean(intent.value);break;
 case 'mono':next.mono=Boolean(intent.value);break;
 case 'ambience':next.ambience=Boolean(intent.value);break;
 case 'feather':next.muted=true;next.ambience=false;next.status='cancelled';break;
 case 'reset':return initialState();
 default:throw new RangeError('Unknown intent '+intent.type);
 }
 next.revision++;next.events.push({revision:next.revision,type:intent.type,status:next.status});next.events=next.events.slice(-40);
 return next;
}
export function receipt(state){return {schema:SCHEMA,world_id:'wayglass:simulated-writing-room',revision:state.revision,listener:{...state.listener},marker:{...state.marker},selected:state.selected,status:state.status,events:state.events.map(e=>({...e}))};}
const RETURN_STATUSES=new Set(['idle','selected','oriented','traverse-requested','declined','cancelled','returned']);
const EVENT_TYPES=new Set(['turn','move','place','select','orient','request-traverse','decline','mute','mono','ambience','feather']);
export function recover(value){
 if(value?.schema!==SCHEMA||value?.world_id!=='wayglass:simulated-writing-room')throw new TypeError('Invalid return receipt');
 const s=initialState(),l=value.listener,m=value.marker;
 if(!l||!m||![l.x,l.y,l.heading,m.x,m.y].every(Number.isFinite)||m.id!==MARKER.id||m.source_ref!==MARKER.source_ref||m.x!==MARKER.x||m.y!==MARKER.y||Math.abs(l.x)>1||Math.abs(l.y)>1||Math.abs(l.heading)>Math.PI)throw new TypeError('Invalid return coordinates');
 if(typeof value.selected!=='boolean'||!RETURN_STATUSES.has(value.status)||!Number.isSafeInteger(value.revision)||value.revision<0)throw new TypeError('Invalid return state');
 if(!Array.isArray(value.events)||value.events.length>40||value.events.length!==Math.min(value.revision,40))throw new TypeError('Invalid return events');
 const events=Array.from(value.events,(event,index)=>{
  if(!event||typeof event!=='object'||Array.isArray(event)||Object.keys(event).length!==3||!Object.hasOwn(event,'revision')||!Object.hasOwn(event,'type')||!Object.hasOwn(event,'status')||!Number.isSafeInteger(event.revision)||event.revision!==value.revision-value.events.length+index+1||!EVENT_TYPES.has(event.type)||!RETURN_STATUSES.has(event.status))throw new TypeError('Invalid return event');
  return {revision:event.revision,type:event.type,status:event.status};
 });
 s.listener={x:l.x,y:l.y,heading:l.heading};
 s.marker={...MARKER};s.selected=value.selected;s.status='returned';s.revision=value.revision;s.events=events;
 return s;
}

