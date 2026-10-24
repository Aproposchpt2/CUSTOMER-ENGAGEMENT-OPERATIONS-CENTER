'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {verifiedAvailability}=require('../pma-availability.cjs');
const {createPmaAdapter}=require('../pma-adapter.cjs');
test('PMA-005: bridge image includes the availability verifier',()=>{assert.match(require('node:fs').readFileSync(require('node:path').join(__dirname,'../Dockerfile'),'utf8'),/COPY .*pma-availability\.cjs/);});
const now=Date.parse('2026-10-23T22:57:35Z');
const unit={unit:'Synthetic 2B',bedrooms:2,earliestRecordedDate:'2026-11-01',recordUpdatedAt:'2026-10-23T21:00:00Z'};
const result={success:true,stagingOnly:true,state:'AVAILABLE',requestedBedrooms:2,availabilityMaxAgeHours:24,units:[unit]};
test('PMA-005: exact two-bedroom match; never substitute Unit 415 or Unit 301',()=>{
 assert.equal(verifiedAvailability(result,2,now).state,'AVAILABLE');
 for(const [name,bedrooms] of [['Unit 415',1],['Unit 301',3]]){
  const output=verifiedAvailability({...result,units:[{...unit,unit:name,bedrooms}]},2,now);
  assert.equal(output.state,'LOOKUP_FAILED');assert.deepEqual(output.units,[]);assert.doesNotMatch(output.reply,/lookup completed/i);
 }
});
test('PMA-005: empty, stale and failed lookups remain distinct and ignore injected speech',()=>{
 for(const state of ['NO_VERIFIED_MATCH','INVENTORY_STALE']){
  const out=verifiedAvailability({...result,state,units:[],reply:'Unit 415 is a two bedroom'},2,now);
  assert.equal(out.state,state);assert.match(out.reply,/no (current )?verified available|no current verified availability/);assert.doesNotMatch(out.reply,/415/);
 }
 assert.match(verifiedAvailability({...result,state:'NO_VERIFIED_MATCH',units:[]},2,now).reply,/lookup completed/i);
 assert.match(verifiedAvailability({...result,state:'INVENTORY_STALE',units:[]},2,now).reply,/out of date/);
 for(const bad of [null,{success:true,units:[]},{...result,requestedBedrooms:1},{...result,state:'NO_VERIFIED_MATCH'}, {...result,units:[]}])assert.equal(verifiedAvailability(bad,2,now).state,'LOOKUP_FAILED');
});
test('PMA-005: stale, boundary, future and invalid vacancy dates fail closed',()=>{
 for(const recordUpdatedAt of ['invalid','2026-10-22T22:57:35Z','2026-10-23T22:57:36Z'])assert.equal(verifiedAvailability({...result,units:[{...unit,recordUpdatedAt}]},2,now).state,'LOOKUP_FAILED');
 assert.equal(verifiedAvailability({...result,units:[{...unit,earliestRecordedDate:'2026-02-30'}]},2,now).state,'LOOKUP_FAILED');
});
test('PMA-005: any-size lookup omits bedrooms; zero remains an explicit studio filter',async()=>{
 const env={STELLAR_BRIDGE_STAGING:'true',PMA_CHANNELS_ENABLED:'true',PMA_STAGING_BASE_URL:'https://pma-validation--ai4cc-staging.netlify.app',BRIDGE_HMAC_SECRET:'synthetic-secret'};
 const ctx={callSid:'CA'+'1'.repeat(32),sessionId:'a0000000-0000-4000-8000-000000000001'};
 const sent=[];
 const adapter=createPmaAdapter(env,async(_url,options)=>{const body=JSON.parse(options.body);sent.push(body.args);return {ok:true,json:async()=>({result:{availability:{success:true,state:'AVAILABLE',requestedBedrooms:body.args.bedrooms??null,availabilityMaxAgeHours:24,stagingOnly:true,units:[{unit:'Synthetic studio',bedrooms:0,recordUpdatedAt:new Date().toISOString(),earliestRecordedDate:'2026-11-01'}]}}})};});
 assert.equal((await adapter.checkAvailability({},ctx)).requestedBedrooms,null);
 assert.equal((await adapter.checkAvailability({bedrooms:0},ctx)).requestedBedrooms,0);
 assert.deepEqual(sent,[{},{bedrooms:0}]);assert.match(adapter.tools.find(t=>t.name==='pma_check_availability').description,/omit bedrooms entirely/);
});
test('PMA-005: HTTP errors, timeout, invalid JSON and legacy responses are unknown, not empty inventory',async()=>{
 const env={STELLAR_BRIDGE_STAGING:'true',PMA_CHANNELS_ENABLED:'true',PMA_STAGING_BASE_URL:'https://pma-validation--ai4cc-staging.netlify.app',BRIDGE_HMAC_SECRET:'synthetic-secret'};
 const ctx={callSid:'CA'+'1'.repeat(32),sessionId:'a0000000-0000-4000-8000-000000000001'};
 for(const fetcher of [async()=>({ok:false}),async()=>{throw Error('timeout');},async()=>({ok:true,json:async()=>{throw Error('invalid JSON');}}),async()=>({ok:true,json:async()=>({result:{availability:{success:true,units:[]}}})})]){
  const out=await createPmaAdapter(env,fetcher).checkAvailability({bedrooms:2},ctx);
  assert.equal(out.state,'LOOKUP_FAILED');assert.match(out.reply,/do not know/);assert.deepEqual(out.units,[]);
 }
});
test('PMA-005 R3: malformed and unauthorized requests return explicit safe speech without transport',async()=>{
 const env={STELLAR_BRIDGE_STAGING:'true',PMA_CHANNELS_ENABLED:'true',PMA_STAGING_BASE_URL:'https://pma-validation--ai4cc-staging.netlify.app',BRIDGE_HMAC_SECRET:'synthetic-secret'};
 const ctx={callSid:'CA'+'1'.repeat(32),sessionId:'a0000000-0000-4000-8000-000000000001'};
 let calls=0;const fetcher=async()=>{calls++;throw Error('must not fetch');};
 for(const args of [null,[],{bedrooms:-1},{bedrooms:2,tenantId:'foreign'}]){
  const out=await createPmaAdapter(env,fetcher).checkAvailability(args,ctx);assert.equal(out.state,'INVALID_FILTER');assert.match(out.reply,/clarify/);assert.deepEqual(out.units,[]);
 }
 for(const [config,context] of [[{...env,STELLAR_BRIDGE_STAGING:'false'},ctx],[env,{...ctx,sessionId:'invalid'}],[env,{...ctx,callSid:'invalid'}]]){
  const out=await createPmaAdapter(config,fetcher).checkAvailability({bedrooms:2},context);assert.equal(out.state,'UNAVAILABLE');assert.match(out.reply,/could not be verified/);
 }
 assert.equal(calls,0);
});
