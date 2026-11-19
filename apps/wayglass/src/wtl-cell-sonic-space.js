// Continuous-frequency WTL sonic representation, independent of speaker limits.
// Musical relationships are ratios, not mandatory semitone grids.
export function sonicPitch(hz,{timbre='sine',amplitude=0.2}={}){
 if(typeof hz!=='number'||!Number.isFinite(hz)||hz<=0||hz>1e12)throw Error('Invalid positive frequency');
 if(!['sine','triangle','sawtooth','square'].includes(timbre))throw Error('Invalid timbre');
 if(!Number.isFinite(amplitude)||amplitude<0||amplitude>1)throw Error('Invalid amplitude');
 return Object.freeze({schema:'wayglass.wtl.sonic-pitch.v1',hz,timbre,amplitude});
}
export function transposeRatio(pitch,numerator,denominator=1){
 if(!Number.isSafeInteger(numerator)||!Number.isSafeInteger(denominator)||numerator<1||denominator<1||numerator>1000000||denominator>1000000)throw Error('Invalid ratio');
 return sonicPitch(pitch.hz*numerator/denominator,{timbre:pitch.timbre,amplitude:pitch.amplitude});
}
// Only an audible projection; never replace the original frequency in receipts.
export function projectAudible(pitch,{minHz=40,maxHz=16000}={}){
 if(!pitch||pitch.schema!=='wayglass.wtl.sonic-pitch.v1'||!Number.isFinite(pitch.hz)||pitch.hz<=0)throw Error('Invalid pitch');
 if(!Number.isFinite(minHz)||!Number.isFinite(maxHz)||minHz<=0||maxHz<=minHz)throw Error('Invalid output range');
 let hz=pitch.hz,octaves=0;
 while(hz<minHz){hz*=2;octaves++}
 while(hz>maxHz){hz/=2;octaves--}
 return Object.freeze({originalHz:pitch.hz,audibleHz:hz,octaveShift:octaves,projected:octaves!==0,
  timbre:pitch.timbre,amplitude:pitch.amplitude});
}
export function replyByRatio(call,{numerator=3,denominator=2}={}){
 return transposeRatio(call,numerator,denominator);
}
