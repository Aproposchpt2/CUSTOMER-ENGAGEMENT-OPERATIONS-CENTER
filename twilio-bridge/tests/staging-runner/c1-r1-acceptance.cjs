'use strict';
// Isolated acceptance harness. Ticket creation exists ONLY in the parent fixture setup.
const {fork}=require('node:child_process');
const {randomUUID}=require('node:crypto');
const fs=require('node:fs');
const {Client}=require('pg');
const {config,databaseErrorCode,TENANT,PROJECT}=require('./access-check.cjs');
const TABLES={cases:['stellar_support_cases','id'],contacts:['ai4cc_contacts','id'],workflows:['stellar_orchestrator_workflows_staging','workflow_id'],events:['stellar_orchestrator_events_staging','event_id']};
const WF='public.stellar_orchestrator_workflows_staging',EV='public.stellar_orchestrator_events_staging';
const now=()=>new Date().toISOString();
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function need(ok,code){if(!ok){const e=new Error(code);e.safeCode=code;throw e;}}
function client(){need(process.env.STAGING_ACCEPTANCE_AUTHORIZED==='C1_R1','ACCEPTANCE_AUTHORIZATION_REQUIRED');return new Client(config().db);}
const metadata=c=>c.query("SELECT pg_backend_pid() AS backend_pid,current_user AS role,clock_timestamp() AS timestamp,txid_current()::text AS transaction_id").then(r=>r.rows[0]);
async function worker(){
 let c;try{
  const [mode,id,timeout]=process.argv.slice(3);need(/^[0-9a-f-]{36}$/i.test(id),'INVALID_WORKFLOW');
  c=client();await c.connect();await c.query('BEGIN');
  if(mode!=='hold')await c.query('SET LOCAL ROLE service_role');
  await c.query("SELECT set_config('statement_timeout',$1,true)",[String(Number(timeout)||8000)]);
  const info={pid:process.pid,...await metadata(c)};
  if(mode==='hold'){
   const locked=await c.query(`SELECT workflow_id FROM ${WF} WHERE workflow_id=$1 AND tenant_id=$2 FOR UPDATE`,[id,TENANT]);
   need(locked.rowCount===1,'LOCK_FIXTURE_MISSING');process.send({type:'ready',mode,...info});
   // Actual process termination must release this transaction and row lock.
   await new Promise(resolve=>process.once('message',resolve));
   await c.query('ROLLBACK');
  }else{
   need(info.role==='service_role','WORKER_ROLE_REJECTED');process.send({type:'ready',mode,...info});
   await new Promise(resolve=>process.once('message',resolve));
   const started=await metadata(c);
   try{
    const r=await c.query('SELECT * FROM public.stellar_orch_reconcile_case_staging($1::uuid)',[id]);
    const finished=await metadata(c);await c.query('COMMIT');
    process.send({type:'result',pid:process.pid,backend_pid:info.backend_pid,started,finished,rows:r.rows,committedAt:now()});
   }catch(e){await c.query('ROLLBACK');process.send({type:'result',pid:process.pid,backend_pid:info.backend_pid,errorCode:databaseErrorCode(e),finishedAt:now()});}
  }
  await c.end();process.disconnect();
 }catch(e){if(c)await c.end().catch(()=>{});process.send?.({type:'error',code:e.safeCode||databaseErrorCode(e)},()=>process.disconnect());process.exitCode=2;}
}
const active=new Set();
function launch(mode,id,timeout){
 const allowed=['PATH','STELLAR_BRIDGE_STAGING','CSS_TENANT_ID','STAGING_SUPABASE_URL','STAGING_SUPABASE_SERVICE_ROLE_KEY','STAGING_DATABASE_URL','STAGING_DATABASE_CA_PEM','STAGING_ACCEPTANCE_AUTHORIZED'];
 const env=Object.fromEntries(allowed.filter(k=>process.env[k]!==undefined).map(k=>[k,process.env[k]]));
 const w=fork(__filename,['--worker',mode,id,String(timeout||8000)],{env,execArgv:[],stdio:['ignore','ignore','ignore','ipc']});active.add(w);
 let rr,rj,dr,dj,er;const ready=new Promise((r,j)=>{rr=r;rj=j;}),done=new Promise((r,j)=>{dr=r;dj=j;}),exited=new Promise(r=>er=r);
 // Prevent unhandled rejections on worker shutdown during cleanup.
 ready.catch(()=>{});done.catch(()=>{});
 const timer=setTimeout(()=>{rj(Error('WORKER_TIMEOUT'));dj(Error('WORKER_TIMEOUT'));w.kill('SIGKILL');},20000);timer.unref();
 w.on('message',m=>{if(m.type==='ready')rr(m);if(m.type==='result')dr(m);if(m.type==='error'){rj(Error(m.code));dj(Error(m.code));}});
 w.on('error',()=>{rj(Error('WORKER_START_FAILED'));dj(Error('WORKER_START_FAILED'));});
 w.on('exit',(code,signal)=>{clearTimeout(timer);active.delete(w);er({pid:w.pid,code,signal,at:now()});});
 return {w,ready,done,exited};
}
async function snapshot(c){
 const result={};for(const [name,[table,key]]of Object.entries(TABLES)){
  const r=await c.query(`SELECT count(*)::int AS count,md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY ${key}),'')) AS fingerprint FROM public.${table} t`);result[name]=r.rows[0];
 }return result;
}
async function security(c){
 const rls=(await c.query("SELECT relname,relrowsecurity,relacl::text FROM pg_class WHERE oid=ANY($1::regclass[]) ORDER BY relname",[Object.values(TABLES).map(([t])=>'public.'+t)])).rows;
 const functions=(await c.query("SELECT proname,md5(prosrc) AS body_hash,prosecdef,proacl::text,has_function_privilege('service_role',oid,'EXECUTE') AS service_execute,has_function_privilege('anon',oid,'EXECUTE') AS anon_execute,has_function_privilege('authenticated',oid,'EXECUTE') AS authenticated_execute FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname=ANY($1::text[]) ORDER BY proname",[['stellar_orch_accept_staging','stellar_orch_transition_staging','stellar_orch_reconcile_case_staging']])).rows;
 const policies=(await c.query("SELECT schemaname,tablename,policyname,roles::text,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename=ANY($1::text[]) ORDER BY tablename,policyname",[Object.values(TABLES).map(([t])=>t)])).rows;
 need(rls.length===4&&rls.every(x=>x.relrowsecurity),'RLS_REQUIRED');
 need(functions.length===3&&functions.every(x=>x.service_execute&&!x.anon_execute&&!x.authenticated_execute),'RPC_PRIVILEGES_REJECTED');
 const grants=(await c.query("SELECT has_table_privilege('service_role',$1,'INSERT') AS insert_allowed,has_table_privilege('service_role',$1,'UPDATE') AS update_allowed,has_table_privilege('service_role',$1,'DELETE') AS delete_allowed",[WF])).rows[0];
 need(!grants.insert_allowed&&!grants.update_allowed&&!grants.delete_allowed,'DIRECT_WORKFLOW_WRITES_MUST_BE_DENIED');
 return {rls,functions,policies,grants};
}
async function verifyV5(c){
 const sql=fs.readFileSync('../../sql/stellar-orchestrator-staging-association-integrity-v5.sql','utf8');
 const normalize=s=>s.replace(/\s+/g,' ').trim();const evidence=[];
 for(const name of ['stellar_orch_transition_staging','stellar_orch_reconcile_case_staging']){
  const re=new RegExp('create or replace function public\\.'+name+'[\\s\\S]*?as \\$\\$([\\s\\S]*?)\\$\\$;','i');const expected=sql.match(re)?.[1];
  const r=await c.query("SELECT prosrc,md5(prosrc) AS body_hash FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname=$1",[name]);
  need(expected&&r.rowCount===1&&normalize(r.rows[0].prosrc)===normalize(expected),'V5_DEFINITION_MISMATCH');evidence.push({function:name,bodyHash:r.rows[0].body_hash,matched:true});
 }return evidence;
}
async function fixture(c,tag,withCase,register){
 const id={tag,session:'phone-staging:CA'+randomUUID().replaceAll('-',''),operation:'c1r1:'+tag+':'+randomUUID(),email:tag.toLowerCase()+'-'+randomUUID()+'@example.invalid'};
 register(id);
 await c.query('BEGIN');try{
  await c.query('SET LOCAL ROLE service_role');
  if(withCase){const r=await c.query("SELECT * FROM public.stellar_create_phone_support_test_intake($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",[TENANT,id.session,'Fictional acceptance fixture',id.email,'','Synthetic test router','2026-10-01','Fictional isolated acceptance test; no customer contact.','No physical troubleshooting required','Synthetic test only','NORMAL']);
   need(r.rowCount===1&&r.rows[0].created_new===true,'FIXTURE_CASE_NOT_NEW');id.caseId=r.rows[0].case_id;id.contactId=r.rows[0].customer_id;}
  const r=await c.query('SELECT * FROM public.stellar_orch_accept_staging($1,$2,$3,$4)',[TENANT,id.session,tag,id.operation]);
  need(r.rowCount===1&&!r.rows[0].deduplicated&&r.rows[0].workflow_state==='ACCEPTED','FIXTURE_WORKFLOW_NOT_NEW');id.workflowId=r.rows[0].workflow_id;
  need((await c.query("SELECT public.stellar_orch_transition_staging($1,'ACCEPTED','RUNNING',NULL) AS ok",[id.workflowId])).rows[0].ok===true,'FIXTURE_TRANSITION_REJECTED');
  await c.query('COMMIT');id.committedAt=now();return id;
 }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}
}
async function state(c,f){
 const workflow=(await c.query(`SELECT workflow_id,tenant_id,session_id,tool_call_id,state,case_id,version::text FROM ${WF} WHERE workflow_id=$1`,[f.workflowId])).rows[0];
 const cases=(await c.query('SELECT id,tenant_id,intake_session_id,test_only,contact_id FROM public.stellar_support_cases WHERE tenant_id=$1 AND intake_session_id=$2 ORDER BY id',[TENANT,f.session])).rows;
 const events=(await c.query(`SELECT event_id::text,event_type,tenant_id,session_id,case_id,delivered_at,attempts FROM ${EV} WHERE workflow_id=$1 ORDER BY event_id`,[f.workflowId])).rows;
 return {workflow,cases,events,completionCount:events.filter(x=>x.event_type==='COMPLETED').length};
}
function assertState(s,f,expected){
 need(s.workflow?.tenant_id===TENANT&&s.workflow.session_id===f.session&&s.workflow.tool_call_id===f.operation,'WORKFLOW_ASSOCIATION_INVALID');
 need(s.workflow.state===expected,'WORKFLOW_STATE_INVALID');
 need(s.cases.length===(f.caseId?1:0),'CASE_COUNT_INVALID');
 if(f.caseId)need(s.cases[0].id===f.caseId&&s.cases[0].test_only===true&&s.cases[0].tenant_id===TENANT&&s.cases[0].intake_session_id===f.session,'CASE_ASSOCIATION_INVALID');
 if(expected==='COMPLETED'){
  need(s.workflow.case_id===f.caseId&&s.completionCount===1,'COMPLETION_INVALID');
  need(s.events.filter(x=>x.event_type==='COMPLETED').every(x=>x.case_id===f.caseId&&x.tenant_id===TENANT&&x.session_id===f.session),'EVENT_ASSOCIATION_INVALID');
 }else need(!s.workflow.case_id&&s.completionCount===0,'FALSE_COMPLETION');
 need(s.events.every(x=>x.delivered_at===null&&x.attempts===0),'NOTIFICATION_DISPATCH_DETECTED');
}
async function lockedPair(c,f){
 await c.query('BEGIN');await c.query(`SELECT workflow_id FROM ${WF} WHERE workflow_id=$1 FOR UPDATE`,[f.workflowId]);
 const a=launch('reconcile',f.workflowId),b=launch('reconcile',f.workflowId);const ready=await Promise.all([a.ready,b.ready]);
 need(ready[0].pid!==ready[1].pid&&ready[0].backend_pid!==ready[1].backend_pid,'CLIENTS_NOT_INDEPENDENT');
 a.w.send({go:true});b.w.send({go:true});let waiting=[];
 const deadline=Date.now()+6000;while(Date.now()<deadline){
  waiting=(await c.query("SELECT pid,xact_start,query_start,state,wait_event_type,wait_event,pg_blocking_pids(pid) AS blockers FROM pg_stat_activity WHERE pid=ANY($1::int[]) AND wait_event_type='Lock'",[ready.map(x=>x.backend_pid)])).rows;
  if(waiting.length===2)break;await delay(40);
 }need(waiting.length===2,'CONCURRENT_LOCK_OVERLAP_NOT_OBSERVED');
 const releasedAt=now();await c.query('COMMIT');const results=await Promise.all([a.done,b.done]);await Promise.all([a.exited,b.exited]);
 need(results.every(x=>!x.errorCode),'CONCURRENT_RECONCILIATION_FAILED');
 return {ready,simultaneousBlockedConnections:waiting,lockReleasedAt:releasedAt,results};
}
async function cleanup(c,fixtures){
 const removed=[];await c.query('BEGIN');try{
  for(const f of fixtures){
   const s=await state(c,f);
   if(!s.workflow){need(s.cases.length===0,'CLEANUP_ORPHAN_CASE');const contacts=await c.query('SELECT id FROM public.ai4cc_contacts WHERE tenant_id=$1 AND email=$2',[TENANT,f.email]);need(contacts.rowCount===0,'CLEANUP_ORPHAN_CONTACT');continue;}
   need(s.workflow.tenant_id===TENANT&&s.workflow.session_id===f.session&&s.workflow.tool_call_id===f.operation,'CLEANUP_SCOPE_MISMATCH');
   need(s.cases.length===(f.caseId?1:0)&&s.cases.every(x=>x.id===f.caseId&&x.test_only&&x.contact_id===f.contactId),'CLEANUP_CASE_SCOPE_MISMATCH');
   if(f.contactId){const contact=await c.query("SELECT id FROM public.ai4cc_contacts WHERE id=$1 AND tenant_id=$2 AND email=$3 AND metadata->>'test_only'='true' AND metadata->>'notifications_disabled'='true'",[f.contactId,TENANT,f.email]);need(contact.rowCount===1,'CLEANUP_CONTACT_SCOPE_MISMATCH');}
  }
  for(const f of fixtures){
   if(!(await state(c,f)).workflow){removed.push({session:f.session,notPersisted:true});continue;}
   const events=await c.query(`DELETE FROM ${EV} WHERE workflow_id=$1 AND tenant_id=$2 AND session_id=$3`,[f.workflowId,TENANT,f.session]);
   const workflows=await c.query(`DELETE FROM ${WF} WHERE workflow_id=$1 AND tenant_id=$2 AND session_id=$3 AND tool_call_id=$4`,[f.workflowId,TENANT,f.session,f.operation]);need(workflows.rowCount===1,'CLEANUP_WORKFLOW_COUNT');
   let cases=0,contacts=0;if(f.caseId){cases=(await c.query('DELETE FROM public.stellar_support_cases WHERE id=$1 AND tenant_id=$2 AND intake_session_id=$3 AND test_only=true',[f.caseId,TENANT,f.session])).rowCount;need(cases===1,'CLEANUP_CASE_COUNT');contacts=(await c.query("DELETE FROM public.ai4cc_contacts WHERE id=$1 AND tenant_id=$2 AND email=$3 AND metadata->>'test_only'='true'",[f.contactId,TENANT,f.email])).rowCount;need(contacts===1,'CLEANUP_CONTACT_COUNT');}
   removed.push({workflowId:f.workflowId,events:events.rowCount,workflows:workflows.rowCount,cases,contacts});
  }await c.query('COMMIT');return removed;
 }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}
}
async function main(){
 const report={status:'RUNNING',project:PROJECT,tenant:TENANT,runId:process.env.GITHUB_RUN_ID||'local',startedAt:now(),tests:{},fixtures:[]};
 const save=()=>fs.writeFileSync('c1-r1-evidence.json',JSON.stringify(report,null,2));let c;
 try{
  c=client();await c.connect();report.control=await metadata(c);need(report.control.role==='postgres','EXISTING_ADMIN_ROLE_REQUIRED');
  report.v5=await verifyV5(c);report.baseline=await snapshot(c);report.securityBefore=await security(c);save();
  for(const [tag,withCase]of [['concurrent',true],['missing',false],['restart',true]]){const f=await fixture(c,'c1r1-'+report.runId+'-'+tag,withCase,id=>{report.fixtures.push(id);save();});save();const s=await state(c,f);assertState(s,f,'RUNNING');}
  const [f,missing,restart]=report.fixtures;
  report.tests.C1={before:await state(c,f),...await lockedPair(c,f)};
  for(const x of report.tests.C1.results)need(x.rows.length===1&&x.rows[0].workflow_state==='COMPLETED'&&x.rows[0].verified_case_id===f.caseId,'C1_RESULT_INVALID');
  report.tests.C1.after=await state(c,f);assertState(report.tests.C1.after,f,'COMPLETED');need(report.tests.C1.after.workflow.version==='3','C1_TRANSITION_REPEATED');report.tests.C1.status='PASS';save();
  report.tests.C1_missing={before:await state(c,missing),...await lockedPair(c,missing)};
  for(const x of report.tests.C1_missing.results)need(x.rows.length===1&&x.rows[0].workflow_state==='UNKNOWN'&&x.rows[0].verified_case_id===null,'MISSING_RESULT_INVALID');
  report.tests.C1_missing.after=await state(c,missing);assertState(report.tests.C1_missing.after,missing,'UNKNOWN');need(report.tests.C1_missing.after.events.filter(x=>x.event_type==='UNKNOWN').length===1,'UNKNOWN_EVENT_DUPLICATED');report.tests.C1_missing.status='PASS';save();
  const initial=await state(c,restart);assertState(initial,restart,'RUNNING');const a=launch('hold',restart.workflowId);const held=await a.ready;
  const during=await state(c,restart);assertState(during,restart,'RUNNING');need(held.role==='postgres','ADMIN_LOCK_ROLE_REQUIRED');
  const timeoutWorker=launch('reconcile',restart.workflowId,250);const timeoutReady=await timeoutWorker.ready;timeoutWorker.w.send({go:true});const timeoutResult=await timeoutWorker.done;await timeoutWorker.exited;
  need(timeoutResult.errorCode==='DATABASE_57014','TIMEOUT_NOT_OBSERVED');const afterTimeout=await state(c,restart);need(JSON.stringify(initial)===JSON.stringify(afterTimeout),'TIMEOUT_MUTATED_WORKFLOW');
  report.tests.timeout={status:'PASS',ready:timeoutReady,result:timeoutResult,unchanged:true};save();
  const terminatedAt=now();a.w.kill('SIGKILL');const exited=await a.exited;need(exited.signal==='SIGKILL','WORKER_NOT_KILLED');
  let released=false;for(let i=0;i<40;i++){released=(await c.query('SELECT NOT EXISTS(SELECT 1 FROM pg_stat_activity WHERE pid=$1) AS released',[held.backend_pid])).rows[0].released;if(released)break;await delay(50);}need(released,'CRASHED_WORKER_CONNECTION_REMAINS');
  const persisted=await state(c,restart);assertState(persisted,restart,'RUNNING');
  const b=launch('reconcile',restart.workflowId);const fresh=await b.ready;need(held.pid!==fresh.pid&&held.backend_pid!==fresh.backend_pid,'RESTART_NOT_INDEPENDENT');b.w.send({go:true});const recovered=await b.done;await b.exited;
  need(!recovered.errorCode&&recovered.rows[0]?.verified_case_id===restart.caseId,'RESTART_RECOVERY_INVALID');const after=await state(c,restart);assertState(after,restart,'COMPLETED');
  const repeat=launch('reconcile',restart.workflowId);const repeatReady=await repeat.ready;repeat.w.send({go:true});const repeated=await repeat.done;await repeat.exited;need(!repeated.errorCode&&repeated.rows[0]?.verified_case_id===restart.caseId,'REPEAT_RECOVERY_INVALID');const final=await state(c,restart);assertState(final,restart,'COMPLETED');need(JSON.stringify(after)===JSON.stringify(final),'REPEAT_MUTATED_COMPLETION');
  report.tests.R1={status:'PASS',initial,workerA:held,persistedWhileLocked:during,terminatedAt,exit:exited,connectionReleased:released,persistedAfterCrash:persisted,workerB:fresh,recovered,after,repeatWorker:repeatReady,repeated,final,workerTicketCreationCalls:0};
  report.tests.crashHoldingLock={status:'PASS',pid:held.pid,backendPid:held.backend_pid,connectionReleased:released};
  report.status='PASS';
 }catch(e){report.status='FAIL';report.failureCode=e.safeCode||(/^[A-Z0-9_]+$/.test(e.message||'')?e.message:databaseErrorCode(e));}
 finally{
  for(const w of active)if(!w.killed)w.kill('SIGKILL');await delay(200);
  if(c){try{await c.query('ROLLBACK');report.cleanup=await cleanup(c,report.fixtures);report.final=await snapshot(c);report.securityAfter=await security(c);
   report.cleanupVerified=JSON.stringify(report.baseline)===JSON.stringify(report.final);report.securityUnchanged=JSON.stringify(report.securityBefore)===JSON.stringify(report.securityAfter);
   if(!report.cleanupVerified||!report.securityUnchanged)report.status='FAIL';
  }catch(e){report.cleanupVerified=false;report.cleanupFailure=e.safeCode||databaseErrorCode(e);report.status='FAIL';}await c.end().catch(()=>{});}
  report.finishedAt=now();save();console.log(JSON.stringify({status:report.status,failureCode:report.failureCode,tests:Object.fromEntries(Object.entries(report.tests).map(([k,v])=>[k,v.status||'INCOMPLETE'])),cleanupVerified:report.cleanupVerified,securityUnchanged:report.securityUnchanged}));
 }process.exitCode=report.status==='PASS'?0:2;
}
module.exports={assertState,verifyV5};
if(require.main===module){if(process.argv[2]==='--worker')worker();else main();}
