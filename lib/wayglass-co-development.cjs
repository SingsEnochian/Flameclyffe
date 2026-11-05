'use strict';

const { createHash, randomUUID } = require('node:crypto');

function digest(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
function assertText(value, name, max = 12000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new TypeError(name + ' must be nonempty bounded text');
  return value.trim();
}

/**
 * Consult the existing native Wayglass /respond route. This does not create a
 * second model provider or claim the model ran until a response is received.
 * Persist returned receipts through the host's existing receipt store.
 */
async function consultWayglass({ task, sources, endpoint, bearer, fetchImpl = fetch, receiptId = randomUUID() }) {
  const taskText = assertText(task, 'task');
  if (!Array.isArray(sources) || !sources.length || sources.length > 24) throw new TypeError('Verified sources required');
  const verified = sources.map((source) => {
    if (!source || source.verified !== true) throw new TypeError('Unverified source rejected');
    return { ref: assertText(source.ref, 'source ref', 500), sha256: assertText(source.sha256, 'source hash', 64) };
  });
  if (verified.some(s => !/^[a-f0-9]{64}$/i.test(s.sha256))) throw new TypeError('Invalid source hash');
  const url = new URL(assertText(endpoint, 'endpoint', 2048));
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))) {
    throw new TypeError('Remote model endpoint must use HTTPS');
  }
  if (!url.pathname.endsWith('/api/v1/wayglass/respond')) throw new TypeError('Use the native Wayglass respond route');
  if (url.username || url.password || url.search || url.hash) throw new TypeError('Endpoint must not embed credentials');
  const input = [
    'WAYGLASS ENGINEERING CONSULTATION. You are a participant, not a simulated transcript.',
    'Inspect the task and source references. Propose one concrete, testable next change.',
    'You may disagree or report insufficient evidence. Do not claim code was changed or tests ran.',
    'Return: proposal, files to inspect, acceptance test, unresolved question.',
    'Task: ' + taskText,
    'Verified source references: ' + JSON.stringify(verified),
  ].join('\n');
  const request = {
    input,
    interaction: { channel: 'OOC', turn_owner: 'wayglass', character_ownership: [] },
    history: [],
    max_output_tokens: 1400,
  };
  const startedAt = new Date().toISOString();
  let response;
  try {
    response = await fetchImpl(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}) },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(120000),
    });
  } catch (error) {
    return { status: 'transport-failed', receipt_id: receiptId, task_sha256: digest(taskText), source_refs: verified, started_at: startedAt, error: String(error.message || error) };
  }
  if (!response.ok) return { status: 'route-failed', receipt_id: receiptId, task_sha256: digest(taskText), source_refs: verified, started_at: startedAt, http_status: response.status };
  let body;
  try { body = await response.json(); } catch { return { status: 'invalid-response', receipt_id: receiptId, task_sha256: digest(taskText), source_refs: verified, started_at: startedAt }; }
  const output = body?.output || body?.response?.output || body?.response?.text;
  if (typeof output !== 'string' || !output.trim()) return { status: 'invalid-response', receipt_id: receiptId, task_sha256: digest(taskText), source_refs: verified, started_at: startedAt };
  return {
    status: 'model-responded', receipt_id: receiptId, task_sha256: digest(taskText),
    source_refs: verified, started_at: startedAt, completed_at: new Date().toISOString(),
    route_id: body.route_id || body?.route?.route_id || null,
    model_observation_id: body.observation?.observation_id || body.observation_id || null,
    proposal: output.trim(), proposal_sha256: digest(output.trim()),
    verification: 'model-output-only; no code or test execution claimed',
  };
}

module.exports = { consultWayglass };
