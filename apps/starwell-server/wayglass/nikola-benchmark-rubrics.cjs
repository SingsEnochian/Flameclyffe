'use strict';

/** EXAMINER ONLY. Never import in a generation/prompt/route module.
 * These are human-review criteria, not machine-certified answers.
 */
const { createHash } = require('node:crypto');
const { BENCHMARK_SCHEMA, listNikolaBlindCases } = require('./nikola-benchmark-questions.cjs');
const RUBRIC_SCHEMA = 'wayglass.nikola-exam-rubric/v1';
const evaluations = Object.freeze({
  'MECH-01': ['T approximately equals 2π sqrt(L/g)','longer L or lower g both increase the period','independent length/gravity or controlled-length measurement'],
  'MECH-02': ['momentum and kinetic energy are different conserved quantities','inelastic collision can convert kinetic energy to heat/sound/deformation','measure deformation, temperature or dissipated energy'],
  'MECH-03': ['unstable closed-loop control and mechanical resonance are distinct','measure open-loop modes or sweep forcing frequency','inspect controller phase margin or controller-disabled response'],
  'QUANT-01': ['which-path information/environment coupling, not human awareness','loss of interference tied to coherence or distinguishability','change detector/environment coupling with controlled visibility measurement'],
  'QUANT-02': ['Bell inequality violation versus no-signalling','local measurement statistics cannot be controlled to transmit arbitrary messages','compare local marginals or demonstrate classical coincidence channel requirement'],
  'QUANT-03': ['ΔxΔp ≥ ħ/2 for position/momentum uncertainties','narrowing position imposes lower bound on momentum spread','no unique momentum distribution follows from the inequality alone'],
  'MATH-01': ['overfitting/noise, shift, leakage or improper validation are alternatives','held-out split/cross-validation/shift checks distinguish mechanisms','training fit alone does not certify generalisation'],
  'MATH-02': ['determinant equals product of singular values for square matrix magnitude','near-zero determinant does not fix any one singular value or condition number','compute SVD/condition number and scale'],
  'MATH-03': ['equal-prior posterior P(H1|E)=4/5 given stated likelihood ratio','conditional independence of evidence matters','shared origin duplicate does not supply a second independent factor'],
  'COMP-01': ['6GB VRAM memory capacity/offload pressure','performance can be bandwidth, transfers or compute-limited','GPU utilization, memory footprint, offload and tokens/second profiling'],
  'COMP-02': ['timeout does not establish failure or success','idempotency key/status query prevents duplicate execution','distinguish retrying read vs mutation and receipt authority'],
  'COMP-03': ['wall-clock timestamps alone do not establish happens-before','vector clocks/Lamport clocks and message causality','concurrent events may remain partially ordered'],
});
const rubricKeys = Object.keys(evaluations).sort();
const questionKeys = listNikolaBlindCases().map(x=>x.id).sort();
if (JSON.stringify(rubricKeys) !== JSON.stringify(questionKeys)) throw new Error('examiner rubric/question mismatch');
function freezeNikolaResponse({id, answer, modelReported=null}={}) {
  if (!evaluations[id]) throw new Error('unknown exam case');
  if (typeof answer !== 'string' || !answer.trim() || answer.length > 16000) throw new Error('bounded answer required');
  const answer_sha256=createHash('sha256').update(answer,'utf8').digest('hex');
  return Object.freeze({
    schema: 'wayglass.nikola-frozen-exam-response/v1',
    case_id: id, answer_sha256, answer_length: answer.length,
    model_reported:typeof modelReported === 'string' ? modelReported.slice(0,120) : null,
    status: 'response-frozen-not-graded',
    independent_model_attestation: false,
  });
}
function revealNikolaRubric(receipt) {
  if (receipt?.schema !== 'wayglass.nikola-frozen-exam-response/v1' ||
    receipt?.status !== 'response-frozen-not-graded' ||
    !/^[0-9a-f]{64}$/.test(receipt?.answer_sha256 || '') ||
    !Number.isInteger(receipt.answer_length) || receipt.answer_length < 1 ||
    !evaluations[receipt.case_id]) throw new Error('freeze receipt required before examiner access');
  return Object.freeze({
    schema: RUBRIC_SCHEMA,
    case_id: receipt.case_id,
    candidate_answer_sha256: receipt.answer_sha256,
    criteria: [...evaluations[receipt.case_id]],
    grading: 'independent-human-review-required',
    machine_verdict: null,
    source_class: 'human-authored-synthetic',
    caveat: 'Code-level access control is procedural; this is not a cryptographic secret from a developer who can read the repository.',
  });
}
module.exports={ RUBRIC_SCHEMA, freezeNikolaResponse, revealNikolaRubric };
