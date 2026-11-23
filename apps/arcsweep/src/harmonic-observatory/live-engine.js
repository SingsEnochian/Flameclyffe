/** Möbius-compatible, user-invoked Web Audio audition transport.
 * No Spotify capture, network sink, output-device override, firmware access or autoplay.
 */
import {compileArrangement} from './core.js';
export class HarmonicAudioEngine {
  constructor({createContext=()=>new (globalThis.AudioContext||globalThis.webkitAudioContext)({latencyHint:'interactive'})}={}) {
    this.createContext=createContext;
    this.context=null;
    this.outputGain=null;
    this.analyser=null;
    this.active=[];
    this.startedAt=null;
    this.state='idle';
  }
  async arm(){
    if(!this.context || this.context.state==='closed'){
      this.context=this.createContext();
      this.outputGain=this.context.createGain();
      this.outputGain.gain.value=0;
      this.analyser=this.context.createAnalyser();
      this.analyser.fftSize=2048;
      // This compressor is a rehearsal dynamics guard, NOT a true-peak limiter.
      this.guard=this.context.createDynamicsCompressor();
      this.guard.threshold.value=-12;this.guard.knee.value=8;
      this.guard.ratio.value=6;this.guard.attack.value=0.003;this.guard.release.value=0.18;
      this.outputGain.connect(this.analyser);
      this.analyser.connect(this.guard);
      this.guard.connect(this.context.destination);
    }
    if(this.context.state==='suspended') await this.context.resume();
    this.state='armed';
    return this.state;
  }
  async audition(session){
    const arrangement=compileArrangement(session);
    await this.arm(); // Caller MUST invoke audition from user gesture.
    this.feather();
    const ctx=this.context,start=ctx.currentTime+0.03;
    const end=start+session.duration_seconds;
    const out=ctx.createGain();
    out.gain.value=1;
    let destination=out;
    const nodes=[out];
    if(arrangement.modulation){
      const m=arrangement.modulation;
      const am=ctx.createGain();
      am.gain.setValueAtTime(1/(1+m.depth),start);
      const lfo=ctx.createOscillator();lfo.type='sine';lfo.frequency.value=m.rate_hz;
      const depth=ctx.createGain();depth.gain.value=m.depth/(1+m.depth);
      lfo.connect(depth);depth.connect(am.gain);
      out.connect(am);am.connect(this.outputGain);
      lfo.start(start);lfo.stop(end+0.05);
      nodes.push(am,depth,lfo);destination=out;
    } else out.connect(this.outputGain);
    for(const spec of arrangement.oscillators){
      const osc=ctx.createOscillator();osc.type='sine';osc.frequency.setValueAtTime(spec.hz,start);
      const gain=ctx.createGain();gain.gain.setValueAtTime(0,start);
      const peak=spec.gain*session.master_gain;
      const rise=Math.min(session.fade_seconds,session.duration_seconds/3);
      gain.gain.linearRampToValueAtTime(peak,start+rise);
      gain.gain.setValueAtTime(peak,Math.max(start+rise,end-session.fade_seconds));
      gain.gain.linearRampToValueAtTime(0,end);
      osc.connect(gain);
      if(arrangement.channels===2){
        const pan=ctx.createStereoPanner();pan.pan.setValueAtTime(spec.pan,start);
        gain.connect(pan);pan.connect(destination);nodes.push(pan);
      } else gain.connect(destination);
      osc.start(start);osc.stop(end+0.05);nodes.push(osc,gain);
    }
    this.active=nodes;
    this.outputGain.gain.cancelScheduledValues(ctx.currentTime);
    this.outputGain.gain.setValueAtTime(0,ctx.currentTime);
    this.outputGain.gain.linearRampToValueAtTime(1,start+0.035);
    this.startedAt=start;
    this.state='auditioning';
    return {state:this.state,scheduled_at:start,ends_at:end,device_profile:session.device_profile,
      channels:arrangement.channels,playing_via:'browser-default-output'};
  }
  measureFrame(){
    if(!this.analyser) return null;
    const samples=new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(samples);
    let square=0,peak=0;
    for(const x of samples){square+=x*x;peak=Math.max(peak,Math.abs(x));}
    return {rms:Math.sqrt(square/samples.length),sample_peak:peak,
      authority:'browser-postmix-monitor',not_integrated_lufs:true};
  }
  feather(){
    const now=this.context?.currentTime||0;
    if(this.outputGain){
      this.outputGain.gain.cancelScheduledValues(now);
      this.outputGain.gain.setValueAtTime(0,now);
    }
    for(const node of this.active){
      try{node.stop?.(now);}catch{}
      try{node.disconnect?.();}catch{}
    }
    this.active=[];this.state=this.context?'armed':'idle';this.startedAt=null;
    return this.state;
  }
  async close(){
    this.feather();
    const old=this.context;
    this.context=null;this.outputGain=null;this.analyser=null;
    if(old && old.state!=='closed') await old.close();
    this.state='closed';
  }
}