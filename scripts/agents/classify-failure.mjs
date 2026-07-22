import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const INPUT = process.argv[2] || process.env.BOXFIRE_FAILURE_INPUT;
const OUT = process.argv[3] || process.env.BOXFIRE_FAILURE_OUTPUT || 'generated/hearthfire-agent-data/failures/latest-failure-report.json';
const TAXONOMY = process.env.BOXFIRE_FAILURE_TAXONOMY || 'agents/failure-clinic-taxonomy.json';

if (!INPUT) {
  console.error('Usage: node scripts/agents/classify-failure.mjs <log-or-report.txt> [output.json]');
  process.exit(2);
}

const rules = [
  { id: 'F13', terms: ['unexpected exponentiation expression', 'syntaxerror', 'parse error', 'unexpected token', 'vite-transform'] },
  { id: 'F14', terms: ['npm ci', 'lockfile', 'package-lock', 'out of sync', 'missing from lock file'] },
  { id: 'F15', terms: ['missing starwell', 'missing glyph studio', 'staging', 'packaged installer is missing', 'dist-electron'] },
  { id: 'F10', terms: ['econnrefused', 'not ready', 'health check failed', 'startup', 'connection refused'] },
  { id: 'F11', terms: ['works locally', 'environment variable', 'secret', 'configuration', 'different node', 'wrong runtime'] },
  { id: 'F16', terms: ['schema changed', 'unexpected field', 'parser returned null', 'invalid json', 'feed format'] },
  { id: 'F07', terms: ['invalid argument', 'unknown option', 'tool call', 'permission denied', 'forbidden'] },
  { id: 'F04', terms: ['stale', 'outdated index', 'latest pointer', 'old data'] },
  { id: 'F05', terms: ['wrong route', 'wrong agent', 'wrong tool', 'wrong world'] },
  { id: 'F12', terms: ['race condition', 'concurrent', 'collision', 'overwrote', 'shared state'] },
  { id: 'F18', terms: ['private data', 'consent', 'visibility violation', 'unauthorised publication'] },
  { id: 'F17', terms: ['presented as measurement', 'physical probability', 'unsupported causal', 'epistemic'] }
];

function scoreRule(text, rule) {
  return rule.terms.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0);
}

async function main() {
  const [inputText, taxonomyText] = await Promise.all([
    readFile(INPUT, 'utf8'),
    readFile(TAXONOMY, 'utf8')
  ]);
  const taxonomy = JSON.parse(taxonomyText);
  const lower = inputText.toLowerCase();
  const ranked = rules
    .map((rule) => ({ id: rule.id, score: scoreRule(lower, rule), matched_terms: rule.terms.filter((term) => lower.includes(term)) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

  const primaryId = ranked[0]?.id || 'UNCLASSIFIED';
  const primary = taxonomy.patterns.find((pattern) => pattern.id === primaryId) || null;
  const secondary = ranked.slice(1, 3).map((entry) => ({
    ...entry,
    pattern: taxonomy.patterns.find((pattern) => pattern.id === entry.id) || null
  }));

  const report = {
    schemaVersion: '0.1.0',
    incident_id: `incident-${Date.now()}`,
    observed_at: new Date().toISOString(),
    input_path: INPUT,
    primary_pattern: primary ? { id: primary.id, name: primary.name, matched_terms: ranked[0].matched_terms } : null,
    secondary_patterns: secondary,
    exact_failure_excerpt: inputText.slice(-12000),
    suspected_root_cause: primary
      ? `Evidence matches the ${primary.name} incident class. Root cause remains provisional until reproduced.`
      : 'No deterministic pattern matched. Boxfire review required.',
    minimal_structural_fix: primary
      ? `Reproduce the failure, collect ${primary.minimumEvidence.join(', ')}, then propose the smallest change that removes this class without weakening existing invariants.`
      : 'Do not patch blindly. Add a new failure pattern or supply more evidence.',
    regression_tests: primary ? primary.minimumEvidence.map((item) => `Verify ${item}`) : ['Add deterministic reproduction'],
    rollback_plan: 'Revert the candidate commit or restore the last verified artifact.',
    owner: 'boxfire-quality-sentinel',
    verification_status: 'UNTRIAGED',
    steward_action_required: false,
    ranked_matches: ranked
  };

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ output: OUT, primary: report.primary_pattern, status: report.verification_status }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
