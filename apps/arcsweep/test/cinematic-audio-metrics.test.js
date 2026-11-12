import test from 'node:test';
import assert from 'node:assert/strict';
import {spectralEntropy,dominantBinFrequency,rms,samplePeak,stereoCorrelation,measureAudioFrame} from '../src/cinematic-audio-metrics.js';
test('entropy is zero for one occupied bin and one for flat power',()=>{
 assert.equal(spectralEntropy([0,10,0,0]),0);
 assert.ok(Math.abs(spectralEntropy([1,1,1,1])-1)<1e-12);
 assert.equal(spectralEntropy([0,0,0]),null);
});
test('FFT peak frequency is correctly labelled as a bin, not a fundamental',()=>{
 assert.equal(dominantBinFrequency([0,0,5,1],48000,1024),93.75);
 assert.equal(dominantBinFrequency([0,0,0],48000,1024),null);
});
test('stereo correlation distinguishes in-phase, inverted and silent',()=>{
 assert.equal(stereoCorrelation([1,-1,1,-1],[1,-1,1,-1]),1);
 assert.equal(stereoCorrelation([1,-1,1,-1],[-1,1,-1,1]),-1);
 assert.equal(stereoCorrelation([0,0],[0,0]),null);
});
test('frame does not invent loudness, roughness or health measurements',()=>{
 const result=measureAudioFrame({sourceId:'fixture-1',powerSpectrum:[0,4,0],sampleRate:48000,fftSize:8,left:[0.5,-0.5],right:[0.5,-0.5]});
 assert.equal(result.dominant_bin_hz,6000);
 assert.equal(result.integrated_lufs,null);
 assert.equal(result.true_peak_dbtp,null);
 assert.equal(result.acoustic_roughness,null);
 assert.equal(result.system_health,null);
 assert.equal(rms([1,-1]),1);
 assert.equal(samplePeak([0.2,-0.8]),0.8);
});
