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
export function recover(value){
 if(value?.schema!==SCHEMA||value?.world_id!=='wayglass:simulated-writing-room')throw new TypeError('Invalid return receipt');
 const s=initialState(),l=value.listener,m=value.marker;
 if(!l||!m||![l.x,l.y,l.heading,m.x,m.y].every(Number.isFinite)||m.id!==MARKER.id||m.source_ref!==MARKER.source_ref)throw new TypeError('Invalid return coordinates');
 s.listener={x:clamp(l.x,-1,1),y:clamp(l.y,-1,1),heading:wrap(l.heading)};
 s.marker={...MARKER};s.selected=Boolean(value.selected);s.status='returned';s.revision=Math.max(0,Math.floor(Number(value.revision)||0));s.events=Array.isArray(value.events)?value.events.slice(-40):[];
 return s;
}
