'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {assess}=require('./gateway-connection-review.cjs');
test('client TLS and the original backend observer gate remain distinct',()=>{const r=assess({role:'postgres',clientEncrypted:true,clientAuthorized:true,rejectUnauthorized:true,databaseBackendTls:false});assert.equal(r.clientTlsVerified,true);assert.equal(r.originalObserverGuardAccepted,false);});
test('unencrypted or unauthorized client connections never verify TLS',()=>{for(const key of ['clientEncrypted','clientAuthorized','rejectUnauthorized']){const r={role:'postgres',clientEncrypted:true,clientAuthorized:true,rejectUnauthorized:true,databaseBackendTls:true};r[key]=false;assert.equal(assess(r).clientTlsVerified,false);}});
test('unexpected role remains rejected even with both TLS observations',()=>{const r=assess({role:'unexpected',clientEncrypted:true,clientAuthorized:true,rejectUnauthorized:true,databaseBackendTls:true});assert.equal(r.roleAccepted,false);assert.equal(r.originalObserverGuardAccepted,false);});
