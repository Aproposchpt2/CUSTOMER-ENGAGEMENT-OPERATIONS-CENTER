'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const twilio=require('twilio');
const {processVoiceDemo}=require('../../lib/voiceDemo/gateway.cjs');
const env={PMA_ENVIRONMENT:'staging',VOICE_DEMO_IVR_ENABLED:'true',TWILIO_AUTH_TOKEN:'synthetic-test-token',TWILIO_ACCOUNT_SID:'AC'+'12'.repeat(16),PMA_STAGING_DID:'+15555550100',PMA_STAGING_TEST_CALLER:'+15555550123'};
function fixture(){const params={AccountSid:env.TWILIO_ACCOUNT_SID,CallSid:'CA'+'34'.repeat(16),To:env.PMA_STAGING_DID,From:env.PMA_STAGING_TEST_CALLER,Digits:'2',NewProviderParameter:'value & spaces'};const signature=twilio.getExpectedTwilioSignature(env.TWILIO_AUTH_TOKEN,'https://ai4-pma-bridge-staging.fly.dev/api/ivr/router',params);return{action:'route',originalPath:'/api/ivr/router',twilioSignature:signature,params};}
const deps={env,validateRequest:twilio.validateRequest,record:async a=>({session_id:'11111111-1111-4111-8111-111111111111',call_sid:a.call_sid,agentRoute:a.agent_route}),knowledge:async()=>[]};
test('official SDK verifies original Fly URL and every provider parameter',async()=>{const r=await processVoiceDemo(fixture(),deps);assert.equal(r.session.agentRoute,'sales-specialist');});
test('official SDK rejects changed DTMF after signing',async()=>{const b=fixture();b.params.Digits='3';await assert.rejects(processVoiceDemo(b,deps),/signature/);});

function reuseFixture(to,action='entry',changes={}){
 const b=fixture(); b.action=action;b.originalPath=action==='entry'?'/api/ivr/main':'/api/ivr/router';
 Object.assign(b.params,{To:to,...changes});
 b.twilioSignature=twilio.getExpectedTwilioSignature(env.TWILIO_AUTH_TOKEN,'https://ai4-pma-bridge-staging.fly.dev'+b.originalPath,b.params);
 return b;
}
const reuseEnv={...env,PMA_STAGING_DID:'+17029351414',VOICE_DEMO_REUSABLE_DIDS_ENABLED:'true'};
test('signed calls to all three authorized retired numbers enter IVR and select every branch',async()=>{
 for(const to of ['+17252010584','+17253305102','+17027102622']){
  await processVoiceDemo(reuseFixture(to),{...deps,env:reuseEnv});
  for(const [Digits,agent] of [['1','support-specialist'],['2','sales-specialist'],['3','property-management-assistant']]){
   const r=await processVoiceDemo(reuseFixture(to,'route',{Digits}),{...deps,env:reuseEnv});
   assert.equal(r.session.agentRoute,agent);
  }
 }
});
test('reusable DID switch preserves caller/account/signature restrictions and rejects arbitrary numbers',async()=>{
 let writes=0; const d={...deps,env:reuseEnv,record:async()=>{writes++;throw Error('must not persist');}};
 for(const body of [reuseFixture('+15555550999'),reuseFixture('+17252010584','entry',{From:'+15555550999'}),reuseFixture('+17252010584','entry',{AccountSid:'AC'+'99'.repeat(16)})]){
  await assert.rejects(processVoiceDemo(body,d),/Unapproved/);
 }
 const tampered=reuseFixture('+17252010584');tampered.params.To='+17253305102';
 await assert.rejects(processVoiceDemo(tampered,d),/signature/);
 for(const envOverride of [{VOICE_DEMO_REUSABLE_DIDS_ENABLED:'false'},{VOICE_DEMO_REUSABLE_DIDS_ENABLED:undefined},{PMA_ENVIRONMENT:'production'},{PMA_STAGING_DID:'+17253305102'}]){
  await assert.rejects(processVoiceDemo(reuseFixture('+17252010584'),{...d,env:{...reuseEnv,...envOverride}}),/Unapproved|disabled/);
 }
 assert.equal(writes,0);
});
