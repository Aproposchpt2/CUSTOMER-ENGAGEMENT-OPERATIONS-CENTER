'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {readiness,submitStagingSupport,SUMMIT_TENANT}=require('../twilio-bridge/summit-support-intake.staging.cjs');
const env={STELLAR_SUMMIT_HVAC_SUPPORT_MODE:'true',STELLAR_BRIDGE_STAGING:'true',STAGING_SUPPORT_WRITES_ENABLED:'true',
 CSS_TENANT_ID:SUMMIT_TENANT,STAGING_SUPABASE_URL:'https://hvzauakkhlivzeqatfqm.supabase.co',STAGING_SUPABASE_SERVICE_ROLE_KEY:'test-secret'};
const args={name:'Synthetic Test',email:'synthetic@example.invalid',phone:'',product:'HVAC Heating',purchaseDate:'2026-10-24',
 issue:'Synthetic heat failure for staging acceptance',steps:'No unsafe troubleshooting',impact:'Synthetic test only',priority:'NORMAL'};
const callSid='CAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
test('isolation requires explicit staging flag and Summit tenant',()=>{
 assert.equal(readiness(env),'READY');
 assert.equal(readiness({...env,STELLAR_BRIDGE_STAGING:'false'}),'NOT_STAGING');
 assert.equal(readiness({...env,CSS_TENANT_ID:'5885a020-d363-4c27-910a-c035eda132f5'}),'STAGING_TARGET_REJECTED');
 assert.equal(readiness({...env,STAGING_SUPABASE_URL:'https://example.com'}),'STAGING_TARGET_REJECTED');
 assert.equal(readiness({...env,STAGING_SUPPORT_WRITES_ENABLED:'false'}),'STAGING_WRITES_DISABLED');
});
test('Summit approved RPC, server-owned tenant and stable session',async()=>{
 let called;const request=async(url,options)=>{called={url,options};return {ok:true,json:async()=>[{
 customer_id:'11111111-1111-4111-8111-111111111111',case_id:'22222222-2222-4222-8222-222222222222',created_new:true
 }]}};
 const response=await submitStagingSupport(args,callSid,env,request);
 assert.equal(response.success,true);assert.equal(response.testOnly,true);
 assert.equal(response.notificationSent,false);
 assert.match(called.url,/stellar_create_hvac_demo_support_intake$/);
 const p=JSON.parse(called.options.body);
 assert.equal(p.p_tenant_id,SUMMIT_TENANT);
 assert.equal(p.p_session_id,'phone-staging:'+callSid);
 assert.equal(p.p_email,args.email);
});
test('rejects model-supplied tenant override, invalid session and unknown save',async()=>{
 await assert.rejects(submitStagingSupport({...args,tenantId:'5885a020-d363-4c27-910a-c035eda132f5'},callSid,env),/INVALID_SUPPORT_ARGUMENTS/);
 await assert.rejects(submitStagingSupport(args,'INVALID',env),/INVALID_STAGING_CALL_ID/);
 await assert.rejects(submitStagingSupport(args,callSid,env,async()=>({ok:true,json:async()=>[]})),/STAGING_SAVE_NOT_CONFIRMED/);
});
