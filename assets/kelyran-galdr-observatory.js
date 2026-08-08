/* Kelyran Galdr Observatory v0.1
 * Voice measurement + myth/science bridge for Runa/Wardenclyffe/Mobius/Heimdall.
 * Does not invent Kelyran lexemes or frequencies. Canon registry is injected.
 */
(function (global) {
  'use strict';

  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number(x)||0));
  const cents=(f,ref)=>1200*Math.log2(f/ref);

  class KelyranGaldrObservatory {
    constructor({frequencyRegistry={}, lexicon={}, onFrame=()=>{}}={}) {
      this.frequencyRegistry=frequencyRegistry;
      this.lexicon=lexicon;
      this.onFrame=onFrame;
      this.ctx=null; this.stream=null; this.analyser=null; this.source=null;
      this.running=false; this.raf=0; this.history=[];
    }

    setFrequencyRegistry(registry){ this.frequencyRegistry=registry||{}; }
    setLexicon(lexicon){ this.lexicon=lexicon||{}; }

    validateKelyran(tokens=[]) {
      return tokens.map(token=>({token, known:Boolean(this.lexicon[token]), entry:this.lexicon[token]||null}));
    }

    nearestMappedFrequency(hz) {
      const entries=Object.entries(this.frequencyRegistry)
        .map(([id,v])=>({id, ...(typeof v==='number'?{frequency:v}:v)}))
        .filter(x=>Number.isFinite(x.frequency)&&x.frequency>0);
      if(!entries.length||!hz) return null;
      return entries.map(x=>({...x,cents:cents(hz,x.frequency)}))
        .sort((a,b)=>Math.abs(a.cents)-Math.abs(b.cents))[0];
    }

    estimatePitch(buffer,sampleRate) {
      let rms=0; for(const x of buffer) rms+=x*x; rms=Math.sqrt(rms/buffer.length);
      if(rms<0.008) return {hz:null,rms};
      const minLag=Math.floor(sampleRate/1000), maxLag=Math.min(Math.floor(sampleRate/55),buffer.length-2);
      let bestLag=0,best=-Infinity;
      for(let lag=minLag;lag<=maxLag;lag++){
        let sum=0; for(let i=0;i<buffer.length-lag;i++) sum+=buffer[i]*buffer[i+lag];
        if(sum>best){best=sum;bestLag=lag;}
      }
      return {hz:bestLag?sampleRate/bestLag:null,rms};
    }

    temporal369(tSeconds, voicePulseHz=0) {
      const phase=n=>(2*Math.PI*n*tSeconds)%(2*Math.PI);
      const p3=phase(3),p6=phase(6),p9=phase(9);
      const coherence=voicePulseHz>0 ? [3,6,9].map(n=>Math.cos(2*Math.PI*(voicePulseHz-n)*tSeconds)) : [0,0,0];
      return {phase3:p3,phase6:p6,phase9:p9,coherence369:coherence.reduce((a,b)=>a+b,0)/3};
    }

    async start(){
      if(this.running)return;
      this.ctx=this.ctx||new (global.AudioContext||global.webkitAudioContext)({latencyHint:'interactive'});
      this.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
      this.source=this.ctx.createMediaStreamSource(this.stream);
      this.analyser=this.ctx.createAnalyser(); this.analyser.fftSize=4096;
      this.source.connect(this.analyser); this.running=true;
      const time=new Float32Array(this.analyser.fftSize);
      const tick=()=>{
        if(!this.running)return;
        this.analyser.getFloatTimeDomainData(time);
        const pitch=this.estimatePitch(time,this.ctx.sampleRate);
        const mapped=this.nearestMappedFrequency(pitch.hz);
        const temporal=this.temporal369(this.ctx.currentTime);
        const frame={timestamp:Date.now(),fundamentalHz:pitch.hz,rms:pitch.rms,mapped,temporal};
        this.history.push(frame); if(this.history.length>2048)this.history.shift();
        this.onFrame(frame); this.raf=requestAnimationFrame(tick);
      }; tick();
    }

    stop(){
      this.running=false; cancelAnimationFrame(this.raf);
      this.stream?.getTracks().forEach(t=>t.stop()); this.source?.disconnect(); this.analyser?.disconnect();
    }

    heimdallProjection(frame,{softMode=null,usParticipation=null,galdrVector=null}={}){
      let alignment=null;
      if(Array.isArray(softMode)&&Array.isArray(galdrVector)&&softMode.length===galdrVector.length){
        const dot=softMode.reduce((s,x,i)=>s+x*galdrVector[i],0);
        const a=Math.sqrt(softMode.reduce((s,x)=>s+x*x,0));
        const b=Math.sqrt(galdrVector.reduce((s,x)=>s+x*x,0));
        alignment=a&&b?Math.abs(dot)/(a*b):null;
      }
      return {...frame,softModeAlignment:alignment,usParticipation:Number.isFinite(usParticipation)?clamp(usParticipation):null,galdrUsExcitation:alignment!=null&&Number.isFinite(usParticipation)?alignment*clamp(usParticipation):null};
    }
  }

  global.KelyranGaldrObservatory=KelyranGaldrObservatory;
})(window);
