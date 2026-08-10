'use strict';

/*
  Pipeline Ledger v0.1
  Purpose: an honest build/deploy + local-status page.
  Confidence rule (Truth-Lit Surface Rule, contracts/surface_visual_state_v0_1.schema.json):
  - "observed": read from a real source (GitHub's public API, a local reachability probe) —
    real, but not independently cross-verified.
  - "unknown": unsupported, rate-limited, errored, or unreachable. Always paired with a
    plain-language reason. Never a fabricated or cached-and-relabeled value.
*/

const REPO = 'SingsEnochian/Flameclyffe';
const RUNS_URL = `https://api.github.com/repos/${REPO}/actions/runs?per_page=8`;

const LOCAL_ENDPOINTS = [
  { label: 'Grove (Yggdrasil Chamber Matrix)', url: 'http://127.0.0.1:4000' },
  { label: 'Ollama (Yggdrasil engine)', url: 'http://127.0.0.1:11434' },
  { label: 'DSpark proxy', url: 'http://127.0.0.1:8000' },
  { label: 'Mythic Bridge', url: 'http://127.0.0.1:5174' },
  { label: 'STARWELL dev server', url: 'http://127.0.0.1:5173' },
];

const $ = (id) => document.getElementById(id);
const statusEl = $('ledger-status');
const runsListEl = $('runs-list');
const localListEl = $('local-list');

function setStatus(text) {
  statusEl.textContent = text;
}

function confidenceBadge(confidence) {
  return `<span class="confidence ${confidence}">${confidence}</span>`;
}

function shortSha(sha) {
  return typeof sha === 'string' ? sha.slice(0, 7) : 'unknown';
}

function renderRunsLoading() {
  runsListEl.innerHTML = `<p class="tiny">Fetching…</p>`;
}

function renderRuns(runs) {
  if (!runs.length) {
    runsListEl.innerHTML = `<p class="tiny">No workflow runs returned by the API.</p>`;
    return;
  }

  runsListEl.innerHTML = runs
    .map((run) => {
      const label = `${run.conclusion || run.status}`;
      return `<div class="run-row">
        <div>
          <strong>${run.name}</strong>
          <div class="run-meta">${shortSha(run.head_sha)} · ${new Date(run.updated_at).toLocaleString()}</div>
        </div>
        <span>${label}${confidenceBadge('observed')}</span>
      </div>`;
    })
    .join('');
}

function renderRunsError(reason) {
  runsListEl.innerHTML = `<p class="tiny">${reason}${confidenceBadge('unknown')}</p>`;
}

async function fetchRuns() {
  renderRunsLoading();
  setStatus('Fetching recent workflow runs…');

  try {
    const response = await fetch(RUNS_URL, { cache: 'no-store' });

    if (!response.ok) {
      renderRunsError(`GitHub API returned ${response.status} ${response.statusText}.`);
      setStatus('Workflow run fetch did not succeed.');
      return;
    }

    const data = await response.json();
    renderRuns(data.workflow_runs || []);
    setStatus(`Loaded ${data.workflow_runs?.length ?? 0} recent run(s) from the public GitHub API.`);
  } catch (error) {
    renderRunsError(`Network error: ${error.message}`);
    setStatus('Workflow run fetch did not succeed.');
  }
}

function renderLocalRow(label, reachable) {
  const confidence = reachable ? 'observed' : 'unknown';
  const text = reachable ? 'Reachable' : 'Not reachable from this browser';
  return `<div class="local-row"><span>${label}</span><span>${text}${confidenceBadge(confidence)}</span></div>`;
}

async function probeLocalEndpoints() {
  localListEl.innerHTML = LOCAL_ENDPOINTS.map(({ label }) => renderLocalRow(label, false)).join('');

  const results = await Promise.all(
    LOCAL_ENDPOINTS.map(async ({ label, url }) => {
      try {
        await fetch(url, { mode: 'no-cors', cache: 'no-store' });
        return { label, reachable: true };
      } catch (error) {
        return { label, reachable: false };
      }
    })
  );

  localListEl.innerHTML = results.map(({ label, reachable }) => renderLocalRow(label, reachable)).join('');
}

document.querySelector('[data-action="refresh"]').addEventListener('click', () => {
  fetchRuns();
  probeLocalEndpoints();
});

fetchRuns();
probeLocalEndpoints();
