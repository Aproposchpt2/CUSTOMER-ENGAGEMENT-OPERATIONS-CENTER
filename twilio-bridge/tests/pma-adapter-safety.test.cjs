 'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {createPmaAdapter}=require('../pma-adapter.cjs');
const env={STELLAR_BRIDGE_STAGING:'true',PMA_CHANNELS_ENABLED:'true',PMA_STAGING_BASE_URL:'https://pma-validation--ai4cc-staging.netlify.app',BRIDGE_HMAC_SECRET:'synthetic-secret'};
const context={callSid:'CA'+'a1'.repeat(16),sessionId:'11111111-1111-4111-8111-111111111111'};
for(const description of ['carbon monoxide alarm','medical emergency','gas leak','fire'])for(const malformed of [false,true])test('structured hazard '+description+' precedes confirmation and malformed proposal='+malformed,async()=>{
 let calls=0;
 const adapter=createPmaAdapter(env,async(url,options)=>{
  calls++;assert.equal(url,env.PMA_STAGING_BASE_URL+'/api/intake/pma-staging');
  const body=JSON.parse(options.body);assert.equal(body.confirmed,false);assert.equal(body.maintenance.description,description);assert.equal(body.modelOutput,undefined);
  assert.equal(body.call_sid,context.callSid);assert.equal(body.session_id,context.sessionId);
  const [ts,sig]=options.headers['x-bridge-signature'].split('.');assert.equal(sig,crypto.createHmac('sha256',env.BRIDGE_HMAC_SECRET).update(`pma-staging:${ts}:${options.body}`).digest('hex'));
  return {ok:true,json:async()=>({result:{state:'INFORMATION',domainPersisted:false,reply:'Immediate safety guidance'}})};
 });
 const result=await adapter.submit({message:'maintenance request',maintenance:{description},confirmed:false,...(malformed?{modelOutput:{intent:'INVALID'}}:{})},context);
 assert.equal(calls,1);assert.equal(result.state,'INFORMATION');assert.equal(result.notificationSent,false);
});
test('ordinary maintenance still requires confirmation and valid classification',async()=>{
 let calls=0;const adapter=createPmaAdapter(env,async()=>{calls++;});
 assert.equal((await adapter.submit({message:'maintenance request',maintenance:{description:'dripping faucet'},confirmed:false},context)).state,'NEEDS_CONFIRMATION');
 assert.equal((await adapter.submit({message:'maintenance request',maintenance:{description:'dripping faucet'},modelOutput:{intent:'INVALID'}},context)).state,'INVALID_CLASSIFICATION');
 assert.equal(calls,0);
});
test('structured hazards retain transport authorization gates',async()=>{
 let calls=0;const adapter=createPmaAdapter(env,async()=>{calls++;});const args={message:'maintenance request',maintenance:{description:'carbon monoxide alarm'},confirmed:false};
 assert.equal((await adapter.submit(args,{...context,callSid:'invalid'})).state,'UNAUTHORIZED');
 assert.equal((await adapter.submit(args,{...context,sessionId:undefined})).state,'AUTHORIZATION_REQUIRED');
 assert.equal((await createPmaAdapter({}).submit(args,context)).state,'DISABLED');assert.equal(calls,0);
});
