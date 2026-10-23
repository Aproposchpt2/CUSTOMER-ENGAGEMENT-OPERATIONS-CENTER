'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const bridge=fs.readFileSync(path.join(__dirname,'../twilio-bridge/server.js'),'utf8');
const {routeIntent}=require('../twilio-bridge/sales-orchestration.cjs');

test('intent assessment registered only with staging and opt-in flag',()=>{
 assert.match(bridge,/STAGING_ONLY && process\.env\.STELLAR_SALES_INTENT_ASSESSMENT_ENABLED === 'true'/);
 assert.match(bridge,/name: 'assess_sales_intent'/);
 assert.match(bridge,/routeIntent\(\{intentId:args\.intentId,confidence:args\.confidence,entities:args\.entities \|\| \{\}\}\)/);
});
test('intent assessment cannot authorize lead submission',()=>{
 for(const confidence of [0,0.5,0.8,0.95,1]){
  const r=routeIntent({intentId:'SLS-013',confidence});
  assert.equal(r.mayExecute,false);
 }
});
test('out-of-catalog IDs never authorize actions',()=>{
 for(const id of ['WF-001','SLS-999','DROP TABLE',null]){
  assert.equal(routeIntent({intentId:id,confidence:1}).mayExecute,false);
 }
});
