import {playCellReturn} from './cell-ecology-audio.js';

/** A local monitor for committed cell signals, opened by the Listen control. */
export function createCellListeningChannel({
  url,scope=globalThis,onStatus=()=>{},onFeather=()=>{},
}={}){
  let session=null;
  let volume=.25;
  let muted=false;

  function updateGain(){
    if(session?.output)session.output.gain.value=muted?0:volume;
  }

  function stop(message='Listening paused.'){
    const previous=session;
    session=null;
    if(previous){
      previous.controller.abort();
      previous.stream?.close();
      if(previous.context&&previous.context.state!=='closed')
        void previous.context.close().catch(()=>{});
    }
    onStatus(message);
  }

  async function start(){
    if(session)return;
    const Context=scope.AudioContext||scope.webkitAudioContext;
    if(!Context||!scope.EventSource){
      onStatus('Live cell sound is unavailable on this device.');
      return;
    }
    const run={controller:new AbortController(),context:null,stream:null,output:null};
    session=run;
    onStatus('Connecting to the Cell Garden…');
    try{
      run.context=new Context();
      await run.context.resume();
      if(session!==run)return;
      run.output=run.context.createGain();
      run.output.connect(run.context.destination);
      updateGain();
      run.stream=new scope.EventSource(url);

      let queue=Promise.resolve();
      let lastRevision=-1;
      const quiet='Listening · quiet until a cell exchange';
      run.stream.addEventListener('ready',()=>{if(session===run)onStatus(quiet);});
      run.stream.addEventListener('exchange',event=>{
        if(session!==run)return;
        let receipt;
        try{receipt=JSON.parse(event.data);}
        catch{stop('Listening stopped. The Garden sent an unreadable signal.');return;}
        if(!Number.isSafeInteger(receipt?.revision)||receipt.revision<=lastRevision)return;
        lastRevision=receipt.revision;
        queue=queue.then(async()=>{
          if(session!==run)return;
          onStatus('Hearing '+receipt.from_id+' → '+receipt.to_id);
          await playCellReturn(receipt,{scope,signal:run.controller.signal,output:run.output});
          if(session===run)onStatus(quiet);
        }).catch(()=>{
          if(session===run)stop('Listening stopped. The cell sound could not play.');
        });
      });
      run.stream.addEventListener('feather',()=>{
        if(session!==run)return;
        stop('Feather held. Listening stopped.');
        onFeather();
      });
      run.stream.addEventListener('error',()=>{
        if(session===run)stop('Live connection closed. Choose Listen to reconnect.');
      });
    }catch{
      if(session===run)stop('Live cell sound could not start.');
    }
  }

  return {
    start,stop,isActive:()=>Boolean(session),
    setVolume(value){volume=Math.max(0,Math.min(.6,Number(value)||0));updateGain();},
    setMuted(value){muted=Boolean(value);updateGain();},
  };
}
