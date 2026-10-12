#!/usr/bin/env node
// Codex's bounded local entrance to the existing shared Wayglass workspace ledger.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

async function main() {
  const [action, workspace, project, artifactId, filename] = process.argv.slice(2);
  if (!['inspect', 'write', 'handoff'].includes(action) || !['atelier', 'builder'].includes(workspace) || !/^[a-z0-9][a-z0-9_-]{0,79}$/.test(project || '')) {
    throw new Error('Usage: wayglass-workspace.mjs inspect <atelier|builder> <project> | write <workspace> <project> <artifact-id> <text-file> | handoff <workspace> <project> <handoff-json-file>');
  }
  const origin = new URL(process.env.WAYGLASS_WORKSPACE_ORIGIN || 'http://127.0.0.1:3000');
  if (origin.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname) || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('Workspace CLI requires a loopback HTTP origin.');
  }
  const token = process.env.WAYGLASS_CODEX_ACCESS_TOKEN;
  if (!token || Buffer.byteLength(token) < 32) throw new Error('Configure the separate WAYGLASS_CODEX_ACCESS_TOKEN on the host and this client. Do not paste it into chat.');
  const endpoint = `${origin.origin}/api/v1/wayglass/workspaces/${workspace}/${project}`;
  async function request(suffix = '', payload) {
    const response = await fetch(endpoint + suffix, {
      method: payload ? 'POST' : 'GET',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
      signal: AbortSignal.timeout(10000),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(`Workspace ${response.status}: ${result.error || 'request failed'}`);
    return result;
  }
  const state = await request();
  if (action === 'inspect') { console.log(JSON.stringify(state, null, 2)); return; }
  const sourceFile = action === 'write' ? filename : artifactId;
  if (!sourceFile || fs.statSync(sourceFile).size > 80000) throw new Error('Supply a UTF-8 source file no larger than 80 KB.');
  const bytes = fs.readFileSync(sourceFile);
  const text = bytes.toString('utf8');
  const metadata = {
    expected_head: state.head_event_id,
    source_refs: [`sha256:${createHash('sha256').update(bytes).digest('hex')}`],
    tool_refs: ['wayglass-workspace-cli/v0.1'],
  };
  if (action === 'write') {
    const mediaType = { '.md': 'text/markdown', '.json': 'application/json', '.svg': 'image/svg+xml' }[path.extname(sourceFile).toLowerCase()] || 'text/plain';
    const receipt = await request('/artifacts', { ...metadata, artifact_id: artifactId, media_type: mediaType, content: text });
    console.log(JSON.stringify({ event_id: receipt.event_id, author: receipt.event.author, workspace_id: receipt.event.workspace_id, project_id: receipt.event.project_id }, null, 2));
  } else {
    const handoff = JSON.parse(text);
    const receipt = await request('/handoff', { ...metadata, stop_point: handoff.stop_point, next_owner: handoff.next_owner, open_questions: handoff.open_questions });
    console.log(JSON.stringify({ event_id: receipt.event_id, author: receipt.event.author, next_owner: receipt.event.next_owner }, null, 2));
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
