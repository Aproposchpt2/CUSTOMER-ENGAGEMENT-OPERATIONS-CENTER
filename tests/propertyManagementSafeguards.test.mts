import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import vm from 'node:vm';
import * as crypto from 'node:crypto';
import ts from 'typescript';
import {PGlite} from '@electric-sql/pglite';
import * as domain from '../lib/propertyManagement/domain.ts';
function load(path:string,deps:Record<string,unknown>){const module={exports:{}};vm.runInNewContext(ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{module,exports:module.exports,Date,Intl,require:(n:string)=>deps[n]});return module.exports as any;}
const availability=load('lib/propertyManagement/availability.ts',{'./domain':domain});
const callScope=load('lib/propertyManagement/callScope.ts',{'node:crypto':crypto,'./domain':domain});
const scheduling=load('lib/propertyManagement/scheduling.ts',{'./domain':domain,'./availability':availability});
const t='20000000-0000-4000-8000-000000000001',p='40000000-0000-4000-8000-000000000001',c='30000000-0000-4000-8000-000000000001',u='50000000-0000-4000-8000-000000000001';
const owner='10000000-0000-4000-8000-000000000001',resident='10000000-0000-4000-8000-000000000004';

test('T02/T05: SQL DATE fidelity, property-local day, stale/invalid/occupied exclusion and DST',()=>{
 const now=new Date('2026-10-23T00:30:00Z');
 const rows=[{label:'415',status:'vacant',availability_date:'2026-10-25',updated_at:'2026-10-22T20:00:00Z'}, {label:'301',status:'vacant',availability_date:'2026-11-01',updated_at:'2026-10-22T20:00:00Z'}, {label:'205',status:'occupied',availability_date:'2026-10-22',updated_at:'2026-10-22T20:00:00Z'}, {label:'stale',status:'vacant',availability_date:'2026-10-25',updated_at:'2026-10-21T20:00:00Z'}, {label:'invalid',status:'vacant',availability_date:'2026-02-30',updated_at:'2026-10-22T20:00:00Z'}];
 const out=availability.inventorySnapshot(rows,now);assert.equal(out.units.length,2);assert.equal(out.units[0].earliestRecordedDate,'2026-10-25');assert.equal(out.units[1].earliestRecordedDate,'2026-11-01');assert.equal(out.asOf,'2026-10-22');
 assert.equal(availability.calendarDate('2026-10-25'),'October 25, 2026');assert.equal(scheduling.requestedDay('tomorrow',now),'2026-10-23');assert.equal(availability.inventorySnapshot([],now).requiresHumanReview,true);assert.throws(()=>availability.sqlDate('2026-02-30'));
 assert.throws(()=>scheduling.showingInstant('2099-03-08T02:30:00'));assert.throws(()=>scheduling.showingInstant('2099-03-08T02:30:00-08:00')); // DST gap
 assert.equal(scheduling.showingInstant('2099-11-01T01:30:00-07:00'),'2099-11-01T08:30:00.000Z');
 assert.equal(scheduling.showingInstant('2099-11-01T01:30:00-08:00'),'2099-11-01T09:30:00.000Z'); // explicit fold offsets
 assert.throws(()=>domain.futureTime('2099-02-31T12:00:00Z'));
});

test('Trusted call contract rejects cross-call/closed/model identity; server operation keys survive rephrasing',()=>{
 const binding={tenantId:t,propertyId:p,sessionId:'a0000000-0000-4000-8000-000000000001',callSid:'CA00000000000000000000000000000001',actorId:owner};
 const row={id:binding.sessionId,tenant_id:t,channel:'voice',status:'active',ended_at:null,metadata:{synthetic:true,voice_demo:true,selected_route:'property-management-assistant',property_id:p,call_sid:binding.callSid}};
 const scope=callScope.pmaCallScope(row,binding);assert.equal(scope.contactId,null);assert.equal(scope.verifiedResidentUserId,null);
 assert.throws(()=>callScope.pmaCallScope({...row,ended_at:'2026-10-23'},binding));assert.throws(()=>callScope.pmaCallScope(row,{...binding,callSid:'CA00000000000000000000000000000002'}));
 const nonce='b0000000-0000-4000-8000-000000000001';const secret='x'.repeat(32);
 assert.equal(callScope.pmaOperationId(scope,'showing',nonce,secret),callScope.pmaOperationId(scope,'showing',nonce,secret));assert.notEqual(callScope.pmaOperationId(scope,'showing',nonce,secret),callScope.pmaOperationId(scope,'maintenance',nonce,secret));
});

test('PMA-002 domain contracts on isolated PostgreSQL with rollback',async ctx=>{
 const db=new PGlite();
 const q=async(sql:string,args:any[]=[])=> (await db.query<{v:any}>(sql,args)).rows[0]?.v;
 const auth=async(id=owner,role='authenticated')=>{await db.exec('reset role; set local role '+role);await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:id,role:'authenticated'})]);};
 const deny=async(fn:()=>Promise<any>,code?:string)=>{await db.exec('savepoint denied');try{await assert.rejects(fn,code?{code}:undefined);}finally{await db.exec('rollback to savepoint denied; release savepoint denied');}};
 try{
 await db.exec(readFileSync('supabase/tests/pma_local_baseline.sql','utf8'));
 for(const f of readdirSync('supabase/migrations').filter(f=>f.includes('_pma_')).sort())await db.exec(readFileSync('supabase/migrations/'+f,'utf8'));
 await db.exec('revoke insert on public.audit_log from service_role');
 await db.exec(readFileSync('supabase/tests/pma_acceptance.sql','utf8').split('set local role authenticated;')[0]);
 await db.exec(`update public.pm_properties set accepts_inquiries=true where id='${p}'`);
 await auth();
 await ctx.test('T11: one eligibility predicate excludes draft, PROPOSED, future, expiry, staff, template and wrong scope in both answer paths',async()=>{
  await db.exec('reset role');
  for(const [title,extra] of Object.entries({good:{},draft:{publication_state:'draft'},proposed:{source_status:'PROPOSED'},future:{effective_at:'2099-01-01T00:00:00Z'},expired:{expires_at:'2000-01-01T00:00:00Z'},invalidated:{valid_until:'2000-01-01T00:00:00Z'},staff:{visibility:'staff'},unapproved:{approved:false},template:{category:'pma_template',approved:false,visibility:'staff'},otherproperty:{property_id:'40000000-0000-4000-8000-000000000002'},othertenant:{tenant_id:'20000000-0000-4000-8000-000000000002',property_id:'40000000-0000-4000-8000-000000000003'},unitprivate:{unit_id:u}})){
   const entry={tenant_id:t,property_id:p,title:'eligibility'+title,content:'eligibility'+title+' answer',approved:true,visibility:'public',publication_state:'published',source_status:'VERIFIED',...extra};
   const keys=Object.keys(entry);await db.query(`insert into public.ai4cc_knowledge_entries(${keys.join(',')})values(${keys.map((_,i)=>'$'+(i+1)).join(',')})`,Object.values(entry));
  }
  await auth(owner,'service_role');const preload=await q('select public.pm_public_voice_knowledge_v1($1,$2) v',[t,p]);assert.equal(preload.length,1);assert.equal(preload[0].title,'eligibilitygood');
  await auth('10000000-0000-4000-8000-000000000006');
  const listing=await q('select public.pm_available_properties() v');const listed=listing.find((x:any)=>x.id===p);assert.equal(listed.knowledge.length,1);assert.equal(listed.knowledge[0].title,'eligibilitygood');
  await auth();
  for(const name of ['draft','proposed','future','expired','invalidated','staff','unapproved','template','otherproperty','othertenant']){const out=await q('select private.pm_knowledge_answer($1,$2,$3,$4,$5) v',[t,p,c,u,'eligibility'+name]);assert.equal(out.requiresHumanReview,true,name);assert.equal(out.knowledgeId,undefined);}
  const good=await q('select private.pm_knowledge_answer($1,$2,$3,$4,$5) v',[t,p,c,u,'eligibilitygood']);assert.ok(good.knowledgeId);
 });
 await ctx.test('T12: equally scoped conflicting approved answers escalate without quoting policy',async()=>{
  await db.exec('reset role');await db.query(`insert into public.ai4cc_knowledge_entries(tenant_id,property_id,title,content,visibility,approved,publication_state,source_status)values($1,$2,'rentconflict','rentconflict grace three days','public',true,'published','VERIFIED'),($1,$2,'rentconflict','rentconflict grace five days','public',true,'published','VERIFIED')`,[t,p]);await auth();const out=await q('select private.pm_knowledge_answer($1,$2,$3,$4,$5) v',[t,p,c,u,'rentconflict']);assert.equal(out.knowledgeConflict,true);assert.equal(out.knowledgeId,undefined);
 });
 await ctx.test('T02: catalog includes exact recorded dates, exact-unit scope and the same 24-hour freshness rule',async()=>{
  await db.exec('reset role');
  await db.query(`insert into public.pm_units(tenant_id,property_id,label,bedrooms,status,availability_date,updated_at)values($1,$2,'Unit 415',1,'vacant','2026-10-25',now()),($1,$2,'Unit 301',3,'vacant','2026-11-01',now()),($1,$2,'Unit 205',2,'occupied','2026-10-22',now()),($1,$2,'Stale vacancy',1,'vacant','2026-10-25',now()-interval '2 days')`,[t,p]);
  await auth();
  const lookup=(unit:string|null,key:string)=>q('select public.pm_catalog_turn($1,$2,$3,$4,$5,$6,$7,$8::jsonb) v',[t,p,c,unit,key,'chat','availability for next move date',JSON.stringify({intent:'UNIT_AVAILABILITY',confidence:1,entities:{bedrooms:1,move_date:'2099-01-01'}})]);
  const out=await lookup(null,'inventory-date-test');assert.equal(out.units.length,1);assert.equal(out.units[0].label,'Unit 415');assert.equal(out.units[0].earliestRecordedDate,'2026-10-25');
  const empty=await lookup(u,'inventory-unit-test');assert.equal(empty.units,undefined);assert.equal(empty.requires_escalation,true);
 });
 const tour=async(key:string,slot:string|null=null,ver:number|null=null,time='2099-10-25T17:00:00Z',notes='First wording')=>q('select public.pm_request_or_book_showing_v1($1,$2,$3,$4,$5,$6,$7,$8,$9) v',[t,p,c,u,key,time,notes,slot,ver]);
 await ctx.test('T03/T04/T10: disabled slot source returns no fabricated slots; request fallback and rephrased retry recover one ID',async()=>{
  const slots=await q('select public.pm_list_tour_slots_v1($1,$2,$3,$4) v',[t,p,'2099-10-25T00:00:00Z','2099-10-26T00:00:00Z']);assert.equal(slots.mode,'REQUESTED_ONLY');assert.equal(slots.slots.length,0);
  const a=await tour('request-replay-01'),b=await tour('request-replay-01',null,null,'2099-10-25T17:00:00Z','Rephrased retry after response lost');assert.equal(a.status,'REQUESTED');assert.equal(a.bookingConfirmed,false);assert.equal(b.showingId,a.showingId);assert.equal(b.replayed,true);
  await deny(()=>tour('request-replay-01',null,null,'2099-10-25T18:00:00Z'),'23514');
  assert.equal(await q('select count(*)::int v from public.pm_showings where tenant_id=$1',[t]),1);
 });
 const slot='90000000-0000-4000-8000-000000000001';
 await ctx.test('T04/T05: synthetic source, blackout/version/capacity conflict and persisted reservation',async()=>{
  await db.exec('reset role');await db.query(`update public.pm_properties set metadata='{"pma_synthetic_tours":true}' where id=$1`,[p]);await db.query(`insert into private.pm_tour_slots_v1(id,tenant_id,property_id,starts_at,ends_at,timezone,capacity,source_ref) values($1,$2,$3,'2099-10-25T17:00:00Z','2099-10-25T17:30:00Z','America/Los_Angeles',1,'fixture-calendar-v1')`,[slot,t,p]);await db.exec("select set_config('pma.synthetic_tours_enabled','on',true)");await auth();
  assert.equal((await tour('slot-stale-version',slot,2)).status,'CONFLICT');
  await db.exec('reset role');await db.query('update private.pm_tour_slots_v1 set blackout=true where id=$1',[slot]);await auth();assert.equal((await tour('slot-blackout',slot,1)).status,'CONFLICT');
  await db.exec('reset role');await db.query('update private.pm_tour_slots_v1 set blackout=false where id=$1',[slot]);await auth();
  const a=await tour('slot-capacity-first',slot,1),b=await tour('slot-capacity-second',slot,1);assert.equal(a.status,'CONFIRMED_SYNTHETIC');assert.equal(b.status,'CONFLICT');assert.equal(b.persisted,false);
  assert.equal((await tour('slot-capacity-first',slot,1)).showingId,a.showingId);
  const full=await q('select public.pm_list_tour_slots_v1($1,$2,$3,$4) v',[t,p,'2099-10-25T00:00:00Z','2099-10-26T00:00:00Z']);assert.equal(full.slots.length,0);
  await deny(()=>tour('past-rejected',null,null,'2000-01-01T00:00:00Z'),'22023');
  await auth('10000000-0000-4000-8000-000000000002');await deny(()=>tour('wrong-owner-01'),'42501');await auth();
 });
 await ctx.test('T06/T10: session-bound consent capture, normalization, correction/version and timeout replay use one existing CRM record',async()=>{
  await db.exec('reset role');await db.query(`update public.ai4cc_contacts set metadata='{"synthetic":true}' where id=$1`,[c]);
  // Test session is synthetic and PMA-selected; no IVR implementation is modified.
  await db.query(`insert into public.ai4cc_interactions(id,tenant_id,channel,direction,external_id,customer_identifier,status,metadata)values('a0000000-0000-4000-8000-000000000001',$1,'voice','inbound','pma-capture-fixture','fixture','active',jsonb_build_object('synthetic',true,'voice_demo',true,'property_id',$2::text,'call_sid','CA00000000000000000000000000000001','selected_route','property-management-assistant'))`,[t,p]);await auth(owner,'service_role');
  const capture=(key:string,details:any={},sid='a0000000-0000-4000-8000-000000000001',call='CA00000000000000000000000000000001')=>q('select public.pm_capture_prospect_v1($1,$2,$3,$4,$5,$6::jsonb) v',[t,p,sid,call,key,JSON.stringify({name:'Synthetic Prospect',email:' PERSON@EXAMPLE.INVALID ',confirmed:true,consent:true,...details})]);
  assert.equal((await capture('consent-denied-01',{consent:false})).persisted,false);
  const a=await capture('capture-first-01'),b=await capture('capture-first-01');assert.equal(b.contactId,a.contactId);assert.equal(b.replayed,true);assert.notEqual(a.contactId,c);
  const corrected=await capture('capture-correct-01',{name:'Corrected Prospect',expectedVersion:1});assert.equal(corrected.contactId,a.contactId);assert.equal(corrected.version,2);
  await deny(()=>capture('capture-stale-01',{expectedVersion:1}),'23514');await deny(()=>capture('capture-wrong-call',{},undefined,'CA00000000000000000000000000000002'),'42501');
  assert.equal(await q('select email v from public.ai4cc_contacts where id=$1',[a.contactId]),'person@example.invalid');assert.equal(await q('select display_name v from public.ai4cc_contacts where id=$1',[c]),'Synthetic Resident');
  await auth();await deny(()=>capture('capture-not-service'),'42501');
 });
 await ctx.test('T08/T10/T14: common-area intake retains required fields without photo; own-record scope, replay and simulated receipt',async()=>{
  await auth(resident);
  const details={category:'common_area',description:'The hallway light is broken',impact:'Dark shared hall',urgency:'high',safetyIndicators:[],preferredContactMethod:'phone',confirmed:true};
  const submit=(key:string,changes:any={},contact=c)=>q('select public.pm_submit_maintenance_v1($1,$2,$3,$4,$5,$6,$7::jsonb) v',[t,p,contact,null,key,'chat',JSON.stringify({...details,...changes})]);
  const a=await submit('common-area-first'),b=await submit('common-area-first');assert.equal(a.requestId,b.requestId);assert.equal(b.replayed,true);assert.equal(a.notificationSent,false);assert.equal(a.notificationState,'QUEUED_SIMULATED');assert.equal(a.providerReceiptId,null);assert.ok(a.notificationTaskId);
  const saved=await q('select intake_details v from public.pm_maintenance_requests where id=$1',[a.requestId]);assert.equal(saved.impact,details.impact);assert.equal(saved.urgency,'high');assert.equal(saved.photos,undefined);
  await deny(()=>submit('missing-impact',{impact:''}),'22023');await deny(()=>submit('other-resident',{},'30000000-0000-4000-8000-000000000002'),'42501');
  const hazard=await submit('hazard-priority',{description:'There is smoke in the hall',urgency:'normal'});assert.equal(hazard.urgency,'emergency');assert.equal(hazard.emergencyServicesContacted,false);
  await auth();
 });
 await db.exec('reset role;rollback');
 const sqlResults=await db.exec(readFileSync('supabase/tests/pma_002_acceptance.sql','utf8'));assert.ok(sqlResults.flatMap(r=>r.rows as any[]).some(r=>r.result?.startsWith('PASS: PMA-002')));
 assert.equal(await q('select count(*)::int v from public.pm_properties'),0);
 }finally{await db.close();}
});

test('T02/T10: inventory lookup failure propagates and the preserved voice tool requires uncertainty',async()=>{
 const {createRequire}=await import('node:module');const require=createRequire(import.meta.url);
 const {processVoiceDemo}=require('../lib/voiceDemo/gateway.cjs');
 const adapter=require('../twilio-bridge/pma-adapter.cjs');
 const call='CA00000000000000000000000000000001',session='a0000000-0000-4000-8000-000000000001';
 await assert.rejects(()=>processVoiceDemo({action:'pma_availability',call_sid:call,session_id:session,agentRoute:'property-management-assistant',args:{}},{env:{PMA_ENVIRONMENT:'staging',VOICE_DEMO_IVR_ENABLED:'true',VOICE_DEMO_WORKFLOWS_ENABLED:'true'},record:async()=>({call_sid:call,session_id:session,agentRoute:'property-management-assistant',start_time:new Date().toISOString()}),availability:async()=>{throw Error('Synthetic lookup unavailable');}}),/Synthetic lookup unavailable/);
 const source=readFileSync('twilio-bridge/pma-adapter.cjs','utf8');assert.match(source,/If lookup fails, say availability could not be verified/);assert.match(source,/pma_check_availability/);
});
