// Wayglass / Mythiences cinematic audio metrics.
// Pure functions: no AudioContext, no device routing, no hidden playback.
// Attribution: corrected engineering adaptation of Atlas's proposed resonance bridge.
export const CINEMATIC_AUDIO_METRICS_SCHEMA = 'wayglass.cinematic-audio-metrics/v1';

function assertSpectrum(spectrum) {
  if (!Array.isArray(spectrum) && !(spectrum instanceof Float32Array) && !(spectrum instanceof Float64Array)) {
    throw new TypeError('spectrum must be an array of finite nonnegative linear power values');
  }
  if (!spectrum.length || Array.from(spectrum).some(x => !Number.isFinite(x) || x < 0)) {
    throw new RangeError('power spectrum must be nonempty, finite and nonnegative');
  }
}
export function spectralEntropy(powerSpectrum, { normalised = true } = {}) {
  assertSpectrum(powerSpectrum);
  const sum = Array.from(powerSpectrum).reduce((a,b) => a+b, 0);
  if (sum === 0) return null; // Silence has no measured spectral distribution.
  let entropy = 0;
  for (const power of powerSpectrum) {
    if (power > 0) {
      const p = power / sum;
      entropy -= p * Math.log(p);
    }
  }
  return normalised && powerSpectrum.length > 1 ? entropy / Math.log(powerSpectrum.length) : entropy;
}
export function dominantBinFrequency(powerSpectrum, sampleRate, fftSize) {
  assertSpectrum(powerSpectrum);
  if (!(Number.isFinite(sampleRate) && sampleRate > 0 && Number.isInteger(fftSize) && fftSize >= 2)) {
    throw new RangeError('valid sample rate and FFT size required');
  }
  if (powerSpectrum.length > Math.floor(fftSize / 2) + 1) throw new RangeError('spectrum exceeds FFT bins');
  if (Array.from(powerSpectrum).every(x => x === 0)) return null;
  let bin = 0;
  for (let i=1;i<powerSpectrum.length;i++) if (powerSpectrum[i] > powerSpectrum[bin]) bin=i;
  return bin * sampleRate / fftSize; // Dominant FFT bin, NOT guaranteed fundamental frequency.
}
export function rms(samples) {
  if (!samples?.length || Array.from(samples).some(x=>!Number.isFinite(x))) throw new RangeError('finite samples required');
  return Math.sqrt(Array.from(samples).reduce((a,x)=>a+x*x,0)/samples.length);
}
export function samplePeak(samples) {
  if (!samples?.length || Array.from(samples).some(x=>!Number.isFinite(x))) throw new RangeError('finite samples required');
  return Math.max(...Array.from(samples,Math.abs));
}
export function stereoCorrelation(left,right) {
  if (!left?.length || left.length !== right?.length) throw new RangeError('matching nonempty channels required');
  const l=Array.from(left),r=Array.from(right);
  if ([...l,...r].some(x=>!Number.isFinite(x))) throw new RangeError('finite samples required');
  const ml=l.reduce((a,b)=>a+b,0)/l.length,mr=r.reduce((a,b)=>a+b,0)/r.length;
  let cov=0,ll=0,rr=0;
  for(let i=0;i<l.length;i++){const a=l[i]-ml,b=r[i]-mr;cov+=a*b;ll+=a*a;rr+=b*b;}
  return ll===0 || rr===0 ? null : Math.max(-1,Math.min(1,cov/Math.sqrt(ll*rr)));
}
export function measureAudioFrame({powerSpectrum,sampleRate,fftSize,left,right,sourceId}) {
  if (typeof sourceId!=='string'||!sourceId.trim()) throw new TypeError('sourceId required');
  return Object.freeze({
    schema:CINEMATIC_AUDIO_METRICS_SCHEMA,
    authority:'measured-audio-frame',
    source_id:sourceId,
    spectral_entropy:spectralEntropy(powerSpectrum),
    dominant_bin_hz:dominantBinFrequency(powerSpectrum,sampleRate,fftSize),
    stereo_correlation:stereoCorrelation(left,right),
    left_rms:rms(left),right_rms:rms(right),
    left_sample_peak:samplePeak(left),right_sample_peak:samplePeak(right),
    true_peak_dbtp:null, integrated_lufs:null, acoustic_roughness:null,
    system_health:null,
    note:'No FFT-bin estimate is labelled fundamental; unmeasured professional metrics remain null.'
  });
}
