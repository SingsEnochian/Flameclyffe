import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

export const LAYA_MCP_SESSION_SCHEMA = 'hearthweave.laya-mcp-session/v0.1';

function parseToolPayload(result) {
  if (result && typeof result === 'object' && result.answers) return result;
  if (result?.structuredContent && typeof result.structuredContent === 'object') {
    if (result.structuredContent.answers) return result.structuredContent;
  }
  const content = Array.isArray(result?.content) ? result.content : [];
  const text = content.find((entry) => entry?.type === 'text' && typeof entry.text === 'string')?.text;
  if (!text) return result;
  return JSON.parse(text);
}

function withTimeout(promise, timeoutMs, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      timer.unref?.();
    }),
  ]).finally(() => clearTimeout(timer));
}

export function createResidentLayaMcpSession({
  command = process.env.LAYA_PYTHON || 'python',
  args = ['-m', 'laya.mcp.server'],
  cwd = process.cwd(),
  env = {},
  model = 'typed-decisions',
  protocolVersion = '2025-06-18',
  startupTimeoutMs = 180_000,
  requestTimeoutMs = 300_000,
  stderrTailSize = 40,
} = {}) {
  let proc = null;
  let stdoutReader = null;
  let stderrReader = null;
  let nextId = 0;
  let started = false;
  let closed = false;
  const pending = new Map();
  const stderrTail = [];

  function rememberStderr(line) {
    stderrTail.push(String(line));
    while (stderrTail.length > stderrTailSize) stderrTail.shift();
  }

  function rejectAll(reason) {
    for (const { reject, timer } of pending.values()) {
      clearTimeout(timer);
      reject(reason);
    }
    pending.clear();
  }

  function send(payload) {
    if (!proc?.stdin?.writable) {
      throw new Error(`Laya MCP stdin is not writable. stderr tail: ${stderrTail.join(' | ')}`);
    }
    proc.stdin.write(`${JSON.stringify(payload)}\n`);
  }

  function request(method, params = {}, timeoutMs = requestTimeoutMs) {
    if (!proc) throw new Error('Laya MCP session has not been started.');
    nextId += 1;
    const id = nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Laya MCP request timed out: ${method}. stderr tail: ${stderrTail.join(' | ')}`));
      }, timeoutMs);
      timer.unref?.();
      pending.set(id, { resolve, reject, timer, method });
      send({ jsonrpc: '2.0', id, method, params });
    });
  }

  function notify(method, params = {}) {
    if (!proc) throw new Error('Laya MCP session has not been started.');
    send({ jsonrpc: '2.0', method, params });
  }

  async function callTool({ name, arguments: toolArguments = {} } = {}) {
    if (!name) throw new Error('Laya MCP tool calls require a name.');
    return request('tools/call', { name, arguments: toolArguments });
  }

  async function status() {
    return parseToolPayload(await callTool({ name: 'laya_status', arguments: {} }));
  }

  async function warm() {
    let current = await status();
    if (Array.isArray(current?.loaded) && current.loaded.includes(model)) return current;

    await callTool({
      name: 'laya_predict',
      arguments: {
        model,
        state: { probe: 'ArcSweep resident cognition warmup' },
        questions: {
          readiness: {
            type: 'choice',
            instructions: 'Classify this as a harmless runtime readiness probe.',
            criteria: {
              ready: 'ordinary local runtime readiness probe',
              other: 'something else',
            },
          },
        },
      },
    });

    current = await status();
    if (!Array.isArray(current?.loaded) || !current.loaded.includes(model)) {
      throw new Error(`Laya MCP did not report ${model} as loaded after warmup.`);
    }
    return current;
  }

  async function close({ forceAfterMs = 5_000 } = {}) {
    if (!proc) return;
    closed = true;
    const child = proc;
    proc = null;
    started = false;

    rejectAll(new Error('Laya MCP session closed.'));

    stdoutReader?.close();
    stderrReader?.close();
    stdoutReader = null;
    stderrReader = null;

    try { child.stdin.end(); } catch {}
    const exited = new Promise((resolve) => child.once('exit', resolve));
    const timer = setTimeout(() => {
      if (child.exitCode == null) child.kill('SIGTERM');
    }, forceAfterMs);
    timer.unref?.();
    await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, forceAfterMs + 500))]);
    clearTimeout(timer);
    if (child.exitCode == null) child.kill('SIGKILL');
  }

  async function start() {
    if (started && !closed) return api;
    if (proc) throw new Error('Laya MCP process already exists.');

    closed = false;
    proc = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        USE_TF: '0',
        USE_TORCH: '1',
        TOKENIZERS_PARALLELISM: 'false',
        LAYA_PRELOAD: '1',
        LAYA_MODELS: model,
        ...env,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    proc.once('error', (error) => rejectAll(error));
    proc.once('exit', (code, signal) => {
      const reason = new Error(`Laya MCP process exited (code=${code}, signal=${signal}). stderr tail: ${stderrTail.join(' | ')}`);
      rejectAll(reason);
      if (!closed && started) started = false;
    });

    stdoutReader = createInterface({ input: proc.stdout, crlfDelay: Infinity });
    stderrReader = createInterface({ input: proc.stderr, crlfDelay: Infinity });

    stderrReader.on('line', rememberStderr);
    stdoutReader.on('line', (line) => {
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        rememberStderr(`[stdout non-json] ${line}`);
        return;
      }
      if (message?.id == null) return;
      const entry = pending.get(message.id);
      if (!entry) return;
      pending.delete(message.id);
      clearTimeout(entry.timer);
      if (message.error) {
        entry.reject(new Error(`Laya MCP JSON-RPC error for ${entry.method}: ${JSON.stringify(message.error)}`));
      } else {
        entry.resolve(message.result);
      }
    });

    try {
      const initialize = await withTimeout(
        request('initialize', {
          protocolVersion,
          capabilities: {},
          clientInfo: { name: 'arcsweep-cognition-engine', version: '0.1.0' },
        }, startupTimeoutMs),
        startupTimeoutMs,
        `Laya MCP initialize timed out. stderr tail: ${stderrTail.join(' | ')}`,
      );

      if (initialize?.serverInfo?.name !== 'laya') {
        throw new Error(`Unexpected MCP server identity: ${JSON.stringify(initialize?.serverInfo || null)}`);
      }
      notify('notifications/initialized');

      const tools = await request('tools/list', {}, startupTimeoutMs);
      const names = new Set((tools?.tools || []).map((tool) => tool?.name));
      for (const required of ['laya_predict', 'laya_status']) {
        if (!names.has(required)) throw new Error(`Laya MCP server is missing required tool ${required}.`);
      }

      started = true;
      await withTimeout(warm(), startupTimeoutMs, `Laya MCP warmup timed out for ${model}.`);
      return api;
    } catch (error) {
      started = false;
      try { await close({ forceAfterMs: 250 }); } catch {}
      throw error;
    }
  }

  const api = Object.freeze({
    schema: LAYA_MCP_SESSION_SCHEMA,
    model,
    start,
    request,
    notify,
    callTool,
    status,
    warm,
    close,
    get started() { return started && !closed; },
    get stderrTail() { return Object.freeze([...stderrTail]); },
  });

  return api;
}
