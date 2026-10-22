import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const TRANSFORMERS_SUBSTRATE_SCHEMA = 'hearthweave.transformers-substrate/v0.1';

const DEFAULT_WORKER = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../scripts/arcsweep-transformers-worker.py',
);

export function createTransformersSubstrateSession({
  command = process.env.ARCSWEEP_PYTHON || process.env.LAYA_PYTHON || 'python',
  workerPath = DEFAULT_WORKER,
  cwd = process.cwd(),
  env = {},
  startupTimeoutMs = 120_000,
  requestTimeoutMs = 300_000,
} = {}) {
  let proc = null;
  let stdoutReader = null;
  let stderrReader = null;
  let nextId = 0;
  let started = false;
  const pending = new Map();
  const stderrTail = [];

  function remember(line) {
    stderrTail.push(String(line));
    while (stderrTail.length > 40) stderrTail.shift();
  }

  function rejectAll(error) {
    for (const entry of pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(error);
    }
    pending.clear();
  }

  function request(payload, timeoutMs = requestTimeoutMs) {
    if (!proc?.stdin?.writable) throw new Error('Transformers substrate worker is not running.');
    nextId += 1;
    const id = nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Transformers substrate request timed out. stderr: ${stderrTail.join(' | ')}`));
      }, timeoutMs);
      timer.unref?.();
      pending.set(id, { resolve, reject, timer });
      proc.stdin.write(`${JSON.stringify({ ...payload, id })}\n`);
    });
  }

  async function start() {
    if (started) return api;
    proc = spawn(command, [workerPath], {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const ready = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Transformers worker startup timed out. stderr: ${stderrTail.join(' | ')}`)), startupTimeoutMs);
      timer.unref?.();

      stdoutReader = createInterface({ input: proc.stdout, crlfDelay: Infinity });
      stderrReader = createInterface({ input: proc.stderr, crlfDelay: Infinity });
      stderrReader.on('line', remember);
      stdoutReader.on('line', (line) => {
        let message;
        try { message = JSON.parse(line); } catch { remember(`[stdout non-json] ${line}`); return; }
        if (message?.event === 'ready') {
          clearTimeout(timer);
          resolve(message);
          return;
        }
        const entry = pending.get(message?.id);
        if (!entry) return;
        pending.delete(message.id);
        clearTimeout(entry.timer);
        if (message.error) entry.reject(new Error(`${message.error}\n${message.trace || ''}`));
        else entry.resolve(message);
      });
    });

    proc.once('error', (error) => {
      remember(error.message);
      rejectAll(error);
    });
    proc.once('exit', (code, signal) => {
      started = false;
      rejectAll(new Error(`Transformers worker exited (code=${code}, signal=${signal}). stderr: ${stderrTail.join(' | ')}`));
    });

    await ready;
    started = true;
    return api;
  }

  async function generate({ modelRef, prompt, maxNewTokens = 96 } = {}) {
    if (!started) await start();
    if (!modelRef || !prompt) throw new Error('Generative substrate requires modelRef and prompt.');
    return request({ model: modelRef, prompt, max_new_tokens: maxNewTokens });
  }

  async function close() {
    if (!proc) return;
    const child = proc;
    if (child.stdin.writable) {
      try { await request({ method: 'shutdown' }, 5_000); } catch {}
      try { child.stdin.end(); } catch {}
    }
    proc = null;
    started = false;
    stdoutReader?.close();
    stderrReader?.close();
    stdoutReader = null;
    stderrReader = null;
    if (child.exitCode == null) {
      await new Promise((resolve) => {
        const timer = setTimeout(() => { child.kill('SIGTERM'); resolve(); }, 2_000);
        timer.unref?.();
        child.once('exit', () => { clearTimeout(timer); resolve(); });
      });
    }
  }

  const api = Object.freeze({
    schema: TRANSFORMERS_SUBSTRATE_SCHEMA,
    start,
    generate,
    close,
    get started() { return started; },
    get stderrTail() { return Object.freeze([...stderrTail]); },
  });

  return api;
}

export function buildIdentitySubstratePrompt({ runtime, input, context = [], symbolicState, cognitiveDecision } = {}) {
  if (!runtime?.identityId || !input) throw new Error('Identity substrate prompt requires runtime and input.');
  return [
    `Identity seed: ${runtime.displayName} (${runtime.identityId})`,
    `Anchors: ${(runtime.seed?.anchors || []).join('; ')}`,
    `Canon boundary: ${runtime.seed?.canonBoundary || 'none declared'}`,
    `Active glyphs: ${(symbolicState?.activeGlyphs || []).join(', ') || 'none'}`,
    `Attention: ${(symbolicState?.attentionTags || []).join(', ') || 'none'}`,
    `Cognitive route: ${cognitiveDecision?.route || 'conversation'}`,
    `Continuity namespace: ${runtime.continuity?.namespace || 'unknown'}`,
    `Retrieved context: ${JSON.stringify(context)}`,
    '',
    'Respond as this identity runtime using the seed as orientation, not as a rigid script. Preserve uncertainty where relevant.',
    `Input: ${input}`,
  ].join('\n');
}
