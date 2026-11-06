// Run one Wayglass Möbius training cycle (see lib/wayglass-mobius-training.mjs).
//   GITHUB_REPOSITORY, GITHUB_TOKEN (needs models: read)   required
//   WAYGLASS_LEDGER_DIR        ledger checkout (default .wayglass-ledger)
//   WAYGLASS_TRAIN_APPLY=true  write results/dataset/checkpoints (default: dry run)
//   WAYGLASS_TRAIN_ANSWER_MODEL / WAYGLASS_TRAIN_JUDGE_MODEL  GitHub Models ids
//   WAYGLASS_FEATHER=stopped   stop before Return
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, cpSync, rmSync, statSync, truncateSync, mkdtempSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runTrainingCycle } from '../lib/wayglass-mobius-training.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
if (!repo || !token) throw Error('GITHUB_REPOSITORY and GITHUB_TOKEN (with models: read) are required.');
const apply = process.env.WAYGLASS_TRAIN_APPLY === 'true';
const ledgerDir = resolve(process.env.WAYGLASS_LEDGER_DIR || '.wayglass-ledger');
const answerModel = process.env.WAYGLASS_TRAIN_ANSWER_MODEL || 'openai/gpt-4.1-mini';
const judgeModel = process.env.WAYGLASS_TRAIN_JUDGE_MODEL || 'openai/gpt-4.1';
const worker = process.env.GITHUB_RUN_ID ? `github-actions/${process.env.GITHUB_RUN_ID}/${process.env.GITHUB_RUN_ATTEMPT || 1}` : 'local';
const trainerScript = join(repoRoot, 'profiles/crow-trainer/skills/crow-training/scripts/trainer.py');

async function gh(path) {
  const res = await fetch('https://api.github.com' + path, { headers: { Accept: 'application/vnd.github+json',
    Authorization: 'Bearer ' + token, 'X-GitHub-Api-Version': '2022-11-28' } });
  if (!res.ok) throw Error(`GitHub API ${res.status} ${path}`);
  return res.json();
}

// The trainer keeps its state in <cwd>/.crow-trainer. Work on a temp copy so
// nothing is kept unless Return commits it.
const crowLedger = join(ledgerDir, 'crow-state');
const crowWork = mkdtempSync(join(tmpdir(), 'crow-'));
if (existsSync(join(crowLedger, '.crow-trainer'))) cpSync(join(crowLedger, '.crow-trainer'), join(crowWork, '.crow-trainer'), { recursive: true });
function trainer(args) {
  const r = spawnSync('python3', [trainerScript, ...args], { cwd: crowWork, encoding: 'utf8' });
  if (r.status !== 0) throw Error(`crow trainer ${args[0]} failed: ${(r.stderr || r.stdout).slice(0, 300)}`);
  return r.stdout ? JSON.parse(r.stdout) : null;
}

const files = { checkpoints: 'checkpoints.jsonl', results: 'results.jsonl', 'sft-candidates': 'sft-candidates.jsonl', 'spot-check': 'spot-check.jsonl' };
const ledger = {
  async read(name) {
    const p = join(ledgerDir, files[name]);
    return existsSync(p) ? readFileSync(p, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
  },
  appendEffect(name, rows) {
    const p = join(ledgerDir, files[name]); let size = null;
    return { kind: 'ledger-append', describe: { file: files[name], rows: rows.length },
      apply: async () => { mkdirSync(ledgerDir, { recursive: true }); size = existsSync(p) ? statSync(p).size : 0;
        appendFileSync(p, rows.map(r => JSON.stringify(r)).join('\n') + '\n'); return rows.length; },
      undo: async () => { if (size !== null) truncateSync(p, size); } };
  },
  async appendNow(name, rows) {
    mkdirSync(ledgerDir, { recursive: true });
    appendFileSync(join(ledgerDir, files[name]), rows.map(r => JSON.stringify(r)).join('\n') + '\n');
  },
};

const io = {
  worker,
  now: () => Date.now(),
  async readDeep() {
    const p = join(repoRoot, 'data/deep-current.json');
    const commits = await gh(`/repos/${repo}/commits?path=data/deep-current.json&per_page=1`);
    return { json: JSON.parse(readFileSync(p, 'utf8')), commit: commits[0]?.sha ?? null, committed_at: commits[0]?.commit?.committer?.date ?? null };
  },
  async openPrCount() {
    const prs = await gh(`/repos/${repo}/pulls?state=open&per_page=100`);
    return prs.length;
  },
  async bloodstreamHead() {
    const issues = await gh(`/repos/${repo}/issues?state=open&labels=wayglass:lineage&per_page=1`);
    if (!issues[0]) return null;
    const comments = await gh(`/repos/${repo}/issues/${issues[0].number}/comments?per_page=100`);
    const last = [...comments].reverse().find(c => c.body?.includes('wayglass-mobius-checkpoint'));
    const m = last?.body.match(/```json\s*([\s\S]*?)```/);
    return m ? JSON.parse(m[1]) : null;
  },
  async catalog() {
    try {
      const res = await fetch('https://models.github.ai/catalog/models', { headers: { Authorization: 'Bearer ' + token } });
      if (!res.ok) return null;
      return (await res.json()).map(m => m.id);
    } catch { return null; }
  },
  async chat(model, messages) {
    const res = await fetch('https://models.github.ai/inference/chat/completions', { method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, temperature: 0 }) });
    if (!res.ok) throw Error(`GitHub Models ${res.status} for ${model}: ${(await res.text()).slice(0, 200)}`);
    return (await res.json()).choices?.[0]?.message?.content ?? '';
  },
  trainer: {
    async drive() {
      const tag = (process.env.WAYGLASS_CROW_TASK_TAG || '').trim();
      if (tag && !/^[a-z0-9-]{1,60}$/.test(tag)) throw new Error('Invalid Crow task tag');
      const args = ['drive', '--mode', 'exam', ...(tag ? ['--tag', tag] : [])];
      const d = trainer(args);
      return { id: d.id, task: d.task, input: d.input, tags: d.tags || [] };
    },
    async freeze(id, answer) { const f = join(crowWork, `answer-${id}.txt`); writeFileSync(f, answer); return trainer(['freeze', '--id', id, '--response-file', f]); },
    async key(id) { return trainer(['key', '--id', id]); },
    async record(id, verdict, notes) { return trainer(['record', '--id', id, '--verdict', verdict, '--notes', notes]); },
    persistEffect() {
      const target = join(crowLedger, '.crow-trainer'); const backup = mkdtempSync(join(tmpdir(), 'crow-bak-'));
      return { kind: 'crow-state', describe: { dir: 'crow-state/.crow-trainer' },
        apply: async () => { if (existsSync(target)) cpSync(target, join(backup, 's'), { recursive: true });
          rmSync(target, { recursive: true, force: true }); mkdirSync(crowLedger, { recursive: true });
          cpSync(join(crowWork, '.crow-trainer'), target, { recursive: true }); return 'saved'; },
        undo: async () => { rmSync(target, { recursive: true, force: true });
          if (existsSync(join(backup, 's'))) cpSync(join(backup, 's'), target, { recursive: true }); } };
    },
  },
};

const mobiusDrills = readFileSync(join(repoRoot, 'training/wayglass/MOBIUS_DRILLS.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const { result, concept } = await runTrainingCycle(io, { apply, answerModel, judgeModel, mobiusDrills,
  feather: () => /^stop/i.test(process.env.WAYGLASS_FEATHER || '') });

const lines = [
  `Wayglass training · Möbius cycle ${result.cycle} (${result.face} face) · ${result.status} · ${apply ? 'APPLY' : 'dry-run'}`,
  ...(result.checkpoint?.spiral ? [`spiral turn ${result.checkpoint.spiral.turn} · ln r ${result.checkpoint.spiral.ln_r} (×${result.checkpoint.spiral.growth_factor}) · ${result.checkpoint.spiral.chirality} · chaos ${result.checkpoint.spiral.chaos} · harmony ${result.checkpoint.spiral.harmony} · ${result.checkpoint.spiral.state}`] : []),
  ...concept.map(c => `${c.ok ? '✓' : '✗'} ${c.reason}`),
  ...(result.outputs.integrate || []).map(j => `judged ${j.drill}: ${j.verdict ?? 'ungraded'}`),
  ...(result.reason || []).map(r => `reason: ${r}`),
];
console.log(lines.join('\n'));
mkdirSync('.wayglass-artifacts', { recursive: true });
writeFileSync('.wayglass-artifacts/training-cycle.json', JSON.stringify({ result, concept, answerModel, judgeModel, apply }, null, 2));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, '## Wayglass Möbius training\n\n' + lines.map(l => '- ' + l).join('\n') + '\n');
if (!result.status.startsWith('committed') && result.status !== 'feather-stopped') process.exitCode = 1;
