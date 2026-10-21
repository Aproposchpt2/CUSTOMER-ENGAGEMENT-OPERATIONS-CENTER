'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createGateway}=require('../orchestrator-gateway.staging.cjs');
const context={tenantId:'tenant-staging',sessionId:'session-1',callId:'call-1',callToolId:'tool-1'};
const request={workflowType:'support_ticket_creation',confirmed:true,intake:{issue:'Synthetic test'}};
async function settle(){for(let i=0;i<12;i++)await Promise.resolve();}
test('accepted then verified completion and correlated event',async()=>{
 const events=[];const gateway=createGateway({executeTicket:async()=>({caseId:'SIM-001'}),verifyTicket:async x=>x,onEvent:x=>events.push(x)});
 const a=gateway.initiate({context,request});assert.equal(a.state,'ACCEPTED');await settle();
 const status=gateway.status(context);assert.equal(status.state,'COMPLETED');assert.equal(status.events.at(-1).caseId,'SIM-001');
 assert.ok(events.every(e=>e.tenantId===context.tenantId&&e.sessionId===context.sessionId));
});
test('duplicate tool invocation cannot resubmit ticket',async()=>{
 let count=0;const gateway=createGateway({executeTicket:async()=>{count++;return {caseId:'SIM-002'}},verifyTicket:async x=>x,onEvent:()=>{}});
 const a=gateway.initiate({context,request});const b=gateway.initiate({context,request});
 await settle();assert.equal(b.deduplicated,true);assert.equal(a.workflowId,b.workflowId);assert.equal(count,1);
});
test('definitive failure never announces completion',async()=>{
 const gateway=createGateway({executeTicket:async()=>{throw Error('bad')},verifyTicket:async x=>x,onEvent:()=>{}});
 gateway.initiate({context,request});await settle();
 const s=gateway.status(context);assert.equal(s.state,'FAILED');assert.ok(!s.events.some(e=>e.state==='COMPLETED'));
});
test('uncertain outcome must be reconciled, not silently retried',async()=>{
 const gateway=createGateway({executeTicket:async()=>{const e=Error('timeout');e.outcomeUnknown=true;throw e},verifyTicket:async x=>x,onEvent:()=>{}});
 gateway.initiate({context,request});await settle();
 const s=gateway.status(context);assert.equal(s.state,'UNKNOWN');assert.equal(s.events.at(-1).reason,'RECONCILIATION_REQUIRED');
});
test('unconfirmed or unauthorized request blocked',()=>{
 const gateway=createGateway({executeTicket:async()=>{},verifyTicket:async()=>{},onEvent:()=>{}});
 assert.throws(()=>gateway.initiate({context,request:{...request,confirmed:false}}),/INTAKE_NOT_CONFIRMED/);
 assert.throws(()=>gateway.initiate({context,request:{...request,workflowType:'send_email'}}),/WORKFLOW_NOT_ALLOWED/);
});
