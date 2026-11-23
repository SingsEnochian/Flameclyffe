import {invokeWayglassRoute,listWayglassRoutes} from './route-client.js';

// Shipwide presence persists across surface changes; model calls use the native router.
export function installShipwidePresence({host=document.body,getSurface=()=>null}={}){
 const panel=document.createElement('aside');
 panel.className='wg-ship-presence glass-panel';
 panel.setAttribute('aria-label','Wayglass shipwide presence');
 panel.innerHTML='<div class="wg-presence-head"><strong>◈ Wayglass · Shipwide</strong><button type="button" class="glass-chip" data-presence-toggle aria-expanded="false">Open</button></div><div data-presence-body hidden><label for="wg-presence-route">Cognitive route</label><select id="wg-presence-route"></select><label for="wg-presence-input">Speak anywhere aboard</label><textarea id="wg-presence-input" rows="3" placeholder="A question for the ship…"></textarea><button type="button" class="glass-chip" data-presence-send>Send through Wayglass</button><p data-presence-status role="status" aria-live="polite">Awaiting route catalogue</p><div data-presence-log role="log" aria-live="polite"></div></div>';
 host.append(panel);
 const body=panel.querySelector('[data-presence-body]');
 const toggle=panel.querySelector('[data-presence-toggle]');
 const select=panel.querySelector('select');
 const input=panel.querySelector('textarea');
 const send=panel.querySelector('[data-presence-send]');
 const status=panel.querySelector('[data-presence-status]');
 const log=panel.querySelector('[data-presence-log]');
 const history=[];
 const sessionId=globalThis.crypto?.randomUUID?.()||'ship-'+Date.now();
 let busy=false;
 toggle.addEventListener('click',()=>{
   body.hidden=!body.hidden;
   toggle.textContent=body.hidden?'Open':'Close';
   toggle.setAttribute('aria-expanded',String(!body.hidden));
 });
 const append=(who,content)=>{
   const entry=document.createElement('p');
   const label=document.createElement('strong');
   label.textContent=who+': ';
   entry.append(label,document.createTextNode(content));
   log.append(entry);
   log.scrollTop=log.scrollHeight;
 };
 listWayglassRoutes().then(data=>{
   for(const route of data.routes||[]){
     const option=document.createElement('option');
     option.value=route.route_id;
     option.textContent=route.label+' · '+route.model;
     select.append(option);
   }
   select.value=[...select.options].some(o=>o.value==='local:ollama')?'local:ollama':select.options[0]?.value||'';
   status.textContent=select.value?'Route ready. No model has been called yet.':'No registered route available.';
 }).catch(error=>{status.textContent='Route catalogue unavailable: '+error.message;});
 async function speak(){
   const message=input.value.trim();
   if(!message||busy||!select.value)return;
   busy=true;send.disabled=true;status.textContent='Calling existing Wayglass route…';
   const surface=getSurface()?.surface_id||'wayglass:ship';
   try{
     const result=await invokeWayglassRoute({
       routeId:select.value,input:message,history:history.slice(-12),
       interaction:{channel:'OOC',turn_owner:'Rowan'},
       sessionId,surfaceId:surface,maxOutputTokens:1400
     });
     if(result.schema!=='wayglass.route-turn/v0.1'||!result.observation||!result.output)
       throw new Error('Missing native observation or model output');
     append('Rowan',message);append(result.model||'Wayglass route',result.output);
     history.push({role:'user',content:message},{role:'assistant',content:result.output});
     input.value='';
     status.textContent='Observed · '+result.route_id+' · '+(result.receipt?.observation_id||'receipt unavailable')+' · not canon';
     globalThis.dispatchEvent(new CustomEvent('wayglass:ship-observation',{detail:{
       surface_id:surface,route_id:result.route_id,model:result.model,
       observation:result.observation,receipt:result.receipt
     }}));
   }catch(error){status.textContent='No verified turn: '+error.message;}
   finally{busy=false;send.disabled=false;}
 }
 send.addEventListener('click',speak);
 input.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();void speak();}});
 return Object.freeze({element:panel,open(){if(body.hidden)toggle.click();input.focus();},
   get history(){return [...history];},destroy(){panel.remove();}});
}
