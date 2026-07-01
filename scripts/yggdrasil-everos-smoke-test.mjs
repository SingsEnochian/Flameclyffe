#!/usr/bin/env node
// scripts/yggdrasil-everos-smoke-test.mjs
// Run from repo root after copying patches into sandbox/everos:
//   node scripts/yggdrasil-everos-smoke-test.mjs

import { getYggMemoryContext } from '../sandbox/everos/yggdrasil-everos-bridge.mjs';

const checks = [
  {
    name: 'safety boundary retrieval',
    query: 'EverOS sandbox safety no raw private chat ingestion',
    lane: 'safety_boundary',
    reason: 'verify safety spine'
  },
  {
    name: 'anti-flattening room memory retrieval',
    query: "Vee's room decorated through discovered crafted objects not flat profile fields",
    lane: 'object_room_memory',
    reason: 'verify room/object memory'
  },
  {
    name: 'blocked private lane without consent',
    query: 'private room memory',
    lane: 'constellation_private',
    reason: 'blocked test'
  }
];

for (const check of checks) {
  const result = await getYggMemoryContext(check);
  console.log('\n---', check.name, '---');
  console.log(JSON.stringify({
    ok: result.ok,
    blocked: result.blocked,
    reason: result.reason,
    card_count: result.cards?.length || 0,
    prompt_preview: result.prompt_context?.slice(0, 500) || ''
  }, null, 2));
}
