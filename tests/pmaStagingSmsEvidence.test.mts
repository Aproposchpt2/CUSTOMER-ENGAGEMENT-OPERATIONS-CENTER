import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import {PGlite} from '@electric-sql/pglite';
import * as domain from '../lib/propertyManagement/domain.ts';
import {dispatchEmergency} from '../lib/propertyManagement/emergencyDispatch.ts';
const require=createRequire(import.meta.url),twilio=require('twilio');
const module={exports:{}};vm.runInNewContext(ts.transpileModule(readFileSync('lib/propertyManagement/stagingSmsEvidence.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,URL,Buffer,require:(n:string)=>n==='./domain'?domain:require(n)});
const api=module.exports as any;
const tenant='5885a020-d363-4c27-910a-c035eda132f5',property='eead9ac5-b28b-4594-b75b-a9e9bbbd111f';
const incident='20000000-0000-4000-8000-000000000001',session='10000000-0000-4000-8000-000000000001',attempt='30000000-0000-4000-8000-000000000001',sid='SM'+'a'.repeat(32);
const env={PMA_ENVIRONMENT:'staging',PMA_CHANNELS_ENABLED:'true',NEXT_PUBLIC_SUPABASE_URL:'https://hvzauakkhlivzeqatfqm.supabase.co',AI4CC_VOICE_DEMO_TENANT_ID:tenant,PMA_STAGING_PROPERTY_ID:property,PMA_STAGING_SMS_FROM:'+17252010584',PMA_STAGING_NOTIFICATION_EVIDENCE_ENABLED:'true',TWILIO_AUTH_TOKEN:'synthetic-token',TWILIO_ACCOUNT_SID:'AC'+'1'.repeat(32)};
function signed(url:string,body:Record<string,string>){return {url,body,headers:{'x-twilio-signature':twilio.getExpectedTwilioSignature(env.TWILIO_AUTH_TOKEN,'https://pma-validation--ai4cc-staging.netlify.app'+url,body)}};}
test('provider status signature covers query, every parameter, account and exact approved destination',()=>{
 const url='/api/twilio/pma-sms-status-staging?attempt_id='+attempt;
 const body={AccountSid:env.TWILIO_ACCOUNT_SID,MessageSid:sid,MessageStatus:'delivered',From:'+17252010584',To:'+17027102622',NewProviderField:'signed too'};
 const request=signed(url,body);const event=api.stagingSmsEvent(request,'status',env);assert.equal(event.op,'status');assert.equal(event.attempt_id,attempt);
 for(const changed of [{...request,url:url.replace(attempt,session)},{...request,body:{...body,NewProviderField:'tampered'}},signed(url,{...body,To:'+15555550100'}),signed(url,{...body,AccountSid:'AC'+'2'.repeat(32)})])assert.throws(()=>api.stagingSmsEvent(changed,'status',env));
 assert.throws(()=>api.stagingSmsEvent(request,'status',{...env,PMA_STAGING_NOTIFICATION_EVIDENCE_ENABLED:'false'}));
 assert.throws(()=>api.stagingSmsEvent(request,'status',{...env,PMA_ENVIRONMENT:'production'}));
 assert.throws(()=>api.stagingSmsEvent(request,'status',{...env,PMA_CHANNELS_ENABLED:'false'}));
});
test('owned-number receiving emits only hashed evidence and binds ACK only to test vendor direction',()=>{
 const url='/api/twilio/pma-sms-receive-staging';const token='a'.repeat(32);
 const body={AccountSid:env.TWILIO_ACCOUNT_SID,MessageSid:sid,From:'+17253305102',To:'+17252010584',Body:'ACK '+token};
 const event=api.stagingSmsEvent(signed(url,body),'receive',env);assert.equal(event.ack_token,token);assert.match(event.body_hash,/^[a-f0-9]{64}$/);assert.equal(event.Body,undefined);
 assert.throws(()=>api.stagingSmsEvent(signed(url,{...body,From:'+15555550100'}),'receive',env));
 const received=api.stagingSmsEvent(signed(url,{...body,From:'+17252010584',To:'+17253305102'}),'receive',env);assert.equal(received.ack_token,null);
});
test('dispatcher persists attempt before sending, supplies callback and distinguishes ambiguous submission',async(t)=>{
 const events:any[]=[];let calls=0;
 const admin={rpc:async(name:string,args:any)=>{events.push({name,args});if(name==='pm_staging_emergency_prepare_v1')return {data:{incidentId:incident,notify:true,preferences:[{channel:'sms',destination:'+17027102622'}]}};if(args.payload.op==='begin')return {data:{attempt_id:attempt,ack_token:'a'.repeat(32),claimed:true}};return {data:{recorded:true}};}};
 t.mock.method(globalThis,'fetch',async(_url:any,o:any)=>{calls++;const body=new URLSearchParams(o.body);assert.equal(body.get('StatusCallback'),api.smsStatusCallback(attempt));assert.equal(events[1].args.payload.op,'begin');return new Response(JSON.stringify({sid,status:'queued'}),{status:201});});
 const ctx={tenantId:tenant,propertyId:property,callSid:'CA'+'1'.repeat(32),sessionId:session,intent:'GAS_EMERGENCY',message:'Synthetic gas'};
 const result=await dispatchEmergency(ctx,admin,env);assert.equal(result.attempts?.[0].providerMessageId,sid);assert.equal(result.attempts?.[0].auditRecorded,true);assert.equal(events[2].args.payload.submission_state,'SUBMITTED');assert.equal(calls,1);
 t.mock.method(globalThis,'fetch',async()=>{throw Error('timeout after write may have happened');});
 const uncertain=await dispatchEmergency(ctx,admin,env);assert.equal(uncertain.state,'UNKNOWN');assert.equal(uncertain.dispatched,false);assert.equal(events.at(-1).args.payload.submission_state,'UNKNOWN');
});
test('unavailable evidence or already claimed attempt sends no new message',async(t)=>{
 let sends=0;t.mock.method(globalThis,'fetch',async()=>{sends++;throw Error('must not send');});
 const ctx={tenantId:tenant,propertyId:property,callSid:'CA'+'1'.repeat(32),sessionId:session,intent:'GAS_EMERGENCY',message:'Synthetic gas'};
 for(const receipt of [{error:{code:'42501'}},{data:{attempt_id:attempt,ack_token:'a'.repeat(32),claimed:false}}]){
  const admin={rpc:async(name:string)=>name==='pm_staging_emergency_prepare_v1'?{data:{incidentId:incident,notify:true,preferences:[{channel:'sms',destination:'+17253305102'}]}}:receipt};
  const r=await dispatchEmergency(ctx,admin,env);assert.equal(r.dispatched,false);
 }
 assert.equal(sends,0);
});
test('HTTP receiver is POST-only, fail-closed, and emits empty TwiML without reply or transport',()=>{
 const calls:any[]=[];let clients=0;
 const load=(eventEnv:any)=>{const m={exports:{}};vm.runInNewContext(ts.transpileModule(readFileSync('pages/api/twilio/pma-sms-receive-staging.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:m,exports:m.exports,process:{env:eventEnv},require:(n:string)=>{
  if(n==='@supabase/supabase-js')return {createClient:()=>{clients++;return {};}};
  if(n==='@/lib/propertyManagement/stagingSmsEvidence')return {stagingSmsEvent:api.stagingSmsEvent,recordSmsEvidence:async(_db:any,p:any)=>{calls.push(p);}};
  if(n==='@/lib/propertyManagement/server')return {privateResponse:(r:any)=>r.setHeader('Cache-Control','no-store'),fail:(r:any,e:any)=>r.status(e.status||500).json({error:e.message})};
  throw Error('Unexpected transport dependency '+n);
 }});return (m.exports as any).default;};
 const response=()=>({code:0,body:undefined as any,headers:{} as any,status(n:number){this.code=n;return this;},setHeader(k:string,v:string){this.headers[k]=v;},send(body:any){this.body=body;return this;},json(body:any){this.body=body;return this;},end(){return this;}});
 const body={AccountSid:env.TWILIO_ACCOUNT_SID,MessageSid:sid,From:'+17252010584',To:'+17027102622',Body:'Synthetic notification'};
 const req={...signed('/api/twilio/pma-sms-receive-staging',body),method:'POST'};
 return (async()=>{
  let res=response();await load(env)({...req,method:'GET'},res);assert.equal(res.code,405);assert.equal(clients,0);
  res=response();await load({...env,PMA_STAGING_NOTIFICATION_EVIDENCE_ENABLED:'false'})(req,res);assert.equal(res.code,503);assert.equal(clients,0);
  res=response();await load(env)({...req,headers:{'x-twilio-signature':'forged'}},res);assert.equal(res.code,403);assert.equal(clients,0);
  res=response();await load(env)(req,res);assert.equal(res.code,200);assert.equal(res.body,'<?xml version="1.0"?><Response/>');assert.equal(calls.length,1);assert.equal(calls[0].Body,undefined);
 })();
});
test('evidence read endpoint denies wrong keys before any database operation',async()=>{
 let clients=0;const operations:any[]=[];const m={exports:{}};
 vm.runInNewContext(ts.transpileModule(readFileSync('pages/api/staging/pma-sms-evidence.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:m,exports:m.exports,process:{env:{...env,BRIDGE_HMAC_SECRET_STAGING:'synthetic-read-key'}},Buffer,require:(n:string)=>{
  if(n==='crypto')return require('node:crypto');
  if(n==='@supabase/supabase-js')return {createClient:()=>{clients++;return {};}};
  if(n==='@/lib/propertyManagement/stagingSmsEvidence')return {smsEvidenceEnabled:api.smsEvidenceEnabled,recordSmsEvidence:async(_db:any,p:any)=>{operations.push(p);return {attempts:[],liveSmsAttempted:false};}};
  if(n==='@/lib/propertyManagement/server')return {privateResponse:()=>{},fail:(r:any,e:any)=>r.status(e.status||500).json({error:e.message})};
  throw Error('Unexpected dependency '+n);
 }});
 const response=()=>({code:0,body:undefined as any,status(n:number){this.code=n;return this;},json(body:any){this.body=body;return this;},end(){return this;}});
 for(const key of [undefined,'wrong']){const res=response();await (m.exports as any).default({method:'GET',headers:{'x-test-key':key}},res);assert.equal(res.code,401);}
 assert.equal(clients,0);
 const res=response();await (m.exports as any).default({method:'GET',headers:{'x-test-key':'synthetic-read-key'}},res);assert.equal(res.code,200);assert.equal(operations[0].op,'inspect');assert.equal(res.body.liveSmsAttempted,false);
});
test('PostgreSQL evidence preserves grants, inactive gating, callback ordering, correlation and test-only ACK',async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema private;grant usage on schema private to service_role;
   create table public.pm_vendors(id uuid primary key,tenant_id uuid,status text);
   create table public.pm_property_vendors(tenant_id uuid,property_id uuid,vendor_id uuid);
   create table public.platform_incidents(id uuid primary key,tenant_id uuid,service text,status text,metadata jsonb,opened_at timestamptz);
   create table public.ai4cc_interactions(id uuid,tenant_id uuid,ended_at timestamptz,started_at timestamptz,metadata jsonb);
   create table public.pm_notification_preferences(tenant_id uuid,entity_type text,entity_id uuid,channel text,event_type text,destination text,active boolean,staging_override boolean);
   insert into public.platform_incidents values('${incident}','${tenant}','pma-voice-staging','OPEN','{"staging":true,"property_id":"${property}","test_mode":false,"session_id":"${session}","call_sid":"CA11111111111111111111111111111111"}',clock_timestamp());
   insert into public.ai4cc_interactions values('${session}','${tenant}',null,clock_timestamp(),'{"voice_demo":true,"selected_route":"property-management-assistant","property_id":"${property}","call_sid":"CA11111111111111111111111111111111"}');
   insert into public.pm_notification_preferences values('${tenant}','property','${property}','sms','emergency_escalation','+17753508039',true,true),('${tenant}','property','${property}','sms','pma_v2_maintenance_vendor_test','+17253305102',false,true);`);
  await db.exec(readFileSync('docs/pma-v2/sql/staging-sms-evidence-review-only.sql','utf8'));
  const asService=()=>db.exec(`set role service_role;set request.jwt.claims='{"role":"service_role"}';`);await asService();
  const invoke=async(payload:any,t=tenant)=> (await db.query<{v:any}>('select public.pm_staging_sms_evidence_v1($1,$2,$3) v',[t,property,payload])).rows[0].v;
  await assert.rejects(db.query('select * from private.pm_staging_sms_attempts_v1'),/permission denied/);
  await assert.rejects(invoke({op:'begin',incident_id:incident,role:'owner'},session),/scope rejected/);
  await assert.rejects(invoke({op:'begin',incident_id:incident,role:'vendor'}),/Active approved preference/);
  const owner=await invoke({op:'begin',incident_id:incident,role:'owner'});assert.equal(owner.claimed,true);assert.equal((await invoke({op:'begin',incident_id:incident,role:'owner'})).claimed,false);
  const status={op:'status',attempt_id:owner.attempt_id,message_sid:sid,status:'delivered',from:'+17252010584',to:'+17753508039'};
  await invoke(status);await invoke({op:'complete',attempt_id:owner.attempt_id,message_sid:sid,status:'queued',submission_state:'SUBMITTED'});await invoke({...status,status:'sent'});await invoke(status);
  await assert.rejects(invoke({...status,to:'+17027102622'}),/status correlation/);
  await assert.rejects(invoke({...status,from:undefined}),/status correlation/);
  await assert.rejects(invoke({...status,message_sid:'SM'+'b'.repeat(32)}),/reference mismatch/);
  await db.exec(`reset role;update public.pm_notification_preferences set active=true where event_type='pma_v2_maintenance_vendor_test';`);await asService();
  await assert.rejects(invoke({op:'begin',incident_id:incident,role:'vendor'}),/vendor assignment/);
  await db.exec(`reset role;insert into public.pm_vendors values('${session}','${tenant}','active');insert into public.pm_property_vendors values('${tenant}','${property}','${session}');insert into private.pm_staging_sms_vendor_binding_v1 values('${tenant}','${property}','${session}','+17253305102');`);await asService();
  const vendor=await invoke({op:'begin',incident_id:incident,role:'vendor'});
  await invoke({op:'complete',attempt_id:vendor.attempt_id,message_sid:'SM'+'c'.repeat(32),status:'queued',submission_state:'SUBMITTED'});
  const ack={op:'receive',message_sid:'SM'+'d'.repeat(32),from:'+17253305102',to:'+17252010584',body_hash:'e'.repeat(64),ack_token:vendor.ack_token};
  const received=await invoke(ack);assert.equal(received.vendorTestAcknowledgment,true);assert.equal(received.vendorAcceptedAssignment,false);assert.equal(received.replySmsSent,false);await invoke(ack);
  const projection=await invoke({op:'inspect'});assert.equal(projection.attempts.length,2);assert.equal(projection.ownedInboxCount,1);assert.equal(projection.liveSmsAttempted,false);
  const visible=JSON.stringify(projection);assert.ok(!visible.includes(vendor.ack_token));assert.ok(!visible.includes('+17753508039'));assert.ok(!visible.includes('body_hash'));
  await assert.rejects(invoke({...ack,message_sid:'SM'+'f'.repeat(32),from:'+17027102622'}),/owned-number|acknowledgment/);
  await assert.rejects(invoke({...ack,body_hash:'f'.repeat(64)}),/Immutable inbox/);
  await db.exec('reset role;');
  const rows=await db.query<any>('select recipient_role,delivery_status,vendor_test_ack_received_at from private.pm_staging_sms_attempts_v1 order by recipient_role');
  assert.equal(rows.rows[0].delivery_status,'delivered');assert.equal(rows.rows[0].vendor_test_ack_received_at,null);assert.ok(rows.rows[1].vendor_test_ack_received_at);
  assert.equal((await db.query<any>('select count(*)::int n from private.pm_staging_sms_inbox_v1')).rows[0].n,1);
  await db.exec('set role anon;');await assert.rejects(invoke({op:'begin',incident_id:incident,role:'owner'}),/permission denied/);
 }finally{await db.close();}
});
