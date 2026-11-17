import {createWyrdruneRuntime} from './wyrdrune/runtime.mjs';

const voices = Object.freeze({
  wood: {partials:[[1,.65],[2.76,.19],[5.4,.10]],attack:.007,release:.09,decay:10},
  glass: {partials:[[1,.66],[2.01,.19],[3.98,.08]],attack:.009,release:.23,decay:1.7},
  wash: {partials:[[1,.70],[2,.16],[3,.07]],attack:.22,release:.42,decay:.10},
  hearth: {partials:[[1,.64],[2,.22],[3,.10]],attack:.045,release:.21,decay:2.1},
  light: {partials:[[1,.66],[2.02,.21],[3,.08]],attack:.055,release:.32,decay:1.3},
});
const within = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;
const sampleRate = 24000;

// Timings, pitches and level come from Wyrdrune. This projection assigns the
// named timbres and renders their envelopes onto a common clock.
export async function renderWyrdruneTimedScore(source) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(source));
  const hash = [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
  const runtime = createWyrdruneRuntime({hashSource:()=>hash});
  const result = await runtime.execute(runtime.compile(source),{maxOperations:1600});
  const score = result.output[0];
  const notes = score?.sections?.flat();
  if (result.withness?.completedCycles !== 2 || result.receipts.length !== 16 ||
      result.output.length !== 1 || score?.schema !== 'wayglass.timed-score/v1' ||
      typeof score.title !== 'string' || !within(score.duration,1,45) ||
      !Array.isArray(notes) || notes.length < 1 || notes.length > 48 ||
      notes.some(note=>!note || !Object.hasOwn(voices,note.voice) ||
        !within(note.at,0,score.duration) || !within(note.length,.03,8) ||
        note.at + note.length > score.duration || !within(note.pitch,70,1200) ||
        !within(note.destination,70,1200) || !within(note.level,0,.15))) {
    throw new TypeError('Wyrdrune returned an invalid timed score.');
  }
  const samples = new Float32Array(Math.ceil(score.duration * sampleRate));
  for (const {voice,at,length,pitch,destination,level} of notes) {
    const {partials,attack,release,decay} = voices[voice];
    const start = Math.round(at * sampleRate);
    const count = Math.min(Math.round(length * sampleRate),samples.length-start);
    for (let i=0; i<count; i++) {
      const seconds = i/sampleRate;
      const phase = 2*Math.PI*(pitch*seconds + (destination-pitch)*seconds*seconds/(2*length));
      const fade = Math.min(1,seconds/attack,(count-1-i)/(sampleRate*release));
      const envelope = fade*fade*Math.exp(-seconds*decay);
      let wave=0;
      for (const [ratio,mix] of partials) wave += mix*Math.sin(phase*ratio);
      samples[start+i] += level*envelope*wave;
    }
  }
  return {title:score.title,samples,sampleRate,hash,notes};
}
