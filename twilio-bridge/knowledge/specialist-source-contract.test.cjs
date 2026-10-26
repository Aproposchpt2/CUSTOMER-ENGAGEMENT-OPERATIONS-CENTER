'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const {readReviewSource,TENANTS}=require('./specialist-source-contract.cjs');
const url='https://hvzauakkhlivzeqatfqm.supabase.co';
test('review source rejects wrong environment and cross-product tenant before network',async()=>{
 let calls=0;const req={url,key:'test',tenantId:TENANTS.sales,scope:'sales',type:'knowledge',recordId:'SAL-082',fetchImpl:async()=>{calls++;}};
 for(const change of [{url:'https://production.supabase.co'},{scope:'support_hvac'},{tenantId:TENANTS.support_hvac},{scope:'shared'},{scope:'toString'}])await assert.rejects(readReviewSource({...req,...change}),/BINDING/);assert.equal(calls,0);
});
test('returns explicit internal-only payload without pretending draft is caller eligible',async()=>{
 const result=await readReviewSource({url,key:'test',tenantId:TENANTS.sales,scope:'support_platform',type:'knowledge',recordId:'SUP-080',fetchImpl:async(u,o)=>{assert.equal(JSON.parse(o.body).p_scope,'support_platform');return {ok:true,json:async()=>[{record_id:'SUP-080',review_state:'draft',caller_enabled:false,payload:{answer:'draft'}}]};}});
 assert.equal(result.callerUsable,false);assert.equal(result.records.length,1);
});
test('unexpected enabled payload and failed request fail closed',async()=>{
 for(const response of [{ok:false},{ok:true,json:async()=>[{record_id:'SAL-082',review_state:'draft',caller_enabled:true}]}])await assert.rejects(readReviewSource({url,key:'test',tenantId:TENANTS.sales,scope:'sales',type:'knowledge',recordId:'SAL-082',fetchImpl:async()=>response}));
});
