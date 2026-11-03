// Wayglass Crossing Lattice: twenty directed crossings among four engines and Observer.
// Crossings are explicit and receipted; no hidden model calls or authority changes.
export const CROSSING_NODES=Object.freeze(['state','geometry','temporal','becoming','observer']);
export const CROSSING_EDGES=Object.freeze(CROSSING_NODES.flatMap(from=>CROSSING_NODES.filter(to=>to!==from).map(to=>Object.freeze({from,to,id:from+'->'+to}))));
const copy=x=>structuredClone(x);
export function createCrossingPacket({id,origin,payload,register='HYPOTHESIS'}={}){
 if(typeof id!=='string'||!id||!CROSSING_NODES.includes(origin)||payload===undefined)throw Error('Invalid crossing packet');
 return {schema:'wayglass.crossing-packet/v1',id,origin,current:origin,payload:copy(payload),register,history:[],visited:[origin]};
}
export function cross(packet,to,{transform,observer=null}={}){
 if(packet?.schema!=='wayglass.crossing-packet/v1'||!CROSSING_NODES.includes(packet.current)||!CROSSING_NODES.includes(to)||packet.current===to)throw Error('Invalid crossing');
 if(typeof transform!=='function')throw Error('Explicit transformation required');
 const from=packet.current,prior=copy(packet.payload),result=transform(copy(prior),{from,to,history:copy(packet.history)});
 if(result===undefined||result instanceof Promise)throw Error('Synchronous result required');
 const next=copy(packet),index=next.history.length+1;
 next.payload=copy(result);next.current=to;next.visited.push(to);
 next.history.push({index,edge:from+'->'+to,from,to,observer,sourcePacket:packet.id,register:packet.register,authorityGrant:false});
 return next;
}
export function traverseCrossings(packet,steps,{maxSteps=32}={}){
 if(!Array.isArray(steps)||steps.length>maxSteps||!Number.isSafeInteger(maxSteps)||maxSteps<1)throw Error('Invalid crossing path');
 return steps.reduce((current,step)=>cross(current,step.to,{transform:step.transform,observer:step.observer??null}),packet);
}
export function crossingTopology(){
 return {nodes:[...CROSSING_NODES],edges:CROSSING_EDGES.map(x=>({...x})),directedEdges:CROSSING_EDGES.length};
}
