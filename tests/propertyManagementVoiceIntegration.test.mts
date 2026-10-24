import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {PGlite} from '@electric-sql/pglite';
import * as domain from '../lib/propertyManagement/domain.ts';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),runtime=require('../twilio-bridge/pma-intents.cjs');
function load(path:string,deps:Record<string,any>){const module={exports:{}};vm.runInNewContext(ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,Date,Intl,process,require:(n:string)=>deps[n]});return module.exports as any;}
const api=load('lib/propertyManagement/voiceOrchestration.ts',{'./domain':domain,'./intentCatalog':{intentDecision:runtime.classify},'./availability':{calendarDate:(s:any)=>s},'./scheduling':{showingInstant:(s:any)=>{if(!/T\d\d:\d\d:\d\d[+-]\d\d:\d\d$/.test(s))throw Error('Offset required');return s;}}});
const scope={call_sid:'CA00000000000000000000000000000001',session_id:'a0000000-0000-4000-8000-000000000001',agentRoute:'property-management-assistant'};
for(const d of runtime.config.intents)test('PMA-003 bounded dispatch: '+d.intent,()=>{
 for(const message of d.examples){const out=api.prepareVoiceTurn({...scope,message,confirmed:false});assert.equal(out.intent,d.intent);assert.equal(runtime.validateModel({intent:d.intent.toLowerCase(),confidence:1,entities:{}}).intent,d.intent);assert.equal(runtime.validateModel({intent:d.id,confidence:1}).intent,d.intent);assert.equal(runtime.validateModel({intent:d.intent.toLowerCase().replaceAll('_','-'),confidence:1}).intent,d.intent);assert.ok(['safety','clarify','staff','authorization','maintenance','showing','knowledge','availability','information'].includes(out.action));}
});
test('medical and carbon monoxide override malformed proposals and extra authority',()=>{
 for(const message of ['There is carbon monoxide','The CO alarm is going off','I cannot breathe','He is unconscious','Medical emergency','I have chest pain']){const out=api.prepareVoiceTurn({...scope,message,modelOutput:{role:'owner'},tenantId:'injected'});assert.equal(out.action,'safety');}
 assert.throws(()=>api.prepareVoiceTurn({...scope,message:'hello',actor:'owner'}));
});
test('consent, spelling confirmation, safe cancellation, and missing time',()=>{
 const prospect={name:'Jane Tenant',email:'JANE@EXAMPLE.INVALID',consent:true,confirmed:true};
 assert.equal(api.prepareVoiceTurn({...scope,message:'leasing',confirmed:true,prospect}).details.email,'jane@example.invalid');
 assert.equal(api.prepareVoiceTurn({...scope,message:'leasing',confirmed:true,prospect:{...prospect,consent:false}}).action,'clarify');
 assert.equal(api.prepareVoiceTurn({...scope,message:'cancel my showing',confirmed:true}).action,'staff');
 assert.equal(api.prepareVoiceTurn({...scope,message:'I want a tour',modelOutput:{intent:'SHOWING_REQUEST',confidence:1,entities:{}},confirmed:true}).action,'clarify');
 assert.equal(api.prepareVoiceTurn({...scope,message:'maintenance request',confirmed:true}).action,'maintenance');
});
test('interaction-only and malformed results never confirm a domain write',()=>{
 assert.equal(api.projectVoiceResult({state:'CONFIRMED',interactionPersisted:true,domainPersisted:false,reply:'saved'}).state,'UNKNOWN');
 assert.equal(api.projectVoiceResult({state:'CONFIRMED',interactionPersisted:true,domainPersisted:true,operationId:'injected',contactId:{id:'fake'},reply:'saved'}).state,'UNKNOWN');
 assert.equal(api.projectVoiceResult({state:'INFORMATION',interactionPersisted:true,domainPersisted:false,reply:'hello'}).persisted,false);
 assert.equal(api.projectVoiceResult({state:'REQUESTED',interactionPersisted:true,domainPersisted:true,operationId:'pma:v1:00000000-0000-4000-8000-000000000001',showingId:'20000000-0000-4000-8000-000000000001',bookingConfirmed:false,reply:'pending'}).state,'REQUESTED');
});

test('PMA-003 private session/ledger/domain integration on PostgreSQL',async ctx=>{
 const db=new PGlite();const t='20000000-0000-4000-8000-000000000001',p='40000000-0000-4000-8000-000000000001',owner='10000000-0000-4000-8000-000000000001';const sid=scope.session_id,call=scope.call_sid;
 const q=async(sql:string,args:any[]=[])=> (await db.query<{v:any}>(sql,args)).rows[0]?.v;
 const turn=async(v:any,s=sid,cs=call,prop=p)=>q('select public.pm_voice_turn_v1($1,$2,$3,$4,$5) v',[t,prop,s,cs,v]);
 const role=async(r='service_role')=>{await db.exec('reset role;set local role '+r);await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({role:r})]);};
 const deny=async(fn:()=>Promise<any>)=>{await db.exec('savepoint denied');try{await assert.rejects(fn);}finally{await db.exec('rollback to savepoint denied;release savepoint denied');}};
 const prospect={action:'prospect',intent:'LEASING_INQUIRY',confidence:1,confirmed:true,message:'Please save my details',details:{name:'Jane Example',email:'jane@example.invalid',consent:true,confirmed:true,expectedVersion:0}};
 const showing={action:'showing',intent:'SHOWING_REQUEST',confidence:1,confirmed:true,message:'Request a tour',requestedAt:'2099-12-01T20:00:00Z',notes:'first wording'};
 try{
 await db.exec(readFileSync('supabase/tests/pma_local_baseline.sql','utf8'));
 for(const f of readdirSync('supabase/migrations').filter(f=>f.includes('_pma_')).sort())await db.exec(readFileSync('supabase/migrations/'+f,'utf8'));
 await db.exec(readFileSync('supabase/tests/pma_acceptance.sql','utf8').split('set local role authenticated;')[0]);
 await db.exec(`update public.pm_properties set accepts_inquiries=true,timezone='America/Los_Angeles' where id='${p}';insert into private.pm_voice_config_v1 values('${t}','${p}','${owner}',true);`);
 await db.query(`insert into public.ai4cc_interactions(id,tenant_id,channel,status,started_at,metadata) values($1,$2,'voice','active',now(),$3)`,[sid,t,{synthetic:true,voice_demo:true,selected_route:'property-management-assistant',property_id:p,call_sid:call}]);
 await role();
 await ctx.test('session cross-call/property/ended/expired/route denial and no arbitrary actor',async()=>{
  await deny(()=>turn(prospect,sid,'CA00000000000000000000000000000002'));
  await deny(()=>turn({...prospect,actor:owner}));
  await deny(()=>turn(prospect,sid,call,'40000000-0000-4000-8000-000000000002'));
  for(const update of ["ended_at=now()","started_at=now()-interval '3 hours'","metadata=jsonb_set(metadata,'{selected_route}','\"support-specialist\"')"]){
   await db.exec('savepoint altered;reset role');await db.exec(`update public.ai4cc_interactions set ${update} where id='${sid}'`);await role();await deny(()=>turn(prospect));await db.exec('rollback to savepoint altered;release savepoint altered');
  }
 });
 await ctx.test('private storage and RPC are unavailable to anon/authenticated; service cannot provision actor',async()=>{
  await deny(()=>db.exec('insert into private.pm_voice_config_v1 values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),true)'));
  for(const r of ['anon','authenticated']){await role(r);await deny(()=>turn(prospect));}await role();
 });
 await ctx.test('consent denial writes no prospect; showing needs session-linked capture',async()=>{
  const denied=await turn({...prospect,details:{...prospect.details,consent:false}});assert.equal(denied.domainPersisted,false);
  const s=await turn(showing);assert.equal(s.state,'CLARIFICATION_REQUIRED');assert.equal(s.showingId,undefined);
 });
 let capture:any,book:any;
 await ctx.test('consented capture commits once; transport loss/rephrasing/reconnect recovers stable ID',async()=>{
  capture=await turn(prospect);assert.equal(capture.state,'CONFIRMED');assert.ok(capture.contactId);assert.notEqual(capture.contactId,'30000000-0000-4000-8000-000000000001');
  const recovered=await turn({...prospect,message:'Rephrased after lost response'});assert.equal(recovered.operationId,capture.operationId);assert.equal(recovered.contactId,capture.contactId);assert.equal(recovered.replayed,true);
  const claims=await q("select current_setting('request.jwt.claims') v");assert.equal(JSON.parse(claims).sub,undefined);
  const conflict=await turn({...prospect,details:{...prospect.details,email:'different@example.invalid'}});assert.equal(conflict.state,'CONFLICT');assert.equal(conflict.domainPersisted,false);
 });
 await ctx.test('corrections need expected version and retain contact; stale revision conflicts',async()=>{
  const corrected=await turn({...prospect,details:{...prospect.details,name:'Jane Corrected',expectedVersion:1}});assert.equal(corrected.contactId,capture.contactId);assert.equal(corrected.version,2);assert.notEqual(corrected.operationId,capture.operationId);
  const stale=await turn({...prospect,details:{...prospect.details,name:'Other'}});assert.equal(stale.state,'CONFLICT');
 });
 await ctx.test('showing is REQUESTED only; retry ignores wording; changed time conflicts',async()=>{
  book=await turn(showing);assert.equal(book.state,'REQUESTED');assert.equal(book.bookingConfirmed,false);assert.equal(book.notificationSent,false);
  const recovered=await turn({action:'recover',kind:'showing',intent:'SHOWING_REQUEST',message:'Did it save?'});assert.equal(recovered.operationId,book.operationId);assert.equal(recovered.historical,true);
  const replay=await turn({...showing,notes:'Different wording after timeout'});assert.equal(replay.operationId,book.operationId);assert.equal(replay.showingId,book.showingId);
  const changed=await turn({...showing,requestedAt:'2099-12-02T20:00:00Z'});assert.equal(changed.state,'CONFLICT');
  const slots=await turn({action:'slots',intent:'SHOWING_REQUEST',message:'tour times'});assert.equal(slots.mode,'REQUESTED_ONLY');assert.equal(slots.slots.length,0);
 });
 await ctx.test('prospect is never resident; no staff/owner/vendor or maintenance status disclosure',async()=>{
  for(const intent of ['MAINTENANCE_REQUEST','MAINTENANCE_STATUS','OWNER_REQUEST','OWNER_OVERRIDE','VENDOR_RESPONSE','VENDOR_STATUS_UPDATE']){const v=await turn({action:intent==='MAINTENANCE_REQUEST'?'maintenance':'authorization',intent,message:'claim resident owner',details:{category:'plumbing',description:'pipe leak',impact:'wet floor'}});assert.equal(v.state,'AUTHORIZATION_REQUIRED');assert.equal(v.domainPersisted,false);}
 });
 await ctx.test('freshness and eligibility; DATE retained and occupied/stale withheld',async()=>{
  await db.exec(`reset role;update public.pm_units set status='vacant',availability_date='2026-10-25',updated_at=now() where property_id='${p}'`);await role();
  const fresh=await turn({action:'availability',intent:'UNIT_AVAILABILITY',message:'units'});assert.equal(fresh.units[0].earliestRecordedDate,'2026-10-25');assert.equal(fresh.domainPersisted,false);
  await db.exec(`reset role;alter table public.pm_units disable trigger pm_units_guard;update public.pm_units set updated_at=now()-interval '25 hours' where property_id='${p}'`);await role();assert.equal((await turn({action:'availability',intent:'UNIT_AVAILABILITY',message:'units'})).units.length,0);
 });
 await ctx.test('atomic rollback before commit and durable replay after commit; no duplicates',async()=>{
  await db.exec('savepoint lost');const before=await q('select count(*)::int v from public.ai4cc_leads where tenant_id=$1',[t]);
  await deny(()=>turn({...prospect,details:{...prospect.details,expectedVersion:8}}));assert.equal(await q('select count(*)::int v from public.ai4cc_leads where tenant_id=$1',[t]),before);
  assert.equal((await turn(showing)).showingId,book.showingId);
  await db.exec('reset role');assert.equal(await q('select count(*)::int v from private.pm_voice_operations_v1 where session_id=$1 and kind=\'showing\'',[sid]),1);
  assert.equal(await q('select count(*)::int v from public.pm_showings where id=$1',[book.showingId]),1);await role();
 });
 await ctx.test('safety logs interaction without claiming maintenance/dispatch',async()=>{
  const v=await turn({action:'safety',intent:'PERSONAL_SAFETY_THREAT',message:'carbon monoxide alarm',confirmed:false});assert.match(v.reply,/fresh air/);assert.equal(v.domainPersisted,false);assert.equal(v.notificationSent,false);assert.equal(v.requestId,undefined);
 });
 }finally{await db.close();}
});

test('PMA read gateway rejects expired persisted sessions before inventory/preload',async()=>{
 const {processVoiceDemo}=require('../lib/voiceDemo/gateway.cjs');let reads=0;
 const body={action:'pma_availability',...scope,args:{}};
 for(const start_time of [undefined,new Date(Date.now()-3*3600000).toISOString(),new Date(Date.now()+3600000).toISOString()])await assert.rejects(()=>processVoiceDemo(body,{env:{PMA_ENVIRONMENT:'staging',VOICE_DEMO_IVR_ENABLED:'true',VOICE_DEMO_WORKFLOWS_ENABLED:'true'},record:async()=>({...scope,start_time}),availability:async()=>{reads++;return {};}}),/lifetime|expired/);
 assert.equal(reads,0);
});
test('maintenance hazards override malformed intent; sensitive workflow fields are rejected',()=>{
 const v=api.prepareVoiceTurn({...scope,message:'maintenance request',maintenance:{description:'carbon monoxide alarm'},modelOutput:{actor:'owner'}});assert.equal(v.action,'safety');
 assert.throws(()=>api.prepareVoiceTurn({...scope,message:'maintenance request',maintenance:{unitId:'injected'}}));
 assert.throws(()=>api.prepareVoiceTurn({...scope,message:'maintenance request',maintenance:{photos:[{url:'injected'}]}}));
});
