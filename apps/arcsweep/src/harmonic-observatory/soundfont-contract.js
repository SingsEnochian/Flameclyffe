/** Pure SoundFont attachment and three-voice MIDI contract for Wayglass.
 * Bank bytes stay browser-local; a file selection is not a persistent identity or a sound receipt.
 */
import { validateSession } from './core.js';

export const SOUNDFONT_RACK_SCHEMA = 'wayglass.harmonic-observatory.soundfont-rack/v1';
export const SOUNDFONT_TAKE_SCHEMA = 'wayglass.harmonic-observatory.soundfont-take/v1';
export const MAX_BANKS = 8;
export const MAX_BANK_BYTES = 128 * 1024 * 1024;
export const BANK_EXTENSIONS = /\.(?:sf2|sf3|sfogg|dls)$/i;
export const KNOWN_BANKS = Object.freeze([
  {name:'VocalsPapel.sf2',historical_presets:4},
  {name:'Ancient Instruments Of The World.sf2.sf2',historical_presets:24},
  {name:'lord of the rings snes.sf2',historical_presets:28},
  {name:'Dystopian Terra.sf2',historical_presets:11},
  {name:'Bradbury.sf2',historical_presets:12},
]);

function must(test, message) { if (!test) throw new RangeError(message); }
export function checkSoundfontFile(file) {
  must(file && typeof file.name === 'string' && BANK_EXTENSIONS.test(file.name),'Only .sf2, .sf3, .sfogg or .dls SoundFonts are supported.');
  must(Number.isInteger(file.size) && file.size > 0 && file.size <= MAX_BANK_BYTES, 'SoundFont must be between 1 byte and 128 MiB.');
  must(typeof file.arrayBuffer === 'function', 'SoundFont requires a readable local File.');
  return {name:file.name,size:file.size,modified:Number.isFinite(file.lastModified)?file.lastModified:null};
}
export function presetKey(preset){
  must(preset && Number.isInteger(preset.bankMSB) && Number.isInteger(preset.bankLSB) && Number.isInteger(preset.program),'Invalid SoundFont preset.');
  must([preset.bankMSB,preset.bankLSB,preset.program].every(n=>n>=0 && n<=127), 'Out-of-range SoundFont bank/program.');
  return `${preset.isDrum?'D':'M'}:${preset.bankMSB}:${preset.bankLSB}:${preset.program}`;
}
export function midiForFrequency(frequency){
  must(Number.isFinite(frequency) && frequency>0,'Frequency must be positive.');
  return Math.max(0,Math.min(127,Math.round(69+12*Math.log2(frequency/440))));
}
const midiClamp = n=>Math.max(0,Math.min(127,Math.round(n)));
export function buildSoundfontPerformance(session, selectedPresets){
  validateSession(session);
  must(Array.isArray(selectedPresets) && selectedPresets.length===3,'A preset must be declared for each voice.');
  const voices=[];
  session.stems.forEach((stem, i)=>{
    if(!stem.enabled || stem.gain===0)return;
    const p=selectedPresets[i];
    must(p && !p.isDrum,'A melodic SF2 preset must be selected for each enabled voice.');
    const hz=session.root_hz*2**((stem.semitones+stem.detune_cents/100)/12);
    voices.push({
      stem_id:stem.id, channel:i, midi_note:midiForFrequency(hz), frequency_target_hz:hz,
      tuning:'12-TET MIDI nearest semitone; detune is rounded, not pitch-bent',
      velocity:midiClamp(35+stem.gain*165),
      expression:midiClamp(12+stem.gain*160),
      pan:midiClamp((stem.pan+1)*63.5),
      program:p.program,bankMSB:p.bankMSB,bankLSB:p.bankLSB,preset_name:String(p.name||'Unknown preset').slice(0,140),preset_key:presetKey(p),
    });
  });
  must(voices.length>0,'At least one audible voice is required.');
  return Object.freeze({schema:SOUNDFONT_RACK_SCHEMA,mode:'sample-based-midi-performance',source:'selected browser-local soundfont',voices,duration_seconds:session.duration_seconds,profile:session.device_profile});
}
export function createSoundfontTakeReceipt({bank,session,performance,createdAt=new Date().toISOString()}){
  must(bank && bank.loaded===true && typeof bank.sha256==='string' && /^[0-9a-f]{64}$/i.test(bank.sha256),'Only a verified loaded bank may produce a SoundFont take receipt.');
  must(performance?.schema===SOUNDFONT_RACK_SCHEMA,'Performance contract missing.');
  return {
    schema:SOUNDFONT_TAKE_SCHEMA,
    source_domain:'OBSERVATION-TRUE',
    session_id:session.session_id,
    created_at:createdAt,
    source:{kind:'local-sf2-bank',name:bank.name,size_bytes:bank.size,sha256:bank.sha256,preset_count:bank.preset_count},
    performance,
    continuity:JSON.parse(JSON.stringify(session.continuity)),
    acoustic_claim:'MIDI events scheduled for a sample-based SoundFont synthesizer; acoustic waveform, physical audibility and device output are not measured by this receipt.',
    capture:null,
    retained_binary:false,
    playback_route:'browser-default-output',
    device_calibration:'not performed',
  };
}