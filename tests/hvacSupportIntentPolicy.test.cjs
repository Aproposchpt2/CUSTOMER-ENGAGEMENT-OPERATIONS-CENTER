'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {classifyCandidate,TENANT_ID,SAFETY}=require('../twilio-bridge/hvac-support-intent-policy.cjs');
const src=require('../docs/hvac-knowledge/source/HVAC-SUPPORT-master-intents-source.json');
test('canonical inventory includes support 13, HVAC 22, SAFE 8',()=>{assert.equal(src.counts.support,13);assert.equal(src.counts.hvac,22);assert.equal(SAFETY.size,8)});
test('correct tenant and confidence threshold are mandatory',()=>{const r=classifyCandidate({tenantId:TENANT_ID,referenceId:'HVC-001',confidence:0.95});assert.equal(r.decision,'RECOGNIZED');assert.equal(r.mayExecute,false);assert.equal(classifyCandidate({tenantId:'5885a020-d363-4c27-910a-c035eda132f5',referenceId:'HVC-001',confidence:1}).decision,'DENY_TENANT')});
test('model confidence alone never causes a business write',()=>{for(const confidence of [0,0.5,0.75,0.95,1]) assert.equal(classifyCandidate({tenantId:TENANT_ID,referenceId:'SUP-001',confidence}).mayExecute,false)});
test('deterministic safety has precedence',()=>{const r=classifyCandidate({tenantId:TENANT_ID,referenceId:'HVC-001',confidence:1,scannerSafetyId:'SAFE-001'});assert.equal(r.decision,'SAFETY_OVERRIDE');assert.equal(r.mayExecute,false)});
test('unrecognized intent and workflow codes denied',()=>{for(const id of ['HVC-999','WF-001',null]) assert.equal(classifyCandidate({tenantId:TENANT_ID,referenceId:id,confidence:1}).decision,'UNKNOWN_INTENT')});
