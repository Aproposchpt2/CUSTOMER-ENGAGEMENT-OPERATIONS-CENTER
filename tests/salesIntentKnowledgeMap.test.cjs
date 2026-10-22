'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const spec=require('../config/sales-intelligence/sales-intent-knowledge-map.json');
const registry=require('../config/sales-intelligence/master-intent-registry-v1.0.json');
test('all 25 sales intents map to nonempty source sections',()=>{
 const expected=registry.intents.filter(x=>x.group==='sales');
 assert.equal(expected.length,25);
 assert.equal(spec.mapping.length,25);
 const refs=new Set(expected.map(x=>x.reference_id));
 for(const item of spec.mapping){
  assert.ok(refs.has(item.intent_ref),item.intent_ref);
  assert.ok(Array.isArray(item.source_sections)&&item.source_sections.length,item.intent_ref);
  assert.equal(item.runtime_status,'NOT_VERIFIED');
 }
 assert.equal(new Set(spec.mapping.map(x=>x.intent_ref)).size,25);
});
test('mapping preserves original Catalog required entities and action',()=>{
 const source=new Map(registry.intents.filter(x=>x.group==='sales').map(x=>[x.reference_id,x.source_fields]));
 for(const item of spec.mapping){
  assert.equal(item.expected_action_from_catalog,source.get(item.intent_ref).Action);
  assert.equal(item.required_entities_from_catalog,source.get(item.intent_ref)['Required Entities']);
 }
});
