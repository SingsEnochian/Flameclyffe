import {
  HOUSE_COOKIE_SESSION,
  readHouseRuntimeToken,
  restoreHouseRuntimeSession,
} from '../../arcsweep/src/house-runtime.js';

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

async function refreshStatus() {
  if (!elements.form) return;
  const token = await resolveRuntimeSession();
  if (!token) {
    setStatus('HOUSE OFFLINE · connect the House Runtime in Arcsweep Settings before auditioning.', 'blocked');
    elements.run.disabled = true;
    return;
  }

  try {
    const [baseline, candidate] = await Promise.all([
      runtimeFetch(`/api/v1/flames/${BASELINE_FLAME}/status`),
      runtimeFetch(`/api/v1/flames/${BASELINE_FLAME}/audition/${CANDIDATE_ID}`),
    ]);
    elements.baselineModel.textContent = baseline.model || 'Qwythos primary';
    elements.candidateModel.textContent = candidate.model || 'thinkingmachines/Inkling-Small';
    elements.run.disabled = !(baseline.configured && candidate.configured && candidate.audition_route);
    const baselineState = baseline.configured ? 'QWYTHOS READY' : `QWYTHOS WAITING · ${(baseline.missing || []).join(', ') || 'provider unavailable'}`;
    const candidateState = candidate.configured && candidate.audition_route
      ? 'INKLING COAT ARMED'
      : `INKLING WAITING · ${(candidate.missing || []).join(', ') || 'audition route unavailable'}`;
    setStatus(`${baselineState} · ${candidateState} · primary route remains Qwythos.`, elements.run.disabled ? 'blocked' : 'ready');
  } catch (error) {
    elements.run.disabled = true;
    setStatus(`AUDITION UNAVAILABLE · ${error.message}`, 'blocked');
  }
}

async function runAudition(event) {
  event.preventDefault();
  const message = String(elements.message?.value || '').trim();
  if (!message) {
    setStatus('Give Larkshine something to answer first.', 'blocked');
    elements.message?.focus();
    return;
  }

  elements.run.disabled = true;
  setOutput(elements.baselineOutput, 'Qwythos is answering…');
  setOutput(elements.candidateOutput, 'Inkling is finding all the trenchcoat pockets…');
  setStatus('AUDITION RUNNING · identical turn, same Larkshine identity, two model routes.', 'running');

  const body = { message, context: [] };
  const candidateBody = { ...body, reasoning_effort: elements.effort?.value || 'medium' };
  const [baselineResult, candidateResult] = await Promise.allSettled([
    runtimeFetch(`/api/v1/flames/${BASELINE_FLAME}/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    runtimeFetch(`/api/v1/flames/${BASELINE_FLAME}/audition/${CANDIDATE_ID}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(candidateBody),
    }),
  ]);

  if (baselineResult.status === 'fulfilled') {
    const data = baselineResult.value;
    setOutput(elements.baselineOutput, data.message, `${data.provider || 'primary'} · ${data.model || 'Qwythos'}`);
  } else {
    setOutput(elements.baselineOutput, `ROUTE ERROR · ${baselineResult.reason.message}`);
  }

  if (candidateResult.status === 'fulfilled') {
    const data = candidateResult.value;
    setOutput(
      elements.candidateOutput,
      data.message,
      `${data.provider || 'candidate'} · ${data.model || 'Inkling-Small'} · effort ${data.reasoning_effort || candidateBody.reasoning_effort}`,
    );
  } else {
    setOutput(elements.candidateOutput, `AUDITION ERROR · ${candidateResult.reason.message}`);
  }

  const both = baselineResult.status === 'fulfilled' && candidateResult.status === 'fulfilled';
  setStatus(
    both
      ? 'AUDITION COMPLETE · compare the voices; no primary-model promotion occurred.'
      : 'AUDITION PARTIAL · one route failed; the primary Larkshine route was not changed.',
    both ? 'ready' : 'blocked',
  );
  elements.run.disabled = false;
}

if (elements.form) {
  elements.form.addEventListener('submit', runAudition);
  void refreshStatus();
}
