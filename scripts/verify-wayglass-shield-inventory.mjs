#!/usr/bin/env node
// Inventory lint only. Not a runtime authorization mechanism.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

export function validateRegistry(registry) {
  const errors = [];
  if (registry?.schema !== 'wayglass.capability-registry/v1') errors.push('unknown schema');
  if (registry?.policy !== 'default-deny') errors.push('policy must be default-deny');
  if (!Array.isArray(registry?.entries) || !registry.entries.length) errors.push('entries missing');
  const ids = new Set();
  for (const [index, item] of (registry?.entries ?? []).entries()) {
    for (const key of ['id','path','purpose','execution','network','risk','authority','permissions','review','rollback']) {
      if (typeof item?.[key] !== 'string' || !item[key].trim()) errors.push(`entries[${index}].${key} missing`);
    }
    if (!Array.isArray(item?.data)) errors.push(`entries[${index}].data missing`);
    if (ids.has(item.id)) errors.push(`duplicate id: ${item.id}`);
    ids.add(item.id);
    if (item.permissions === '*' || item.permissions === 'allow-all') errors.push(`unbounded permissions: ${item.id}`);
    if (!['low','medium','high','critical'].includes(item.risk)) errors.push(`invalid risk: ${item.id}`);
  }
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = resolve(dirname(fileURLToPath(import.meta.url)), '../security/wayglass-capabilities.json');
  try {
    const errors = validateRegistry(JSON.parse(readFileSync(file, 'utf8')));
    if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
    else console.log('SHIELD-01 inventory syntax and required fields: PASS (not runtime enforcement)');
  } catch (err) { console.error(err.message); process.exitCode = 1; }
}
