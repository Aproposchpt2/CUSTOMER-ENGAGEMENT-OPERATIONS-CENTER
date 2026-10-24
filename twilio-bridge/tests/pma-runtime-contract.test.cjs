'use strict';
// Stage-only PMA orchestration contract: catch disconnected schemas before telephone release.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const catalog=require('../pma-intent-catalog-v1.json');
const profile=require('../pma-profile.json');
const {classify}=require('../pma-intents.cjs');
const {boundInstructions}=require('../voice-entry.cjs');
const {processVoiceDemo}=require('../../lib/voiceDemo/gateway.cjs');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const active={session_id:'11111111-1111-4111-8111-111111111111',call_sid:'CA'+'a1'.repeat(16),caller_number:'+15555550123',account_sid:'AC'+'b1'.repeat(16),agentRoute:'property-management-assistant',start_time:new Date(Date.now()-1000).toISOString()};
const env={PMA_ENVIRONMENT:'staging',VOICE_DEMO_IVR_ENABLED:'true',PMA_STAGING_TEST_CALLER:active.caller_number};
const base={action:'stream_start',call_sid:active.call_sid,session_id:active.session_id,agentRoute:active.agentRoute};
const publicEntry={id:'fixture-public-property',title:'Public parking policy',content:'Visitors use the visitor area.',version_num:1,approved:true,publication_state:'published',visibility:'public',source_status:'VERIFIED',tags:[],effective_at:'2020-01-01T00:00:00Z'};
const dependencies=entries=>({env,record:async()=>active,knowledge:async route=>{assert.equal(route,'property-management-assistant');return entries;}});
test('all 25 operative PMA intents are unique and declared by the actual voice workflow tool',()=>{
 assert.equal(catalog.intents.length,25);
 const catalogNames=catalog.intents.map(x=>x.intent);
 assert.equal(new Set(catalogNames).size,25);
 const tool=profile.tool;
 assert.equal(tool.name,'pma_property_workflow');
 assert.deepEqual(new Set(tool.parameters.properties.intent.enum),new Set(catalogNames));
 for(const intent of catalog.intents){
   assert.ok(intent.action && intent.workflow && intent.restrictions,intent.intent);
   assert.equal(classify(intent.examples[0]).intent,intent.intent,'deterministic intent fixture: '+intent.intent);
 }
});
test('PMA catalog remains distinct from the enterprise Sales/Support catalog',()=>{
 const enterprise=require('../voice-agent-catalog.json');
 assert.equal(enterprise.status,'STAGING_CANDIDATE');
 assert.ok(!enterprise.intents.some(x=>x.group==='pma'));
 assert.ok(catalog.intents.some(x=>x.intent==='SUSPECTED_GAS_LEAK'));
});
test('approved current public property data is injected; private, draft, expired and unverified values never reach PMA',async()=>{
 const entries=[publicEntry,
  {...publicEntry,id:'fixture-staff-secret',content:'STAFF_SECRET',visibility:'staff'},
  {...publicEntry,id:'fixture-resident-secret',content:'RESIDENT_SECRET',visibility:'resident'},
  {...publicEntry,id:'fixture-draft',content:'DRAFT_SECRET',publication_state:'draft'},
  {...publicEntry,id:'fixture-unapproved',content:'UNAPPROVED_SECRET',approved:false},
  {...publicEntry,id:'fixture-unverified',content:'UNVERIFIED_SECRET',source_status:'REVIEW'},
  {...publicEntry,id:'fixture-expired',content:'EXPIRED_SECRET',expires_at:'2020-01-01T00:00:00Z'},
  {...publicEntry,id:'fixture-future',content:'FUTURE_SECRET',effective_at:'2999-01-01T00:00:00Z'}];
 const result=await processVoiceDemo(base,dependencies(entries));
 assert.equal(result.assets.knowledgeAvailable,true);
 assert.deepEqual(result.assets.knowledgeEntries.map(x=>x.id),['fixture-public-property']);
 assert.equal(result.assets.intents.length,25);
 const bound=boundInstructions('PMA caller instructions',active,result.assets);
 assert.match(bound,/Visitors use the visitor area/);
 for(const marker of ['STAFF_SECRET','RESIDENT_SECRET','DRAFT_SECRET','UNAPPROVED_SECRET','UNVERIFIED_SECRET','EXPIRED_SECRET','FUTURE_SECRET'])assert.ok(!bound.includes(marker),marker);
 assert.ok(bound.includes('SUSPECTED_GAS_LEAK'));
 assert.ok(bound.includes('MAINTENANCE_REQUEST'));
});
test('empty eligible KB explicitly forbids the model from inventing property facts',async()=>{
 const result=await processVoiceDemo(base,dependencies([]));
 assert.equal(result.assets.knowledgeAvailable,false);
 assert.deepEqual(result.assets.knowledgeEntries,[]);
 assert.match(boundInstructions('PMA caller instructions',active,result.assets),/cannot verify the answer/);
});
test('PMA has both signed availability and confirmed-workflow dispatch paths; no raw model-driven database operations',()=>{
 const adapter=read('twilio-bridge/pma-adapter.cjs');
 const bridge=read('twilio-bridge/server.js');
 const gateway=read('lib/voiceDemo/gateway.cjs');
 const endpoint=read('pages/api/intake/voice-demo-staging.ts');
 assert.match(adapter,/name:'pma_check_availability'/);
 assert.match(adapter,/name:'pma_property_workflow'|profile\.tool/);
 assert.match(adapter,/createHmac\('sha256'/);
 assert.match(bridge,/voiceEntry\.openSession\(session\)/);
 assert.match(bridge,/boundInstructions\(instructions,session,assets\)/);
 assert.match(gateway,/pm[aA]Catalog\.intents/);
 assert.match(endpoint,/pm_public_voice_knowledge_v1/);
 assert.match(endpoint,/PMA_STAGING_PROPERTY_ID/);
 assert.match(read('lib/propertyManagement/voiceOrchestration.ts'),/pm_voice_turn_v1/);
});
