import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  REQUIRED_PATHS,validateWayglassHost,classifyAccessResponse,checkWayglassCloudflareBoundary,
} from '../../../scripts/wayglass-cloudflare-preflight.mjs';

test('the Cloudflare gate rejects public/static, local, insecure and URL-credential hosts',()=>{
  for(const url of [
    'http://wayglass.example.com','https://localhost','https://127.0.0.1',
    'https://example.github.io','https://wayglass.pages.dev',
    'https://user:secret@wayglass.example.com','https://wayglass.example.com/wayglass/',
    'https://wayglass.example.com?token=bad','https://wayglass.example.com:8443',
  ])assert.throws(()=>validateWayglassHost(url));
  assert.equal(validateWayglassHost('https://ship.example.com/'),'https://ship.example.com');
});
test('only a real HTTPS Cloudflare Access login redirect is accepted',()=>{
  const requestUrl='https://ship.example.com/wayglass/';
  const check=(status,location)=>classifyAccessResponse({status,location,requestUrl}).protected;
  assert.equal(check(302,'https://my-team.cloudflareaccess.com/cdn-cgi/access/login/ship'),true);
  assert.equal(check(200,'https://my-team.cloudflareaccess.com/cdn-cgi/access/login/ship'),false);
  assert.equal(check(302,'https://evil.example/cdn-cgi/access/login/ship'),false);
  assert.equal(check(302,'https://my-team.cloudflareaccess.com/other'),false);
  assert.equal(check(403,''),false);
  assert.equal(check(302,'http://my-team.cloudflareaccess.com/cdn-cgi/access/login/ship'),false);
});
test('all root, Wayglass UI and API paths must be protected',async()=>{
  const seen=[];
  const fetcher=async(url,opts)=>{
    seen.push({path:new URL(url).pathname,opts});
    return {status:302,headers:new Headers({location:'https://team.cloudflareaccess.com/cdn-cgi/access/login/ship'})};
  };
  const report=await checkWayglassCloudflareBoundary('https://ship.example.com',{fetcher});
  assert.equal(report.protected,true);
  assert.deepEqual(seen.map(x=>x.path),REQUIRED_PATHS);
  assert.ok(seen.every(x=>x.opts.redirect==='manual'&&x.opts.credentials==='omit'));
});
test('an unprotected API route fails the whole promotion',async()=>{
  const report=await checkWayglassCloudflareBoundary('https://ship.example.com',{
    fetcher:async url=>new URL(url).pathname.includes('respond')
      ?{status:200,headers:new Headers()}
      :{status:302,headers:new Headers({location:'https://team.cloudflareaccess.com/cdn-cgi/access/login/ship'})},
  });
  assert.equal(report.protected,false);
  assert.equal(report.receipts.at(-1).protected,false);
});
