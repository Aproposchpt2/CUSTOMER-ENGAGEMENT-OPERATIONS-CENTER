'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createVoiceOrchestrationAdapter}=require('./orchestrator-voice-adapter.staging.cjs');
const TENANT='5885a020-d363-4c27-910a-c035eda132f5';
const ID='CA1234567890abcdef1234567890abcdef';
const UUID='a98fcd5a-893e-4eb7-835b-146f516ff47d';
const CASE='69e8e6d4-2f83-4c3a-b9ff-f614f392b9df';
const CUSTOMER='bbcdda13-1487-4565-981c-dcc002c68a26';
const call={authenticated:true,staging:true,profile:'support',tenantId:TENANT,callSid:ID};
const details={name:'Synthetic Test',email:'synthetic@example.invalid',phone:'',product:'Synthetic Device',purchaseDate:'2026-10-20',issue:'A fictional hardware support issue',steps:'Tested once',impact:'Fictional',priority:'NORMAL'};
test('rejects unauthenticated or non-staging invocation before RPC',async()=>{
 let calls=0;const a=createVoiceOrchestrationAdapter({rpc:async()=>{calls++;}});
 await assert.rejects(a.submit({trustedCall:{...call,authenticated:false},toolCallId:'tool-1',confirmed:true,intake:details}),/TRUSTED_VOICE_CALL_REQUIRED/);
 await assert.rejects(a.submit({trustedCall:call,toolCallId:'tool-1',confirmed:false,intake:details}),/INTAKE_NOT_CONFIRMED/);
 assert.equal(calls,0);
});
test('stable identity, confirmed write, exact verified IDs and duplicate recovery without another write',async()=>{
 let row=null,writes=0,accepts=0,opId;
 const rpc=async(name,args)=>{
  if(name==='stellar_orch_lookup_staging')return row&&row.operationId===args.p_operation_id?row:{found:false};
  if(name==='stellar_orch_accept_staging'){
   accepts++;opId=args.p_tool_call_id;
   row={found:true,workflowId:UUID,tenantId:TENANT,sessionId:'phone-staging:'+ID,operationId:opId,state:'ACCEPTED'};
   return [{workflow_id:UUID,deduplicated:false}];
  }
  if(name==='stellar_orch_transition_staging'){row.state=args.p_to;return true;}
  if(name==='stellar_create_phone_support_test_intake'){writes++;return [{customer_id:CUSTOMER,case_id:CASE,created_new:true}];}
  if(name==='stellar_orch_reconcile_case_staging'){
    row={...row,state:'COMPLETED',verifiedCompleted:true,testOnly:true,caseId:CASE,customerId:CUSTOMER};
    return true;
  }
  throw Error('UNEXPECTED_RPC_'+name);
 };
 const a=createVoiceOrchestrationAdapter({rpc,staging:true});
 const args={trustedCall:call,toolCallId:'tool-1',confirmed:true,intake:details};
 const first=await a.submit(args);
 assert.equal(first.success,true);assert.equal(first.caseId,CASE);assert.equal(first.customerId,CUSTOMER);
 assert.match(opId,/^voice:[0-9a-f]{64}$/);assert.equal(writes,1);assert.equal(accepts,1);
 const replay=await a.submit(args);
 assert.deepEqual(replay,first);assert.equal(writes,1);assert.equal(accepts,1);
 const recovery=await a.recover({trustedCall:call,toolCallId:'tool-1'});
 assert.deepEqual(recovery,first);assert.equal(writes,1);
});
test('unknown results never become invented successful ticket confirmations',async()=>{
 const a=createVoiceOrchestrationAdapter({rpc:async name=>{
  if(name==='stellar_orch_lookup_staging')return {found:false};
  throw Error('DISCONNECTED');
 },staging:true});
 const result=await a.submit({trustedCall:call,toolCallId:'tool-2',confirmed:true,intake:details});
 assert.equal(result.success,false);assert.equal(result.state,'UNKNOWN');assert.equal('caseId' in result,false);
});
