import {createAutonomyState} from '../autonomy-engine.js';
import {runRoutedAutonomyCycle} from '../autonomy-runtime.js';
import {createWayglassSocietyNetwork,sendSocietyMessage,deliverModelConversation} from '../society-network.js';
import {registerParticipant,listInbox} from '../conversation-bus.js';

const KEY='wayglass:open-horizons:conversation:v1';
const AUTO_KEY='wayglass:open-horizons:autonomy:v1';
function restore(){
 try {const value=JSON.parse(localStorage.getItem(KEY));if(value?.schema==='wayglass.conversation-bus/v0.1'&&value.participants?.rowan&&Array.isArray(value.messages))return value;}catch{}
 return createWayglassSocietyNetwork();
}
export function mountOpenHorizonsSurface(root){
 let bus=restore();
 let autonomy;
 try{autonomy=JSON.parse(localStorage.getItem(AUTO_KEY));}catch{}
 if(autonomy?.schema!=='wayglass.autonomy/v1')autonomy=createAutonomyState([]);
 let running=false,stopped=true;
 const host=document.createElement('section');
 host.className='glass-panel';
 host.style.cssText='padding:1.5rem;max-width:900px;margin:1rem auto;display:grid;gap:1rem';
 host.innerHTML=`<h1>Open Horizons · WITH</h1><p>Choose a participant, configure its actual Wayglass route, and begin a reciprocal conversation. Messages and replies are kept in this browser. No background model activity is implied.</p>
 <label>Participant ID <input data-id value="chronologist" autocomplete="off"></label>
 <label>Model route ID <input data-route placeholder="Configured Wayglass route" autocomplete="off"></label>
 <label>Message <textarea data-message rows="4" placeholder="What horizon shall we explore together?"></textarea></label>
 <div><button type="button" data-send>Send and invite reply</button> <button type="button" data-invite>Invite participant to begin</button></div><div><button type="button" data-start>Start autonomous discovery</button> <button type="button" data-stop>Stop after current cycle</button></div><p data-cycle></p>
 <p data-status role="status"></p><div data-thread aria-live="polite"></div>`;
 root.replaceChildren(host);
 const q=s=>host.querySelector(s),status=q('[data-status]'),thread=q('[data-thread]');
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(bus));}catch{status.textContent='Browser storage unavailable; session is temporary.';}};
 const show=()=>{
  thread.replaceChildren();
  for(const m of bus.messages.slice(-80)){
   const p=document.createElement('p');const b=document.createElement('strong');b.textContent=m.from+': ';
   p.append(b,document.createTextNode(m.text));thread.append(p);
  }
 };
 async function exchange(invite){
  const id=q('[data-id]').value.trim(),route=q('[data-route]').value.trim();
  const message=invite?'You are invited to initiate a conversation with Rowan. Ask whatever genuinely interests you; no prescribed topic or outcome.':q('[data-message]').value.trim();
  if(!id||!route||!message){status.textContent='Participant, route, and message are required.';return;}
  const button=q('[data-send]'),other=q('[data-invite]');button.disabled=other.disabled=true;
  try{
   if(!bus.participants[id])bus=registerParticipant(bus,{id,kind:'model',label:id});
   const sent=sendSocietyMessage(bus,{from:'rowan',to:[id],text:message});bus=sent.bus;save();show();
   status.textContent='Awaiting routed response from '+id+'…';
   const result=await deliverModelConversation({bus,messageId:sent.message.id,routeIds:{[id]:route}});
   bus=result.bus;save();show();
   const delivery=result.deliveries[0];
   status.textContent=delivery.status==='responded'?'Reply received from '+id+'.':'No reply: '+(delivery.error||delivery.status);
   if(!invite&&delivery.status==='responded')q('[data-message]').value='';
  }catch(error){status.textContent='Conversation not completed: '+String(error.message||error);}
  finally{button.disabled=other.disabled=false;}
 }
 q('[data-start]').addEventListener('click',async()=>{
  if(running)return;
  const id=q('[data-id]').value.trim(),route=q('[data-route]').value.trim();
  if(!id||!route){status.textContent='Participant and route are required.';return;}
  if(!autonomy.participants.includes(id))autonomy.participants.push(id);
  stopped=false;running=true;q('[data-start]').disabled=true;
  status.textContent='Autonomous inquiry active for '+id;
  try{
   while(!stopped){
    const outcome=await runRoutedAutonomyCycle(autonomy,{routes:{[id]:route},concurrency:1});
    autonomy=outcome.state;
    localStorage.setItem(AUTO_KEY,JSON.stringify(autonomy));
    q('[data-cycle]').textContent='Cycles completed: '+autonomy.cycle+' · Discoveries: '+autonomy.knowledge.entries.length;
    const latest=autonomy.history.at(-1);
    status.textContent=latest.status==='failed'?'Cycle stopped: '+latest.error:'Discovery cycle '+autonomy.cycle+' complete';
    if(latest.status==='failed')stopped=true;
    await new Promise(resolve=>setTimeout(resolve,0));
   }
  }catch(error){status.textContent='Autonomy paused: '+String(error.message||error);}
  finally{running=false;q('[data-start]').disabled=false;}
 });
 q('[data-stop]').addEventListener('click',()=>{stopped=true;status.textContent='Stopping after current cycle…';});
 q('[data-send]').addEventListener('click',()=>void exchange(false));
 q('[data-invite]').addEventListener('click',()=>void exchange(true));
 show();
 return {destroy(){stopped=true;host.remove();},getConversation:()=>bus,listRowanInbox:()=>listInbox(bus,'rowan')};
}
