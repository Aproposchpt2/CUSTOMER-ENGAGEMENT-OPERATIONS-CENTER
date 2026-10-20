'use strict';
// Isolated staging-only dispatcher contract. Not imported by server.js.
// The production durable database adapter is deliberately not implemented here.
const {createHash,createHmac}=require('node:crypto');
const PROJECT='hvzauakkhlivzeqatfqm',TENANT='5885a020-d363-4c27-910a-c035eda132f5';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
function check(ok,code){if(!ok){const e=new Error(code);e.safeCode=code;throw e;}}
function envelope(event){
 check(event?.tenantId===TENANT,'TENANT_REJECTED');
 check(typeof event.eventId==='string'&&/^[1-9][0-9]*$/.test(event.eventId),'EVENT_ID_REJECTED');
 check(uuid(event.workflowId)&&uuid(event.caseId),'ASSOCIATION_ID_REJECTED');
 check(event.eventType==='COMPLETED','EVENT_TYPE_REJECTED');
 check(typeof event.sessionId==='string'&&event.sessionId.length>0&&event.sessionId.length<=200,'SESSION_REJECTED');
 check(typeof event.createdAt==='string'&&Number.isFinite(Date.parse(event.createdAt)),'EVENT_TIME_REJECTED');
 const payload={project:PROJECT,eventId:event.eventId,eventType:'COMPLETED',tenantId:TENANT,workflowId:event.workflowId,sessionId:event.sessionId,caseId:event.caseId,createdAt:new Date(event.createdAt).toISOString()};
 const body=JSON.stringify(payload),payloadSha256=createHash('sha256').update(body).digest('hex');
 return {payload,body,payloadSha256,idempotencyKey:`stellar:${PROJECT}:${TENANT}:${event.eventId}`};
}
function loopbackTransport({url,sharedKey,request=fetch,timeoutMs=1500}){
 const endpoint=new URL(url);check(endpoint.protocol==='http:'&&endpoint.hostname==='127.0.0.1'&&endpoint.port&&endpoint.pathname==='/test-event'&&!endpoint.username&&!endpoint.password&&!endpoint.search&&!endpoint.hash,'LOOPBACK_TEST_RECEIVER_REQUIRED');
 check(typeof sharedKey==='string'&&sharedKey.length>=32,'TEST_RECEIVER_AUTH_REQUIRED');
 check(Number.isInteger(timeoutMs)&&timeoutMs>=100&&timeoutMs<=2000,'BOUNDED_TIMEOUT_REQUIRED');
 return async message=>{
  const response=await request(endpoint.href,{method:'POST',redirect:'error',signal:AbortSignal.timeout(timeoutMs),headers:{'content-type':'application/json','idempotency-key':message.idempotencyKey,'x-stellar-signature':createHmac('sha256',sharedKey).update(message.body).digest('hex')},body:message.body});
  check(response.ok,'RECEIVER_REJECTED');const text=await response.text();check(text.length<=4096,'ACK_TOO_LARGE');return JSON.parse(text);
 };
}
function createDispatcher({store,transport,now=()=>Date.now(),workerId,workflowIds,staging=false,maxAttempts=5,leaseMs=10000}){
 check(staging===true,'STAGING_ONLY_REQUIRED');check(typeof workerId==='string'&&workerId.length>0,'WORKER_ID_REQUIRED');
 check(Array.isArray(workflowIds)&&workflowIds.length>0&&workflowIds.length<=20&&workflowIds.every(uuid),'FIXTURE_WORKFLOW_SCOPE_REQUIRED');
 check(Number.isInteger(maxAttempts)&&maxAttempts>=1&&maxAttempts<=5,'ATTEMPT_LIMIT_REJECTED');check(leaseMs>=5000&&leaseMs<=30000,'LEASE_BOUND_REJECTED');
 for(const method of ['claim','verifyAssociation','complete','fail'])check(typeof store?.[method]==='function','DURABLE_ADAPTER_REQUIRED');
 check(typeof transport==='function','TRANSPORT_REQUIRED');
 async function once(){
  const claim=await store.claim({tenantId:TENANT,workflowIds,workerId,leaseMs,now:now()});
  if(!claim)return {state:'IDLE'};
  check(uuid(claim.token)&&workflowIds.includes(claim.event?.workflowId)&&Number.isFinite(claim.leaseUntil)&&claim.leaseUntil>now(),'CLAIM_REJECTED');
  check(Number.isInteger(claim.attempt)&&claim.attempt>=1&&claim.attempt<=maxAttempts,'CLAIM_ATTEMPT_REJECTED');
  let message;
  try{
   message=envelope(claim.event);
   const association=await store.verifyAssociation(claim);
   check(association?.verified===true&&association.tenantId===TENANT&&association.workflowId===message.payload.workflowId&&association.sessionId===message.payload.sessionId&&association.caseId===message.payload.caseId,'AUTHORITATIVE_ASSOCIATION_INVALID');
   check(now()<claim.leaseUntil,'LEASE_EXPIRED');
   const ack=await transport(message);
   check(ack?.accepted===true&&ack.durable===true&&ack.eventId===message.payload.eventId&&ack.caseId===message.payload.caseId&&ack.idempotencyKey===message.idempotencyKey&&ack.payloadSha256===message.payloadSha256,'ACK_MISMATCH');
   if(now()>=claim.leaseUntil)return {state:'LEASE_LOST',eventId:message.payload.eventId};
   const committed=await store.complete({eventId:message.payload.eventId,token:claim.token,payloadSha256:message.payloadSha256,now:now()});
   return {state:committed?'DELIVERED':'LEASE_LOST',eventId:message.payload.eventId};
  }catch(error){
   // Never persist raw response bodies, credential-bearing errors, or stack traces.
   const code=error.safeCode==='DURABLE_RECEIPT_REQUIRED'?'ACK_MISMATCH':error.safeCode||(error.name==='TimeoutError'||error.name==='AbortError'?'TRANSPORT_TIMEOUT':'DELIVERY_UNCERTAIN');
   const quarantine=['TENANT_REJECTED','EVENT_ID_REJECTED','ASSOCIATION_ID_REJECTED','EVENT_TYPE_REJECTED','SESSION_REJECTED','EVENT_TIME_REJECTED','AUTHORITATIVE_ASSOCIATION_INVALID','ACK_MISMATCH'].includes(code);
   const terminal=quarantine||claim.attempt>=maxAttempts;
   const nextAttemptAt=terminal?null:now()+Math.min(300000,1000*2**(claim.attempt-1));
   const committed=await store.fail({eventId:claim.event.eventId,token:claim.token,code,nextAttemptAt,state:quarantine?'QUARANTINED':terminal?'FAILED':'PENDING',now:now()});
   return {state:committed?(quarantine?'QUARANTINED':terminal?'FAILED':'RETRY_PENDING'):'LEASE_LOST',eventId:claim.event.eventId,code};
  }
 }
 return {once};
}
module.exports={envelope,loopbackTransport,createDispatcher,PROJECT,TENANT};
