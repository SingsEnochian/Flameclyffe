#!/usr/bin/env node
// WAYGLASS training admission gate. Rejects unreviewed records; does NOT train weights.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
export const MODALITIES = Object.freeze(['text','image','voice','tool','world','rsi','metacognition','continuity']);
export function inspectTrainingRecord(record) {
 const errors=[];
 if (record?.schema !== 'wayglass.training-example/v1') errors.push('invalid schema');
 if (typeof record?.id !== 'string' || !/^[a-zA-Z0-9_.:-]{1,128}$/.test(record.id)) errors.push('invalid id');
 if (!MODALITIES.includes(record?.modality)) errors.push('invalid modality');
 if (record?.synthetic !== true && record?.consent?.training !== true) errors.push('training consent required for non-synthetic data');
 if (record?.source?.license_ok !== true) errors.push('license verification required');
 if (record?.source?.provenance_verified !== true) errors.push('verified provenance required');
 if (!['public','internal','private','restricted'].includes(record?.privacy)) errors.push('privacy classification required');
 if (record?.privacy === 'restricted') errors.push('restricted records are not admitted');
 if (record?.contains_credentials !== false) errors.push('credential exclusion must be explicit');
 if (record?.revoked !== false) errors.push('revocation status must be explicit and false');
 if (typeof record?.input !== 'string' || !record.input.trim()) errors.push('input missing');
 if (typeof record?.target !== 'string' || !record.target.trim()) errors.push('target missing');
 const payload=JSON.stringify({input:record?.input,target:record?.target});
 if (/(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9_]{16,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/.test(payload)) errors.push('credential pattern detected');
 if (record?.modality === 'tool' && (!record?.tool?.name || !['success','failure','uncertain','denied'].includes(record?.tool?.outcome))) errors.push('tool outcome and name required');
 if (record?.modality === 'rsi' && (!record?.evaluation?.baseline_id || !record?.evaluation?.candidate_id || !record?.evaluation?.verdict)) errors.push('RSI baseline/candidate/verdict required');
 return errors;
}
export function inspectDataset(records) {
 const errors=[];const ids=new Set();
 if (!Array.isArray(records) || !records.length) return ['dataset empty'];
 for (const [i,record] of records.entries()) {
  if(ids.has(record?.id)) errors.push('duplicate id '+record.id);
  ids.add(record?.id);
  errors.push(...inspectTrainingRecord(record).map(e=>`record[${i}]: ${e}`));
 }
 return errors;
}
if(process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href){
 const path=process.argv[2];
 if(!path){console.error('Usage: node scripts/wayglass-training-admission.mjs <dataset.json>');process.exitCode=2;}
 else try{const errors=inspectDataset(JSON.parse(readFileSync(path,'utf8')));if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log('Training admission checks: PASS. This is NOT a model training or promotion receipt.');}
 catch(e){console.error(e.message);process.exitCode=1;}
}
