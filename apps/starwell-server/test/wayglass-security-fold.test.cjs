const test=require('node:test');
const assert=require('node:assert/strict');
const { securityFold, SECURITY_DOMAINS, PHASES }=require('../security/wayglass-security-fold.cjs');
test('every cybersecurity domain follows eight phases without self-authorizing',()=>{
 for(const domain of SECURITY_DOMAINS){
  const r=securityFold({domain,action:'propose',principal:'claimed-steward',resource:'wayglass'});
  assert.deepEqual(r.trace.map(x=>x.phase),PHASES);
  assert.equal(r.authorization.allowed,false);
  assert.equal(r.execution.performed,false);
  assert.equal(r.continuity.receipt_persisted,false);
 }
});
test('unknown domain and missing resource are rejected',()=>{
 assert.throws(()=>securityFold({domain:'untrusted',action:'deploy',resource:'host'}));
 assert.throws(()=>securityFold({domain:'network',action:'deploy'}));
});
