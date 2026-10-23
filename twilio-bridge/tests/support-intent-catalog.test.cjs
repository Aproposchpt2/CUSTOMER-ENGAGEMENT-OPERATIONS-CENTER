'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const catalog=require('../support-intent-catalog-v1.json');
test('Summit Support intent catalog preserves staging tenant boundary',()=>{
 assert.equal(catalog.tenant.id,'d7e80001-0000-4000-b000-000000000001');
 assert.equal(catalog.tenant.mode,'synthetic_staging_only');
 assert.match(catalog.policy.runtime_activation,/blocked/);
 assert.ok(catalog.intents.length>=19);
 const ids=catalog.intents.map(x=>x.id);
 assert.equal(new Set(ids).size,ids.length);
 assert.ok(catalog.intents.every(x=>x.examples.length>0&&x.behavior.length>0));
 for(const id of ['GAS_LEAK','CARBON_MONOXIDE','FIRE_ELECTRICAL']){
  const entry=catalog.intents.find(x=>x.id===id);
  assert.equal(entry.action,'emergency');
 }
 for(const id of ['TICKET_CREATION','TICKET_STATUS','CALLBACK_REQUEST']){
  assert.equal(catalog.intents.find(x=>x.id===id).requires_verified_tool,true);
 }
});
