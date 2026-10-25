'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const articles=require('../../docs/specialist-staging/caller/articles.json');const {readStagingKnowledgeV2}=require('./specialist-caller-v2.cjs');const {createSpecialistSession,TENANTS}=require('../specialist-staging.cjs');
const dates={effective_at:'2026-01-01T00:00:00Z',expires_at:'2099-01-01T00:00:00Z',package_version:'scoped-v2'};
const hosted=a=>({...a,...dates});
const call='CA00000000000000000000000000000146';
const env=profile=>({SS_STAGING_INTELLIGENCE_ENABLED:'true',STELLAR_BRIDGE_STAGING:'true',STAGING_SUPABASE_URL:'https://hvzauakkhlivzeqatfqm.supabase.co',STAGING_SUPABASE_SERVICE_ROLE_KEY:'fictional',SS_STAGING_SALES_TENANT_ID:TENANTS.sales,SS_STAGING_SUPPORT_TENANT_ID:TENANTS.support,SS_STAGING_RETRIEVAL_VERSION:'scoped-v2',SS_STAGING_HVAC_WRITES_ENABLED:'true'});
const make=(profile,request)=>createSpecialistSession({profile,callSid:call,env:env(profile),request,trustedSession:{call_sid:call,session_id:'a0000000-0000-4000-8000-000000000146',agentRoute:profile==='sales'?'sales-specialist':'support-specialist'}});
test('269 caller answers have unique IDs, explicit scope and no internal source blocks or dollar pricing',()=>{
 assert.equal(articles.length,269);assert.equal(new Set(articles.map(a=>a.id)).size,269);
 for(const a of articles){assert.ok(a.content.trim().length>20);assert.ok(!a.content.includes('I can provide the approved information for'));assert.ok(!a.content.includes('APPROVED VOICE ANSWER'));assert.ok(!/\$\d/.test(a.content));assert.equal(a.test_only,true);}
 const hours=articles.find(a=>a.product_scope==='support_hvac'&&a.stable_id==='SERVICE_HOURS');assert.match(hours.content,/8 AM to 5 PM/);assert.match(hours.content,/fictional/);assert.ok(!/Saturday/.test(hours.content));
});
test('reader rejects foreign tenant, foreign scope and unsafe response without returning a draft',async()=>{
 const a=articles[0];let calls=0;
 await assert.rejects(readStagingKnowledgeV2({tenantId:TENANTS.support,scope:'sales',query:'SAL-001',key:'test',request:async()=>{calls++;}}));assert.equal(calls,0);
 for(const change of [{tenant_id:TENANTS.support},{product_scope:'support_platform'},{test_only:false},{expires_at:'2020-01-01'},{effective_at:'2099-01-01'},{source_status:'UNKNOWN'},{id:'invalid'},{package_version:'legacy'}]){
 const result=await readStagingKnowledgeV2({tenantId:TENANTS.sales,scope:'sales',query:'SAL-001',key:'test',request:async()=>({ok:true,json:async()=>[{...hosted(a),...change}]})});assert.equal(result.entries.length,0);
 }
});
test('v2 runtime binds Sales and HVAC queries to exact scope and returns curated caller text only',async()=>{
 for(const profile of ['sales','support']){
 const scope=profile==='sales'?'sales':'support_hvac';const a=articles.find(a=>a.product_scope===scope);let requests=0;
 const s=make(profile,async(url,o)=>{requests++;assert.match(url,/rpc\/ai4cc_specialist_staging_knowledge_v2$/);const b=JSON.parse(o.body);assert.equal(b.p_scope,scope);assert.equal(b.p_tenant_id,TENANTS[profile]);return {ok:true,json:async()=>[hosted(a)]};});
 const result=await s.knowledge({query:a.stable_id});assert.equal(result.status,'FOUND');assert.equal(result.entries[0].id,a.id);assert.ok(!JSON.stringify(result).includes('source_blocks'));assert.equal(requests,1);
 }
});
test('Summit v2 uses HVAC taxonomy, not platform account administration, and safety still overrides',()=>{
 const s=make('support');assert.equal(s.status().intentCount,52);assert.equal(s.assess({reference:'SUP-030',confidence:1}).state,'CLARIFY');assert.equal(s.assess({reference:'TICKET_CREATION',confidence:1}).state,'CLASSIFIED');
 for(const id of ['GAS_LEAK','CARBON_MONOXIDE','FIRE_ELECTRICAL'])assert.equal(make('support').assess({reference:id,confidence:1}).state,'SAFETY_OVERRIDE');
});
test('v2 ticket uses observed consent, stable readback and deduplication with HVAC intent reference',async()=>{
 let posts=0;const row={id:'b0000000-0000-4000-8000-000000000146',contact_id:'c0000000-0000-4000-8000-000000000146',tenant_id:TENANTS.support,intake_session_id:'phone-staging:'+call,test_only:true};
 const s=make('support',async(url,o)=>{if(o.method==='POST'){posts++;return {ok:true,json:async()=>[{case_id:row.id}]};}return {ok:true,json:async()=>posts?[row]:[]};});
 const a={name:'Fictional caller',email:'caller@example.invalid',phone:'',product:'Fictional system',purchaseDate:'2026-10-25',issue:'Fictional cooling intake test',steps:'No unsafe checks',impact:'Synthetic test only',priority:'NORMAL'};
 s.observe('Please create a service request');s.assess({reference:'TICKET_CREATION',confidence:1});assert.equal((await s.submit(a)).state,'CONFIRMATION_REQUIRED');assert.equal(posts,0);
 s.observe('yes');s.assess({reference:'TICKET_CREATION',confidence:1});assert.equal((await s.submit(a)).caseId,row.id);assert.equal((await s.submit(a)).caseId,row.id);assert.equal(posts,1);
});
test('all 269 scoped caller IDs can be read through response validation',async()=>{
 for(const a of articles){const result=await readStagingKnowledgeV2({tenantId:a.tenant_id,scope:a.product_scope,query:a.stable_id,key:'fictional',request:async()=>({ok:true,json:async()=>[hosted(a)]})});assert.equal(result.entries[0].id,a.id);}
});
test('v2 Sales assessment returns all 32 catalog fields without granting write authority',()=>{
 const s=make('sales');const r=s.assess({reference:'SAL-082',confidence:1});assert.equal(Object.keys(r.definition.sourceFields).length,32);assert.ok(r.definition.sourceFields.PositiveUtterances);assert.equal(r.mayExecute,false);
});
test('closed v2 session cannot fetch caller knowledge',async()=>{
 let calls=0;const s=make('sales',async()=>{calls++;});s.close();assert.equal((await s.knowledge({query:'SAL-001'})).status,'SESSION_CLOSED');assert.equal(calls,0);
});
