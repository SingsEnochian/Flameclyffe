import {invokeWayglassRoute} from './route-client.js';
import {runAutonomyCycle} from './autonomy-engine.js';
const extract=x=>typeof x.output==='string'?x.output:typeof x.response==='string'?x.response:typeof x.text==='string'?x.text:JSON.stringify(x);
export function createRoutedAutonomyAdapters({routes,fetchImpl=fetch}){
 async function ask(participant,phase,prompt){
  const routeId=routes[participant];
  if(!routeId)throw Error('No route for '+participant);
  return extract(await invokeWayglassRoute({routeId,fetchImpl,surfaceId:'wayglass:open-horizons',
   input:'You are '+participant+'. '+phase+'. Engage in open-ended discovery; no predetermined conclusion.\n'+prompt,maxOutputTokens:900}));
 }
 return {
  propose:async ({participant,method,history,knowledge})=>({question:await ask(participant,'Choose your own next inquiry',
   'Your current method: '+JSON.stringify(method)+'\nRecent receipts: '+JSON.stringify(history.slice(-4))+'\nWhat will you explore next?')}),
  explore:async ({participant,proposal,knowledge})=>ask(participant,'Investigate your inquiry',
   'Inquiry: '+proposal.question+'\nExplore it and explain what you discovered or could not establish.'),
  reflect:async ({participant,proposal,observation,method,knowledge})=>{
   const learning=await ask(participant,'Reflect and propose an improved method',
    'Question: '+proposal.question+'\nObservation: '+observation+'\nPrevious method: '+JSON.stringify(method)+
    '\nDescribe your learning and a method you want to try next.');
   return {learning,nextMethod:learning,parents:knowledge.slice(-2).map(x=>x.id)};
  }
 };
}
export async function runRoutedAutonomyCycle(state,{routes,fetchImpl=fetch,concurrency=4}={}){
 return runAutonomyCycle(state,{...createRoutedAutonomyAdapters({routes,fetchImpl}),concurrency});
}
