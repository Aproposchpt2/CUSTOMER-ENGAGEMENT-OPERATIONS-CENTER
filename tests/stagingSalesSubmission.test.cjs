'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {submitVerifiedSales}=require('../twilio-bridge/staging-sales-submission.cjs');
const tenant='5885a020-d363-4c27-910a-c035eda132f5';
const ctx={tenantId:tenant,propertyId:'11111111-1111-4111-8111-111111111111',contactId:'22222222-2222-4222-8222-222222222222',actorId:'33333333-3333-4333-8333-333333333333',sessionId:'44444444-4444-4444-8444-444444444444',synthetic:true,voiceDemo:true,selectedRoute:'sales-specialist'};
const details={confirmed:true,callerName:'Fictional Customer',description:'Synthetic sales voice test',email:'fictional@example.invalid'};
const env={STELLAR_BRIDGE_STAGING:'true',STELLAR_STAGING_SALES_WRITES_ENABLED:'true',STAGING_SUPABASE_URL:'https://hvzauakkhlivzeqatfqm.supabase.co',STAGING_SUPABASE_SERVICE_ROLE_KEY:'not-a-real-secret'};
test('blocks inactive and untrusted sessions without requests',async()=>{
 let calls=0;const request=async()=>{calls++;throw Error('SHOULD_NOT_RUN')};
 await assert.rejects(submitVerifiedSales({trustedSession:ctx,confirmedDetails:details,env:{...env,STELLAR_BRIDGE_STAGING:'false'},request}),/DISABLED/);
 await assert.rejects(submitVerifiedSales({trustedSession:{...ctx,tenantId:'d7e80001-0000-4000-b000-000000000001'},confirmedDetails:details,env,request}),/TRUSTED_SALES_SESSION_REQUIRED/);
 await assert.rejects(submitVerifiedSales({trustedSession:ctx,confirmedDetails:{...details,actor:'malicious'},env,request}),/UNTRUSTED_FIELD/);
 assert.equal(calls,0);
});
test('constructs canonical RPC and requires confirmed result',async()=>{
 let requestBody;
 const request=async (url,opts)=>{assert.match(url,/stellar_voice_demo_sales_submit_staging$/);requestBody=JSON.parse(opts.body);return {ok:true,json:async()=>({lead:{id:'55555555-5555-4555-8555-555555555555'},testOnly:true,persisted:true,notificationSent:false,deduplicated:false})}};
 const x=await submitVerifiedSales({trustedSession:ctx,confirmedDetails:details,env,request});
 assert.equal(x.success,true);assert.equal(x.notificationSent,false);assert.equal(requestBody.t,tenant);assert.equal(requestBody.session_id,ctx.sessionId);
});
test('unknown save outcome is never reported as success',async()=>{
 await assert.rejects(submitVerifiedSales({trustedSession:ctx,confirmedDetails:details,env,request:async()=>({ok:false})}),/SALES_SAVE_NOT_CONFIRMED/);
 await assert.rejects(submitVerifiedSales({trustedSession:ctx,confirmedDetails:details,env,request:async()=>({ok:true,json:async()=>({persisted:true,lead:{id:'fake'}})})}),/SALES_SAVE_NOT_CONFIRMED/);
});
