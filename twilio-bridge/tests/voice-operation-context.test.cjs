'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createVoiceOrchestrationAdapter}=require('../orchestrator-voice-adapter.staging.cjs');
test('parallel Support operations carry isolated trusted context through every RPC',async()=>{
 const rows=new Map(),seen=[];let writes=0;
 async function rpc(name,args,context){
  assert.equal(context.authenticated,true);assert.equal(context.operationAuthorized,true);assert.match(context.operationId,/^voice:[0-9a-f]{64}$/);assert.equal(context.tenantId,'5885a020-d363-4c27-910a-c035eda132f5');seen.push(context);
  let row=rows.get(context.operationId);
  if(name==='stellar_orch_lookup_staging')return row||{found:false};
  if(name==='stellar_orch_accept_staging'){
   assert.equal(args.p_tool_call_id,context.operationId);assert.equal(args.p_call_id,context.callId);
   row={found:true,workflowId:context.callId.endsWith('01')?'11111111-1111-4111-8111-111111111111':'22222222-2222-4222-8222-222222222222',tenantId:context.tenantId,operationId:context.operationId,sessionId:context.sessionId,state:'ACCEPTED'};rows.set(context.operationId,row);return{workflow_id:row.workflowId};
  }
  assert.ok(row);assert.equal(row.sessionId,context.sessionId);
  if(name==='stellar_orch_transition_staging'){assert.equal(args.p_workflow_id,row.workflowId);row.state='RUNNING';return true;}
  if(name==='stellar_create_phone_support_test_intake'){assert.equal(args.p_session_id,context.sessionId);writes++;row.caseId='33333333-3333-4333-8333-333333333333';row.customerId='44444444-4444-4444-8444-444444444444';return{};}
  if(name==='stellar_orch_reconcile_case_staging'){assert.equal(args.p_workflow_id,row.workflowId);row.state='COMPLETED';row.verifiedCompleted=true;row.testOnly=true;return true;}
  throw Error('Unexpected RPC');
 }
 const adapter=createVoiceOrchestrationAdapter({rpc,staging:true});
 const run=callSid=>adapter.submit({trustedCall:{authenticated:true,staging:true,profile:'support',tenantId:'5885a020-d363-4c27-910a-c035eda132f5',callSid},toolCallId:'confirmed-test-tool',confirmed:true,intake:{name:'Synthetic Test',email:'synthetic@example.test',phone:'+15555550123',product:'Test device',purchaseDate:'2026-10-01',issue:'Synthetic device issue for test',steps:'Restarted test device',impact:'Test only',priority:'NORMAL'}});
 const result=await Promise.all([run('CA'+'e1'.repeat(15)+'01'),run('CA'+'e2'.repeat(15)+'02')]);
 assert.ok(result.every(x=>x.success&&x.state==='COMPLETED'));assert.equal(rows.size,2);assert.equal(writes,2);
 assert.equal(new Set(seen.map(x=>x.operationId)).size,2);
});
