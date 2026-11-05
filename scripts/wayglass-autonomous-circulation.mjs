import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { eligible, marker, priority } from './wayglass-circulation-policy.mjs';
import { executionMarker, executeDiagnostic, diagnosticReceipt }
  from './wayglass-circulation-executor.mjs';

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
if (!repo || !token) throw Error('GitHub Actions repository and workflow token required.');

const api = async (path, options = {}) => {
  const response = await fetch('https://api.github.com' + path, {
    ...options, headers: {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + token,
      'X-GitHub-Api-Version': '2022-11-28', ...options.headers
    },
  });
  if (!response.ok) throw Error('GitHub API ' + response.status + ' ' + path);
  return response.json();
};
const root = '/repos/' + repo;
async function pages(path) {
  const all = [];
  for (let page = 1; page <= 100; page++) {
    const separator = path.includes('?') ? '&' : '?';
    const batch = await api(path + separator + 'per_page=100&page=' + page);
    if (!Array.isArray(batch)) throw Error('Expected paginated list');
    all.push(...batch);
    if (batch.length < 100) return all;
  }
  throw Error('Pagination bound exceeded; refusing incomplete selection');
}

const issues = (await pages(root + '/issues?state=open'))
  .filter(eligible)
  .sort((a, b) => priority(b) - priority(a) || a.number - b.number);
let selected = null;
let hadSelection = false;
for (const issue of issues) {
  const comments = await pages(root + '/issues/' + issue.number + '/comments');
  // Older selection-only receipts are eligible for real execution. Completed
  // diagnostic receipts are not replayed or silently claimed as new work.
  if (comments.some(c => String(c.body || '').includes(executionMarker))) continue;
  selected = issue;
  hadSelection = comments.some(c => String(c.body || '').includes(marker));
  break;
}
if (!selected) {
  console.log('No unexecuted eligible tasks; no mutation.');
  process.exit(0);
}
if (process.env.WAYGLASS_APPLY !== 'true') {
  console.log('Dry run · selected #' + selected.number + ' · execution NOT claimed.');
  process.exit(0);
}

// The only executable operation is a fixed, reviewed node:test path. The
// selected issue's body is not treated as an instruction or shell command.
const result = executeDiagnostic(selected);
const sha = process.env.GITHUB_SHA || 'unknown';
const runUrl = 'https://github.com/' + repo + '/actions/runs/' + (process.env.GITHUB_RUN_ID || 'unknown');
const body = [
  ...(hadSelection ? [] : [marker]),
  diagnosticReceipt({ issue: selected, result, sha, runUrl, hadSelection }),
].join('\n');
const report = {
  schema: 'wayglass.autonomous-circulation-execution/v1',
  source_sha: sha, run_url: runUrl,
  selected_issue: selected.number,
  prior_selection_present: hadSelection,
  result,
  identity_authority_changed: false,
  code_changed: false,
  model_inference_claimed: false,
};
mkdirSync('.wayglass-artifacts', { recursive: true });
writeFileSync('.wayglass-artifacts/circulation-execution.json', JSON.stringify(report, null, 2));
await api(root + '/issues/' + selected.number + '/comments', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ body }),
});
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
  '## Wayglass autonomous diagnostic\n\n' +
  '- Issue: #' + selected.number + '\n' +
  '- Result: **' + result.status + '**\n' +
  '- Executed: `node --test ' + result.path + '`\n' +
  '- Evidence: ' + result.output_sha256 + '\n' +
  '- No model inference, production deploy or canon change.\n');
console.log('Executed bounded diagnostic for #' + selected.number +
  ' · ' + result.status + ' · receipt posted.');
if (result.status !== 'passed') process.exitCode = 1;
