'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { searchCatalog } = require('../twilio-bridge/voice-intent-search.cjs');
test('expanded catalog lookup is isolated by specialist', () => {
 const sales=searchCatalog({profile:'sales',query:'pricing'});
 const support=searchCatalog({profile:'support',query:'ticket'});
 assert.equal(sales.ok,true);
 assert.equal(support.ok,true);
 assert.ok(sales.results.every(x=>['sales','universal','conversation_control','safety'].includes(x.group)));
 assert.ok(support.results.every(x=>['support','universal','conversation_control','safety'].includes(x.group)));
 assert.ok(sales.results.length>0);
 assert.ok(support.results.length>0);
});
test('rejects unknown domain, bad query, excessive request',()=>{
 assert.deepEqual(searchCatalog({profile:'pma',query:'ticket'}),{ok:false,error:'UNAUTHORIZED_PROFILE'});
 assert.deepEqual(searchCatalog({profile:'sales',query:'a'}),{ok:false,error:'INVALID_QUERY'});
 assert.deepEqual(searchCatalog({profile:'sales',query:'ticket',limit:100}),{ok:false,error:'INVALID_LIMIT'});
});
test('catalog output never grants authorization or returns candidate KB as verified facts',()=>{
 const r=searchCatalog({profile:'sales',query:'service'});
 assert.equal(r.ok,true);
 assert.match(r.advisory,/not authorization/i);
 assert.ok(r.results.every(x=>!('approvedVoiceAnswer' in x)&&!('toolMapping' in x)));
});
