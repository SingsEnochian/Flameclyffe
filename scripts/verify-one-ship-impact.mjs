#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const base = process.env.GITHUB_BASE_REF || 'wayglass/current';
const changed = execFileSync('git', ['diff', '--name-only', `origin/${base}...HEAD'], { encoding: 'utf8' })
  .split(/\r?\n/).filter(Boolean);
const impactPath = 'docs/wayglass/CHANGE_IMPACT.json';
const contractPath = 'docs/wayglass/ONE_SHIP_DIRECTIVE.md';
const registerPath = 'docs/wayglass/current.json';
const implementation = changed.filter(path =>
  /^(apps|lib|scripts|test|tests|src|packages)\//.test(path) ||
  /^\.github\/workflows\//.test(path)
);
if (!changed.includes(contractPath) && !changed.includes(registerPath) && !readFileSync(contractPath, 'utf8').includes('## Automation and program rule')) {
  throw new Error('One Ship governing contract is missing or malformed.');
}
if (!changed.includes(registerPath)) {
  const register = JSON.parse(readFileSync(registerPath, 'utf8'));
  if (register.governance?.one_ship_contract !== contractPath) throw new Error('current.json does not point to the canonical One Ship contract.');
}
if (implementation.length && !changed.includes(impactPath)) {
  throw new Error('Implementation/workflow changes require a same-PR One Ship impact entry in ' + impactPath + '. Changed: ' + implementation.join(', '));
}
if (changed.includes(impactPath)) {
  const impact = JSON.parse(readFileSync(impactPath, 'utf8'));
  if (impact.schema !== 'wayglass.change-impact/v1' || !Array.isArray(impact.entries)) throw new Error('Invalid One Ship change-impact manifest.');
  const declared = new Set(impact.entries.flatMap(entry => entry.changed_paths || []));
  const missing = implementation.filter(path => !declared.has(path));
  if (missing.length) throw new Error('Undeclared changed paths in One Ship impact manifest: ' + missing.join(', '));
  for (const entry of impact.entries) {
    for (const field of ['affected_organs','dependent_checks','provenance','rollback']) {
      if (!Array.isArray(entry[field]) || entry[field].length === 0) throw new Error('Each impact entry needs non-empty ' + field + '.');
    }
  }
}
console.log(JSON.stringify({ ok: true, base, changed_count: changed.length, implementation_paths: implementation, impact_manifest_updated: changed.includes(impactPath) }));
