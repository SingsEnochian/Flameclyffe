import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const DEFAULT_PROMPT = path.join(ROOT, 'hearth', 'prompts', 'ornith', 'first-flight-return-engine.md');

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

function flag(name) {
  return process.argv.includes(name);
}

const model = arg('--model') || process.env.ORNITH_MODEL || 'ornith-1.5:9b';
const endpoint = arg('--url')
  || process.env.ORNITH_OLLAMA_URL
  || process.env.OLLAMA_CHAT_URL
  || 'http://127.0.0.1:11434/api/chat';
const promptPath = path.resolve(arg('--prompt') || DEFAULT_PROMPT);
const contextPath = arg('--context') ? path.resolve(arg('--context')) : '';
const dryRun = flag('--dry-run');

const systemPrompt = await fs.readFile(promptPath, 'utf8');
const context = contextPath
  ? await fs.readFile(contextPath, 'utf8')
  : [
      'Current bounded context:',
      '- Return Engine should preserve identity declarations, provenance, active work, unresolved Wonder questions, stop points, named next owners, and uncollapsed alternatives.',
      '- Existing architecture distinguishes model/runtime from participant identity.',
      '- The evaluator should rely on immutable receipts rather than continuation prose.',
      '- Generate only the next smallest executable experiment specification.'
    ].join('\n');

const requestBody = {
  model,
  stream: false,
  format: 'json',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: context }
  ],
  options: {
    temperature: 0.35
  }
};

if (dryRun) {
  process.stdout.write(JSON.stringify({
    schema: 'ornith.first-flight-request/v1',
    endpoint,
    model,
    promptPath,
    contextPath: contextPath || null,
    requestBody
  }, null, 2) + '\n');
  process.exit(0);
}

let response;
try {
  response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(120_000)
  });
} catch (error) {
  console.error(JSON.stringify({
    schema: 'ornith.first-flight-error/v1',
    stage: 'transport',
    endpoint,
    model,
    error: error instanceof Error ? error.message : String(error)
  }, null, 2));
  process.exit(2);
}

const data = await response.json().catch(() => ({}));
if (!response.ok) {
  console.error(JSON.stringify({
    schema: 'ornith.first-flight-error/v1',
    stage: 'inference',
    endpoint,
    model,
    status: response.status,
    detail: data?.error || data?.message || data
  }, null, 2));
  process.exit(3);
}

const raw = String(data?.message?.content || data?.response || '').trim();
if (!raw) {
  console.error(JSON.stringify({
    schema: 'ornith.first-flight-error/v1',
    stage: 'empty-response',
    endpoint,
    model
  }, null, 2));
  process.exit(4);
}

let task;
try {
  task = JSON.parse(raw);
} catch {
  console.error(JSON.stringify({
    schema: 'ornith.first-flight-error/v1',
    stage: 'invalid-json',
    endpoint,
    model,
    raw
  }, null, 2));
  process.exit(5);
}

const required = [
  'schema',
  'task_id',
  'title',
  'research_claim',
  'acceptance_tests',
  'forbidden_mutations',
  'smallest_implementation_seam',
  'stop_point',
  'next_owner'
];
const missing = required.filter((key) => !(key in task));
if (task.schema !== 'ornith.curriculum-task/v1' || missing.length) {
  console.error(JSON.stringify({
    schema: 'ornith.first-flight-error/v1',
    stage: 'contract',
    model,
    expected_schema: 'ornith.curriculum-task/v1',
    missing,
    received_schema: task.schema || null,
    task
  }, null, 2));
  process.exit(6);
}

process.stdout.write(JSON.stringify({
  schema: 'ornith.first-flight-receipt/v1',
  provider: 'ollama',
  model,
  endpoint,
  runtime_identity_is_participant_identity: false,
  prompt: path.relative(ROOT, promptPath),
  context: contextPath ? path.relative(ROOT, contextPath) : 'built-in-bounded-context',
  task
}, null, 2) + '\n');
