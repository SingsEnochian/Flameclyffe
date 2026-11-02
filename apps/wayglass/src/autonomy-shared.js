import {runAutonomyCycle} from './autonomy-engine.js';
export async function runSharedAutonomyCycle({client,runId,workerId,adapters,nextDueAt,leaseSeconds=120}){
 if(!client||!runId||!workerId||!adapters||!nextDueAt)throw Error('Shared runtime configuration required');
 const claim=await client.rpc('wayglass_claim_run',{p_run_id:runId,p_worker:workerId,p_lease_seconds:leaseSeconds});
 if(claim.error)throw Error('Claim failed: '+claim.error.message);
 const lease=claim.data?.[0];
 if(!lease)return {status:'not_due_or_leased'};
 const result=await runAutonomyCycle(lease.state,adapters);
 const commit=await client.rpc('wayglass_commit_run',{p_run_id:runId,p_worker:workerId,p_version:lease.version,p_state:result.state,p_next_due:nextDueAt});
 if(commit.error)throw Error('Commit failed: '+commit.error.message);
 if(commit.data!==true)return {status:'stale_lease',receipts:result.receipts};
 return {status:'committed',state:result.state,receipts:result.receipts};
}
