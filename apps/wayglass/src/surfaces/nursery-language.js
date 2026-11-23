import {WAYGLASS_FEATHER_EVENT} from '../somatic-sound.js';
import {signInHouseSteward} from '../house-steward-session.js';

const BASE='/api/v1/wayglass/cell-garden/nursery';
const make=(doc,tag,text='',cls='')=>{
  const node=doc.createElement(tag);
  if(text)node.textContent=text;
  if(cls)node.className=cls;
  return node;
};
const action=(doc,id,label)=>{
  const button=make(doc,'button',label,'glass-chip');
  button.type='button';
  button.dataset.nurseryAction=id;
  return button;
};

/**
 * An observation deck in the existing Cell Garden. The host owns the only
 * Nursery state; browser tabs never spawn competing colonies or second servers.
 * Nothing runs until an owner chooses to observe/step/run.
 */
export function mountNurseryLanguagePanel(parent,{
  fetchImpl=globalThis.fetch,scope=globalThis,signal=null,
}={}){
  const doc=parent.ownerDocument;
  const panel=make(doc,'section','','glass-panel wg-nursery-language');
  panel.dataset.nurseryLanguage='source-grounded-v0.1';
  panel.setAttribute('aria-label','Möbius Nursery meaning and poetry');
  const title=make(doc,'h2','Möbius Nursery · what did the babies mean?');
  const intro=make(doc,'p',
    'Grounded speech is tied to accepted signal receipts. Poetry is a separate expressive mode, not proof of an event.',
    'wg-cell-note');
  const actions=make(doc,'div','','wg-cell-row');
  const observe=action(doc,'observe','Observe the babies');
  const step=action(doc,'step','One WTL cycle');
  const run=action(doc,'run','Run cycles');
  const feather=action(doc,'feather','🪽 Feather · Stop Nursery');
  const resume=action(doc,'resume','Release Feather');
  const mode=action(doc,'mode','Show poetry');
  const signin=action(doc,'signin','House Steward sign-in');
  const buttons=[observe,step,run,feather,resume,mode,signin];
  actions.append(...buttons);
  const signinForm=make(doc,'form','','wg-cell-steward-signin');
  signinForm.hidden=true;
  const signinLabel=make(doc,'label','House Steward code');
  const signinField=make(doc,'input');
  signinField.type='password';
  signinField.name='credential';
  signinField.autocomplete='off';
  signinField.required=true;
  signinField.maxLength=4096;
  signinField.setAttribute('aria-label','House Steward code');
  const signinSubmit=make(doc,'button','Sign in privately');
  signinSubmit.type='submit';
  signinLabel.append(signinField);
  signinForm.append(signinLabel,signinSubmit);
  const status=make(doc,'p','The Nursery is not running in this room. Choose Observe to read host state.','wg-cell-note');
  status.setAttribute('role','status');
  const counts=make(doc,'p','','wg-cell-note');
  const items=make(doc,'ol','','wg-cell-list');
  items.setAttribute('aria-label','Nursery source-bound explanations');
  panel.append(title,intro,actions,signinForm,status,counts,items);
  parent.append(panel);
  let disposed=false,loading=false,busy=false,current=null,timer=null,selected='grounded',signedIn=false;
  const clear=()=>{if(timer!==null){(scope.clearInterval||globalThis.clearInterval)(timer);timer=null;}};
  function render(){
    if(disposed)return;
    const known=Boolean(current),paused=Boolean(current?.paused);
    step.disabled=!known||paused||busy;
    run.disabled=!known||paused||busy;
    run.textContent=timer===null?'Run cycles':'Stop running';
    feather.disabled=!known||paused;
    resume.disabled=!known||!paused||busy;
    mode.disabled=!known;
    observe.disabled=loading;
    signin.disabled=busy;
    signin.hidden=signedIn;
    mode.textContent=selected==='grounded'?'Show poetry':'Show grounded meaning';
    counts.textContent=known
      ? `Generation ${current.generation} · Cells ${current.cells?.length??0} · Grounded receipts ${current.groundedUtterances?.length??0} · Poetic expressions ${current.utterances?.length??0} · ${paused?'Feather held':'Host ready'}`
      : 'No host snapshot loaded.';
    items.replaceChildren();
    const events=selected==='grounded'
      ? current?.groundedUtterances||[]
      : current?.utterances||[];
    for(const entry of events.slice(-12).reverse()){
      const item=make(doc,'li','','wg-cell-lineage');
      const sender=selected==='grounded'?entry.speaker:entry.id;
      const name=current?.names?.[sender]||sender||'Unnamed cell';
      const label=make(doc,'strong',name+': ');
      const detail=make(doc,'span',entry.phrase||'No expression recorded.');
      item.append(label,detail);
      if(selected==='grounded'){
        const receipt=entry.source_receipt;
        item.append(make(doc,'small',
          ` Simulation evidence: accepted ${receipt?.signal_type||'unknown'} signal, tick ${receipt?.tick??'?'}; not verified physical hearing.`,
          'wg-cell-note'));
      }else{
        item.append(make(doc,'small',' Expressive composition; not event-verified.','wg-cell-note'));
      }
      items.append(item);
    }
  }
  async function request(path,body){
    const response=await fetchImpl(BASE+path,{
      method:body===undefined?'GET':'POST',credentials:'same-origin',
      headers:{'Content-Type':'application/json'},
      ...(body===undefined?{}:{body:JSON.stringify(body)}),
      ...(signal?{signal}:{})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(data.error||'Nursery request failed');
    return data;
  }
  async function act(kind){
    if(disposed||signal?.aborted)return;
    if(kind==='mode'){selected=selected==='grounded'?'poetic':'grounded';render();return;}
    if(kind==='signin'){
      signinForm.hidden=!signinForm.hidden;
      if(!signinForm.hidden)signinField.focus?.();
      render();
      return;
    }
    if(kind==='run'){
      if(timer!==null){clear();status.textContent='Automatic cycles stopped. Nursery state retained.';render();return;}
      if(!current||current.paused)return;
      timer=(scope.setInterval||globalThis.setInterval)(()=>{if(!busy)void act('step');},1800);
      status.textContent='Running owner-requested local WTL cycles. Stop running to pause automatic steps.';
      render();return;
    }
    if(kind==='feather')clear();
    if(busy&&kind!=='feather')return;
    busy=true;loading=true;render();
    try{
      if(kind==='observe'){current=await request('');signedIn=true;signinForm.hidden=true;}
      else if(kind==='step'){
        if(!current||current.paused)return;
        const result=await request('/step',{expected_generation:current.generation,owner_confirmed:true});
        current=result.culture;
      }else if(kind==='feather')current=await request('/feather',{});
      else if(kind==='resume')current=await request('/resume',{owner_confirmed:true});
      if(!disposed&&!signal?.aborted)status.textContent=kind==='step'
        ? 'Cycle completed. Source-bound explanations are distinct from poetry.'
        : kind==='feather'?'Nursery stopped. No new turns are authorised.'
        : kind==='resume'?'Owner released Feather. Nursery is ready.':'Nursery host state verified.';
    }catch(error){
      if(!disposed&&!signal?.aborted){
        clear();
        const authRequired=/House session|Steward|sign.in|unauthoris|401/i.test(String(error?.message||error));
        status.textContent=authRequired
          ? 'House Steward sign-in required. Use the private sign-in button; do not share your credential in chat.'
          : 'Nursery unavailable: '+String(error?.message||error);
        if(authRequired){signedIn=false;signinForm.hidden=false;}
      }
    }finally{busy=false;loading=false;render();}
  }
  async function onSignin(event){
    event.preventDefault();
    if(disposed||busy||signal?.aborted)return;
    const credential=String(signinField.value||'');
    // Never retain the credential in project state, localStorage, URL or logs.
    signinField.value='';
    busy=true;signinSubmit.disabled=true;
    try{
      await signInHouseSteward(credential,fetchImpl);
      if(disposed||signal?.aborted)return;
      signedIn=true;
      signinForm.hidden=true;
      status.textContent='House Steward session verified. Loading the Nursery.';
    }catch(error){
      if(!disposed){
        signedIn=false;
        signinForm.hidden=false;
        status.textContent='House sign-in refused: '+String(error?.message||error);
      }
      return;
    }finally{busy=false;signinSubmit.disabled=false;render();}
    await act('observe');
  }
  signinForm.addEventListener('submit',onSignin);
  const onClick=event=>{
    const kind=event.target?.closest?.('[data-nursery-action]')?.dataset.nurseryAction;
    if(kind)void act(kind);
  };
  function onFeather(event){
    if(event.detail?.stopped!==true||disposed)return;
    clear();
    if(current)void act('feather');
  }
  function dispose(){
    if(disposed)return;
    disposed=true;clear();
    panel.removeEventListener('click',onClick);
    signinForm.removeEventListener('submit',onSignin);
    signinField.value='';
    scope.removeEventListener?.(WAYGLASS_FEATHER_EVENT,onFeather);
    signal?.removeEventListener?.('abort',dispose);
  }
  panel.addEventListener('click',onClick);
  scope.addEventListener?.(WAYGLASS_FEATHER_EVENT,onFeather);
  signal?.addEventListener?.('abort',dispose,{once:true});
  render();
  return dispose;
}
