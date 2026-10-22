'use strict';
// STAGING-ONLY voice-to-durable-orchestrator adapter. No transport listener,
// phone routing, or production side effects. The bridge must authenticate its
// Twilio stream before supplying trustedCall; never trust model-supplied IDs.
const {createHash}=require('node:crypto');
const {createSupportIntegration,intake}=require('./tests/staging-runner/support-orchestration-integration.staging.cjs');
const TENANT='5885a020-d363-4c27-910a-c035eda132f5';
const CALL=/^CA[0-9a-f]{32}$/i;
function authorize(call,toolCallId){
  if(call?.authenticated!==true||call?.staging!==true||call?.profile!=='support'
    ||call?.tenantId!==TENANT||!CALL.test(call.callSid)
    ||typeof toolCallId!=='string'||toolCallId.length<1||toolCallId.length>200)
    throw Error('TRUSTED_VOICE_CALL_REQUIRED');
  // Stable across reconnects ONLY if the host preserves the original call SID
  // and tool-call ID. A new tool-call ID denotes a new business operation.
  const operationId='voice:'+createHash('sha256').update(call.callSid+'\\0'+toolCallId).digest('hex');
  return {authenticated:true,operationAuthorized:true,tenantId:TENANT,
    callId:call.callSid,sessionId:'phone-staging:'+call.callSid,operationId};
}
function createVoiceOrchestrationAdapter({rpc,staging=false,deadlineMs=6500}={}){
  if(staging!==true||typeof rpc!=='function'||!Number.isInteger(deadlineMs)||deadlineMs<100||deadlineMs>9000)
    throw Error('STAGING_ADAPTER_DISABLED');
  // Carry trusted operation context through the transport, never through model args.
  const serviceFor=context=>createSupportIntegration({rpc:(name,args)=>rpc(name,args,context),staging:true});
  async function bounded(work,context){
    let timeoutId;
    try{
      return await Promise.race([work,new Promise(resolve=>{timeoutId=setTimeout(()=>resolve({
        success:false,state:'UNKNOWN',operationId:context.operationId,
        notificationSent:false,technicianFollowupConfirmed:false
      }),deadlineMs);})]);
    }finally{clearTimeout(timeoutId);}
  }
  const projection=result=>{
    if(result?.success===true&&result?.state==='COMPLETED'&&
      typeof result.caseId==='string'&&typeof result.customerId==='string'&&result.testOnly===true)
      return {success:true,state:'COMPLETED',caseId:result.caseId,customerId:result.customerId,
        testOnly:true,notificationSent:false,technicianFollowupConfirmed:false};
    return {success:false,state:result?.state||'UNKNOWN',
      notificationSent:false,technicianFollowupConfirmed:false};
  };
  async function submit({trustedCall,toolCallId,confirmed,intake:details}){
    const context=authorize(trustedCall,toolCallId);
    const service=serviceFor(context);
    if(confirmed!==true)throw Error('INTAKE_NOT_CONFIRMED');
    const clean=intake(details);
    try{
      const outcome=await bounded(service.submit({context,request:{
        workflowType:'support_ticket_creation',confirmed:true,intake:clean
      }}),context);
      return projection(outcome);
    }catch{
      // A failed/ambiguous write MUST NOT be retried from this method.
      return {success:false,state:'UNKNOWN',notificationSent:false,technicianFollowupConfirmed:false};
    }
  }
  async function recover({trustedCall,toolCallId}){
    const context=authorize(trustedCall,toolCallId);
    const service=serviceFor(context);
    try{return projection(await bounded(service.recover(context),context));}
    catch{return {success:false,state:'UNKNOWN',notificationSent:false,technicianFollowupConfirmed:false};}
  }
  return {submit,recover};
}
module.exports={createVoiceOrchestrationAdapter};
