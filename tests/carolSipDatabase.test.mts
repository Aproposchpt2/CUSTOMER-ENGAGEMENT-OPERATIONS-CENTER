import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {PGlite} from '@electric-sql/pglite';
const require=createRequire(import.meta.url),{processIntake}=require('../lib/pmaSip/intake.cjs');
test('Carol authoritative incident and preference tools execute real isolated PostgreSQL with replay and privacy boundaries',async()=>{
 const db=new PGlite();
 const t='20000000-0000-4000-8000-000000000001',p='40000000-0000-4000-8000-000000000001',c='30000000-0000-4000-8000-000000000001',actor='10000000-0000-4000-8000-000000000001',sid='a0000000-0000-4000-8000-000000000001',call='CA'+'1'.repeat(32),sip='rtc_isolated_carol';
 const env={PMA_SIP_ENABLED:'true',PMA_ENVIRONMENT:'staging',NEXT_PUBLIC_SUPABASE_URL:'https://hvzauakkhlivzeqatfqm.supabase.co',AI4CC_VOICE_DEMO_TENANT_ID:t,PMA_STAGING_PROPERTY_ID:p,PMA_STAGING_CONTACT_ID:c};
 const query=async(sql:string,args:any[]=[])=> (await db.query<any>(sql,args)).rows;
 try{
  await db.exec(readFileSync('supabase/tests/pma_local_baseline.sql','utf8'));
  for(const f of readdirSync('supabase/migrations').filter(f=>f.includes('_pma_')).sort())await db.exec(readFileSync('supabase/migrations/'+f,'utf8'));
  await db.exec(readFileSync('supabase/tests/pma_acceptance.sql','utf8').split('set local role authenticated;')[0]);
  await query("update public.pm_properties set accepts_inquiries=true,timezone='America/Los_Angeles' where id=$1",[p]);
  await query('insert into private.pm_voice_config_v1 values($1,$2,$3,true)',[t,p,actor]);
  await query("insert into public.ai4cc_interactions(id,tenant_id,channel,status,started_at,metadata) values($1,$2,'voice','active',now(),$3)",[sid,t,{synthetic:true,voice_demo:true,selected_route:'property-management-assistant',property_id:p,call_sid:call,pma_sip_call_id:sip}]);
  const deps={env,claim:async()=>false,load:async(id:string,incident=false)=>{await db.exec('reset role');return (await query(incident?"select id,tenant_id,property_id,intake_details from public.pm_maintenance_requests where tenant_id=$1 and intake_details->>'voiceSessionId'=$2":"select tenant_id,metadata,status,started_at,ended_at from public.ai4cc_interactions where tenant_id=$1 and id=$2",[t,id]))[0];},rpc:async(name:string,args:any)=>{
   const params=name==='pma_voice_incident_create_v1'?[args.t,args.p,args.session_id,args.call_sid,args.incident]:[args.t,args.p,args.session_id,args.call_sid,args.request_id,args.method,args.destination,args.consent];
   await db.exec('set local role service_role');await query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({role:'service_role'})]);
   return (await query('select public.'+name+'('+params.map((_:any,i:number)=>'$'+(i+1)).join(',')+') v',params))[0].v;
  }};
  const args={reportedName:'Synthetic Caller',reportedAddress:'123 Test Street',reportedUnit:'Not applicable',description:'The closet door is off the track.'};
  const body={action:'create_incident',session_id:sid,call_sid:call,sip_call_id:sip,args,observedCallerTurns:[args.description]};
  const first=await processIntake(body,deps);assert.equal(first.success,true);assert.match(first.caseNumber,/^PMA-/);assert.equal(first.notificationSent,false);
  const replay=await processIntake(body,deps);assert.equal(replay.requestId,first.requestId);assert.equal(replay.caseNumber,first.caseNumber);assert.equal(replay.replayed,true);
  const changed={...args,description:'Different incident facts.'};assert.equal((await processIntake({...body,args:changed,observedCallerTurns:[changed.description]},deps)).state,'CONFLICT');
  const preference=await processIntake({...body,action:'record_contact_preference',args:{method:'email',destination:'synthetic@example.invalid',consent:true}},deps);assert.equal(preference.success,true);assert.equal(preference.notificationSent,false);
  await db.exec('reset role');
  const rows=await query("select id,case_number,intake_details from public.pm_maintenance_requests where intake_details->>'voiceSessionId'=$1",[sid]);assert.equal(rows.length,1);assert.equal(rows[0].intake_details.descriptionVerbatim,args.description);assert.equal(rows[0].intake_details.contactPreference.destination,'synthetic@example.invalid');
  await assert.rejects(()=>processIntake({...body,sip_call_id:'rtc_foreign'},deps));
  for(const role of ['anon','authenticated']){
   await db.exec('savepoint denied;set local role '+role);
   await assert.rejects(()=>query('select public.pma_voice_incident_create_v1($1,$2,$3,$4,$5)',[t,p,sid,call,args]));
   await db.exec('rollback to savepoint denied;release savepoint denied');
  }
 }finally{await db.close();}
});
