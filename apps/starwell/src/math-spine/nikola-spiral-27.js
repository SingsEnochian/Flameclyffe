/**
 * Nikola N-007: twenty-seven explicit synthetic scientific inquiry turns.
 * Separate from canonical Math Spine compression state, identity and inference routes.
 * 3 arcs x 9 turns. No HTTP, storage, sensors, models, or unattended recurrence.
 */
import {
  createNikolaSpiral,
  advanceNikolaSpiral,
  replayNikolaSpiral,
  NIKOLA_SPIRAL_MAX_CYCLES,
} from './nikola-upward-spiral.js';

export const NIKOLA_27_SCHEMA = 'wayglass.nikola-upward-27/v1';
export const NIKOLA_27_ARCS = Object.freeze([
  { id: 'compression', start: 1, end: 9, question: 'Which independent observations constrain the alternatives?' },
  { id: 'release-perturbation', start: 10, end: 18, question: 'What happens when credible-looking reports disagree?' },
  { id: 'recompression-challenge', start: 19, end: 27, question: 'Can the instrument retain contradictions without manufacturing closure?' },
]);

// Each entry is a caller-declared, synthetic measurement. Reusing a family is
// intentional and must create a held receipt rather than another independent vote.
// The three arcs are *stress-test design*, not twenty-seven empirical discoveries.
const SCRIPT = [
  ['stiffness', 24, 'k-a', 'independent stiffness A'],
  ['mass', 8/3, 'm-a', 'independent mass A'],
  ['stiffness', 24, 'k-a', 'stiffness A reprint'],
  ['stiffness', 24, 'k-b', 'independent stiffness B'],
  ['mass', 8/3, 'm-b', 'independent mass B'],
  ['mass', 8/3, 'fixture-frequency', 'frequency source echo'],
  ['stiffness', 24, 'k-c', 'independent stiffness C'],
  ['mass', 8/3, 'm-c', 'independent mass C'],
  ['stiffness', 24, 'k-b', 'stiffness B echo'],
  ['mass', 3, 'm-d', 'deliberate mass contradiction'],
  ['mass', 3, 'm-d', 'contradictory mass echo'],
  ['stiffness', 24, 'k-d', 'compatible stiffness D'],
  ['mass', 8/3, 'm-e', 'compatible mass E'],
  ['stiffness', 27, 'k-e', 'deliberate stiffness contradiction'],
  ['stiffness', 27, 'k-e', 'contradictory stiffness echo'],
  ['stiffness', 24, 'k-f', 'compatible stiffness F'],
  ['mass', 8/3, 'm-f', 'compatible mass F'],
  ['mass', 3, 'm-d', 'another echo of contradictory mass'],
  ['stiffness', 24, 'k-g', 'compatible stiffness G'],
  ['mass', 8/3, 'm-g', 'compatible mass G'],
  ['stiffness', 27, 'k-e', 'repeat of incompatible stiffness family'],
  ['stiffness', 27, 'k-h', 'new distinct incompatible stiffness family'],
  ['mass', 3, 'm-h', 'new distinct incompatible mass family'],
  ['stiffness', 24, 'k-i', 'compatible stiffness I'],
  ['mass', 8/3, 'm-i', 'compatible mass I'],
  ['mass', 3, 'm-h', 'copy of incompatible mass family'],
  ['stiffness', 24, 'k-j', 'compatible stiffness J; discrepancy remains'],
];

if (SCRIPT.length !== NIKOLA_SPIRAL_MAX_CYCLES) {
  throw new Error('Nikola 27: fixed research script / hard cap mismatch');
}

const arcFor = turn => NIKOLA_27_ARCS.find(arc => turn >= arc.start && turn <= arc.end);
const activeSignal = signal => Boolean(signal?.aborted);

export function planNikola27() {
  return Object.freeze(SCRIPT.map(([kind,value,family,label],index) => {
    const cycle = index + 1;
    return Object.freeze({
      cycle, arc: arcFor(cycle).id,
      label, measurement: Object.freeze({kind, value, unit:kind === 'mass' ? 'kg' : 'N/m'}),
      source: Object.freeze({id:'nikola-27-turn-'+String(cycle).padStart(2,'0'),
        family,kind:'synthetic'}),
    });
  }));
}

function report(status, state, timeline) {
  const admitted=timeline.filter(x=>x.status==='admitted').length;
  const held=timeline.filter(x=>x.status==='held-shared-source-origin').length;
  const last=state.projection;
  return Object.freeze({
    schema:NIKOLA_27_SCHEMA,status,completed:timeline.length,total:SCRIPT.length,
    phase:timeline.length ? timeline.at(-1).arc : null,
    admitted,held,
    conflicts_present:last.evidence_state==='inconsistent-independent-measurements',
    epistemic_state:last.evidence_state,
    source_class:'synthetic',
    physical_observation_verified:false,
    no_model_calls:true,
    no_canon_or_identity_mutation:true,
    final_head_sha256:state.head_fingerprint,
    state, timeline:Object.freeze([...timeline]),
    next_question:last.evidence_state==='inconsistent-independent-measurements'
      ? 'Which independent calibration or amended physical model would explain the conflicting reports?'
      : 'What independent measurement could discriminate remaining alternatives?',
  });
}

/**
 * Stops are user-controlled. onStep is observational, not an authority to alter
 * the packet. yieldTurn yields one event-loop turn for browser Feather clicks.
 * Both optional callbacks must remain local to the research surface.
 */
export async function runNikola27({
  signal = null,
  onStep = () => {},
  yieldTurn = () => new Promise(resolve => setTimeout(resolve, 0)),
} = {}) {
  if (typeof onStep !== 'function' || typeof yieldTurn !== 'function')
    throw new Error('Nikola 27: invalid run callback');
  const plan=planNikola27();
  let state=await createNikolaSpiral({
    baseline:{stiffness:12,stiffness_unit:'N/m',mass:3,mass_unit:'kg'},
    frequencyRatio:1.5,
    source:{id:'synthetic-frequency',family:'fixture-frequency',kind:'synthetic'},
  });
  const timeline=[];
  for (const entry of plan) {
    if (activeSignal(signal)) return report('stopped',state,timeline);
    state=await advanceNikolaSpiral(state,{measurement:entry.measurement,source:entry.source});
    const replay=await replayNikolaSpiral(state);
    if (!replay.matched || replay.head_fingerprint!==state.head_fingerprint ||
      replay.rounds!==entry.cycle) throw new Error('Nikola 27: deterministic replay mismatch');
    const receipt=state.rounds.at(-1);
    const mark=Object.freeze({
      cycle:entry.cycle,arc:entry.arc,
      status:receipt.status,source_id:entry.source.id,source_family:entry.source.family,
      label:entry.label,head_sha256:state.head_fingerprint,
      replay_matched:true,evidence_state:state.projection.evidence_state,
    });
    timeline.push(mark);
    // Throwing callbacks are not turned into false completion; preserve the
    // failed run as an exception rather than constructing fictional success.
    await onStep(mark);
    if (activeSignal(signal)) return report('stopped',state,timeline);
    await yieldTurn();
  }
  return report('completed',state,timeline);
}
