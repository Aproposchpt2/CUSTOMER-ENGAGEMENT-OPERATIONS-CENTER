'use strict';
// Isolated staging persistence adapter. Not imported by the production voice bridge.
// Supply an authenticated staging Supabase RPC client. The stable operationId is
// assigned by trusted application code, never by the speaking model.
function str(v,name){if(typeof v!=='string'||!v.trim()||v.length>200)throw Error('INVALID_'+name);return v.trim();}
function createDurableGateway({rpc,executeTicket,verifyTicket}) {
 if(![rpc,executeTicket,verifyTicket].every(f=>typeof f==='function'))throw Error('DEPENDENCY_MISSING');
 async function invoke(name,payload) {
   const result=await rpc(name,payload);
   if(result?.error)throw Error('PERSISTENCE_UNAVAILABLE');
   return result?.data ?? result;
 }
 async function transition(id,from,to,caseId=null){
   const r=await invoke('stellar_orch_transition_staging',{p_workflow_id:id,p_from:from,p_to:to,p_case_id:caseId});
   if(r!==true)throw Error('TRANSITION_CONFLICT');
 }
 async function accept({context,request}){
   const tenantId=str(context?.tenantId,'TENANT');
   const sessionId=str(context?.sessionId,'SESSION');
   const callId=str(context?.callId,'CALL');
   const operationId=str(context?.operationId,'OPERATION');
   if(request?.workflowType!=='support_ticket_creation')throw Error('WORKFLOW_NOT_ALLOWED');
   if(request?.confirmed!==true)throw Error('INTAKE_NOT_CONFIRMED');
   const data=await invoke('stellar_orch_accept_staging',{
     p_tenant_id:tenantId,p_session_id:sessionId,p_call_id:callId,p_tool_call_id:operationId
   });
   const row=Array.isArray(data)?data[0]:data;
   if(!row?.workflow_id||!['ACCEPTED','RUNNING','COMPLETED','FAILED','UNKNOWN'].includes(row.workflow_state))throw Error('INVALID_ACCEPT_RESULT');
   // Returning an existing operation never repeats the business write. A recovery
   // worker must first reconcile any accepted/running operation after a crash.
   return {workflowId:row.workflow_id,state:row.workflow_state,deduplicated:row.deduplicated===true,
     operationId};
 }
 async function process({acceptance,context,request}){
   if(!acceptance?.workflowId||acceptance.deduplicated||acceptance.state!=='ACCEPTED')throw Error('NOT_NEW_ACCEPTANCE');
   const tenantId=str(context?.tenantId,'TENANT');
   const sessionId=str(context?.sessionId,'SESSION');
   const operationId=str(context?.operationId,'OPERATION');
   if(request?.confirmed!==true)throw Error('INTAKE_NOT_CONFIRMED');
   await transition(acceptance.workflowId,'ACCEPTED','RUNNING');
   try {
     const submitted=await executeTicket(request.intake,{tenantId,sessionId,
       callId:str(context.callId,'CALL'),operationId,workflowId:acceptance.workflowId});
     // Verification must read authoritative persisted case, match tenant and
     // operation; a mere success response is insufficient.
     const verified=await verifyTicket(submitted,{tenantId,sessionId,operationId,workflowId:acceptance.workflowId});
     if(typeof verified?.caseId!=='string'||!verified.caseId.trim()||
       verified.tenantId!==tenantId||verified.operationId!==operationId||
       verified.workflowId!==acceptance.workflowId)throw Error('VERIFICATION_MISSING');
     await transition(acceptance.workflowId,'RUNNING','COMPLETED',verified.caseId);
     return {state:'COMPLETED',caseId:verified.caseId};
   } catch(error){
     const state=error?.definitiveFailure===true?'FAILED':'UNKNOWN';
     await transition(acceptance.workflowId,'RUNNING',state);
     return {state};
   }
 }
 return {accept,process};
}
module.exports={createDurableGateway};
