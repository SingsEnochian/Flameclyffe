import {
  createAcousticReturn, renderAcousticFrames, hearAcousticFrames,
  receiveAcousticFrame, isAcousticAcknowledgement,
} from '../../../lib/wyrdrune/acoustic-cell.mjs';

export const CELL_ECOLOGY_AUDIO_SCHEMA='wayglass.cell-acoustic-return/v0.1';

const stopped=signal=>{
  if(signal?.aborted)throw signal.reason||new Error('Feather stopped the cell sound');
};

/** One Wyrdrune-addressed Return/ACK pair. The textual observation never travels in sound. */
export async function prepareCellAcousticReturn(receipt,{signal}={}){
  stopped(signal);
  if(receipt?.schema!=='wayglass.cell-exchange/v0.1'||
     receipt.status!=='delivered-in-memory'||receipt.acoustic?.encoding!=='marker-and-open-status-only')
    throw new TypeError('A verified, locally delivered cell observation receipt is required');
  const {request,reply}=receipt.acoustic;
  const checked=createAcousticReturn({
    sender:request?.sender,recipient:request?.recipient,
    marker:request?.marker,resolution:request?.resolution,
  });
  if(reply?.kind!==2||!isAcousticAcknowledgement(reply,{...checked,kind:1})||
     reply.resolution!==checked.resolution)
    throw new TypeError('Acoustic acknowledgement failed address or Return verification');
  const response=await receiveAcousticFrame(checked.recipient,checked,{signal});
  stopped(signal);
  if(!response.reply||!isAcousticAcknowledgement(response.reply,checked)||
     response.reply.resolution!==reply.resolution)
    throw new TypeError('The native Wyrdrune cell did not acknowledge this Return');
  const waveform=renderAcousticFrames([checked,response.reply]);
  const heard=hearAcousticFrames(waveform.channels[0],waveform.sampleRate);
  if(heard.length!==2||!isAcousticAcknowledgement(heard[1],heard[0])||
     heard[0].marker!==checked.marker||heard[0].sender!==checked.sender||
     heard[0].recipient!==checked.recipient)
    throw new Error('Acoustic frames failed to round-trip through the native decoder');
  return {
    schema:CELL_ECOLOGY_AUDIO_SCHEMA,marker:checked.marker,
    sender:checked.sender,recipient:checked.recipient,
    spoken_text_encoded:false,withness_beat_hz:3,
    waveform,received:heard,physical_device_transfer_verified:false,
  };
}

/** User-gesture-only local playback. No microphone, capture or provider call. */
export async function playCellReturn(receipt,{scope=globalThis,signal,output}={}){
  stopped(signal);
  const Context=scope.AudioContext||scope.webkitAudioContext;
  if(!output&&typeof Context!=='function')throw new Error('Web Audio is unavailable on this device');
  const context=output?.context??new Context();
  let source=null;
  let gain=null;
  try{
    if(!output)await context.resume();
    stopped(signal);
    const prepared=await prepareCellAcousticReturn(receipt,{signal});
    stopped(signal);
    const pcm=prepared.waveform;
    const buffer=context.createBuffer(pcm.channels.length,pcm.channels[0].length,pcm.sampleRate);
    for(let i=0;i<pcm.channels.length;i++)buffer.copyToChannel(pcm.channels[i],i);
    source=context.createBufferSource();
    source.buffer=buffer;
    if(output)source.connect(output);
    else{
      gain=context.createGain();
      gain.gain.value=0.6;
      source.connect(gain);gain.connect(context.destination);
    }
    await new Promise((resolve,reject)=>{
      let done=false;
      const finish=error=>{
        if(done)return;done=true;
        signal?.removeEventListener('abort',onAbort);
        source.onended=null;
        if(error)reject(error);else resolve();
      };
      const onAbort=()=>{
        try{source.stop();}catch{}
        finish(signal?.reason||new Error('Feather stopped cell sound'));
      };
      source.onended=()=>finish();
      signal?.addEventListener('abort',onAbort,{once:true});
      if(signal?.aborted){onAbort();return}
      try{source.start()}catch(error){finish(error)}
    });
    return {
      schema:CELL_ECOLOGY_AUDIO_SCHEMA,played:true,
      marker:prepared.marker,withness_beat_hz:3,
      physical_device_transfer_verified:false,
    };
  } finally {
    try{source?.disconnect()}catch{}
    try{gain?.disconnect?.()}catch{}
    try{if(!output&&context.state!=='closed')await context.close()}catch{}
  }
}
