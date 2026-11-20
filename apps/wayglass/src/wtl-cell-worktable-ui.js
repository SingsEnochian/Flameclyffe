import {playInscription} from './wtl-cell-sharing.js';

export function mountCellWorktables(panel,{play,volume,onTurn=()=>{}}){
  const select=panel.querySelector('select');
  const form=panel.querySelector('form');
  const note=form.querySelector('input');
  const offer=form.querySelector('button');
  const listen=panel.querySelector('[data-hear-program]');
  const status=panel.querySelector('[role="status"]');
  const output=panel.querySelector('[data-program-output]');
  const source=panel.querySelector('pre');
  const visitorId=crypto.randomUUID?.()??crypto.getRandomValues(new Uint32Array(4)).join('-');
  let programs=[],paused=false,busy=false,shownProgram,shownTurn,context=null,stopNotes;

  function stop(){
    stopNotes?.();
    stopNotes=null;
    if(context)void context.close().catch(()=>{});
    context=null;
  }

  function selected(){
    return programs.find(program=>program.id===select.value);
  }

  function describe(action){
    const name=action.actor.kind==='cell'?action.actor.name
      :action.actor.id===visitorId?'You':`Visitor ${action.actor.id.slice(0,8)}`;
    if(!action.joined)return `${name} chose to listen.`;
    return `${name} · ${Math.round(action.output.pitch)} Hz · colour ${Math.round(action.output.hue)}°`;
  }

  function render(){
    const program=selected();
    const turn=program?.turns.at(-1);
    offer.disabled=paused||busy||!program;
    listen.disabled=paused||!turn;
    if(program?.id!==shownProgram){
      stop();
      status.textContent='';
      source.textContent=program?.source??'';
      if(program)note.value=program.carry.last_note;
      shownProgram=program?.id;
    }
    if(turn?.revision!==shownTurn?.revision||turn?.program!==shownTurn?.program){
      output.replaceChildren(...(turn?.actions??[]).map(action=>{
        const item=document.createElement('li');
        item.textContent=describe(action);
        if(action.output)item.style.borderInlineStart=`4px solid hsl(${action.output.hue} 70% 62%)`;
        return item;
      }));
      shownTurn=turn;
    }
  }

  function update(snapshot){
    paused=snapshot.paused;
    if(paused)stop();
    const next=snapshot.worktables??[];
    if(next.length!==programs.length||next.some((program,index)=>program.id!==programs[index].id)){
      const previous=select.value;
      select.replaceChildren(...next.map(program=>{
        const option=document.createElement('option');
        option.value=program.id;
        option.textContent=`${program.author.name??program.author.id} · ${program.id}`;
        return option;
      }));
      if(next.some(program=>program.id===previous))select.value=previous;
    }
    programs=next;
    panel.hidden=!programs.length;
    render();
  }

  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const program=selected();
    if(!program||paused||busy)return;
    busy=true;
    render();
    try{
      const response=await play({id:program.id,note:note.valueAsNumber,visitorId,
        expectedSession:program.session,expectedRevision:program.revision});
      if(response.status==='committed'){
        onTurn(response.turn);
        status.textContent=`Turn ${response.turn.revision} completed.`;
      }else if(response.status==='feather-stopped')status.textContent='Feather held this turn.';
      else if(response.status==='changed')status.textContent='Someone else moved first. Offer your note again.';
      else status.textContent='This program could not accept the note.';
    }catch{
      status.textContent='The program could not complete this turn.';
    }finally{
      busy=false;
      render();
    }
  });
  listen.onclick=async()=>{
    const turn=selected()?.turns.at(-1);
    if(paused||!turn)return;
    stop();
    try{
      const Voice=window.AudioContext||window.webkitAudioContext;
      const active=new Voice();
      context=active;
      await active.resume();
      if(context!==active||paused)return;
      const score=turn.actions.filter(action=>action.joined).map(action=>action.output);
      stopNotes=playInscription(active,score,volume(),()=>{stopNotes=null;stop();});
    }catch{
      stop();
      status.textContent='Sound playback is unavailable.';
    }
  };
  select.onchange=render;
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  return {update};
}
