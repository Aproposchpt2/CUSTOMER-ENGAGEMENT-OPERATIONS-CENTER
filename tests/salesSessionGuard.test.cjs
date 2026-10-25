'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {validSession,payloadForTrustedSession,TENANT}=require('../twilio-bridge/sales-session-guard.cjs');
const base={tenantId:TENANT,propertyId:'11111111-1111-4111-8111-111111111111',contactId:'22222222-2222-4222-8222-222222222222',actorId:'33333333-3333-4333-8333-333333333333',sessionId:'44444444-4444-4444-8444-444444444444',synthetic:true,voiceDemo:true,selectedRoute:'sales-specialist'};
const details={confirmed:true,callerName:'Fictional Person',description:'Test-only Sales inquiry',email:'fictional@example.invalid'};
test('accepts bound synthetic Sales session and canonical UUID',()=>{assert.equal(validSession(base),true);const p=payloadForTrustedSession(base,details);assert.equal(p.t,TENANT);assert.equal(p.session_id,base.sessionId);assert.equal(p.payload.interactionId,base.sessionId)});
test('denies foreign tenant, unknown route and missing IDs',()=>{for(const c of [{...base,tenantId:'d7e80001-0000-4000-b000-000000000001'},{...base,selectedRoute:'support'},{...base,sessionId:'staging:CA123'},{...base,synthetic:false}]){assert.equal(validSession(c),false);assert.throws(()=>payloadForTrustedSession(c,details),/TRUSTED_SALES_SESSION_REQUIRED/)}});
test('denies unconfirmed or model-supplied RPC identity',()=>{assert.throws(()=>payloadForTrustedSession(base,{...details,confirmed:false}),/CONFIRMED_DETAILS_REQUIRED/);assert.throws(()=>payloadForTrustedSession(base,{...details,t:'foreign'}),/UNTRUSTED_FIELD/)});
