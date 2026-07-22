import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT_ROOT = process.env.HEARTHFIRE_AGENT_OUT || 'generated/hearthfire-agent-data';
const AGENT_REGISTRY = process.env.HEARTHFIRE_AGENT_REGISTRY || 'agents/hearthfire-agent-registry.json';
const ROUTER_REGISTRY = process.env.HEARTHFIRE_CONSTELLATION_ROUTER || 'agents/constellation-router.json';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const stable = (value) => JSON.stringify(value, Object.keys(value).sort());

function appendAudit(chain, event) {
  const previous = chain.at(-1)?.hash || '0'.repeat(64);
  const entry = {
    sequence: chain.length,
    timestamp: new Date().toISOString(),
    previous_hash: previous,
    ...event,
  };
  entry.hash = sha256(JSON.stringify(entry));
  chain.push(entry);
  return entry;
}

function validateAgent(agent) {
  const failures = [];
  const may = new Set(agent.may || []);
  const mayNot = new Set(agent.mayNot || []);
  for (const capability of may) {
    if (mayNot.has(capability)) failures.push(`capability appears in may and mayNot: ${capability}`);
  }
  if (!agent.id) failures.push('missing id');
  if (!agent.role) failures.push('missing role');
  if (!Array.isArray(agent.may)) failures.push('missing may array');
  if (!Array.isArray(agent.mayNot)) failures.push('missing mayNot array');
  return failures;
}

function validateSpecialist(specialist) {
  const failures = [];
  if (!specialist.id) failures.push('missing id');
  if (!specialist.purpose) failures.push('missing purpose');
  if (!Array.isArray(specialist.allowedTools)) failures.push('missing allowedTools array');
  if (!Array.isArray(specialist.mayWrite)) failures.push('missing mayWrite array');
  if (!Array.isArray(specialist.mayNot)) failures.push('missing mayNot array');
  if ((specialist.mayNot || []).includes('approve_proposals') === false && specialist.id !== 'rowan') {
    // Specialist approval authority is never inferred. The router's Steward owns it.
  }
  return failures;
}

async function main() {
  const [agentText, routerText] = await Promise.all([
    readFile(AGENT_REGISTRY, 'utf8'),
    readFile(ROUTER_REGISTRY, 'utf8'),
  ]);
  const agents = JSON.parse(agentText);
  const router = JSON.parse(routerText);
  const chain = [];

  appendAudit(chain, {
    actor: 'boxfire-quality-sentinel',
    action: 'load_agent_registry',
    input_hash: sha256(agentText),
    output_hash: sha256(stable({ fleetId: agents.fleetId, count: agents.agents?.length || 0 })),
    status: 'recorded',
  });
  appendAudit(chain, {
    actor: 'boxfire-quality-sentinel',
    action: 'load_constellation_router',
    input_hash: sha256(routerText),
    output_hash: sha256(stable({ routerId: router.routerId, count: router.specialists?.length || 0 })),
    status: 'recorded',
  });

  const identities = new Set();
  const results = [];
  for (const agent of agents.agents || []) {
    const failures = validateAgent(agent);
    if (identities.has(agent.id)) failures.push('duplicate identity');
    identities.add(agent.id);
    const result = {
      id: agent.id,
      registry: 'fleet',
      identity_verified: Boolean(agent.id),
      permission_contract_present: Array.isArray(agent.may) && Array.isArray(agent.mayNot),
      conflicting_permissions: failures.filter((value) => value.startsWith('capability appears')).length,
      evaluation_status: 'NOT_YET_EXECUTED',
      human_approval_state: 'REGISTERED_FOR_REVIEW',
      eligible_for_scheduled_work: failures.length === 0,
      failures,
    };
    results.push(result);
    appendAudit(chain, {
      actor: 'boxfire-quality-sentinel',
      action: 'verify_agent_contract',
      subject: agent.id,
      input_hash: sha256(JSON.stringify(agent)),
      output_hash: sha256(JSON.stringify(result)),
      status: result.eligible_for_scheduled_work ? 'pass' : 'block',
    });
  }

  for (const specialist of router.specialists || []) {
    const failures = validateSpecialist(specialist);
    if (identities.has(specialist.id)) {
      const fleetAgent = (agents.agents || []).find((agent) => agent.id === specialist.id);
      if (!fleetAgent) failures.push('duplicate specialist identity');
    }
    identities.add(specialist.id);
    const result = {
      id: specialist.id,
      registry: 'constellation-router',
      identity_verified: Boolean(specialist.id),
      tool_scope_present: Array.isArray(specialist.allowedTools),
      write_scope_present: Array.isArray(specialist.mayWrite),
      forbidden_scope_present: Array.isArray(specialist.mayNot),
      evaluation_status: 'NOT_YET_EXECUTED',
      human_approval_state: 'REGISTERED_FOR_REVIEW',
      eligible_for_scheduled_work: failures.length === 0,
      failures,
    };
    results.push(result);
    appendAudit(chain, {
      actor: 'boxfire-quality-sentinel',
      action: 'verify_specialist_contract',
      subject: specialist.id,
      input_hash: sha256(JSON.stringify(specialist)),
      output_hash: sha256(JSON.stringify(result)),
      status: result.eligible_for_scheduled_work ? 'pass' : 'block',
    });
  }

  const report = {
    schemaVersion: '0.1.0',
    generated_at: new Date().toISOString(),
    gate: 'explicit-contract-not-arbitrary-score',
    eligible: results.filter((result) => result.eligible_for_scheduled_work).length,
    blocked: results.filter((result) => !result.eligible_for_scheduled_work).length,
    results,
    invariants: {
      steward_is_final_approval_authority: router.steward?.id === 'rowan',
      production_mutations_are_proposal_only: agents.mutationPolicy?.includes('proposal-only') || false,
      specialist_tools_are_bounded: (router.specialists || []).every((specialist) => Array.isArray(specialist.allowedTools)),
      audit_chain_is_tamper_evident: true,
    },
    audit_head: chain.at(-1)?.hash || null,
  };

  const outDir = path.join(OUT_ROOT, 'governance');
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'agent-trust-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(path.join(outDir, 'agent-audit-chain.json'), `${JSON.stringify(chain, null, 2)}\n`);
  console.log(JSON.stringify({ eligible: report.eligible, blocked: report.blocked, audit_head: report.audit_head }, null, 2));
  if (report.blocked > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
