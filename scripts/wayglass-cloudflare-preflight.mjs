#!/usr/bin/env node
/**
 * Fail-closed, unauthenticated Cloudflare Access probe for the full Wayglass host.
 * This checks only the edge boundary. It cannot prove owner login, model routes,
 * iPad support, or local runtime health. It never sends tokens or cookies.
 */
import {pathToFileURL} from 'node:url';

export const REQUIRED_PATHS=Object.freeze([
  '/',
  '/wayglass/',
  '/api/v1/wayglass/healthz',
  '/api/v1/wayglass/respond',
]);

export function validateWayglassHost(input){
  if(typeof input!=='string'||!input.trim())throw new Error('Supply --url https://your-protected-host.example');
  let parsed;
  try{parsed=new URL(input)}catch{throw new Error('Cloudflare host must be a valid URL');}
  if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.search||parsed.hash||
      parsed.pathname!=='/'||parsed.port||!parsed.hostname.includes('.')||
      parsed.hostname==='localhost'||parsed.hostname.endsWith('.local')||
      parsed.hostname.endsWith('.pages.dev')||parsed.hostname.endsWith('.github.io')){
    throw new Error('Use an HTTPS owner-only Cloudflare hostname (no path, port, credentials, query or fragment).');
  }
  return parsed.origin;
}
export function classifyAccessResponse({status,location,requestUrl}){
  let destination;
  try{destination=new URL(location||'',requestUrl)}catch{return {protected:false,reason:'No valid Access redirect'};}
  const accessHost=destination.hostname==='cloudflareaccess.com'||
    destination.hostname.endsWith('.cloudflareaccess.com');
  const accessPath=destination.pathname.startsWith('/cdn-cgi/access/');
  const isRedirect=[301,302,303,307,308].includes(status);
  return Object.freeze({
    protected:Boolean(isRedirect&&accessHost&&accessPath&&destination.protocol==='https:'),
    reason:isRedirect&&accessHost&&accessPath?'Cloudflare Access login challenge':'Missing Cloudflare Access login challenge',
  });
}
export async function checkWayglassCloudflareBoundary(origin,{fetcher=fetch,timeoutMs=12000}={}){
  const base=validateWayglassHost(origin);
  const receipts=[];
  for(const path of REQUIRED_PATHS){
    const url=new URL(path,base).href;
    let result;
    try{
      const response=await fetcher(url,{
        method:'GET',redirect:'manual',cache:'no-store',credentials:'omit',
        signal:AbortSignal.timeout(timeoutMs),
        headers:{'Accept':'text/html,application/json'},
      });
      const checked=classifyAccessResponse({
        status:response.status,location:response.headers.get('location'),requestUrl:url,
      });
      result={path,status:response.status,protected:checked.protected,reason:checked.reason};
      // No response body or authentication headers are ever recorded.
    }catch(error){
      result={path,status:null,protected:false,reason:'Network or timeout failure'};
    }
    receipts.push(Object.freeze(result));
  }
  return Object.freeze({
    schema:'wayglass.cloudflare-preflight/v1',host:base,
    protected:receipts.every(receipt=>receipt.protected),
    receipts:Object.freeze(receipts),
    claim:'Unauthenticated edge challenge only; not a live Wayglass acceptance test',
  });
}
async function main(){
  const i=process.argv.indexOf('--url');
  const url=i>=0?process.argv[i+1]:null;
  const report=await checkWayglassCloudflareBoundary(url);
  for(const item of report.receipts){
    process.stdout.write((item.protected?'PASS':'FAIL')+' '+item.path+
      ' ('+(item.status??'no response')+'): '+item.reason+'\n');
  }
  if(!report.protected){
    process.stderr.write('Refusing promotion: not all host paths demonstrate an Access login challenge.\n');
    process.exitCode=1;
  }else process.stdout.write('Cloudflare Access edge gate observed. Authenticated runtime and device checks still required.\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main().catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
}
