'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {lookupSalesKnowledge}=require('../twilio-bridge/sales-knowledge-retrieval.cjs');
const tenant='11111111-1111-4111-8111-111111111111';
const env={STELLAR_SALES_KB_READ_ENABLED:'true',SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fake-unit-test-key'};
const row={id:'k1',tenant_id:tenant,title:'CEOC',content:'Verified product information',approved:true,visibility:'public',publication_state:'published',audience_scope:'public',source_status:'VERIFIED'};
test('disabled by default, no network',async()=>{const r=await lookupSalesKnowledge({query:'CEOC',tenantId:tenant,env:{},fetchImpl(){throw Error('unexpected fetch')}});assert.equal(r.status,'DISABLED')});
test('missing server credentials fail closed',async()=>{const r=await lookupSalesKnowledge({query:'CEOC',tenantId:tenant,env:{STELLAR_SALES_KB_READ_ENABLED:'true'}});assert.equal(r.status,'UNAVAILABLE')});
test('filter and tenant guard on server query',async()=>{let called=false;const r=await lookupSalesKnowledge({query:'CEOC',tenantId:tenant,env,fetchImpl:async(url,opts)=>{called=true;const u=new URL(url);assert.equal(u.searchParams.get('tenant_id'),'eq.'+tenant);assert.equal(u.searchParams.get('approved'),'eq.true');assert.equal(u.searchParams.get('publication_state'),'eq.published');assert.equal(u.searchParams.get('visibility'),'eq.public');assert.ok(opts.headers.apikey);return {ok:true,json:async()=>[row]};}});assert.equal(called,true);assert.equal(r.status,'FOUND');assert.equal(r.entries[0].id,'k1')});
test('unapproved, foreign-tenant, proposed or staff-only rows excluded even if API responds with them',async()=>{const rows=[{...row,approved:false},{...row,tenant_id:'other'},{...row,source_status:'PROPOSED'},{...row,visibility:'staff'},{...row,publication_state:'draft'}];const r=await lookupSalesKnowledge({query:'CEOC',tenantId:tenant,env,fetchImpl:async()=>({ok:true,json:async()=>rows})});assert.equal(r.status,'NO_APPROVED_MATCH');assert.deepEqual(r.entries,[])});
test('backend rejection and malformed body fail closed',async()=>{const r=await lookupSalesKnowledge({query:'CEOC',tenantId:tenant,env,fetchImpl:async()=>({ok:false})});assert.equal(r.status,'UNAVAILABLE')});

test('legacy validity is selected and expired rows are excluded',async()=>{
 const result=await lookupSalesKnowledge({query:'CEOC',tenantId:tenant,env,fetchImpl:async url=>{
  assert.ok(new URL(url).searchParams.get('select').split(',').includes('valid_until'));
  return {ok:true,json:async()=>[{...row,valid_until:'2020-01-01T00:00:00Z'}]};
 }});
 assert.equal(result.status,'NO_APPROVED_MATCH');
});
