'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {checkCallerKnowledge}=require('./check-specialist-readiness.cjs');
const url='https://hvzauakkhlivzeqatfqm.supabase.co';
const sales='5885a020-d363-4c27-910a-c035eda132f5';
const support='d7e80001-0000-4000-b000-000000000001';
const now=new Date('2026-10-25T12:00:00Z');
const row=(tenant,id=1)=>({id:`00000000-0000-4000-8000-${String(id).padStart(12,'0')}`,tenant_id:tenant,title:'Verified answer',content:'Approved substantive answer',category:tenant===sales?'sales_approved_qa':'hvac_qa',approved:true,visibility:'public',audience_scope:'public',publication_state:'published',source_status:'VERIFIED'});
const fetchRows=(fn)=>async q=>({ok:true,json:async()=>fn(q)});
test('rejects production and unexpected staging URLs before any request',async()=>{
 let calls=0;for(const bad of ['https://production.supabase.co',url+'/',url+'.evil.test'])await assert.rejects(checkCallerKnowledge({url:bad,key:'test',fetchImpl:async()=>{calls++;}}),/STAGING_BINDING/);assert.equal(calls,0);
});
test('expired, future, private, wrong category and foreign tenant cannot satisfy readiness',async()=>{
 const variants=[{expires_at:now.toISOString()},{valid_until:now.toISOString()},{effective_at:'2027-01-01'},{effective_at:'invalid'},{content:' '},{visibility:'staff'},{source_status:'UNKNOWN'},{tenant_id:support},{category:'pma_knowledge'}];
 for(const change of variants){const result=await checkCallerKnowledge({url,key:'test',now,fetchImpl:fetchRows(q=>q.searchParams.get('tenant_id')==='eq.'+sales?[{...row(sales),...change}]:[row(support)])});assert.equal(result.sales.status,'NO_ELIGIBLE_RECORDS');assert.equal(result.support.status,'ELIGIBLE_RECORD_FOUND');}
});
test('pagination finds later valid article and reports exact IDs',async()=>{
 const result=await checkCallerKnowledge({url,key:'test',now,fetchImpl:fetchRows(q=>{
 assert.match(q.searchParams.get('select'),/valid_until/);assert.equal(q.searchParams.get('order'),'id.asc');
 if(q.searchParams.get('tenant_id')==='eq.'+support)return [row(support,999)];
 if(q.searchParams.get('offset')==='0')return Array.from({length:100},(_,i)=>({...row(sales,i+1),expires_at:'2025-01-01'}));
 return [row(sales,101)];
 })});assert.deepEqual(result.sales.recordIds,[row(sales,101).id]);assert.deepEqual(result.support.recordIds,[row(support,999).id]);
});
test('HTTP failure and malformed data fail closed',async()=>{
 await assert.rejects(checkCallerKnowledge({url,key:'test',fetchImpl:async()=>({ok:false,status:403})}),/403/);
 await assert.rejects(checkCallerKnowledge({url,key:'test',fetchImpl:fetchRows(()=>({error:'bad'}))}),/INVALID_RESPONSE/);
});
