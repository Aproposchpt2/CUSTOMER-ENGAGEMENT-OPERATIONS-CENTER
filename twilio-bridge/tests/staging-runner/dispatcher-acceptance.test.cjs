'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {authorize,delivered}=require('./dispatcher-acceptance.cjs');
test('committed acceptance requires explicit separate authorization',()=>{const old=process.env.STAGING_DISPATCH_ACCEPTANCE_AUTHORIZED;delete process.env.STAGING_DISPATCH_ACCEPTANCE_AUTHORIZED;assert.throws(authorize,/DISPATCH_ACCEPTANCE_AUTHORIZATION_REQUIRED/);if(old)process.env.STAGING_DISPATCH_ACCEPTANCE_AUTHORIZED=old;});
test('delivery evidence requires one receipt and one effect',()=>{assert.throws(()=>delivered({event:{delivery_state:'DELIVERED'},receipt:[],effect:[]},{}),/DELIVERY_NOT_EXACTLY_ONCE/);});
test('delivery evidence rejects incorrect session association',()=>{assert.throws(()=>delivered({event:{delivery_state:'DELIVERED'},receipt:[{case_id:'a',tenant_id:'5885a020-d363-4c27-910a-c035eda132f5',session_id:'wrong'}],effect:[{case_id:'a'}]},{caseId:'a',session:'original'}),/RECEIPT_ASSOCIATION_INVALID/);});
