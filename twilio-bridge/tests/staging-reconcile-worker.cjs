'use strict';
// One-shot, isolated staging reconciliation worker. Does NOT create tickets.
// Must be run with explicit staging env and an authorized service-role key.
// No process-local workflow state: safe to launch in a fresh Node process.
const {randomUUID}=require('node:crypto');
async function reconcileOnce({workflowId,tenantId,request,endpoint,token}){
 if(process.env.STELLAR_BRIDGE_STAGING!=='true')throw Error('STAGING_ONLY_REQUIRED');
 if(endpoint!=='https://hvzauakkhlivzeqatfqm.supabase.co')throw Error('STAGING_ENDPOINT_REQUIRED');
 if(tenantId!=='5885a020-d363-4c27-910a-c035eda132f5')throw Error('STAGING_TENANT_REQUIRED');
 if(!/^[0-9a-f-]{36}$/i.test(workflowId))throw Error('WORKFLOW_ID_REQUIRED');
 if(!token)throw Error('STAGING_CREDENTIAL_MISSING');
 const id=randomUUID();
 const response=await request(endpoint+'/rest/v1/rpc/stellar_orch_reconcile_case_staging',{
   method:'POST',headers:{'content-type':'application/json',apikey:token,authorization:'Bearer '+token,'x-client-info':'stellar-staging-reconcile/'+id},
   body:JSON.stringify({p_workflow_id:workflowId}),signal:AbortSignal.timeout(12000)
 });
 if(!response.ok)throw Error('RECONCILIATION_REQUEST_FAILED_'+response.status);
 const records=await response.json();
 if(!Array.isArray(records)||records.length!==1)throw Error('INVALID_RECONCILIATION_RESPONSE');
 const row=records[0];
 if(!['ACCEPTED','RUNNING','COMPLETED','FAILED','UNKNOWN'].includes(row.workflow_state))throw Error('INVALID_WORKFLOW_STATE');
 if(row.workflow_state==='COMPLETED'&&!/^[0-9a-f-]{36}$/i.test(row.verified_case_id||''))throw Error('COMPLETION_NOT_VERIFIED');
 return {workerAttemptId:id,state:row.workflow_state,caseId:row.verified_case_id??null};
}
module.exports={reconcileOnce};
if(require.main===module){
 reconcileOnce({workflowId:process.env.STAGING_WORKFLOW_ID,tenantId:process.env.CSS_TENANT_ID,
  endpoint:process.env.STAGING_SUPABASE_URL,token:process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY,request:fetch})
 .then(x=>{process.stdout.write(JSON.stringify({state:x.state,verifiedCasePresent:!!x.caseId})+'\n')})
 .catch(e=>{process.stderr.write(e.message+'\n');process.exitCode=1});
}
