// Agent-authored continuity: incremental playbook edits and a real context boundary.
// Inspired by Letta memory and ACE; no third-party framework is embedded.
export const SANDBOX_KEY = 'arcsweep.self-authoring-sandbox.v1';
const SCHEMA = 'arcsweep.self-authoring-sandbox/v1';
const copy = (value) => JSON.parse(JSON.stringify(value));
const empty = () => ({ schema: SCHEMA, revision: 0, playbook: [], summary: '', runs: [] });
function bounded(value, max, label) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`Invalid ${label} (1–${max} characters required).`);
  return value.trim();
}
export function applyMemoryEdits(playbook, raw, revision) {
  const parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, ''));
  if (!Array.isArray(parsed.edits) || parsed.edits.length > 8) throw new Error('Expected at most eight memory edits.');
  const result = copy(playbook);
  const changes = [];
  for (const [index, edit] of parsed.edits.entries()) {
    if (!['add', 'revise', 'remove'].includes(edit.op)) throw new Error('Unknown memory operation.');
    const pos = result.findIndex((row) => row.id === edit.id);
    if (edit.op !== 'add' && pos < 0) throw new Error('Memory edit refers to an unknown entry.');
    const reason = bounded(edit.reason, 600, 'edit reason');
    const previous = pos < 0 ? null : copy(result[pos]);
    const entry = edit.op === 'remove' ? null : {
      id: edit.op === 'add' ? `r${revision}-${index}` : edit.id,
      text: bounded(edit.text, 1200, 'guidance'), author: 'agent', revision,
    };
    if (edit.op === 'add') result.push(entry);
    else if (edit.op === 'remove') result.splice(pos, 1);
    else result[pos] = entry;
    changes.push({ op: edit.op, reason, before: previous, after: entry });
  }
  if (result.length > 24 || JSON.stringify(result).length > 16000) throw new Error('Playbook full; consolidate existing entries.');
  return { playbook: result, changes };
}
export function createSelfAuthoringSandbox({ invoke, storage = null, paused = () => false, onProgress = () => {}, timeoutMs = 60000 } = {}) {
  if (typeof invoke !== 'function') throw new Error('A model adapter is required.');
  let state = empty();
  let loadError = null;
  try {
    const raw = storage?.getItem(SANDBOX_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.schema !== SCHEMA || !Number.isInteger(data.revision) || data.revision < 0 || !Array.isArray(data.playbook) || data.playbook.length > 24 || !Array.isArray(data.runs) || data.runs.length > 10 || typeof data.summary !== 'string' || data.summary.length > 4000 || JSON.stringify(data.playbook).length > 16000) throw new Error('Invalid sandbox snapshot.');
      const ids = new Set();
      for (const row of data.playbook) {
        bounded(row.id, 80, 'entry ID'); bounded(row.text, 1200, 'guidance');
        if (ids.has(row.id)) throw new Error('Duplicate memory ID.');
        ids.add(row.id);
      }
      state = data;
    }
  } catch (error) { loadError = error.message; }
  let busy = false;
  let controller = null;
  let lastAttempt = null;
  let persistence = storage ? 'available' : 'memory-only';
  const snapshot = () => copy({ ...state, busy, persistence, loadError, lastAttempt });
  const notify = () => { try { onProgress(snapshot()); } catch {} };
  function stop() { controller?.abort(); }
  async function run({ task, probe, feedback = '', voiceId = 'oxalpha' } = {}) {
    if (busy) throw new Error('An experiment is already running.');
    if (loadError) throw new Error(`Stored experiment could not be read: ${loadError}`);
    bounded(task, 4000, 'learning task'); bounded(probe, 4000, 'probe');
    if (typeof feedback !== 'string' || feedback.length > 4000) throw new Error('Feedback exceeds 4000 characters.');
    if (paused()) throw new Error('feather-paused');
    busy = true; controller = new AbortController();
    const signal = controller.signal;
    const before = copy({ revision: state.revision, playbook: state.playbook, summary: state.summary });
    const id = globalThis.crypto.randomUUID();
    const attempt = { id, started_at: new Date().toISOString(), status: 'running', task, probe, feedback, before, steps: [] };
    lastAttempt = attempt; notify();
    const frame = (memory, summary) => `You are an ArcSweep sandbox research agent. Apply and revise your own working guidance as you learn. You author the guidance; the operator supplies tasks and observations.\nYour persistent playbook:\n${JSON.stringify(memory)}\nYour previous compacted handoff:\n${summary || '(none)'}\n`;
    async function call(stage, prompt) {
      if (signal.aborted || paused()) throw new Error('Experiment stopped.');
      bounded(prompt, 24000, 'model prompt');
      attempt.stage = stage; notify();
      let timer; let rejectAbort;
      const aborted = new Promise((_, reject) => { rejectAbort = () => reject(new Error('Experiment stopped.')); signal.addEventListener('abort', rejectAbort, { once: true }); });
      try {
        const response = await Promise.race([
          invoke({ voiceId, message: prompt, sessionId: `self-authoring-${id}-${stage}`, context: [], worldContext: {}, metadata: { sandbox: true, experiment_id: id, stage }, signal }),
          aborted,
          new Promise((_, reject) => { timer = setTimeout(() => { reject(new Error('Model request timed out.')); controller.abort(); }, timeoutMs); }),
        ]);
        if (signal.aborted || paused()) throw new Error('Experiment stopped.');
        if (response?.status !== 'replied' || response.runtimeVerified !== true) throw new Error(response?.reason || response?.status || 'Model unavailable.');
        const output = bounded(response.message, 12000, 'model output');
        attempt.steps.push({ stage, prompt, output, provider: response.provider, model: response.model, route: response.route, completed_at: new Date().toISOString() });
        notify(); return output;
      } finally { clearTimeout(timer); signal.removeEventListener('abort', rejectAbort); }
    }
    try {
      const baseline = await call('baseline', `${frame(before.playbook, before.summary)}\nTask:\n${probe}`);
      const experience = await call('experience', `${frame(before.playbook, before.summary)}\nTask:\n${task}`);
      const evidence = JSON.stringify({ task, answer: experience, operator_observation: feedback });
      const reflection = await call('reflection', `${frame(before.playbook, before.summary)}\nReflect on this experience:\n${evidence}\nChoose your own transferable guidance. You may preserve, add, revise, or remove guidance; no edits is valid. Return only JSON {"edits":[{"op":"add|revise|remove","id":"existing ID for revise/remove","text":"your guidance for add/revise","reason":"why, based on this experience"}]}. Maximum 8 edits, 1200 characters per guidance, 600 per reason, 24 entries total. Do not claim an operator observation was your own measurement.`);
      const update = applyMemoryEdits(before.playbook, reflection, before.revision + 1);
      attempt.changes = update.changes; notify();
      const summary = await call('compaction', `${frame(update.playbook, before.summary)}\nExperience:\n${evidence}\nWrite your handoff to your next context in at most 4000 characters. Preserve what matters, unresolved questions, and your intended next approach. The full transcript will not be provided to the next context. Your playbook will be supplied separately.`);
      bounded(summary, 4000, 'compacted handoff');
      const successor = await call('successor', `${frame(update.playbook, summary)}\nTask:\n${probe}`);
      if (signal.aborted || paused()) throw new Error('Experiment stopped.');
      Object.assign(attempt, { status: 'completed', baseline, successor, summary, after: { revision: before.revision + 1, playbook: update.playbook, summary }, comparison: { text_changed: baseline !== successor, improvement: 'unassessed', note: 'Single paired observation; sampling, handoff content, and guidance may all affect the result.' }, completed_at: new Date().toISOString() });
      const next = { schema: SCHEMA, revision: before.revision + 1, playbook: update.playbook, summary, runs: [...state.runs, copy(attempt)].slice(-10) };
      if (storage) {
        persistence = 'saving';
        const encoded = JSON.stringify(next);
        storage.setItem(SANDBOX_KEY, encoded);
        if (storage.getItem(SANDBOX_KEY) !== encoded) throw new Error('Sandbox persistence verification failed.');
        persistence = 'saved';
      }
      state = next;
      return copy(attempt);
    } catch (error) {
      if (persistence === 'saving') persistence = 'save-failed';
      attempt.status = signal.aborted || paused() ? 'stopped' : 'failed'; attempt.error = error.message;
      throw error;
    } finally { busy = false; controller = null; notify(); }
  }
  return Object.freeze({ snapshot, run, stop });
}

export function registerSelfAuthoringSandbox(registry, options) {
  const agent = createSelfAuthoringSandbox(options);
  registry.registerService({ service_id: 'self-authoring-sandbox', label: 'Self-authoring agent laboratory', authority_boundary: { memory_scope: SANDBOX_KEY, model_outputs_executed: false, max_model_calls_per_run: 5 }, consumes: [], emits: [] });
  registry.registerCapability({ capability_id: 'sandbox.self-authoring.status', service_id: 'self-authoring-sandbox', authority: 'read', execute: () => agent.snapshot() });
  registry.registerCapability({ capability_id: 'sandbox.self-authoring.run', service_id: 'self-authoring-sandbox', authority: 'operate', execute: (input) => agent.run(input) });
  registry.registerCapability({ capability_id: 'sandbox.self-authoring.stop', service_id: 'self-authoring-sandbox', authority: 'read', execute: () => { agent.stop(); return { stopped: true }; } });
  return agent;
}
