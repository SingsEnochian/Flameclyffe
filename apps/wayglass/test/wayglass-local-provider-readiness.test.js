import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inspectWayglassLocalProviders, PROVIDER_ENDPOINTS } from '../../../scripts/wayglass-local-provider-readiness.mjs';

test('readiness checks only fixed loopback GET endpoints, without model turns or tokens',async()=>{
  const seen=[];
  const result=await inspectWayglassLocalProviders({request:async(url,options)=>{
    seen.push({url,options});
    return {ok:true,json:async()=>url.includes('11434')
      ? {models:[{name:'ornith-test:9b'},{name:'ornith-test:9b'}]}
      : {data:[{id:'localai:test'}]}};
  }});
  assert.deepEqual(seen.map(x=>x.url),PROVIDER_ENDPOINTS.map(x=>x.url));
  assert.ok(seen.every(x=>x.options.method==='GET'&&x.options.redirect==='error'&&!('Authorization' in x.options.headers)));
  assert.ok(seen.every(x=>x.url.startsWith('http://127.0.0.1:')));
  assert.deepEqual(result.checks.map(x=>x.status),['responsive','responsive']);
  assert.deepEqual(result.checks[0].models,['ornith-test:9b']);
  assert.equal(result.evidence.inference_tested,false);
  assert.equal(result.evidence.gpu_measured,false);
  assert.equal(result.evidence.write_performed,false);
});

test('offline, redirect and malformed model catalogues fail without disclosing response details',async()=>{
  let n=0;
  const result=await inspectWayglassLocalProviders({request:async()=>{
    n++;if(n===1)throw new Error('sensitive upstream token');
    return {ok:true,json:async()=>({surprise:'invalid'})};
  }});
  assert.deepEqual(result.checks.map(c=>c.status),['unavailable','unexpected-response']);
  assert.doesNotMatch(JSON.stringify(result),/sensitive upstream token/);
  assert.deepEqual(result.checks.map(c=>c.models),[[],[]]);
});

test('timeout and fetch argument bounds are enforced',async()=>{
  await assert.rejects(inspectWayglassLocalProviders({request:42}),/fetch-compatible/);
  await assert.rejects(inspectWayglassLocalProviders({timeoutMs:0}),/out of bounds/);
});

test('opt-in CLI defaults to a dry run; no text from Loom or private writings',async()=>{
  const src=await readFile(new URL('../../../scripts/wayglass-local-provider-readiness.mjs',import.meta.url),'utf8');
  assert.match(src,/process\.argv\.includes\('--probe'\)/);
  assert.match(src,/Dry run only/);
  assert.doesNotMatch(src,/\/api\/v1\/wayglass\/respond/);
  assert.doesNotMatch(src,/MISTRAL_API_KEY|SPICYCHAT_TOKEN|external_provider_consent/);
});
