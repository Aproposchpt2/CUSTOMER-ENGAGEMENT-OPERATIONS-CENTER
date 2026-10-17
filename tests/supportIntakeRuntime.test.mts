import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=readFileSync(new URL('../pages/api/experimental-support-intake.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
async function invoke({authenticated=true,rpcError=null,created=true,notify=false,recipient='',notificationOk=true,origin='https://test.invalid'}:any={}){
 let notifications=0,rpcCalls=0; const exports:any={};
 const env:any={STELLAR_SUPPORT_TEST_WRITES_ENABLED:'true',NEXT_PUBLIC_SUPABASE_URL:'https://hvzauakkhlivzeqatfqm.supabase.co',RESEND_API_KEY:'mock'};
 if(notify)env.STELLAR_SUPPORT_TEST_NOTIFICATIONS_ENABLED='true';if(recipient)env.STELLAR_SUPPORT_TEST_NOTIFICATION_RECIPIENT=recipient;
 const client={auth:{getUser:async()=>({data:{user:authenticated?{id:'fictional-user'}:null}})},rpc:async()=>{rpcCalls++;return{data:rpcError?null:[{customer_id:'actual-db-customer',case_id:'actual-db-case',created_new:created}],error:rpcError};}};
 const context={exports,require:()=>({createClient:()=>client}),process:{env},console:{error(){},warn(){}},URL,AbortSignal,fetch:async()=>{notifications++;return{ok:notificationOk,status:500,text:async()=>''};}};
 vm.runInNewContext(js,context);
 let status=0,body:any;const res:any={setHeader(){},status(n:number){status=n;return this;},json(v:any){body=v;return this;}};
 await exports.default({method:'POST',headers:{origin,host:'test.invalid'},body:{tenantId:'5885a020-d363-4c27-910a-c035eda132f5',name:'Fictional Test',phone:'+12025550199',product:'Test device',issue:'Fictional fault description',sessionId:'acceptance-session-001'}},res);
 return{status,body,notifications,rpcCalls};
}
test('confirmed IDs returned and notifications disabled by default',async()=>{const r=await invoke();assert.equal(r.status,201);assert.equal(r.body.caseId,'actual-db-case');assert.equal(r.notifications,0);});
test('failed persistence never returns success',async()=>{const r=await invoke({rpcError:{code:'XX000'}});assert.equal(r.status,500);assert.equal(r.body.caseId,undefined);assert.equal(r.notifications,0);});
test('invalid authentication and origin block writes',async()=>{const a=await invoke({authenticated:false});assert.equal(a.status,401);assert.equal(a.rpcCalls,0);const b=await invoke({origin:'https://wrong.invalid'});assert.equal(b.status,403);assert.equal(b.rpcCalls,0);});
test('duplicate intake does not send another notification',async()=>{const r=await invoke({created:false,notify:true,recipient:'fictional@example.invalid'});assert.equal(r.status,201);assert.equal(r.notifications,0);});
test('notification success and failure preserve confirmed persistence',async()=>{const a=await invoke({notify:true,recipient:'fictional@example.invalid'});assert.equal(a.body.notificationSent,true);const b=await invoke({notify:true,recipient:'fictional@example.invalid',notificationOk:false});assert.equal(b.status,201);assert.equal(b.body.notificationSent,false);assert.equal(b.body.caseId,'actual-db-case');});
test('notification opt-in without test recipient sends nothing',async()=>{const r=await invoke({notify:true});assert.equal(r.notifications,0);assert.equal(r.body.notificationError,'TEST_RECIPIENT_NOT_CONFIGURED');});
