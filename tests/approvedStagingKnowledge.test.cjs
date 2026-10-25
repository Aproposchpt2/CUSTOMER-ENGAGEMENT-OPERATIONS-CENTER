'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {allowed,searchKnowledge,TENANTS}=require('../twilio-bridge/approved-staging-knowledge.cjs');
const now=new Date('2026-10-24T12:00:00Z');
const base={tenant_id:TENANTS.support,category:'hvac_safety',approved:true,visibility:'public',audience_scope:'public',publication_state:'published',source_status:'VERIFIED',title:'Carbon monoxide safety',content:'Leave and call emergency services',effective_at:null,expires_at:null,valid_until:null};
test('reject cross-tenant, PMA, staff, unapproved, expired, and invalid KB',()=>{
 assert.equal(allowed(base,'support',now),true);
 for(const change of [{tenant_id:TENANTS.sales},{category:'pma_agent_model_v1'},{visibility:'staff'},{audience_scope:'staff'},{approved:false},{publication_state:'draft'},{expires_at:'2025-01-01'},{valid_until:'not-a-date'},{source_status:'UNKNOWN'}]){
  assert.equal(allowed({...base,...change},'support',now),false,JSON.stringify(change));
 }
 assert.equal(allowed({...base,source_status:'DEMO'},'support',now),true);
 assert.equal(allowed({...base,tenant_id:TENANTS.sales,category:'sales_qa',source_status:'DEMO'},'sales',now),false);
});
test('requires explicit staging config and denies unauthorized queries',async()=>{
 assert.equal((await searchKnowledge({profile:'pma',query:'cooling'})).error,'INVALID_PROFILE');
 assert.equal((await searchKnowledge({profile:'support',query:'x'})).error,'INVALID_QUERY');
 assert.equal((await searchKnowledge({profile:'support',query:'cooling'})).error,'DISABLED');
});
test('server-owned tenant, DB and post-fetch guards remain enforced',async()=>{
 let visited;
 const env={STELLAR_BRIDGE_STAGING:'true',STELLAR_STAGING_APPROVED_KB_ENABLED:'true',
 STAGING_SUPABASE_URL:'https://hvzauakkhlivzeqatfqm.supabase.co',STAGING_SUPABASE_SERVICE_ROLE_KEY:'test-secret'};
 const request=async url=>{visited=new URL(url);return {ok:true,json:async()=>[
 base,{...base,tenant_id:TENANTS.sales},{...base,visibility:'staff'},{...base,category:'pma_agent_model_v1'}
 ]}};
 const x=await searchKnowledge({profile:'support',query:'carbon',env,request,now});
 assert.equal(x.ok,true);assert.equal(x.items.length,1);assert.equal(visited.searchParams.get('tenant_id'),'eq.'+TENANTS.support);
 assert.equal(visited.searchParams.get('approved'),'eq.true');
 assert.equal(visited.searchParams.get('visibility'),'eq.public');
 assert.equal(visited.searchParams.get('audience_scope'),'eq.public');
});
