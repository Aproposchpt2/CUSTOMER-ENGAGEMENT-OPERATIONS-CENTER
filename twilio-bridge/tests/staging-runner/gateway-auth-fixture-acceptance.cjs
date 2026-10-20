'use strict';
// Manual, protected staging runner. Temporary Auth accounts only; never sends invitations.
const {randomUUID,randomBytes}=require('node:crypto');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const {Client}=require('pg');
const {config,PROJECT,TENANT}=require('./access-check.cjs');
const {createStagingGateway,URL:ENDPOINT}=require('./authenticated-support-gateway.staging.cjs');
const processRunner=require('./gateway-process-acceptance.cjs');
const helpers=require('./dispatcher-acceptance.cjs');
function need(ok,code){if(!ok){const e=Error(code);e.safeCode=code;throw e;}}
function preflight(env){
 need(env.STAGING_GATEWAY_AUTH_FIXTURES_AUTHORIZED==='TWO_TEMP_USERS_G02_G04_G05','AUTH_FIXTURE_AUTHORIZATION_REQUIRED');
 need(typeof env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY==='string'&&env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.length>0,'PUBLISHABLE_KEY_REQUIRED');
 return config(env);
}
async function authCall(key,route,{method='GET',body,bearer=key,request=fetch,empty=false}={}){
 need(/^\/(admin\/users(?:\/[0-9a-f-]{36})?|token\?grant_type=password|logout\?scope=global|user)$/.test(route),'AUTH_ROUTE_REJECTED');
 let res;try{res=await request(ENDPOINT+'/auth/v1'+route,{method,redirect:'error',signal:AbortSignal.timeout(10000),headers:{apikey:key,authorization:'Bearer '+bearer,'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});}catch{throw Object.assign(Error('AUTH_RESPONSE_UNCERTAIN'),{safeCode:'AUTH_RESPONSE_UNCERTAIN'});}
 let data=null;if(!empty){try{data=await res.json();}catch{throw Object.assign(Error('AUTH_RESPONSE_INVALID'),{safeCode:'AUTH_RESPONSE_INVALID'});}}
 return {status:res.status,ok:res.ok,data};
}
const tables=[['auth.users','id'],['auth.identities','id'],['auth.sessions','id'],['public.tenant_users','id']];
async function authSnapshot(c){const out={};for(const [table,pk]of tables){out[table]=(await c.query(`SELECT count(*)::int count,md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY ${pk}),'')) fingerprint FROM ${table} t`)).rows[0];}return out;}
async function guardSnapshot(c){return(await c.query("SELECT md5(coalesce(string_agg(x::text,'' ORDER BY x::text),'')) fingerprint FROM (SELECT jsonb_build_object('table',c.oid::regclass::text,'rls',c.relrowsecurity,'force',c.relforcerowsecurity,'acl',c.relacl::text,'policies',(SELECT jsonb_agg(to_jsonb(p) ORDER BY p.polname) FROM pg_policy p WHERE p.polrelid=c.oid)) x FROM pg_class c WHERE c.oid IN ('auth.users'::regclass,'auth.sessions'::regclass,'public.tenant_users'::regclass)) s")).rows[0];}
async function scopedUser(c,f){const rows=(await c.query('SELECT id,email,raw_app_meta_data->>\'stellar_gateway_fixture\' marker FROM auth.users WHERE email=$1',[f.email])).rows;need(rows.length<=1,'AUTH_FIXTURE_AMBIGUOUS');if(rows.length){need(rows[0].marker===f.marker,'AUTH_FIXTURE_MARKER_REJECTED');if(f.id)need(f.id===rows[0].id,'AUTH_FIXTURE_ID_CHANGED');f.id=rows[0].id;}return rows[0];}
async function runProcess(env){return new Promise((resolve,reject)=>{need(process.platform==='linux','PROTECTED_LINUX_RUNNER_REQUIRED');const p=spawn(process.execPath,[path.join(__dirname,'gateway-process-acceptance.cjs')],{env:processRunner.childEnv(env),stdio:'ignore',detached:true});let timedOut=false;const timer=setTimeout(()=>{timedOut=true;try{process.kill(-p.pid,'SIGKILL');}catch{}},180000);p.once('error',()=>{clearTimeout(timer);reject(Error('PROCESS_RUNNER_START_FAILED'));});p.once('exit',(code,signal)=>{clearTimeout(timer);resolve({pid:p.pid,code,signal,timedOut});});});}
async function main(){
 const report={project:PROJECT,tenant:TENANT,status:'BLOCKED',startedAt:new Date().toISOString(),fixtures:[],tests:{}};
 const save=()=>fs.writeFileSync('gateway-auth-fixture-evidence.json',JSON.stringify(report,null,2),{mode:0o600});let c,cfg,before=false,positiveToken,negativeToken;
 try{
  cfg=preflight(process.env);c=new Client(cfg.db);c.on('error',()=>{});await c.connect();need((await c.query('SELECT current_user role')).rows[0].role==='postgres','EXISTING_ADMIN_REQUIRED');
  report.applicationBefore=await helpers.snapshot(c);report.authBefore=await authSnapshot(c);report.securityBefore=await guardSnapshot(c);report.auditBefore=(await c.query('SELECT count(*)::int count FROM auth.audit_log_entries')).rows[0].count;before=true;save();
  for(const kind of ['member','nonmember']){
   const marker=randomUUID(),f={kind,marker,email:'stellar-gateway-'+marker+'@example.invalid'};report.fixtures.push(f);save();
   need(!(await scopedUser(c,f)),'AUTH_FIXTURE_ALREADY_EXISTS');const password=randomBytes(36).toString('base64url');
   const created=await authCall(cfg.token,'/admin/users',{method:'POST',body:{email:f.email,password,email_confirm:true,app_metadata:{stellar_gateway_fixture:marker}}});
   need(created.ok,'AUTH_CREATE_REJECTED');await scopedUser(c,f);need(f.id&&created.data?.id===f.id,'AUTH_CREATE_NOT_VERIFIED');save();
   if(kind==='member'){
    f.membershipId=randomUUID();save();
    await c.query("INSERT INTO public.tenant_users(id,tenant_id,user_id,role,status) VALUES($1,$2,$3,'ADMIN','ACTIVE')",[f.membershipId,TENANT,f.id]);
   }
   const signed=await authCall(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,'/token?grant_type=password',{method:'POST',body:{email:f.email,password}});
   need(signed.ok&&signed.data?.user?.id===f.id&&typeof signed.data.access_token==='string','SYNTHETIC_SIGNIN_REJECTED');
   if(kind==='member')positiveToken=signed.data.access_token;else negativeToken=signed.data.access_token;
   save();
  }
  const env={...process.env,STAGING_GATEWAY_PROCESS_AUTHORIZED:'G04_G05',STAGING_GATEWAY_TEST_BEARER:positiveToken};
  const gate=createStagingGateway({env:processRunner.gatewayEnv(env)});
  const denied=await gate.handle(processRunner.requestFor('begin',{confirmed:true,intake:{}},negativeToken));const body=await denied.json();
  need(denied.status===403&&JSON.stringify(body)===JSON.stringify({error:'STAGING_ACCESS_DENIED'}),'NONMEMBER_NOT_REJECTED');
  need(JSON.stringify(report.applicationBefore)===JSON.stringify(await helpers.snapshot(c)),'NONMEMBER_MUTATED_APPLICATION');
  report.tests.G02={status:'PASS',httpStatus:denied.status,response:body,scope:'REAL_AUTHENTICATED_NONMEMBER_NO_FOREIGN_TENANCY'};save();
  report.process=await runProcess(env);need(report.process.code===0&&!report.process.signal,'PROCESS_ACCEPTANCE_NOT_PASSED');
  const processEvidence=JSON.parse(fs.readFileSync('gateway-process-evidence.json','utf8'));need(processEvidence.status==='PASS'&&processEvidence.cleanupVerified&&processEvidence.securityUnchanged,'PROCESS_EVIDENCE_NOT_VERIFIED');
  report.tests.G04={status:processEvidence.tests.G04.status};report.tests.G05={status:processEvidence.tests.G05.status};report.status='PASS';
 }catch(e){report.status=before?'FAIL':'BLOCKED';report.failureCode=e.safeCode||'AUTH_FIXTURE_ACCEPTANCE_FAILED';}
 finally{
  if(c&&before){try{
   const cleanupErrors=[];
   for(const f of report.fixtures){try{
    const user=await scopedUser(c,f);if(!user)continue;
    const token=f.kind==='member'?positiveToken:negativeToken;
    // Revoke real sessions before deleting users; deleting a user alone cannot revoke a JWT.
    if(token){const signedOut=await authCall(cfg.token,'/logout?scope=global',{method:'POST',bearer:token,empty:true});need(signedOut.ok,'SESSION_REVOCATION_REJECTED');}
    need((await c.query('SELECT count(*)::int n FROM auth.sessions WHERE user_id=$1',[f.id])).rows[0].n===0,'SYNTHETIC_SESSION_REMAINS');
    const memberships=(await c.query('SELECT id,tenant_id,role,status FROM public.tenant_users WHERE user_id=$1',[f.id])).rows;
    need(memberships.every(x=>x.id===f.membershipId&&x.tenant_id===TENANT&&x.role==='ADMIN'&&x.status==='ACTIVE'),'UNEXPECTED_SYNTHETIC_MEMBERSHIP');
    if(f.membershipId)await c.query('DELETE FROM public.tenant_users WHERE id=$1 AND tenant_id=$2 AND user_id=$3',[f.membershipId,TENANT,f.id]);
    const deleted=await authCall(cfg.token,'/admin/users/'+f.id,{method:'DELETE',body:{should_soft_delete:false}});need(deleted.ok,'AUTH_DELETE_REJECTED');
    need(!(await scopedUser(c,f)),'AUTH_USER_REMAINS');
    if(token){const denied=await authCall(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,'/user',{bearer:token});need([401,403,404].includes(denied.status),'DELETED_IDENTITY_STILL_VALID');}
   }catch(e){cleanupErrors.push({id:f.id,email:f.email,code:e.safeCode||'AUTH_FIXTURE_CLEANUP_BLOCKED'});}}
   report.authAfter=await authSnapshot(c);report.applicationAfter=await helpers.snapshot(c);report.securityAfter=await guardSnapshot(c);report.auditAfter=(await c.query('SELECT count(*)::int count FROM auth.audit_log_entries')).rows[0].count;
   report.authCleanupVerified=JSON.stringify(report.authBefore)===JSON.stringify(report.authAfter);report.applicationCleanupVerified=JSON.stringify(report.applicationBefore)===JSON.stringify(report.applicationAfter);report.securityUnchanged=JSON.stringify(report.securityBefore)===JSON.stringify(report.securityAfter);
   if(cleanupErrors.length){report.cleanupErrors=cleanupErrors;need(false,'AUTH_FIXTURE_CLEANUP_BLOCKED');}
   need(report.authCleanupVerified&&report.applicationCleanupVerified&&report.securityUnchanged,'FINAL_AUTH_APPLICATION_OR_SECURITY_MISMATCH');
  }catch(e){report.status='FAIL';report.cleanupFailure=e.safeCode||'AUTH_CLEANUP_BLOCKED';}}
  positiveToken=negativeToken=undefined;if(c)await c.end().catch(()=>{});report.finishedAt=new Date().toISOString();save();console.log(JSON.stringify({status:report.status,failureCode:report.failureCode,cleanupFailure:report.cleanupFailure,tests:report.tests,authCleanupVerified:report.authCleanupVerified,applicationCleanupVerified:report.applicationCleanupVerified,securityUnchanged:report.securityUnchanged}));
 }
 process.exitCode=report.status==='PASS'?0:2;
}
module.exports={preflight,authCall,scopedUser,authSnapshot,guardSnapshot};
if(require.main===module)main();
