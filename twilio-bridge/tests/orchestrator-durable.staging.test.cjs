'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createDurableGateway}=require('../orchestrator-durable.staging.cjs');
const context={tenantId:'5885a020-d363-4c27-910a-c035eda132f5',sessionId:'phone-staging:call-a',callId:'call-a',operationId:'support-intake:call-a:1'};
const request={workflowType:'support_ticket_creation',confirmed:true,intake:{issue:'fictional'}};
function fake({existing=false,failed=false,invalidVerification=false}={}){
 let writes=0;let state=existing?'COMPLETED':'ACCEPTED';const events=[];
 const rpc=async(name,args)=>{
  events.push({name,args});
  if(name==='stellar_orch_accept_staging')return [{workflow_id:'workflow-a',workflow_state:state,deduplicated:existing}];
  if(name==='stellar_orch_transition_staging'){
   if(state!==args.p_from)return false;state=args.p_to;return true;
  }
 };
 const gateway=createDurableGateway({rpc,executeTicket:async()=>{writes++;if(failed){const e=Error('definitive rejection');e.definitiveFailure=true;throw e}return {caseId:'case-a'}},
 verifyTicket:async()=>invalidVerification?{caseId:'case-a',tenantId:'another-tenant',operationId:context.operationId,workflowId:'workflow-a'}:{caseId:'case-a',tenantId:context.tenantId,operationId:context.operationId,workflowId:'workflow-a'}});
 return {gateway,events,getWrites:()=>writes};
}
test('durable acceptance and verified terminal event',async()=>{
 const h=fake(),a=await h.gateway.accept({context,request});
 assert.equal(a.state,'ACCEPTED');assert.equal((await h.gateway.process({acceptance:a,context,request})).state,'COMPLETED');
 assert.equal(h.getWrites(),1);
 assert.equal(h.events.at(-1).args.p_to,'COMPLETED');
});
test('duplicate accepted operation never writes again',async()=>{
 const h=fake({existing:true}),a=await h.gateway.accept({context,request});
 assert.equal(a.deduplicated,true);
 await assert.rejects(h.gateway.process({acceptance:a,context,request}),/NOT_NEW_ACCEPTANCE/);
 assert.equal(h.getWrites(),0);
});
test('definitive rejection is FAILED',async()=>{
 const h=fake({failed:true}),a=await h.gateway.accept({context,request});
 assert.equal((await h.gateway.process({acceptance:a,context,request})).state,'FAILED');
});
test('case tenant mismatch is UNKNOWN not success',async()=>{
 const h=fake({invalidVerification:true}),a=await h.gateway.accept({context,request});
 assert.equal((await h.gateway.process({acceptance:a,context,request})).state,'UNKNOWN');
});
test('requires trusted operation identity and confirmation',async()=>{
 const h=fake();
 await assert.rejects(h.gateway.accept({context:{...context,operationId:''},request}),/INVALID_OPERATION/);
 await assert.rejects(h.gateway.accept({context,request:{...request,confirmed:false}}),/INTAKE_NOT_CONFIRMED/);
});
