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
