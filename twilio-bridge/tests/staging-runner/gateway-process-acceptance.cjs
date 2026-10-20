'use strict';
// Reviewable manual runner only. No listener, deployment, auth-user creation or voice import.
const {fork}=require('node:child_process'),{randomUUID}=require('node:crypto'),fs=require('node:fs');
const {Client}=require('pg');
const {config,TENANT,PROJECT,databaseErrorCode}=require('./access-check.cjs');
const base=require('./c1-r1-acceptance.cjs'),helpers=require('./dispatcher-acceptance.cjs');
const {createStagingGateway,PREVIEW_ORIGIN,URL:ENDPOINT}=require('./authenticated-support-gateway.staging.cjs');
const stamp=()=>new Date().toISOString();
function need(ok,code){if(!ok){const e=Error(code);e.safeCode=code;throw e;}}
function authorized(env=process.env){
 need(env.STAGING_GATEWAY_PROCESS_AUTHORIZED==='G04_G05','GATEWAY_PROCESS_AUTHORIZATION_REQUIRED');
 need(typeof env.STAGING_GATEWAY_TEST_BEARER==='string'&&/^[A-Za-z0-9._~-]{20,8192}$/.test(env.STAGING_GATEWAY_TEST_BEARER),'REAL_TEST_USER_AUTH_REQUIRED');
 need(typeof env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY==='string'&&env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.length>0,'PUBLISHABLE_KEY_REQUIRED');
 return config(env);
}
function gatewayEnv(env=process.env){authorized(env);return {SUPABASE_URL:ENDPOINT,CSS_TENANT_ID:TENANT,SUPABASE_SERVICE_ROLE_KEY:env.STAGING_SUPABASE_SERVICE_ROLE_KEY,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,STAGING_ORCHESTRATION_ORIGIN:PREVIEW_ORIGIN,STELLAR_BRIDGE_STAGING:'true',STAGING_ORCHESTRATION_GATEWAY_ENABLED:'true',STAGING_SUPPORT_WRITES_ENABLED:'true'};}
function requestFor(action,body,bearer){return new Request(PREVIEW_ORIGIN+'/api/staging-orchestration/'+action,{method:'POST',headers:{origin:PREVIEW_ORIGIN,authorization:'Bearer '+bearer,'content-type':'application/json'},body:JSON.stringify(body)});}
const validId=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
const childKeys=['PATH','STELLAR_BRIDGE_STAGING','CSS_TENANT_ID','STAGING_SUPABASE_URL','STAGING_SUPABASE_SERVICE_ROLE_KEY','STAGING_DATABASE_URL','STAGING_DATABASE_CA_PEM','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','STAGING_GATEWAY_TEST_BEARER','STAGING_GATEWAY_PROCESS_AUTHORIZED'];
function childEnv(env){return Object.fromEntries(childKeys.filter(k=>env[k]!==undefined).map(k=>[k,env[k]]));}
function verifyObserver(observer,db,stream){
 need(observer.role==='postgres','OBSERVER_CONNECTION_REJECTED');
 need(db.ssl?.rejectUnauthorized===true&&stream.encrypted===true&&stream.authorized===true,'OBSERVER_CLIENT_TLS_REJECTED');
 const protocol=stream.getProtocol?.();need(['TLSv1.2','TLSv1.3'].includes(protocol),'OBSERVER_CLIENT_TLS_REJECTED');
 const pooled=db.host==='aws-0-us-west-1.pooler.supabase.com'&&db.port===5432&&db.user==='postgres.'+PROJECT;
 const direct=db.host==='db.'+PROJECT+'.supabase.co'&&db.user==='postgres';
 need(pooled||direct,'OBSERVER_TARGET_REJECTED');
 if(direct)need(observer.database_backend_tls===true,'OBSERVER_CONNECTION_REJECTED');
 // pg_stat_ssl describes the pooler's database-side hop, not this verified TLS socket.
 // Never assert end-to-end TLS for the pooled connection.
 return {...observer,client_encrypted:true,client_certificate_verified:true,reject_unauthorized:true,tls_protocol:protocol,tls_verified_scope:pooled?'RUNNER_TO_APPROVED_SESSION_POOLER':'DIRECT_DATABASE',backend_tls_observation:observer.database_backend_tls};
}
async function child(){
 let c,phase='preflight';const queued=[],waiting=[];
 process.on('message',m=>{const w=waiting.find(x=>x.type===m?.type);if(w){waiting.splice(waiting.indexOf(w),1);clearTimeout(w.timer);w.resolve(m);}else queued.push(m);});
 const receive=type=>{const at=queued.findIndex(m=>m.type===type);if(at>=0)return Promise.resolve(queued.splice(at,1)[0]);return new Promise((resolve,reject)=>{const w={type,resolve,timer:setTimeout(()=>reject(Error('WORKER_CONTROL_TIMEOUT')),20000)};waiting.push(w);});};
 try{
  const cfg=authorized();phase='observer_connect';c=new Client(cfg.db);c.on('error',()=>{});await c.connect();phase='observer_query';await c.query('BEGIN READ ONLY');
  let observer=(await c.query("SELECT pg_backend_pid() backend_pid,current_user AS role,clock_timestamp() ready_at,(SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) database_backend_tls")).rows[0];
  observer=verifyObserver(observer,cfg.db,c.connection.stream);
  phase='await_job';process.send({type:'ready',pid:process.pid,observer});const job=await receive('execute');let initialLookup=true;
  const transport=async(url,init)=>{
   const parsed=new URL(url);need(parsed.origin===ENDPOINT,'UPSTREAM_TARGET_REJECTED');
   const name=parsed.pathname.startsWith('/rest/v1/rpc/')?parsed.pathname.slice('/rest/v1/rpc/'.length):null;
   const rpcId=name?randomUUID():null;
   if(name)process.send({type:'rpc',pid:process.pid,name,rpcId,phase:'started',at:stamp()});
   let result;
   try{result=await fetch(url,init);if(name){await result.clone().json();process.send({type:'rpc',pid:process.pid,name,rpcId,phase:'settled',status:result.status,at:stamp()});}}
   catch(e){if(name)process.send({type:'rpc',pid:process.pid,name,rpcId,phase:'uncertain',at:stamp()});throw e;}
   if(result.ok&&name==='stellar_orch_lookup_staging'&&job.lookupBarrier&&initialLookup){
    initialLookup=false;const row=await result.clone().json();need(row.found===false,'INITIAL_LOOKUP_ALREADY_PERSISTED');
    process.send({type:'lookupAbsent',pid:process.pid,at:stamp()});await receive('releaseLookup');
   }
   if(result.ok&&name==='stellar_create_phone_support_test_intake'&&job.crashAfterCase){
    const rows=await result.clone().json();need(Array.isArray(rows)&&validId(rows[0]?.case_id)&&validId(rows[0]?.customer_id),'COMMITTED_CASE_RESPONSE_INVALID');
    process.send({type:'caseCommitted',pid:process.pid,caseId:rows[0].case_id,contactId:rows[0].customer_id,at:stamp()});
    // Parent must verify committed SQL state and SIGKILL this process; no remote control endpoint.
    await receive('neverReleaseCase');
   }
   return result;
  };
  const gate=createStagingGateway({env:gatewayEnv(),request:transport});
  phase='gateway_handle';const startedAt=stamp(),res=await gate.handle(requestFor(job.action,job.body,process.env.STAGING_GATEWAY_TEST_BEARER)),body=await res.json();
  need(!Object.hasOwn(body,'operationToken'),'CAPABILITY_REPORT_REJECTED');
  await c.query('ROLLBACK');await c.end();c=null;
  process.send({type:'result',pid:process.pid,status:res.status,body,startedAt,finishedAt:stamp()},()=>process.disconnect());
 }catch(e){if(c)await c.end().catch(()=>{});process.send?.({type:'failure',pid:process.pid,phase,code:e.safeCode||databaseErrorCode(e)},()=>process.disconnect());process.exitCode=2;}
}
const active=new Set();
function workerFailure(m){const allowed=new Set(['GATEWAY_WORKER_FAILED','OBSERVER_CONNECTION_REJECTED','OBSERVER_CLIENT_TLS_REJECTED','OBSERVER_TARGET_REJECTED','INITIAL_LOOKUP_ALREADY_PERSISTED','COMMITTED_CASE_RESPONSE_INVALID','CAPABILITY_REPORT_REJECTED','UPSTREAM_TARGET_REJECTED','GATEWAY_PROCESS_AUTHORIZATION_REQUIRED','REAL_TEST_USER_AUTH_REQUIRED','PUBLISHABLE_KEY_REQUIRED','WORKER_CONTROL_TIMEOUT','DATABASE_PROBE_FAILED','DATABASE_CONNECTION_TIMEOUT','DATABASE_QUERY_TIMEOUT']);const code=allowed.has(m.code)||(typeof m.code==='string'&&m.code.startsWith('DATABASE_')&&databaseErrorCode({code:m.code.slice(9)})===m.code)?m.code:'GATEWAY_WORKER_FAILED';const e=Error(code);e.safeCode=code;e.worker={pid:Number.isSafeInteger(m.pid)?m.pid:null,phase:['preflight','observer_connect','observer_query','await_job','gateway_handle'].includes(m.phase)?m.phase:'unknown',code};return e;}
function launch(onTrace,onObservation=()=>{}){
 const p=fork(__filename,['--worker'],{env:childEnv(process.env),execArgv:[],stdio:['ignore','ignore','ignore','ipc']});active.add(p);
 const messages=[],waiters=[];let resolveExit;const exited=new Promise(r=>resolveExit=r);
 p.on('message',m=>{if(m.type==='rpc')onTrace(m);if(m.type==='ready')onObservation(m);if(m.type==='failure')onObservation(workerFailure(m).worker);messages.push(m);for(const w of [...waiters])if(m.type===w.type||m.type==='failure'){clearTimeout(w.timer);waiters.splice(waiters.indexOf(w),1);m.type==='failure'?w.reject(workerFailure(m)):w.resolve(m);}});
 p.on('exit',(code,signal)=>{active.delete(p);resolveExit({pid:p.pid,code,signal,at:stamp()});for(const w of waiters){clearTimeout(w.timer);w.reject(Error('WORKER_EXITED_BEFORE_RESULT'));}});
 p.on('error',()=>{for(const w of waiters){clearTimeout(w.timer);w.reject(Error('WORKER_START_FAILED'));}});
 const wait=type=>{const m=messages.find(x=>x.type===type||x.type==='failure');if(m)return m.type==='failure'?Promise.reject(workerFailure(m)):Promise.resolve(m);return new Promise((resolve,reject)=>{const w={type,resolve,reject,timer:setTimeout(()=>{waiters.splice(waiters.indexOf(w),1);reject(Error('GATEWAY_WORKER_TIMEOUT'));},25000)};waiters.push(w);});};
 return {p,wait,exited};
}
async function hydrate(c,f){
 const rows=(await c.query('SELECT workflow_id,tenant_id,session_id,tool_call_id FROM public.stellar_orchestrator_workflows_staging WHERE tenant_id=$1 AND tool_call_id=$2',[TENANT,f.operation])).rows;
 need(rows.length<=1,'DUPLICATE_WORKFLOW');if(rows.length){need(rows[0].session_id===f.session,'WORKFLOW_SESSION_CHANGED');f.workflowId=rows[0].workflow_id;}
 const cases=(await c.query('SELECT id,contact_id,test_only FROM public.stellar_support_cases WHERE tenant_id=$1 AND intake_session_id=$2',[TENANT,f.session])).rows;
 need(cases.length<=1&&cases.every(x=>x.test_only===true),'SYNTHETIC_CASE_SCOPE_REJECTED');if(cases.length){f.caseId=cases[0].id;f.contactId=cases[0].contact_id;}
 return base.state(c,f);
}
function confirmed(r,f){need(r.status===200&&r.body.success===true&&r.body.state==='COMPLETED'&&r.body.caseId===f.caseId&&r.body.customerId===f.contactId&&r.body.testOnly===true&&r.body.notificationSent===false&&r.body.technicianFollowupConfirmed===false,'GATEWAY_RESULT_NOT_VERIFIED');}
function quiescent(traces){return traces.every(x=>x.phase!=='uncertain')&&traces.filter(x=>x.phase==='started').every(x=>traces.some(y=>y.rpcId===x.rpcId&&y.pid===x.pid&&y.phase==='settled'));}
async function security(c){const previous=await helpers.security(c);const lookup=(await c.query("SELECT md5(prosrc) body_hash,prosecdef,proconfig,proacl::text,has_function_privilege('service_role',oid,'EXECUTE') service_execute,has_function_privilege('anon',oid,'EXECUTE') anon_execute,has_function_privilege('authenticated',oid,'EXECUTE') authenticated_execute FROM pg_proc WHERE oid='public.stellar_orch_lookup_staging(uuid,text)'::regprocedure")).rows[0];need(lookup?.body_hash==='83b86abef8590434d473c32ee9284460'&&lookup.service_execute&&!lookup.anon_execute&&!lookup.authenticated_execute,'LOOKUP_SECURITY_REJECTED');return {previous,lookup};}
async function main(){
 const report={scope:'REAL_GATEWAY_MODULE_PROCESSES_NOT_NETLIFY_WORKER_CONTROL',status:'BLOCKED',project:PROJECT,tenant:TENANT,startedAt:stamp(),fixtures:[],tests:{},rpcTraces:[],workerObservations:[]};
 const save=()=>fs.writeFileSync('gateway-process-evidence.json',JSON.stringify(report,null,2),{mode:0o600});let c;let snapshotTaken=false;
 try{
  const cfg=authorized();c=new Client(cfg.db);c.on('error',()=>{});await c.connect();need((await c.query('SELECT current_user AS role')).rows[0].role==='postgres','EXISTING_ADMIN_REQUIRED');
  report.baseline=await helpers.snapshot(c);report.securityBefore=await security(c);await base.verifyV5(c);snapshotTaken=true;save();
  const gate=createStagingGateway({env:gatewayEnv()});
  const make=async tag=>{
   const email='gateway-process-'+randomUUID()+'@example.invalid';const intake={name:'Fictional gateway process customer',email,phone:'',product:'Synthetic test router',purchaseDate:'2026-10-01',issue:'Fictional isolated gateway process acceptance; no outreach.',steps:tag,impact:'No real customer affected',priority:'NORMAL'};
   const res=await gate.handle(requestFor('begin',{confirmed:true,intake},process.env.STAGING_GATEWAY_TEST_BEARER));
   need(res.status===201,'REAL_STAGING_USER_NOT_AUTHORIZED');const body=await res.json();need(typeof body.operationToken==='string','CAPABILITY_REQUIRED');
   const claims=JSON.parse(Buffer.from(body.operationToken.split('.')[0],'base64url').toString());
   need(claims.tenantId===TENANT&&claims.operationId?.startsWith('gateway:')&&validId(claims.operationId.slice(8))&&/^phone-staging:CA[0-9a-f]{32}$/.test(claims.sessionId)&&claims.sessionId==='phone-staging:'+claims.callId,'CAPABILITY_MANIFEST_REJECTED');
   const f={tag,email,operation:claims.operationId,session:claims.sessionId};report.fixtures.push(f);save();
   return {f,submit:{operationToken:body.operationToken,confirmed:true,intake},status:{operationToken:body.operationToken}};
  };
  const trace=x=>{report.rpcTraces.push(x);save();},observe=x=>{report.workerObservations.push(x);save();};
  const recover=async job=>{const w=launch(trace,observe);const ready=await w.wait('ready');w.p.send({type:'execute',action:'status',body:job.status});const result=await w.wait('result'),exit=await w.exited;need(exit.code===0,'RECOVERY_PROCESS_EXIT');return {ready,result,exit};};
  const pair=await make('concurrent-first-submit'),a=launch(trace,observe),b=launch(trace,observe);const ready=await Promise.all([a.wait('ready'),b.wait('ready')]);
  need(ready[0].pid!==ready[1].pid&&ready[0].observer.backend_pid!==ready[1].observer.backend_pid,'INDEPENDENT_WORKERS_REQUIRED');
  for(const w of[a,b])w.p.send({type:'execute',action:'submit',body:pair.submit,lookupBarrier:true});
  const absent=await Promise.all([a.wait('lookupAbsent'),b.wait('lookupAbsent')]);const releasedAt=stamp();for(const w of[a,b])w.p.send({type:'releaseLookup'});
  const results=await Promise.all([a.wait('result'),b.wait('result')]),exits=await Promise.all([a.exited,b.exited]);need(exits.every(x=>x.code===0),'CONCURRENT_PROCESS_EXIT');
  need(results.every(x=>x.status===200||x.status===202),'CONCURRENT_REQUEST_REJECTED');
  await hydrate(c,pair.f);const recovered=await recover(pair);await hydrate(c,pair.f);confirmed(recovered.result,pair.f);const state=await base.state(c,pair.f);base.assertState(state,pair.f,'COMPLETED');
  need(report.rpcTraces.filter(x=>x.name==='stellar_create_phone_support_test_intake'&&x.phase==='started').length===1,'CONCURRENT_DUPLICATE_TICKET_WRITE');
  report.tests.G04={status:'PASS',ready,absent,releasedAt,results,exits,recovered,state,connectionNote:'Observer backend IDs are separate read-only worker connections; PostgREST RPC backend IDs are not exposed.'};save();
  const restart=await make('restart-after-commit'),workerA=launch(trace,observe),readyA=await workerA.wait('ready');workerA.p.send({type:'execute',action:'submit',body:restart.submit,crashAfterCase:true});
  const committed=await workerA.wait('caseCommitted');Object.assign(restart.f,{caseId:committed.caseId,contactId:committed.contactId});save();const persisted=await hydrate(c,restart.f);base.assertState(persisted,restart.f,'RUNNING');
  workerA.p.kill('SIGKILL');const crash=await workerA.exited;need(crash.signal==='SIGKILL','ACTUAL_PROCESS_CRASH_REQUIRED');
  const writes=report.rpcTraces.filter(x=>x.name==='stellar_create_phone_support_test_intake'&&x.phase==='started').length;
  const workerB=await recover(restart);need(workerB.ready.pid!==readyA.pid&&workerB.ready.observer.backend_pid!==readyA.observer.backend_pid,'FRESH_RESTART_PROCESS_REQUIRED');confirmed(workerB.result,restart.f);base.assertState(await hydrate(c,restart.f),restart.f,'COMPLETED');
  const beforeRepeat=await base.state(c,restart.f),repeat=await recover(restart);confirmed(repeat.result,restart.f);need(JSON.stringify(beforeRepeat)===JSON.stringify(await base.state(c,restart.f)),'RECOVERY_CHANGED_COMPLETED_STATE');
  need(writes===report.rpcTraces.filter(x=>x.name==='stellar_create_phone_support_test_intake'&&x.phase==='started').length,'RESTART_REPEATED_CASE_WRITE');
  report.tests.G05={status:'PASS',readyA,committed,persisted,crash,workerB,repeat,additionalRecoveryTicketWrites:0};report.status='PASS';save();
 }catch(e){report.status=snapshotTaken?'FAIL':'BLOCKED';report.failureCode=e.safeCode||'GATEWAY_PROCESS_ACCEPTANCE_FAILED';if(e.worker)report.failureWorker=e.worker;}
 finally{
  await Promise.all([...active].map(p=>new Promise(r=>{p.once('exit',r);p.kill('SIGKILL');})));
  if(c&&snapshotTaken){try{
   // All workers are quiescent; resolve manifest-bound committed state without submitting anything.
   need(quiescent(report.rpcTraces),'UNCERTAIN_UPSTREAM_WRITE_REQUIRES_REVIEW');
   for(const f of report.fixtures){const state=await hydrate(c,f);need(state.events.every(x=>x.delivered_at===null&&x.attempts===0),'UNEXPECTED_DISPATCH_REQUIRES_REVIEW');for(const table of ['stellar_dispatch_receipts_staging','stellar_dispatch_effects_staging']){const count=(await c.query(`SELECT count(*)::int n FROM public.${table} WHERE tenant_id=$1 AND event_id IN (SELECT event_id FROM public.stellar_orchestrator_events_staging WHERE workflow_id=$2)`,[TENANT,f.workflowId])).rows[0].n;need(count===0,'UNEXPECTED_DELIVERY_REQUIRES_REVIEW');}}
   report.cleanup=await base.cleanup(c,report.fixtures);report.final=await helpers.snapshot(c);report.securityAfter=await security(c);
   report.cleanupVerified=JSON.stringify(report.baseline)===JSON.stringify(report.final);report.securityUnchanged=JSON.stringify(report.securityBefore)===JSON.stringify(report.securityAfter);
   need(report.cleanupVerified&&report.securityUnchanged,'FINAL_CLEANUP_SECURITY_MISMATCH');
  }catch(e){report.status='FAIL';report.cleanupFailure=e.safeCode||'CLEANUP_BLOCKED';}}
  if(c)await c.end().catch(()=>{});report.finishedAt=stamp();save();
  console.log(JSON.stringify({status:report.status,failureCode:report.failureCode,tests:Object.fromEntries(Object.entries(report.tests).map(([k,v])=>[k,v.status])),cleanupVerified:report.cleanupVerified,securityUnchanged:report.securityUnchanged}));
 }
 process.exitCode=report.status==='PASS'?0:2;
}
module.exports={authorized,gatewayEnv,requestFor,childEnv,confirmed,quiescent,workerFailure,verifyObserver};
if(require.main===module){if(process.argv[2]==='--worker')child();else main();}
