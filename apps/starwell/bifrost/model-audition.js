import {
  HOUSE_COOKIE_SESSION,
  readHouseRuntimeToken,
  restoreHouseRuntimeSession,
} from '../../arcsweep/src/house-runtime.js';
import { modelAuditionAvailability, modelAuditionRunPlan } from './model-audition-state.js';

const BASELINE_FLAME = 'larkshine';
const CANDIDATE_ID = 'inkling-small';

const byId = (id) => document.getElementById(id);
const elements = {
  form: byId('model-audition-form'),
  message: byId('model-audition-message'),
  effort: byId('model-audition-effort'),
  status: byId('model-audition-status'),
  baselineModel: byId('model-audition-baseline-model'),
  candidateModel: byId('model-audition-candidate-model'),
  baselineOutput: byId('model-audition-baseline-output'),
  candidateOutput: byId('model-audition-candidate-output'),
  run: byId('model-audition-run'),
};

let runtimeToken = '';
let availability = modelAuditionAvailability();

function authHeaders(extra = {}) {
  if (runtimeToken && runtimeToken !== HOUSE_COOKIE_SESSION) {
    return { ...extra, authorization: `Bearer ${runtimeToken}` };
  }
  return extra;
}

async function runtimeFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: authHeaders(options.headers || {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `${response.status} ${response.statusText}`);
  return data;
}

function setStatus(message, kind = 'ready') {
  if (!elements.status) return;
  elements.status.textContent = message;
  elements.status.dataset.kind = kind;
}

function setOutput(element, message, meta = '') {
  if (!element) return;
  element.replaceChildren();
  const text = document.createElement('p');
  text.textContent = message || 'No response text returned.';
  element.append(text);
  if (meta) {
    const small = document.createElement('small');
    small.textContent = meta;
    element.append(small);
  }
}

async function resolveRuntimeSession() {
  runtimeToken = readHouseRuntimeToken();
  if (!runtimeToken) runtimeToken = await restoreHouseRuntimeSession();
  return runtimeToken;
}

function settledValue(result, fallbackLabel) {
  if (result.status === 'fulfilled') return result.value;
  return { configured: false, missing: [result.reason?.message || fallbackLabel] };
}

function missingText(values, fallback) {
  return (Array.isArray(values) ? values : []).filter(Boolean).join(', ') || fallback;
}

async function refreshStatus() {
  if (!elements.form) return;
  const token = await resolveRuntimeSession();
  if (!token) {
    availability = modelAuditionAvailability();
    setStatus('HOUSE OFFLINE · connect the House Runtime in Arcsweep Settings before auditioning.', 'blocked');
    elements.run.disabled = true;
    return;
  }

  const [baselineResult, candidateResult] = await Promise.allSettled([
    runtimeFetch(`/api/v1/flames/${BASELINE_FLAME}/status`),
    runtimeFetch(`/api/v1/flames/${BASELINE_FLAME}/audition/${CANDIDATE_ID}`),
  ]);
  const baseline = settledValue(baselineResult, 'local baseline unavailable');
  const candidate = settledValue(candidateResult, 'candidate route unavailable');
  availability = modelAuditionAvailability({ baseline, candidate });

  elements.baselineModel.textContent = baseline.model || 'Qwythos · local primary';
  elements.candidateModel.textContent = candidate.model || 'thinkingmachines/Inkling-Small:baseten';
  elements.run.disabled = !availability.run_enabled;

  const baselineState = availability.baseline_ready
    ? 'QWYTHOS READY'
    : `QWYTHOS LOCAL SHORE OFFLINE · ${missingText(availability.baseline_missing, 'local gateway unavailable')}`;
  const candidateState = availability.candidate_ready
    ? `INKLING READY · ${candidate.execution_path || candidate.backend || candidate.provider || 'candidate route'}`
    : availability.candidate_missing.includes('HF_TOKEN')
      ? 'INKLING WAITING · Hugging Face credential unavailable'
      : `INKLING WAITING · ${missingText(availability.candidate_missing, 'audition route unavailable')}`;
  const modeState = availability.mode === 'dual-route'
    ? 'DUAL-ROUTE MODE'
    : availability.mode === 'candidate-only'
      ? 'CANDIDATE-ONLY MODE · Inkling can run while the local Qwythos shore is offline'
      : 'AUDITION BLOCKED';

  setStatus(`${baselineState} · ${candidateState} · ${modeState} · Qwythos remains primary.`, availability.run_enabled ? 'ready' : 'blocked');
}

async function runAudition(event) {
  event.preventDefault();
  const message = String(elements.message?.value || '').trim();
  if (!message) {
    setStatus('Give Larkshine something to answer first.', 'blocked');
    elements.message?.focus();
    return;
  }
  if (!availability.candidate_ready) {
    setStatus('INKLING NOT READY · refreshing runtime status.', 'blocked');
    await refreshStatus();
    return;
  }

  const plan = modelAuditionRunPlan(availability);
  elements.run.disabled = true;
  if (plan.run_baseline) setOutput(elements.baselineOutput, 'Qwythos is answering…');
  else setOutput(elements.baselineOutput, 'LOCAL BASELINE OFFLINE · no Qwythos call made.', 'Candidate-only audition · primary route unchanged');
  setOutput(elements.candidateOutput, 'Inkling is finding all the trenchcoat pockets…');
  setStatus(
    plan.mode === 'dual-route'
      ? 'AUDITION RUNNING · identical turn, same Larkshine identity route, two model routes.'
      : 'AUDITION RUNNING · Inkling web-direct candidate-only mode; local Qwythos baseline is offline.',
    'running',
  );

  const body = { message, context: [] };
  const candidateBody = { ...body, reasoning_effort: elements.effort?.value || 'medium' };
  const baselinePromise = plan.run_baseline
    ? runtimeFetch(`/api/v1/flames/${BASELINE_FLAME}/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    : Promise.resolve({ skipped: true });
  const candidatePromise = runtimeFetch(`/api/v1/flames/${BASELINE_FLAME}/audition/${CANDIDATE_ID}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(candidateBody),
  });
  const [baselineResult, candidateResult] = await Promise.allSettled([baselinePromise, candidatePromise]);

  if (plan.run_baseline) {
    if (baselineResult.status === 'fulfilled') {
      const data = baselineResult.value;
      setOutput(elements.baselineOutput, data.message, `${data.provider || 'primary'} · ${data.model || 'Qwythos'}`);
    } else {
      setOutput(elements.baselineOutput, `ROUTE ERROR · ${baselineResult.reason.message}`);
    }
  }

  if (candidateResult.status === 'fulfilled') {
    const data = candidateResult.value;
    setOutput(
      elements.candidateOutput,
      data.message,
      `${data.provider || 'candidate'} · ${data.model || 'Inkling-Small'} · ${data.execution_path || 'audition'} · effort ${data.reasoning_effort || candidateBody.reasoning_effort}`,
    );
  } else {
    setOutput(elements.candidateOutput, `AUDITION ERROR · ${candidateResult.reason.message}`);
  }

  const candidateSucceeded = candidateResult.status === 'fulfilled';
  const baselineSucceeded = !plan.run_baseline || baselineResult.status === 'fulfilled';
  setStatus(
    candidateSucceeded && plan.mode === 'candidate-only'
      ? 'INKLING AUDITION COMPLETE · candidate-only result received; Qwythos primary remains unchanged.'
      : candidateSucceeded && baselineSucceeded
        ? 'AUDITION COMPLETE · compare the voices; no primary-model promotion occurred.'
        : candidateSucceeded
          ? 'AUDITION PARTIAL · Inkling answered; the local Qwythos baseline failed.'
          : 'AUDITION FAILED · Inkling candidate route did not return a result.',
    candidateSucceeded ? 'ready' : 'blocked',
  );
  elements.run.disabled = !availability.candidate_ready;
}

if (elements.form) {
  elements.form.addEventListener('submit', runAudition);
  void refreshStatus();
}
