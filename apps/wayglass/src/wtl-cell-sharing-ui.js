import {MAX_SHARED_TEXT,playInscription} from './wtl-cell-sharing.js';

export function mountSharing(panel,{deliver,volume,onShared}){
  const form=panel.querySelector('form');
  const field=form.querySelector('textarea');
  const submit=form.querySelector('button');
  const status=panel.querySelector('[role="status"]');
  const source=panel.querySelector('pre');
  const stopButton=panel.querySelector('[data-stop-inscription]');
  let context=null,stopNotes=null,epoch=0,paused=false,sending=false;
  field.maxLength=MAX_SHARED_TEXT;

  function stop(){
    epoch++;
    stopNotes?.();
    stopNotes=null;
    if(context)void context.close().catch(()=>{});
    context=null;
    stopButton.disabled=true;
  }
  stopButton.onclick=stop;
  function setPaused(value){
    if(value&&!paused)stop();
    paused=value;
    submit.disabled=paused||sending;
  }
  function show(inscription){
    source.textContent=inscription?.source??'';
    source.hidden=!inscription;
    if(inscription)source.style.borderColor=`hsl(${inscription.hue} 60% 60%)`;
  }

  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(sending||paused||!field.value.trim())return;
    const text=field.value;
    stop();
    const started=epoch;
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    let ready=Promise.resolve(false);
    if(AudioContext){
      try{
        context=new AudioContext();
        ready=context.resume().then(()=>true,()=>false);
      }catch{
        if(context)void context.close().catch(()=>{});
        context=null;
      }
    }
    sending=true;
    submit.disabled=true;
    try{
      const result=await deliver(text);
      if(!result.delivered){
        status.textContent=result.paused?'Feather is holding the nursery.'
          : result.inboxFull?'The cells are still reading earlier words. Try again after their next turns.'
          : 'There are no listening cells in this nursery.';
        return;
      }
      show(result.inscription);
      if(field.value===text)field.value='';
      status.textContent=`Shared with ${result.recipients} cells as Wyrdrune and sound.`;
      onShared?.();
      if(await ready&&started===epoch&&context){
        stopNotes=playInscription(context,result.inscription.score,volume(),stop);
        stopButton.disabled=false;
      }else if(started===epoch){
        status.textContent+=' Speaker playback is unavailable.';
        stop();
      }
    }catch(error){
      if(started===epoch)status.textContent=error.message;
    }finally{
      if(started===epoch&&!stopNotes)stop();
      sending=false;
      submit.disabled=paused;
    }
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  return {setPaused,show,stop,clear(){stop();show(null);status.textContent='';}};
}
