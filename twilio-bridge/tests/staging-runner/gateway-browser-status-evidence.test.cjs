'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {createBrowserAcceptance} = require('./gateway-browser-acceptance.staging.cjs');
// Unit tests only: mock transport does not establish real G06 acceptance.
const clock=()=>Date.parse('2026-10-20T17:00:00Z');
const safe=()=>({success:false,state:'UNKNOWN',notificationSent:false,technicianFollowupConfirmed:false});
async function prepared(reply) {
  const actions=[];
  const runner=createBrowserAcceptance({now:clock,post:async(action)=>{
    actions.push(action);
    if(action==='begin')return {status:201,body:{operationToken:Buffer.from(JSON.stringify({operationId:'gateway:11111111-1111-4111-8111-111111111111',sessionId:'phone-staging:CA11111111111141118111111111111111'})).toString('base64url')+'.mock-not-a-real-capability',expiresAt:'2026-10-20T17:15:00Z'}};
    assert.equal(action,'status');
    return reply;
  }});
  await runner.prepare();return {runner,actions};
}
test('records exact sanitized UNKNOWN response observations on repeated status only',async()=>{
  const {runner,actions}=await prepared({status:202,body:safe()});
  await runner.recover();await runner.recover();
  const evidence=runner.evidence();
  assert.equal(evidence.checks.length,2);
  for(const c of evidence.checks)assert.deepEqual(c,{test:'status recovery',result:'PENDING',state:'UNKNOWN',status:202,observedAt:'2026-10-20T17:00:00.000Z',responseChecks:{success:false,caseIdPresent:false,customerIdPresent:false,notificationSent:false,technicianFollowupConfirmed:false}});
  assert.deepEqual(actions,['begin','status','status']);
  assert.equal(evidence.fixture.submissionAttempted,undefined);
});
const bad=[
  ['missing success',b=>{delete b.success;}],
  ['true success',b=>{b.success=true;}],
  ['caseId null is still a disclosed field',b=>{b.caseId=null;}],
  ['customerId null is still a disclosed field',b=>{b.customerId=null;}],
  ['caseId value',b=>{b.caseId='11111111-1111-4111-8111-111111111111';}],
  ['customerId value',b=>{b.customerId='11111111-1111-4111-8111-111111111111';}],
  ['notification true',b=>{b.notificationSent=true;}],
  ['missing notification flag',b=>{delete b.notificationSent;}],
  ['followup true',b=>{b.technicianFollowupConfirmed=true;}],
  ['missing followup flag',b=>{delete b.technicianFollowupConfirmed;}],
  ['false completed state',b=>{b.state='COMPLETED';}],
  ['unrecognized state',b=>{b.state='untrusted-value';}]
];
for(const [name,mutate]of bad)test('rejects '+name,async()=>{
  const body=safe();mutate(body);
  const {runner}=await prepared({status:202,body});
  await assert.rejects(runner.recover(),/RECOVERY_NOT_SAFE/);
  assert.equal(runner.evidence().checks.length,0);
});
test('does not export unexpected response fields or mock capability',async()=>{
  const body={...safe(),operationToken:'DO_NOT_EXPORT',authorization:'DO_NOT_EXPORT',privateValue:'DO_NOT_EXPORT'};
  const {runner}=await prepared({status:202,body});await runner.recover();
  const serialized=JSON.stringify(runner.evidence());
  assert.equal(serialized.includes('DO_NOT_EXPORT'),false);
  assert.equal(serialized.includes('mock-not-a-real-capability'),false);
});
test('preserves verified COMPLETED result behavior',async()=>{
  const id='11111111-1111-4111-8111-111111111111';
  const {runner}=await prepared({status:200,body:{success:true,state:'COMPLETED',caseId:id,customerId:id,testOnly:true,notificationSent:false,technicianFollowupConfirmed:false}});
  await runner.recover();
  assert.equal(runner.evidence().fixture.caseId,id);
  assert.equal(runner.evidence().checks[0].result,'HTTP_CONFIRMED');
});
test('rejects unexpected HTTP status',async()=>{
  const {runner}=await prepared({status:503,body:safe()});
  await assert.rejects(runner.recover(),/RECOVERY_NOT_SAFE/);
});
