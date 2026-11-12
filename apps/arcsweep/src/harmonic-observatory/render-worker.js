import {renderOffline} from './renderer.js';
import {analyseSpectrum} from './fft.js';
self.onmessage=async(event)=>{
  const {id,session}=event.data || {};
  try{
    const {bytes,receipt,channels}=await renderOffline(session);
    receipt.measurements.spectrum=channels.map(c=>analyseSpectrum(c,receipt.format.sample_rate_hz));
    const stride=Math.max(1,Math.floor(channels[0].length/512));
    const preview=channels.map(channel=>Array.from({length:512},(_,i)=>channel[Math.min(channel.length-1,i*stride)]));
    self.postMessage({id,ok:true,bytes:bytes.buffer,receipt,preview},[bytes.buffer]);
  }catch(error){self.postMessage({id,ok:false,error:String(error?.message||error)});}
};