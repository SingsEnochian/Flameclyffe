// Server-only Supabase adapter for Dreaming receipt journal.
// Requires a user-session-scoped client, never service_role. Database RPC must
// enforce auth.uid(), active consent and uniqueness in one transaction.
// Do not deploy before SQL contract, RLS and authenticated integration tests pass.
const ID=/^[A-Za-z0-9._:-]{1,128}$/;
const assertId=(s,n)=>{if(typeof s!=='string'||!ID.test(s))throw new TypeError(n+' invalid');return s;};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function unwrap(result,operation){
 if(!result||typeof result!=='object')throw new Error(operation+' missing response');
 if(result.error)throw new Error(operation+' failed');
 return result.data;
}
export function createSupabaseDreamReceiptStore({client,assertOwnerSession}={}){
 if(!client||typeof client.rpc!=='function')throw new TypeError('Session-scoped Supabase RPC client required');
 if(typeof assertOwnerSession!=='function')throw new TypeError('Verified owner-session assertion required');
 async function scoped(owner_id,dream_id,action,authorise){
  assertId(owner_id,'owner_id');assertId(dream_id,'dream_id');
  if(typeof authorise!=='function'||await authorise({owner_id,dream_id,action})!==true)throw new Error('Permission revoked');
  // Must verify live owner identity; never trust caller-supplied owner_id alone.
  if(await assertOwnerSession({owner_id,dream_id,action})!==true)throw new Error('Owner session invalid');
 }
 async function appendAtomic({owner_id,dream_id,receipt,authorise}={}){
  await scoped(owner_id,dream_id,'record',authorise);
  if(!receipt||receipt.dream_id!==dream_id)throw new TypeError('Dream receipt mismatch');
  const data=unwrap(await client.rpc('wayglass_dream_receipt_append_v1',{
   p_dream_id:dream_id,p_receipt:receipt
  }),'append');
  if(!data||!equal(data,receipt))throw new Error('Database receipt mismatch');
  return data;
 }
 async function readScoped({owner_id,dream_id,authorise}={}){
  await scoped(owner_id,dream_id,'read',authorise);
  const data=unwrap(await client.rpc('wayglass_dream_receipt_read_v1',{p_dream_id:dream_id}),'read');
  if(!Array.isArray(data))throw new TypeError('Database read must return array');
  return data;
 }
 return Object.freeze({appendAtomic,readScoped});
}
