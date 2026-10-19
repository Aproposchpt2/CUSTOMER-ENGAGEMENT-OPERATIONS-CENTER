'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {assertState}=require('./c1-r1-acceptance.cjs');
const tenant='5885a020-d363-4c27-910a-c035eda132f5';
const f={session:'fictional-session',operation:'fictional-operation',caseId:'original-case'};
function valid(){return {workflow:{tenant_id:tenant,session_id:f.session,tool_call_id:f.operation,state:'COMPLETED',case_id:f.caseId},cases:[{id:f.caseId,tenant_id:tenant,intake_session_id:f.session,test_only:true}],events:[{event_type:'COMPLETED',case_id:f.caseId,tenant_id:tenant,session_id:f.session,delivered_at:null,attempts:0}],completionCount:1};}
test('completion evidence rejects a case from a different session',()=>{const s=valid();s.cases[0].intake_session_id='other-session';assert.throws(()=>assertState(s,f,'COMPLETED'),/CASE_ASSOCIATION_INVALID/);});
test('completion evidence rejects an outbox event pointing at a different case',()=>{const s=valid();s.events[0].case_id='unrelated-case';assert.throws(()=>assertState(s,f,'COMPLETED'),/EVENT_ASSOCIATION_INVALID/);});
test('completion evidence rejects duplicate tickets',()=>{const s=valid();s.cases.push({...s.cases[0],id:'duplicate-case'});assert.throws(()=>assertState(s,f,'COMPLETED'),/CASE_COUNT_INVALID/);});
test('notification delivery is rejected for a synthetic fixture',()=>{const s=valid();s.events[0].delivered_at='2026-10-19';assert.throws(()=>assertState(s,f,'COMPLETED'),/NOTIFICATION_DISPATCH_DETECTED/);});
test('missing case cannot be accepted as completed',()=>{const s=valid();assert.throws(()=>assertState(s,{...f,caseId:undefined},'COMPLETED'),/CASE_COUNT_INVALID/);});
