import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createTailnetGate} from '../../../scripts/wayglass-tailnet-gate.mjs';

async function freePort() {
  const probe=http.createServer();
  probe.listen(0,'127.0.0.1');
  await once(probe,'listening');
  const port=probe.address().port;
  await new Promise(resolve=>probe.close(resolve));
  return port;
}

test('tailnet gate rejects unrelated routes without upstream contact, strips spoofed identity headers, and preserves host 401',async()=>{
  const seen=[];
  const upstream=http.createServer((req,res)=>{
    seen.push({path:req.url,headers:req.headers});
    res.writeHead(req.url==='/api/v1/house/session'?401:200,{'content-type':'application/json'});
    res.end('{}');
  });
  upstream.listen(0,'127.0.0.1');
  await once(upstream,'listening');
  const gate=createTailnetGate({port:await freePort(),hostPort:upstream.address().port});
  try {
    await gate.listen();
    const base='http://127.0.0.1:'+gate.server.address().port;
    const denied=await fetch(base+'/api/boxfire/status');
    assert.equal(denied.status,404);
    assert.equal(seen.length,0,'denied route must never reach STARWELL');
    const allowed=await fetch(base+'/api/v1/house/session',{
      headers:{'x-forwarded-user':'forged-owner','tailscale-user':'forged-owner','x-real-ip':'1.2.3.4'}
    });
    assert.equal(allowed.status,401,'gateway cannot turn an unauthenticated House session into success');
    assert.equal(seen.length,1);
    assert.equal(seen[0].path,'/api/v1/house/session');
    assert.equal(seen[0].headers['x-forwarded-user'],undefined);
    assert.equal(seen[0].headers['tailscale-user'],undefined);
    assert.equal(seen[0].headers['x-real-ip'],undefined);
    assert.equal(seen[0].headers['x-wayglass-tailnet-gate'],'localhost-proxy-not-authorization');
  } finally {
    await gate.close();
    await new Promise(resolve=>upstream.close(resolve));
  }
});
