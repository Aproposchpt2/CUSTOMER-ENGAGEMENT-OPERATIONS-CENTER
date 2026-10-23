import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHmac} from 'node:crypto';
const require=createRequire(import.meta.url);
const {createPmaAdapter}=require('../twilio-bridge/pma-adapter.cjs');
const env={STELLAR_BRIDGE_STAGING:'true',PMA_CHANNELS_ENABLED:'true',PMA_STAGING_BASE_URL:'https://pma-validation--ai4cc-staging.netlify.app',BRIDGE_HMAC_SECRET:'synthetic-test-secret'};
const args={message:'The fictional unit has a leaking tap',confirmed:true};
const ctx={callSid:'CA'+'1'.repeat(32),callId:'tool1',sessionId:'a0000000-0000-4000-8000-000000000001'};
test('PMA voice is disabled in production and refuses unconfirmed details',async()=>{
 let calls=0;const fetcher=async()=>{calls++;throw Error('must not call');};
 assert.equal((await createPmaAdapter({...env,STELLAR_BRIDGE_STAGING:'false'},fetcher).submit(args,ctx)).state,'DISABLED');
 assert.equal((await createPmaAdapter(env,fetcher).submit({...args,confirmed:false},ctx)).state,'NEEDS_CONFIRMATION');
 assert.equal(calls,0);
});
test('PMA voice signs the body, preserves business identity and returns only verified results',async()=>{
 const sent:any[]=[];
 const adapter=createPmaAdapter(env,async(url:string,options:any)=>{assert.equal(url,env.PMA_STAGING_BASE_URL+'/api/intake/pma-staging');sent.push(options);return {ok:true,json:async()=>({result:{success:true,state:'REQUESTED',domainPersisted:true,interactionPersisted:true,operationId:'pma:v1:00000000-0000-4000-8000-000000000001',showingId:'20000000-0000-4000-8000-000000000001',bookingConfirmed:false}})};});
 const first=await adapter.submit(args,ctx),second=await adapter.submit(args,{...ctx,callId:'tool2'});
 assert.equal(first.success,true);assert.equal(second.showingId,first.showingId);assert.equal(first.notificationSent,false);
 assert.equal(JSON.parse(sent[0].body).operationKey,undefined);assert.equal(JSON.parse(sent[0].body).session_id,ctx.sessionId);
 const [ts,sig]=sent[0].headers['x-bridge-signature'].split('.');
 assert.equal(sig,createHmac('sha256',env.BRIDGE_HMAC_SECRET).update(`pma-staging:${ts}:${sent[0].body}`).digest('hex'));
});
test('PMA voice timeout and malformed return cannot announce a saved request',async()=>{
 const timeout=createPmaAdapter(env,async()=>{throw Error('timeout');});
 const result=await timeout.submit(args,ctx);assert.equal(result.state,'UNKNOWN');assert.equal(result.persisted,false);assert.equal(result.requestId,undefined);
 const malformed=createPmaAdapter(env,async()=>({ok:true,json:async()=>({result:{reply:'created'}})}));
 assert.equal((await malformed.submit(args,ctx)).success,false);
});
test('PMA voice forwards validated catalog proposals and never delays safety for confirmation',async()=>{
 const bodies:any[]=[];const adapter=createPmaAdapter(env,async(_url:string,options:any)=>{bodies.push(JSON.parse(options.body));return {ok:true,json:async()=>({result:{success:true,state:'INFORMATION',interactionPersisted:true,domainPersisted:false,reply:'Safety guidance; no dispatch'}})};});
 assert.equal((await adapter.submit({message:'I smell gas',confirmed:false,intent:'GENERAL_GREETING',confidence:0,entities:{tenant_id:'injected'}},ctx)).success,true);
 assert.equal(bodies[0].confirmed,false);assert.equal(bodies[0].modelOutput,undefined);
 assert.equal((await adapter.submit({message:'Question',confirmed:false,intent:'PET_POLICY',confidence:0.78,entities:{topic:'pets'}},ctx)).success,true);
 assert.equal(bodies[1].modelOutput.intent,'PET_POLICY');assert.equal(bodies[1].modelOutput.confidence,0.78);
 assert.equal((await adapter.submit({message:'Something dangerous is happening',confirmed:false,intent:'PERSONAL_SAFETY_THREAT',confidence:0.5},ctx)).success,true);assert.equal(bodies[2].modelOutput.intent,'PERSONAL_SAFETY_THREAT');
 const before=bodies.length;assert.equal((await adapter.submit({message:'Question',confirmed:true,intent:'OWNER_OVERRIDE',confidence:1,entities:{owner:true}},ctx)).state,'INVALID_CLASSIFICATION');assert.equal(bodies.length,before);
});
