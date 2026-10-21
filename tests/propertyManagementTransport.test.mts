import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHmac} from 'node:crypto';
const require=createRequire(import.meta.url);
const {createPmaAdapter}=require('../twilio-bridge/pma-adapter.cjs');
const env={STELLAR_BRIDGE_STAGING:'true',PMA_CHANNELS_ENABLED:'true',PMA_STAGING_BASE_URL:'https://pma-validation--ai4cc-staging.netlify.app',BRIDGE_HMAC_SECRET:'synthetic-test-secret'};
const args={message:'The fictional unit has a leaking tap',confirmed:true};
const ctx={callSid:'CA'+'1'.repeat(32),callId:'tool1'};
test('PMA voice is disabled in production and refuses unconfirmed details',async()=>{
 let calls=0;const fetcher=async()=>{calls++;throw Error('must not call');};
 assert.equal((await createPmaAdapter({...env,STELLAR_BRIDGE_STAGING:'false'},fetcher).submit(args,ctx)).state,'DISABLED');
 assert.equal((await createPmaAdapter(env,fetcher).submit({...args,confirmed:false},ctx)).state,'NEEDS_CONFIRMATION');
 assert.equal(calls,0);
});
test('PMA voice signs the body, preserves business identity and returns only verified results',async()=>{
 const sent:any[]=[];
 const adapter=createPmaAdapter(env,async(url:string,options:any)=>{assert.equal(url,env.PMA_STAGING_BASE_URL+'/api/intake/pma-staging');sent.push(options);return {ok:true,json:async()=>({result:{persisted:true,interactionId:'10000000-0000-4000-8000-000000000001',requestId:'20000000-0000-4000-8000-000000000001'}})};});
 const first=await adapter.submit(args,ctx),second=await adapter.submit(args,{...ctx,callId:'tool2'});
 assert.equal(first.success,true);assert.equal(second.requestId,first.requestId);assert.equal(first.notificationSent,false);
 assert.equal(JSON.parse(sent[0].body).operationKey,JSON.parse(sent[1].body).operationKey);
 const [ts,sig]=sent[0].headers['x-bridge-signature'].split('.');
 assert.equal(sig,createHmac('sha256',env.BRIDGE_HMAC_SECRET).update(`pma-staging:${ts}:${sent[0].body}`).digest('hex'));
});
test('PMA voice timeout and malformed return cannot announce a saved request',async()=>{
 const timeout=createPmaAdapter(env,async()=>{throw Error('timeout');});
 const result=await timeout.submit(args,ctx);assert.equal(result.state,'UNKNOWN');assert.equal(result.persisted,false);assert.equal(result.requestId,undefined);
 const malformed=createPmaAdapter(env,async()=>({ok:true,json:async()=>({result:{reply:'created'}})}));
 assert.equal((await malformed.submit(args,ctx)).success,false);
});
