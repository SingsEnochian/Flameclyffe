// Explicit, low-gain, bounded user-invoked Web Audio audition.
// No system-output selection, Osia processing, recording or physical claims.
export function createFrameAudition({ contextFactory = null, clock = globalThis } = {}) {
  let active=null;
  const makeContext=()=> {
    if(contextFactory) return contextFactory();
    const Context=clock.AudioContext||clock.webkitAudioContext;
    if(!Context) throw new Error('Web Audio is unavailable in this browser.');
    return new Context();
  };
  async function stop() {
    if(!active) return;
    const current=active;
    active=null;
    if(current.timer) clock.clearTimeout(current.timer);
    for(const oscillator of current.oscillators) {
      try { oscillator.stop(); } catch {}
      try { oscillator.disconnect(); } catch {}
    }
    for(const node of current.nodes) try { node.disconnect(); } catch {}
    try { await current.context.close(); } catch {}
  }
  async function play(cues, { stereo=false, spacingMs=170 }={}) {
    if(!Array.isArray(cues)||!cues.length||cues.length>33) throw new TypeError('Expected 1–33 bounded aural cues.');
    if(!Number.isFinite(spacingMs)||spacingMs<120||spacingMs>500) throw new RangeError('Unsafe or unsupported spacing.');
    await stop();
    const context=makeContext();
    const session={ context, oscillators:[],nodes:[],timer:null };
    active=session;
    try {
      if(context.state==='suspended'&&typeof context.resume==='function') await context.resume();
      const start=context.currentTime+0.04;
      cues.forEach((cue,i)=>{
        if(!Number.isFinite(cue.frequency_hz)||cue.frequency_hz<180||cue.frequency_hz>430
            || !Number.isFinite(cue.gain)||cue.gain<0||cue.gain>0.022
            || !Number.isFinite(cue.duration_ms)||cue.duration_ms>170||cue.duration_ms<40) throw new TypeError('Audition cue outside bounded limits.');
        const startAt=start+i*spacingMs/1000;
        // The extra fold note is a labelled model marker, not a claim of real-world anomaly.
        const frequencies=cue.marker==='MODEL_FOLD'?[cue.frequency_hz,cue.frequency_hz*0.75]:[cue.frequency_hz];
        frequencies.forEach((frequency,j)=>{
          const at=startAt+j*0.065;
          const oscillator=context.createOscillator();
          const envelope=context.createGain();
          oscillator.type='sine';
          oscillator.frequency.setValueAtTime(frequency,at);
          envelope.gain.setValueAtTime(0,at);
          envelope.gain.linearRampToValueAtTime(cue.gain/Math.sqrt(frequencies.length),at+0.016);
          envelope.gain.setValueAtTime(cue.gain/Math.sqrt(frequencies.length),at+0.06);
          envelope.gain.linearRampToValueAtTime(0,at+cue.duration_ms/1000);
          oscillator.connect(envelope);
          if(stereo&&typeof context.createStereoPanner==='function'){
            const panner=context.createStereoPanner();
            panner.pan.setValueAtTime(cue.pan,at);
            envelope.connect(panner);panner.connect(context.destination);session.nodes.push(panner);
          }else envelope.connect(context.destination);
          oscillator.start(at);oscillator.stop(at+cue.duration_ms/1000);
          session.oscillators.push(oscillator);session.nodes.push(envelope);
        });
      });
      const totalMs=(cues.length-1)*spacingMs+360;
      session.timer=clock.setTimeout(()=>{if(active===session)void stop();},totalMs);
      return Object.freeze({ scheduled:true, cues:cues.length, duration_ms:totalMs, stereo:Boolean(stereo), device_verified:false });
    } catch(error) {await stop();throw error;}
  }
  return Object.freeze({play,stop,get active(){return Boolean(active);}});
}
