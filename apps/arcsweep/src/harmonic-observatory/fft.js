/** Windowed real-to-complex radix-2 FFT, pure JS. Values are linear power, not decibels. */
import {spectralEntropy,dominantBinFrequency} from '../cinematic-audio-metrics.js';
const assert=(ok,m)=>{if(!ok)throw new RangeError(m);};
export function powerSpectrum(samples, fftSize=2048){
  assert(Number.isInteger(fftSize)&&fftSize>=16&&fftSize<=16384&&(fftSize&(fftSize-1))===0,'FFT size must be power-of-two 16..16384');
  assert(samples?.length>=fftSize,'need full FFT window');
  const real=new Float64Array(fftSize),imag=new Float64Array(fftSize);
  const offset=Math.floor((samples.length-fftSize)/2);
  for(let i=0;i<fftSize;i++){
    const x=samples[offset+i];assert(Number.isFinite(x),'finite samples required');
    real[i]=x*(0.5-0.5*Math.cos(2*Math.PI*i/(fftSize-1)));
  }
  for(let i=1,j=0;i<fftSize;i++){
    let bit=fftSize>>1;
    for(;j&bit;bit>>=1)j^=bit;
    j^=bit;
    if(i<j){[real[i],real[j]]=[real[j],real[i]];}
  }
  for(let len=2;len<=fftSize;len*=2){
    const angle=-2*Math.PI/len,wr0=Math.cos(angle),wi0=Math.sin(angle);
    for(let i=0;i<fftSize;i+=len){
      let wr=1,wi=0;
      for(let j=0;j<len/2;j++){
        const a=i+j,b=a+len/2,vr=real[b]*wr-imag[b]*wi,vi=real[b]*wi+imag[b]*wr;
        const ur=real[a],ui=imag[a];
        real[a]=ur+vr;imag[a]=ui+vi;real[b]=ur-vr;imag[b]=ui-vi;
        const nextR=wr*wr0-wi*wi0;
        wi=wr*wi0+wi*wr0;wr=nextR;
      }
    }
  }
  const power=new Float64Array(fftSize/2+1);
  for(let k=0;k<power.length;k++)power[k]=real[k]**2+imag[k]**2;
  return power;
}
export function analyseSpectrum(channel,sampleRate){
  const fftSize=Math.min(2048,2**Math.floor(Math.log2(channel.length)));
  const spectrum=powerSpectrum(channel,fftSize);
  return {fft_size:fftSize,fft_bin_width_hz:sampleRate/fftSize,
    dominant_bin_hz:dominantBinFrequency(spectrum,sampleRate,fftSize),
    spectral_entropy:spectralEntropy(spectrum)};
}