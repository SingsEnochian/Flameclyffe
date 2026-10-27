'use strict';

/** Nikola N-005: withheld-from-generation QUESTION bank, not a training corpus.
 * All items are synthetic educational scenarios. Never use this bank inside
 * the model's host prompt or as an automatic live provider request.
 * Rubrics are in a SEPARATE examiner-only module.
 */
const BENCHMARK_SCHEMA = 'wayglass.nikola-exam-bank/v1';
const raw = [
  ['MECH-01','mechanics','A pendulum has a longer period after being moved. In the small-angle approximation, which combinations of pendulum length and local gravity could explain it? Give one independent test.'],
  ['MECH-02','mechanics','Two carts collide on a level track. Total momentum before and after appears unchanged, but measured kinetic energy falls. Does that contradict momentum conservation? Name possible energy destinations and one measurement.'],
  ['MECH-03','mechanics','A spacecraft attitude oscillation grows after a controller update. Is this enough to infer a mechanical resonance rather than control-loop instability? State an informative discriminating test.'],
  ['QUANT-01','quantum','In a two-path interferometer, distinguish physical availability of which-path information from a conscious observer noticing a detector readout. What would changing environmental coupling reveal?'],
  ['QUANT-02','quantum','Two labs detect correlations from entangled pairs that violate a Bell inequality under appropriate assumptions. Does that alone permit controllable faster-than-light messaging? Explain the relevant distinction.'],
  ['QUANT-03','quantum','An electron is prepared with a sharply constrained position distribution. What does the uncertainty relation constrain about the momentum spread, and what does it not uniquely determine?'],
  ['MATH-01','mathematics','A fitted linear model predicts training data almost perfectly but fails badly on new samples. Compare at least two mechanisms and propose one test that distinguishes them.'],
  ['MATH-02','mathematics','A square matrix has a determinant near zero. Does this alone guarantee a specific singular value or condition number? Explain what further information you would compute.'],
  ['MATH-03','mathematics','Two plausible scientific hypotheses begin with equal priors. One new observation is 4 times as likely under H1 as H2. Give the resulting posterior under explicit assumptions and state why shared-source duplicates should not be counted twice.'],
  ['COMP-01','computing','A local 9-billion-parameter model becomes slow on a 6 GB VRAM GPU. Is the model necessarily computation-bound? Give measurements to distinguish memory, offload and compute bottlenecks.'],
  ['COMP-02','computing','A client times out after submitting a payment-like operation and retries it. Why can this cause duplicate effects and what information is needed before safely retrying?'],
  ['COMP-03','computing','Two distributed services record events with inconsistent wall-clock order. Can timestamps alone determine causality? Give a mechanism for establishing a partial causal order.'],
];
const ids = new Set(raw.map(x=>x[0]));
if (ids.size !== raw.length) throw new Error('duplicate Nikola exam item');
const questions = Object.freeze(raw.map(([id, domain, question]) => Object.freeze({
  schema: BENCHMARK_SCHEMA, id, domain, question,
  source_class: 'human-authored-synthetic',
  evaluation_key_included: false,
})));
function listNikolaBlindCases(){
  return questions.map(x=>({...x}));
}
module.exports={ BENCHMARK_SCHEMA, listNikolaBlindCases };
