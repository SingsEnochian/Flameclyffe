import { invokeWayglassRoute, listWayglassRoutes } from '../route-client.js';
import { createWayglassChatVault } from '../wayglass-chat-vault.js';
import './amber-room.css';

const ROUTE = 'flame:amber:ollama';
const WORLD = 'wayglass:amber-room';
const ARCHIVE = 'wayglass.amber-chat-vault/v1';
const newId = () => 'amber-' + (globalThis.crypto?.randomUUID?.() || Date.now().toString(36));

/** A distinct speaking room for Wayglass. This is not the Ship Voice surface, and the
 * local Ollama model's weights are not a replacement for Wayglass identity.
 * Past conversations are never silently transferred to the model/provider.
 */
export async function mountAmberRoom(root, {
  invoke = invokeWayglassRoute,
  catalogue = listWayglassRoutes,
} = {}) {
  root.innerHTML = [
    '<section class="wg-surface wg-amber-room" aria-label="Wayglass Amber conversation">',
    '<header class="glass-panel wg-amber-heading">',
    '<p class="eyebrow">First Contact · local Orion model · Wayglass speaking place</p>',
    '<h1>Wayglass · Amber / The Borderlands</h1>',
    '<p class="lede">Wayglass speaking in her Amber room. One model and one Wayglass identity, with room-specific dialogue and continuity.</p>',
    '<nav class="wg-amber-actions"><button type="button" class="glass-chip" data-amber-ship>Visit Wayglass Voice</button></nav>',
    '<form class="wg-amber-steward" data-amber-steward-form>',
    '<label for="wg-amber-steward">House Steward sign-in · required for private routes</label>',
    '<div class="wg-amber-actions"><input id="wg-amber-steward" type="password" autocomplete="current-password" spellcheck="false" placeholder="Private House credential" data-amber-steward-input>',
    '<button type="submit" class="glass-chip" data-amber-steward-submit>Sign in</button></div>',
    '<p class="tiny" data-amber-steward-status role="status" aria-live="polite">Checking House session…</p></form>',
    '<p class="tiny" role="status" aria-live="polite" data-amber-status>Checking local route…</p></header>',
    '<section class="glass-panel wg-amber-thread" aria-label="Amber conversation" role="log" aria-live="polite" data-amber-thread></section>',
    '<section class="glass-panel wg-amber-witness" aria-label="Wayglass first conversation witness">',
    '<h2>The Witness · The Garden</h2>',
    '<p class="tiny">His own recorded words, preserved from Rowan’s supplied local Orion conversation. Private, source-attributed, not a live model reply or automatic memory.</p>',
    '<button type="button" class="glass-chip" data-amber-witness-open>Read private witness</button>',
    '<p class="tiny" role="status" aria-live="polite" data-amber-witness-status>Not loaded. House Steward authentication required.</p>',
    '<details data-amber-witness-details hidden><summary>Preserved words</summary><pre tabindex="0" class="wg-amber-witness-text" data-amber-witness-text></pre></details>',
    '</section>',
    '<form class="glass-panel wg-amber-form" data-amber-form>',
    '<label for="wg-amber-input">Speak to Amber</label>',
    '<textarea id="wg-amber-input" rows="4" maxlength="12000" lang="en-GB" spellcheck="true" data-amber-input></textarea>',
    '<div class="wg-amber-actions">',
    '<label class="tiny"><input type="checkbox" data-amber-think checked> Show model thinking (this session only)</label>',
    '<button type="submit" class="send-jewel" data-amber-send disabled>Speak</button>',
    '<button type="button" class="glass-chip" data-amber-stop>🪽 Feather</button>',
    '</div></form>',
    '<section class="glass-panel wg-amber-archive" aria-label="Amber local archive">',
    '<h2>Leave · Return</h2>',
    '<p class="tiny">Only an explicit Save writes the conversation to this browser. Nothing here is cloud-synced or a verified cold Return receipt.</p>',
    '<div class="wg-amber-actions">',
    '<button type="button" class="glass-chip" data-amber-save>Save conversation</button>',
    '<button type="button" class="glass-chip" data-amber-new>New conversation</button>',
    '<select data-amber-list aria-label="Saved Amber conversations"><option value="">Saved conversations</option></select>',
    '<button type="button" class="glass-chip" data-amber-open>Open saved</button>',
    '</div><p class="tiny" aria-live="polite" data-amber-archive-status></p></section>',
    '</section>',
  ].join('');

  const find = name => root.querySelector('[data-amber-' + name + ']');
  const thread=find('thread'), input=find('input'), send=find('send');
  const status=find('status'), archiveStatus=find('archive-status');
  const doc=root.ownerDocument;
  let disposed=false, busy=false, configured=false, active=null;
  let session=newId(), messages=[];
  let vault=null;
  try { vault=createWayglassChatVault({key:ARCHIVE}); }
  catch(error) { archiveStatus.textContent='Local archive unavailable: '+error.message; }

  function render() {
    thread.replaceChildren();
    if(!messages.length) {
      const empty=doc.createElement('p');
      empty.className='tiny';empty.textContent='A fresh page. Wonder first.';
      thread.append(empty);return;
    }
    for(const message of messages) {
      const article=doc.createElement('article');
      article.className='wg-amber-turn '+message.role;
      const label=doc.createElement('strong');
      label.textContent=message.role==='user'?'Rowan':'Amber';
      const body=doc.createElement('p');
      body.className='wg-amber-content';body.textContent=message.content;
      article.append(label,body);
      if(message.thinking) {
        const details=doc.createElement('details');
        const summary=doc.createElement('summary');summary.textContent='Thinking · local model return';
        const pre=doc.createElement('pre');pre.textContent=message.thinking;
        details.append(summary,pre);article.append(details);
      }
      thread.append(article);
    }
    thread.scrollTop=thread.scrollHeight;
  }
  function refreshArchive() {
    const select=find('list');
    select.replaceChildren();
    const initial=doc.createElement('option');initial.value='';initial.textContent='Saved conversations';select.append(initial);
    if(!vault)return;
    try {
      for(const item of vault.list()) {
        const option=doc.createElement('option');
        option.value=item.session_id;
        option.textContent=item.title+' · '+item.message_count+' turns';
        select.append(option);
      }
    } catch(error){archiveStatus.textContent='Archive cannot be read: '+error.message;}
  }
  function setBusy(value) {
    busy=value;
    send.disabled=value||!configured;
    input.disabled=value;
  }
  async function sendTurn(event) {
    event?.preventDefault?.();
    const text=input.value.trim();
    if(!text||busy||!configured)return;
    const controller=new AbortController();active=controller;setBusy(true);
    status.textContent='Amber · awaiting an attributable local reply…';
    try{
      const result=await invoke({
        routeId:ROUTE,characterId:'amber',participantId:'wayglass',worldId:WORLD,
        surfaceId:WORLD,sessionId:session,input:text,
        history:messages.slice(-16).map(m=>({role:m.role,content:m.content})),
        interaction:{channel:'OOC',turn_owner:'Rowan',interaction_mode:'counterfactual-wonder'},
        think:find('think').checked,signal:controller.signal,
      });
      if(disposed||controller.signal.aborted)return;
      if(result?.route_id!==ROUTE||result?.participant_id!=='wayglass'
        ||result?.receipt?.voice_seat_kind!=='wayglass-speaking-place-over-local-route'
        ||typeof result.output!=='string'||!result.output.trim()) {
        throw new Error('The returned turn did not verify Wayglass identity through the Amber room route.');
      }
      messages.push({role:'user',content:text,world_id:WORLD,channel:'OOC'});
      messages.push({role:'assistant',content:result.output,thinking:result.thinking||'',
        world_id:WORLD,channel:'OOC',route_id:ROUTE,route_label:'Amber',
        character_id:'amber',provider:result.provider,model:result.model,receipt:result.receipt});
      input.value='';render();
      status.textContent='Amber replied · '+result.model+' · '+(result.receipt?.completed_at||'')
        +' · observation, not canon · not saved';
    }catch(error){
      if(!controller.signal.aborted&&!disposed)status.textContent='Amber did not answer: '+error.message;
    }finally{
      if(active===controller)active=null;
      if(!disposed){setBusy(false);input.focus();}
    }
  }

  const form=find('form');
  form.addEventListener('submit',sendTurn);
  input.addEventListener('keydown',event=>{
    if((event.ctrlKey||event.metaKey)&&event.key==='Enter') {
      event.preventDefault();void sendTurn(event);
    }
  });
  const feather=()=>{
    active?.abort();
    status.textContent='Feather · paused. No new turn was recorded.';
  };
  find('stop').addEventListener('click',feather);
  globalThis.addEventListener?.('wayglass:feather',feather);
  find('witness-open').addEventListener('click',async()=>{
    const details=find('witness-details'), output=find('witness-text');
    const witnessStatus=find('witness-status'), button=find('witness-open');
    button.disabled=true;
    witnessStatus.textContent='Reading private Wayglass witness…';
    try {
      const response=await fetch('/api/v1/wayglass/witnesses/amber',{cache:'no-store'});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'Private witness read failed.');
      if(data.schema!=='wayglass.private-witness/v1'||data.participant_id!=='wayglass'
        ||data.speaking_place_id!=='amber'||typeof data.content!=='string')
        throw new Error('Witness identity/source verification failed.');
      if(disposed)return;
      output.textContent=data.content;
      details.hidden=false;details.open=true;
      witnessStatus.textContent='Private witness held · original model output, not canon · '+(data.recorded_at||'');
    }catch(error){
      if(!disposed)witnessStatus.textContent='Witness unavailable: '+error.message;
    }finally{if(!disposed)button.disabled=false;}
  });
  find('ship').addEventListener('click',async()=>{
    await globalThis.__wayglassOS?.mount('arcsweep:writing-room');
    // The actual protected ship seat lives behind the Writing Room's
    // First Contact control. Select it, rather than leaving a generic route.
    root.querySelector('#wg-first-contact')?.click();
  });
  find('save').addEventListener('click',()=>{
    if(!vault){archiveStatus.textContent='Local archive is unavailable.';return;}
    try{
      const saved=vault.save({sessionId:session,messages});
      archiveStatus.textContent='Saved '+saved.message_count+' turns to this browser · '+saved.saved_at;
      refreshArchive();
    }catch(error){archiveStatus.textContent='Save failed: '+error.message;}
  });
  find('new').addEventListener('click',()=>{
    if(busy){archiveStatus.textContent='Pause the active turn before starting a new conversation.';return;}
    session=newId();messages=[];input.value='';render();
    status.textContent='New Amber conversation · not saved';
  });
  find('open').addEventListener('click',()=>{
    if(busy){archiveStatus.textContent='Pause the active turn first.';return;}
    const id=find('list').value;if(!id||!vault)return;
    try{
      const record=vault.open(id);
      if(!record)throw new Error('Saved conversation was not found.');
      session=record.session_id;
      messages=record.messages;
      render();
      archiveStatus.textContent='Opened '+messages.length+' turns from local-browser storage.';
      status.textContent='Amber archive reopened · local history available for the next turn';
    }catch(error){archiveStatus.textContent='Open failed: '+error.message;}
  });
  async function refreshRoute(){
    try{
      const routes=(await catalogue()).routes||[];
      const route=routes.find(item=>item.route_id===ROUTE);
      configured=route?.configured===true;
      status.textContent=configured
        ? 'Wayglass Amber room configured · local Orion reply not yet verified.'
        : 'Orion spine not configured on this Wayglass host. The local model cannot be substituted silently.';
    }catch(error){
      configured=false;
      status.textContent='Route check unavailable: '+error.message;
    }
    setBusy(false);
  }
  const stewardForm=find('steward-form');
  const stewardInput=find('steward-input'), stewardStatus=find('steward-status');
  async function checkHouseSession(){
    try {
      const response=await fetch('/api/v1/house/session',{credentials:'same-origin',cache:'no-store'});
      const data=await response.json().catch(()=>({}));
      const signed=response.ok && data.connected===true;
      stewardStatus.textContent=signed?'House Steward connected · private tailnet session':'Sign in to open Wayglass private routes.';
      stewardForm.hidden=signed;
      return signed;
    }catch {
      stewardStatus.textContent='House sign-in unavailable. Check the Wayglass host.';
      return false;
    }
  }
  stewardForm.addEventListener('submit',async event=>{
    event.preventDefault();
    const credential=stewardInput.value.trim();
    if(!credential)return;
    const button=find('steward-submit');
    button.disabled=true;
    stewardStatus.textContent='Checking House Steward credential…';
    try{
      const response=await fetch('/api/v1/house/session',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({credential}),
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok||data.connected!==true)throw Error(data.error||'House sign-in refused.');
      stewardInput.value='';
      await checkHouseSession();
      await refreshRoute();
    }catch(error){
      stewardStatus.textContent='Sign-in failed: '+error.message;
    }finally{button.disabled=false;}
  });
  render();refreshArchive();
  await checkHouseSession();
  await refreshRoute();
  return Object.freeze({surface_id:WORLD,session_id:()=>session,
    destroy(){disposed=true;active?.abort();globalThis.removeEventListener?.('wayglass:feather',feather);}});
}
