import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {dispatchEmergency} from '../lib/propertyManagement/emergencyDispatch.ts';
const tenant='5885a020-d363-4c27-910a-c035eda132f5',property='eead9ac5-b28b-4594-b75b-a9e9bbbd111f';
const call='CA'+'1'.repeat(32),session='00000000-0000-4000-8000-000000000000';
test('proposed staging RPC confines backend writes and preference reads without table grants',async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema private;grant usage on schema private to service_role;
   create table public.pm_properties(id uuid,tenant_id uuid,name text,status text);
   create table public.ai4cc_interactions(id uuid,tenant_id uuid,metadata jsonb,ended_at timestamptz,started_at timestamptz);
   create table public.platform_incidents(id uuid default gen_random_uuid(),incident_key text unique,severity text check(severity in ('SEV1','SEV2','SEV3','SEV4')),status text,title text,summary text,tenant_id uuid,service text,opened_at timestamptz,metadata jsonb);
   create table public.pm_notification_preferences(tenant_id uuid,entity_type text,entity_id uuid,event_type text,active boolean,staging_override boolean,channel text,destination text);
   insert into public.pm_properties values('${property}','${tenant}','Synthetic staging property','active');
   insert into public.pm_notification_preferences values('${tenant}','property','${property}','emergency_escalation',true,true,'sms','+17753508039'),('${tenant}','property','${property}','emergency_escalation',true,true,'sms','+15555550100');`);
  await db.exec(readFileSync('docs/pma-emergency-repair/staging-permission-repair.sql','utf8'));
  await db.exec(`set role service_role;set request.jwt.claims='{"role":"service_role"}';`);
  await assert.rejects(db.query('select * from public.pm_notification_preferences'),/permission denied/);
  const invoke=(t=tenant,p=property,mode=true,sid=session)=>db.query<{receipt:any}>(`select public.pm_staging_emergency_prepare_v1($1,$2,$3,$4,'GAS_EMERGENCY','Synthetic gas test',$5) as receipt`,[t,p,call,sid,mode]);
  const first=(await invoke()).rows[0].receipt;assert.ok(first.incidentId);assert.equal(first.notify,true);
  assert.deepEqual(first.preferences,[{channel:'sms',destination:'+17753508039'}]);
  const second=(await invoke()).rows[0].receipt;assert.equal(second.incidentId,first.incidentId);assert.equal(second.notify,false);
  const v=(await db.query<{receipt:any}>(`select public.pm_staging_emergency_verify_v1($1,$2) as receipt`,[tenant,property])).rows[0].receipt;assert.equal(v.incidents.length,1);assert.equal(v.incidents[0].id,first.incidentId);
  await assert.rejects(invoke('00000000-0000-4000-8000-000000000099'),/scope rejected/);
  await assert.rejects(invoke(tenant,'00000000-0000-4000-8000-000000000099'),/scope rejected/);
  await assert.rejects(invoke(tenant,property,false),/Active bound PMA call/);
  await db.exec('reset role;set role anon;');await assert.rejects(invoke(),/permission denied/);
  await db.exec('reset role;');const row=(await db.query<{severity:string}>('select severity from public.platform_incidents')).rows[0];assert.equal(row.severity,'SEV1');
 }finally{await db.close();}
});
test('permission errors are surfaced; persisted incident or logged email alone cannot claim dispatch',async()=>{
 const ctx={tenantId:tenant,propertyId:property,callSid:call,sessionId:session,intent:'GAS_EMERGENCY',message:'Synthetic test',testMode:true};
 const env={PMA_ENVIRONMENT:'staging',NEXT_PUBLIC_SUPABASE_URL:'https://hvzauakkhlivzeqatfqm.supabase.co'};
 await assert.rejects(dispatchEmergency(ctx,{rpc:async()=>({error:{code:'42501'}})},env),/EMERGENCY_PREPARE_FAILED:42501/);
 const r=await dispatchEmergency(ctx,{rpc:async()=>({data:{incidentId:'synthetic',notify:true,preferences:[{channel:'email',destination:'test@example.invalid'}]}})},env);
 assert.equal(r.dispatched,false);assert.deepEqual(r.channels,[]);
 assert.deepEqual(r.attempts,[{channel:'email',state:'NOT_CONFIGURED'}]);
 assert.equal(r.state,'NOT_CONFIGURED');
 let calls=0;const disabled=await dispatchEmergency(ctx,{rpc:async()=>{calls++;}},{});assert.equal(disabled.dispatched,false);assert.equal(calls,0);
});
test('configured SMS sender is independent of inbound IVR DID and legacy DID remains a fallback',async(t)=>{
 const requests:URLSearchParams[]=[];
 t.mock.method(globalThis,'fetch',async(_url:any,options:any)=>{
  requests.push(new URLSearchParams(options.body));return new Response('{}',{status:201});
 });
 const ctx={tenantId:tenant,propertyId:property,callSid:call,sessionId:session,intent:'GAS_EMERGENCY',message:'Synthetic test',testMode:true};
 const env={PMA_ENVIRONMENT:'staging',NEXT_PUBLIC_SUPABASE_URL:'https://hvzauakkhlivzeqatfqm.supabase.co',TWILIO_ACCOUNT_SID:'synthetic',TWILIO_AUTH_TOKEN:'synthetic',PMA_STAGING_DID:'+17029351414'};
 const admin={rpc:async()=>({data:{incidentId:'synthetic',notify:true,preferences:[{channel:'sms',destination:'+17753508039'}]}})};
 assert.equal((await dispatchEmergency(ctx,admin,{...env,PMA_STAGING_SMS_FROM:'+17252010584'})).dispatched,true);
 assert.equal(requests[0].get('From'),'+17252010584');assert.equal(requests[0].get('To'),'+17753508039');
 await dispatchEmergency(ctx,admin,env);assert.equal(requests[1].get('From'),env.PMA_STAGING_DID);
});
