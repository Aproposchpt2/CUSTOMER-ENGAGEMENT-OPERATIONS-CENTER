'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {safeSupportAssets}=require('../support-intelligence.cjs');
const tenant='d7e80001-0000-4000-b000-000000000001';
const approved={id:'entry-1',tenant_id:tenant,title:'Gas Leak Protocol',category:'general',content:'Evacuate and call emergency services from safety.',visibility:'public',audience_scope:'public',approved:true,publication_state:'published',source_status:'VERIFIED'};
test('rejects cross-tenant Support KB projection',()=>assert.throws(()=>safeSupportAssets({trustedTenantId:'5885a020-d363-4c27-910a-c035eda132f5'}),/MISMATCH/));
test('only approved published in-scope unexpired records pass',()=>{
 const v=safeSupportAssets({trustedTenantId:tenant,now:new Date('2026-10-23T00:00:00Z'),knowledgeEntries:[
 approved,{...approved,id:'draft',approved:false,publication_state:'draft'},
 {...approved,id:'other',tenant_id:'5885a020-d363-4c27-910a-c035eda132f5'},
 {...approved,id:'unverified',source_status:'UNKNOWN'},
 {...approved,id:'expired',expires_at:'2026-10-22T00:00:00Z'},
 {...approved,id:'future',effective_at:'2026-10-24T00:00:00Z'}]});
 assert.deepEqual(v.knowledgeEntries.map(x=>x.id),['entry-1']);
 assert.equal(v.intents.length,19);
 assert.equal(v.knowledgeEntries[0].tenant_id,undefined);
});

test('staff-only, missing audience, and invalid validity metadata never reach callers',()=>{
 for(const patch of [{visibility:'staff'},{audience_scope:'staff'},{visibility:undefined},{audience_scope:undefined},{effective_at:'bad'},{expires_at:'bad'},{valid_until:'bad'}]){
  assert.deepEqual(safeSupportAssets({trustedTenantId:tenant,knowledgeEntries:[{...approved,...patch}]}).knowledgeEntries,[]);
 }
});
