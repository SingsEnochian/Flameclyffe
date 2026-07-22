import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT_ROOT = process.env.HEARTHFIRE_AGENT_OUT || 'generated/hearthfire-agent-data';
const MANIFESTS = (process.env.HEARTHFIRE_RELEASE_MANIFESTS || 'package.json,apps/starwell-server/package.json')
  .split(',').map((value) => value.trim()).filter(Boolean);
const TIMEOUT_MS = Number(process.env.HEARTHFIRE_RELEASE_TIMEOUT_MS || '12000');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url, attempts = 2) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: { accept: 'application/json', 'user-agent': 'Hearthfire-Release-Radar/0.1' },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(750 * attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

function collectDependencies(manifestPath, manifest) {
  const groups = ['dependencies', 'devDependencies', 'optionalDependencies'];
  return groups.flatMap((group) => Object.entries(manifest[group] || {}).map(([name, declared]) => ({
    manifest: manifestPath,
    group,
    name,
    declared,
  })));
}

function majorOf(version) {
  const match = String(version || '').match(/(?:^|[^0-9])(\d+)(?:\.|$)/);
  return match ? Number(match[1]) : null;
}

function classify(item, metadata) {
  const latest = metadata?.['dist-tags']?.latest || null;
  const declaredMajor = majorOf(item.declared);
  const latestMajor = majorOf(latest);
  const latestRecord = latest ? metadata?.versions?.[latest] : null;
  const unpinned = ['latest', '*'].includes(item.declared) || /^\s*[~^><=]/.test(item.declared);
  const majorChange = declaredMajor !== null && latestMajor !== null && latestMajor > declaredMajor;
  const deprecated = Boolean(latestRecord?.deprecated);
  const reasons = [];
  if (unpinned) reasons.push('dependency is not exactly pinned');
  if (majorChange) reasons.push(`newer major version ${latestMajor} is available`);
  if (deprecated) reasons.push(`latest release is marked deprecated: ${latestRecord.deprecated}`);
  if (!latest) reasons.push('registry did not expose a latest dist-tag');

  let severity = 'INFO';
  if (deprecated) severity = 'HIGH';
  else if (majorChange) severity = 'MEDIUM';
  else if (unpinned) severity = 'LOW';

  return {
    ...item,
    latest,
    severity,
    reasons,
    needs_attention: reasons.length > 0,
    registry: `https://registry.npmjs.org/${encodeURIComponent(item.name)}`,
    package_home: metadata?.homepage || null,
    repository: typeof metadata?.repository === 'string' ? metadata.repository : metadata?.repository?.url || null,
  };
}

function proposalFromFinding(finding, index) {
  const exactChange = finding.latest
    ? `Evaluate changing ${finding.name} in ${finding.manifest} from ${finding.declared} to an exact reviewed version derived from ${finding.latest}.`
    : `Investigate ${finding.name} because no latest version was resolved.`;
  return {
    proposal_id: `dependency-${String(index + 1).padStart(3, '0')}`,
    title: `${finding.name} dependency review`,
    category: 'dependency-release-or-pinning',
    exact_change: exactChange,
    why_proposed: finding.reasons,
    evidence: [finding.registry, finding.package_home, finding.repository].filter(Boolean),
    expected_benefit: 'Reduce runtime drift, deprecation exposure, and unreproducible builds.',
    risks: ['A version change can break build, runtime, or generated output.', 'Exact pins require deliberate update cadence.'],
    privacy_or_consent_impact: 'none',
    affected_systems: [finding.manifest],
    affected_worlds: [],
    requirements: {
      code_execution: true,
      package_installation: true,
      network_access: true,
      credentials: false,
      schema_change: false,
      canon_change: false
    },
    boxfire_qa_status: 'REVIEW_REQUIRED',
    confidence_axes: {
      source_reliability: 'npm-registry-metadata',
      applicability: finding.latest ? 'package-resolved' : 'unresolved',
      build_confidence: 'untested'
    },
    reversibility: 'high-with-lockfile-and-rollback',
    default_action_if_no_response: 'DO_NOT_CHANGE',
    choices: {
      A: 'APPROVE FOR PRODUCTION',
      B: 'APPROVE FOR SANDBOX TEST ONLY',
      C: 'APPROVE AS CANDIDATE, DO NOT ENABLE',
      D: 'DEFER',
      E: 'DENY',
      F: 'BLOCK SOURCE OR CAPABILITY',
      G: 'REQUEST MORE EVIDENCE'
    }
  };
}

async function main() {
  const loaded = [];
  for (const manifestPath of MANIFESTS) {
    try {
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
      loaded.push(...collectDependencies(manifestPath, manifest));
    } catch (error) {
      loaded.push({ manifest: manifestPath, group: 'manifest', name: '__manifest_error__', declared: String(error) });
    }
  }

  const unique = new Map();
  for (const item of loaded) unique.set(`${item.manifest}:${item.group}:${item.name}`, item);
  const findings = [];

  for (const item of unique.values()) {
    if (item.name === '__manifest_error__') {
      findings.push({ ...item, latest: null, severity: 'HIGH', reasons: ['manifest could not be read'], needs_attention: true });
      continue;
    }
    try {
      const metadata = await fetchJson(`https://registry.npmjs.org/${encodeURIComponent(item.name)}`);
      findings.push(classify(item, metadata));
    } catch (error) {
      findings.push({ ...item, latest: null, severity: 'MEDIUM', reasons: [`registry lookup failed: ${error.message}`], needs_attention: true });
    }
  }

  findings.sort((left, right) => {
    const weight = { HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1 };
    return weight[right.severity] - weight[left.severity] || left.name.localeCompare(right.name);
  });

  const attention = findings.filter((finding) => finding.needs_attention);
  const proposals = attention.map(proposalFromFinding);
  const report = {
    schemaVersion: '0.1.0',
    generated_at: new Date().toISOString(),
    mode: 'dry-run-proposal-only',
    manifests: MANIFESTS,
    summary: {
      dependencies_checked: findings.length,
      proposals_created: proposals.length,
      high: findings.filter((item) => item.severity === 'HIGH').length,
      medium: findings.filter((item) => item.severity === 'MEDIUM').length,
      low: findings.filter((item) => item.severity === 'LOW').length
    },
    findings,
    steward_approval_queue: proposals,
    response_template: proposals.length
      ? proposals.map((_, index) => `${index + 1}B`).join(', ') + '  # replace each letter with Rowan\'s decision'
      : 'No dependency proposals tonight.'
  };

  const outDir = path.join(OUT_ROOT, 'release-radar');
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'dependency-release-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(path.join(outDir, 'steward-dependency-queue.json'), `${JSON.stringify({
    generated_at: report.generated_at,
    proposals,
    response_template: report.response_template
  }, null, 2)}\n`);
  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
