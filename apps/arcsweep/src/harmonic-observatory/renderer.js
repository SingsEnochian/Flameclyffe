/** Deterministic 48 kHz 16-bit PCM offline renderer. No playback, device access or remote writes. */
import {compileArrangement,OBSERVATORY_RECEIPT_SCHEMA,RENDERER_VERSION,MATH_SPINE} from './core.js';
import {rms,samplePeak,stereoCorrelation} from '../cinematic-audio-metrics.js';
const TAU=2*Math.PI;
const bounded=(v)=>Math.max(-1,Math.min(1,v));
function amplitudeEnvelope(n, frames, fadeFrames) {
  return Math.max(0,Math.min(1,n/fadeFrames,(frames-1-n)/fadeFrames));
}
function sampleFor(osc,t){return osc.gain*Math.sin(TAU*osc.hz*t);}
function splitStereo(sample,pan){ // true hard-pan at ±1; unity centre for predictable mono sum
  return [sample*Math.sqrt((1-pan)*0.5),sample*Math.sqrt((1+pan)*0.5)];
}
export function renderSamples(session) {
  const a=compileArrangement(session), count=Math.round(session.duration_seconds*a.sample_rate_hz);
  const left=new Float32Array(count),right=new Float32Array(count);
  const fadeFrames=session.fade_seconds*a.sample_rate_hz;
  const norm=session.mode==='mono-am'?1/(1+session.modulation_depth):1;
  for(let n=0;n<count;n++){
    const t=n/a.sample_rate_hz;
    const env=amplitudeEnvelope(n,count,fadeFrames)*session.master_gain;
    const modulation=a.modulation?(1+a.modulation.depth*Math.sin(TAU*a.modulation.rate_hz*t))*norm:1;
    let l=0,r=0;
    for(const osc of a.oscillators){
      const value=sampleFor(osc,t)*env*modulation;
      if(a.channels===1){l+=value;continue;}
      const sides=splitStereo(value,osc.pan);
      l+=sides[0];r+=sides[1];
    }
    // Mono reference is actual mono, not a silent second channel.
    left[n]=bounded(l);
    if(a.channels===2) right[n]=bounded(r);
  }
  return {arrangement:a,channels:a.channels===1?[left]:[left,right],frames:count};
}
function wav16(channels,sampleRate) {
  const count=channels[0].length,nChannels=channels.length,bytes=44+count*nChannels*2;
  const buffer=new ArrayBuffer(bytes),view=new DataView(buffer);
  const writeAscii=(offset,s)=>{for(let i=0;i<s.length;i++)view.setUint8(offset+i,s.charCodeAt(i));};
  writeAscii(0,'RIFF');view.setUint32(4,bytes-8,true);writeAscii(8,'WAVE');
  writeAscii(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);
  view.setUint16(22,nChannels,true);view.setUint32(24,sampleRate,true);
  view.setUint32(28,sampleRate*nChannels*2,true);view.setUint16(32,nChannels*2,true);
  view.setUint16(34,16,true);writeAscii(36,'data');view.setUint32(40,bytes-44,true);
  const quantized=channels.map(()=>new Float32Array(count));
  for(let i=0;i<count;i++)for(let ch=0;ch<nChannels;ch++){
    const v=bounded(channels[ch][i]);
    const q=Math.max(-32768,Math.min(32767,Math.round(v*32767)));
    view.setInt16(44+(i*nChannels+ch)*2,q,true);quantized[ch][i]=q/32768;
  }
  return {bytes:new Uint8Array(buffer),quantized};
}
async function digest(bytes) {
  if(!globalThis.crypto?.subtle) throw new Error('SHA-256 Web Crypto unavailable: render receipt cannot be verified');
  return Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
}
function mean(array){let s=0;for(const v of array)s+=v;return s/array.length;}
export async function renderOffline(session){
  const inputText=JSON.stringify(session);
  const {arrangement,channels,frames}=renderSamples(session);
  const result=wav16(channels,arrangement.sample_rate_hz);
  const metrics={sample_peak:result.quantized.map(samplePeak),rms:result.quantized.map(rms),
    dc_offset:result.quantized.map(mean),stereo_correlation:result.quantized.length===2?stereoCorrelation(...result.quantized):null,
    integrated_lufs:null,true_peak_dbtp:null,acoustic_roughness:null};
  const [inputHash,waveHash]=await Promise.all([digest(new TextEncoder().encode(inputText)),digest(result.bytes)]);
  const receipt={
    schema:OBSERVATORY_RECEIPT_SCHEMA,session_id:session.session_id,
    source_id:session.source_id,math_spine:MATH_SPINE,renderer_id:RENDERER_VERSION,
    state:'offline-rendered',input_sha256:inputHash,wave_sha256:waveHash,
    format:{sample_rate_hz:arrangement.sample_rate_hz,bit_depth:16,channels:arrangement.channels,frames},
    profile:session.device_profile,mode:session.mode,measurements:metrics,
    provenance:{source_domain:session.domain,observed:'generated PCM',symbolic:session.mythic,
      binaural_claim:arrangement.claims.binaural,verified_device_playback:false},
    continuity:JSON.parse(JSON.stringify(session.continuity)),
    unresolved_alternatives:['Device playback, calibrated loudness and subjective experience not measured by this offline render.']
  };
  return {bytes:result.bytes,receipt,channels:result.quantized};
}