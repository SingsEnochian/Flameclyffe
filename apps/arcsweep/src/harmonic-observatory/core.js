/**
 * Harmonic Observatory: canonical session contract and Wardenclyffe cue compilation.
 * Proposed audio laboratory; not a new Hearthgate governing mathematical law.
 * No hardware assumptions, network calls, authorisation or autonomous persistence.
 */
export const OBSERVATORY_SESSION_SCHEMA = 'wayglass.harmonic-observatory.session/v1';
export const OBSERVATORY_RECEIPT_SCHEMA = 'wayglass.harmonic-observatory.receipt/v1';
export const MATH_SPINE = 'hearthgate.math-spine/v1.8';
export const RENDERER_VERSION = 'wayglass.harmonic-observatory/offline-v1.0.0';
export const STUDIO_RATE = 48000;
export const CLAIM_DOMAINS = Object.freeze(['ENGINE-TRUE','OBSERVATION-TRUE','CANON-TRUE','SYMBOLIC','UNKNOWN','REJECTED']);
export const MODES = Object.freeze(['layered-voices', 'stereo-difference', 'mono-am']);
export const DEVICE_PROFILES = Object.freeze(['studio-stereo', 'mono-reference', 'osia-preview']);
export const STEM_IDS = Object.freeze(['voice-a', 'voice-b', 'voice-c']);
const isRecord = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const inRange = (x, min, max) => typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max;
const bounded = (s, max) => typeof s === 'string' && s.trim().length > 0 && s.length <= max;
const optionalText = (s, max) => s === null || (typeof s === 'string' && s.length <= max);
const assert = (ok, message) => { if (!ok) throw new RangeError(message); };

export function createSession() {
  return {
    schema: OBSERVATORY_SESSION_SCHEMA,
    session_id: 'harmonic-observatory-session', source_id: 'author:local-wayglass-lab',
    mode: 'layered-voices', domain: 'SYMBOLIC', device_profile: 'studio-stereo',
    duration_seconds: 6, master_gain: 0.22, fade_seconds: 0.12,
    root_hz: 196, difference_hz: 5.5, modulation_depth: 0.5,
    stems: [
      { id:'voice-a', enabled:true, semitones:0, detune_cents:0, gain:0.30, pan:-0.45, overtones:2 },
      { id:'voice-b', enabled:true, semitones:4, detune_cents:0, gain:0.24, pan:0, overtones:2 },
      { id:'voice-c', enabled:true, semitones:7, detune_cents:0, gain:0.23, pan:0.45, overtones:2 },
    ],
    continuity: {stop_point:null, next_owner:null, unresolved_questions:[]},
    mythic: {world:'Terra Aeterna', phase:'WEAVE', interpretation:'Layered voices remain distinct within one harmonic field.'},
  };
}
export function validateSession(session) {
  assert(isRecord(session), 'session must be an object');
  assert(session.schema === OBSERVATORY_SESSION_SCHEMA, 'invalid session schema');
  assert(bounded(session.session_id,64) && /^[A-Za-z0-9_-]+$/.test(session.session_id),'invalid session id');
  assert(bounded(session.source_id,256),'source id required');
  assert(MODES.includes(session.mode),'unknown synthesis mode');
  assert(CLAIM_DOMAINS.includes(session.domain),'unknown claim domain');
  assert(DEVICE_PROFILES.includes(session.device_profile),'unknown device profile');
  assert(inRange(session.root_hz, 35, 1400),'root must be 35–1400 Hz');
  assert(inRange(session.difference_hz, 0.1, 20),'difference must be 0.1–20 Hz');
  assert(inRange(session.modulation_depth, 0, 1),'modulation depth must be 0–1');
  assert(inRange(session.duration_seconds, 0.25, 30),'duration must be 0.25–30 seconds');
  assert(inRange(session.master_gain, 0.001, 0.35),'master gain must be 0.001–0.35');
  assert(inRange(session.fade_seconds, 0.005, 1) && session.fade_seconds*2 <= session.duration_seconds,'fade does not fit duration');
  assert(Array.isArray(session.stems) && session.stems.length===3,'exactly three authored voice stems required');
  assert(session.stems.every((s,i)=>isRecord(s)&&s.id===STEM_IDS[i]&&typeof s.enabled==='boolean' &&
    inRange(s.semitones,-24,24)&&inRange(s.detune_cents,-50,50)&&inRange(s.gain,0,0.5)&&
    inRange(s.pan,-1,1)&&Number.isInteger(s.overtones)&&s.overtones>=1&&s.overtones<=5),'invalid voice stem');
  assert(isRecord(session.continuity),'continuity required');
  assert(optionalText(session.continuity.stop_point,256) && optionalText(session.continuity.next_owner,128),'invalid continuity metadata');
  assert(Array.isArray(session.continuity.unresolved_questions) && session.continuity.unresolved_questions.length<=20 &&
    session.continuity.unresolved_questions.every(q=>bounded(q,500)),'invalid unresolved questions');
  assert(isRecord(session.mythic) && bounded(session.mythic.world,128) && ['GROUND','WEAVE','CROSS'].includes(session.mythic.phase) &&
    typeof session.mythic.interpretation==='string' && session.mythic.interpretation.length<=500,'invalid mythic interpretation');
  return session;
}
function harmonicSpecs(freq, baseGain, overtones, pan, stemId) {
  // Overtone amplitudes decay geometrically. Sum of partial weights < 2.
  const weights=Array.from({length:overtones},(_,i)=>1/(2**i));
  const norm=weights.reduce((a,b)=>a+b,0);
  return weights.map((weight,i)=>({id:`${stemId}:${i+1}`,stem_id:stemId,hz:freq*(i+1),
    gain:baseGain*weight/norm,pan,partial:i+1}));
}
export function compileArrangement(input) {
  const session=validateSession(input);
  const mono=session.device_profile!=='studio-stereo' || session.mode==='mono-am';
  let oscillators=[];
  if(session.mode==='layered-voices') {
    for(const stem of session.stems) {
      if(!stem.enabled || stem.gain===0) continue;
      const f=session.root_hz*2**((stem.semitones+stem.detune_cents/100)/12);
      oscillators.push(...harmonicSpecs(f,stem.gain,stem.overtones,mono?0:stem.pan,stem.id));
    }
  } else if(session.mode==='stereo-difference') {
    // Perceptual difference requires separate-ear delivery. In mono there is no binaural claim.
    oscillators=[{id:'left:1',stem_id:'difference-left',hz:session.root_hz,gain:0.33,pan:mono?0:-1,partial:1},
      {id:'right:1',stem_id:'difference-right',hz:session.root_hz+session.difference_hz,gain:0.33,pan:mono?0:1,partial:1}];
  } else {
    oscillators=[{id:'carrier:1',stem_id:'mono-carrier',hz:session.root_hz,gain:0.33,pan:0,partial:1}];
  }
  for(const osc of oscillators) assert(osc.hz>0 && osc.hz<STUDIO_RATE/2,'oscillator outside 48k Nyquist limit');
  assert(oscillators.length>0,'enable at least one voice');
  const declaredSum=oscillators.reduce((s,o)=>s+o.gain,0)*session.master_gain;
  assert(declaredSum<=0.35,'mix exceeds conservative combined amplitude budget');
  return Object.freeze({
    schema:'wayglass.harmonic-observatory.arrangement/v1',
    session, sample_rate_hz:STUDIO_RATE, channels:mono?1:2,
    oscillators, headroom_linear:declaredSum,
    modulation:session.mode==='mono-am'?{rate_hz:session.difference_hz,depth:session.modulation_depth}:null,
    perceptual_difference_hz:session.mode==='stereo-difference'&&!mono?session.difference_hz:null,
    claims:{
      physical_audio:'OBSERVATION-TRUE', mythic:'SYMBOLIC',
      binaural:session.mode==='stereo-difference'&&!mono?'separate-ear-stimulus':'not-applicable'
    }
  });
}
export function copySession(session) { return JSON.parse(JSON.stringify(validateSession(session))); }