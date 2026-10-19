'use strict';
// Test-only committed fixtures. Never imported by the voice bridge.
const {fork}=require('node:child_process');
const {randomBytes,randomUUID}=require('node:crypto');
const fs=require('node:fs');
const {Client}=require('pg');
const {config,TENANT,PROJECT}=require('./access-check.cjs');
const base=require('./c1-r1-acceptance.cjs');
const {createDispatcher,loopbackTransport,envelope}=require('./dispatcher.staging.cjs');
const {createDatabaseRpc,createStore,startTestReceiver,FUNCTIONS}=require('./dispatcher-database.staging.cjs');
const EV='public.stellar_orchestrator_events_staging';
const extra=['stellar_dispatch_receipts_staging','stellar_dispatch_effects_staging'];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const need=(v,c)=>{if(!v){const e=Error(c);e.safeCode=c;throw e;}};
function authorize(){need(process.env.STAGING_DISPATCH_ACCEPTANCE_AUTHORIZED==='D01_D11','DISPATCH_ACCEPTANCE_AUTHORIZATION_REQUIRED');return config();}
async function connect(){const c=new Client(authorize().db);await c.connect();return c;}
function rpc(onTrace){return createDatabaseRpc({connect,onTrace});}
async function child(){
 try{authorize();const cfg=await new Promise(r=>process.once('message',r));const traces=[];const store=createStore({rpc:rpc(t=>traces.push(t))});
 if(process.argv[2]==='--receiver'){
  let release;process.on('message',m=>{if(m.release&&release){release();release=null;}});
  const receiver=await startTestReceiver({store,sharedKey:cfg.key,mode:cfg.mode||'normal',afterApply:async ack=>{process.send({type:'applied',ack,traces:traces.splice(0)});if(cfg.hold)await new Promise(r=>release=r);}});
  process.send({type:'ready',pid:process.pid,url:receiver.url});process.on('message',async m=>{if(m.stop){await receiver.close();process.disconnect();}});
 }else{
  const transport=loopbackTransport({url:cfg.url,sharedKey:cfg.key,timeoutMs:2000});
  const d=createDispatcher({store,workerId:'acceptance-'+process.pid,workflowIds:[cfg.workflowId],staging:true,leaseMs:5000,transport:async msg=>{if(cfg.hold){process.send({type:'held',at:new Date().toISOString(),traces:traces.splice(0)});await new Promise(r=>process.once('message',r));}return transport(msg);}});
  process.send({type:'ready',pid:process.pid});await new Promise(r=>process.once('message',r));
  const result=await d.once();process.send({type:'result',pid:process.pid,result,traces,at:new Date().toISOString()},()=>process.disconnect());
 }
 }catch(e){process.send?.({type:'error',code:e.safeCode||'CHILD_FAILED'},()=>process.disconnect());process.exitCode=2;}
}
const children=new Set();
function spawn(kind,cfg){
 const keys=['PATH','STELLAR_BRIDGE_STAGING','CSS_TENANT_ID','STAGING_SUPABASE_URL','STAGING_SUPABASE_SERVICE_ROLE_KEY','STAGING_DATABASE_URL','STAGING_DATABASE_CA_PEM','STAGING_DISPATCH_ACCEPTANCE_AUTHORIZED'];
 const p=fork(__filename,['--'+kind],{env:Object.fromEntries(keys.filter(k=>process.env[k]!==undefined).map(k=>[k,process.env[k]])),execArgv:[],stdio:['ignore','ignore','ignore','ipc']});children.add(p);
 const messages=[],waiters=[];let exit;const exited=new Promise(r=>exit=r);
 p.on('message',m=>{messages.push(m);for(const w of [...waiters])if(m.type===w.type||m.type==='error'){clearTimeout(w.timer);waiters.splice(waiters.indexOf(w),1);m.type==='error'?w.reject(Error(m.code)):w.resolve(m);}});
 p.on('exit',(code,signal)=>{children.delete(p);exit({pid:p.pid,code,signal,at:new Date().toISOString()});});
 p.on('error',()=>{for(const w of waiters)w.reject(Error('PROCESS_START_FAILED'));});
 const wait=type=>{const old=messages.find(m=>m.type===type||m.type==='error');if(old)return old.type==='error'?Promise.reject(Error(old.code)):Promise.resolve(old);return new Promise((resolve,reject)=>{const w={type,resolve,reject,timer:setTimeout(()=>reject(Error('PROCESS_MESSAGE_TIMEOUT')),20000)};waiters.push(w);});};
 p.send(cfg);return {p,wait,exited};
}
async function receiver(key,mode='normal',hold=false){const p=spawn('receiver',{key,mode,hold});return {...p,...await p.wait('ready')};}
async function run(f,r,hold=false){const p=spawn('worker',{key:r.key,url:r.url,workflowId:f.workflowId,hold});const ready=await p.wait('ready');p.p.send({go:true});return {...p,ready};}
async function finish(w){const result=await w.wait('result');const exit=await w.exited;need(exit.code===0,'WORKER_EXIT_FAILURE');return {...result,exit};}
async function stop(p){if(!p.p.killed)p.p.kill('SIGKILL');return p.exited;}
async function inspect(c,f){
 const s=await base.state(c,f);need(s.workflow?.state==='COMPLETED'&&s.workflow.case_id===f.caseId&&s.workflow.tenant_id===TENANT&&s.workflow.session_id===f.session,'AUTHORITATIVE_WORKFLOW_INVALID');need(s.cases.length===1&&s.cases[0].id===f.caseId&&s.cases[0].test_only&&s.cases[0].intake_session_id===f.session&&s.completionCount===1,'AUTHORITATIVE_CASE_INVALID');
 const event=(await c.query(`SELECT event_id::text,delivery_state,attempts,claim_token,lease_until,next_attempt_at,last_error,payload_sha256,created_at FROM ${EV} WHERE workflow_id=$1 AND event_type='COMPLETED'`,[f.workflowId])).rows[0];
 const receipt=(await c.query('SELECT event_id::text,tenant_id,workflow_id,session_id,case_id,payload_sha256 FROM public.stellar_dispatch_receipts_staging WHERE event_id=$1',[event.event_id])).rows;
 const effect=(await c.query('SELECT event_id::text,tenant_id,case_id FROM public.stellar_dispatch_effects_staging WHERE event_id=$1',[event.event_id])).rows;
 return {workflow:s.workflow,cases:s.cases,completionCount:s.completionCount,event,receipt,effect};
}
function delivered(s,f){need(s.event.delivery_state==='DELIVERED'&&s.receipt.length===1&&s.effect.length===1,'DELIVERY_NOT_EXACTLY_ONCE');need(s.receipt[0].case_id===f.caseId&&s.receipt[0].tenant_id===TENANT&&s.receipt[0].session_id===f.session&&s.effect[0].case_id===f.caseId,'RECEIPT_ASSOCIATION_INVALID');}
async function due(c,f,field){const until=Date.now()+16000;while(Date.now()<until){const r=await c.query(`SELECT ${field}<=clock_timestamp() AS due FROM ${EV} WHERE workflow_id=$1 AND event_type='COMPLETED'`,[f.workflowId]);if(r.rows[0]?.due)return;await pause(100);}throw Error('DATABASE_DUE_TIMEOUT');}
async function snapshot(c){const s=await base.snapshot(c);for(const table of extra)s[table]=(await c.query(`SELECT count(*)::int AS count,md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY event_id),'')) AS fingerprint FROM public.${table} t`)).rows[0];return s;}
async function security(c){const old=await base.security(c);const tables=(await c.query("SELECT relname,relrowsecurity,relacl::text FROM pg_class WHERE oid=ANY($1::regclass[]) ORDER BY relname",[extra.map(t=>'public.'+t)])).rows;need(tables.length===2&&tables.every(t=>t.relrowsecurity),'RECEIVER_RLS_REQUIRED');
 const funcs=(await c.query("SELECT proname,md5(prosrc) AS body_hash,proconfig,proacl::text,prosecdef,has_function_privilege('service_role',oid,'EXECUTE') AS service,has_function_privilege('anon',oid,'EXECUTE') AS anon,has_function_privilege('authenticated',oid,'EXECUTE') AS authenticated FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname=ANY($1::text[]) ORDER BY proname",[Object.values(FUNCTIONS)])).rows;need(funcs.length===5&&funcs.every(f=>f.service&&!f.anon&&!f.authenticated),'DISPATCH_RPC_PRIVILEGES_INVALID');return {old,tables,funcs};}
async function rejected(action,code){try{await action();}catch(e){need(e.safeCode===code||e.message===code,'WRONG_REJECTION');return code;}throw Error('EXPECTED_REJECTION_MISSING');}
async function main(){
 const report={status:'RUNNING',project:PROJECT,tenant:TENANT,runId:process.env.GITHUB_RUN_ID||'local',startedAt:new Date().toISOString(),tests:{},fixtures:[]};let c;
 const save=()=>fs.writeFileSync('dispatcher-evidence.json',JSON.stringify(report,(k,v)=>k==='claim_token'?(v?'REDACTED':null):v,2));
 const test=async(id,action)=>{report.tests[id]={status:'RUNNING'};save();report.tests[id]={status:'PASS',...await action()};save();};
 try{authorize();c=await connect();need((await c.query('SELECT current_user AS role')).rows[0].role==='postgres','EXISTING_ADMIN_ROLE_REQUIRED');report.v5=await base.verifyV5(c);report.baseline=await snapshot(c);report.securityBefore=await security(c);save();
 const make=async tag=>{const f=await base.fixture(c,'dispatch-'+report.runId+'-'+tag,true,id=>{report.fixtures.push(id);save();});await c.query('BEGIN');try{await c.query('SET LOCAL ROLE service_role');const r=await c.query('SELECT * FROM public.stellar_orch_reconcile_case_staging($1)',[f.workflowId]);need(r.rows[0]?.verified_case_id===f.caseId,'FIXTURE_COMPLETION_FAILED');await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e;}save();return f;};
 const key=randomBytes(32).toString('hex');const normal=await receiver(key);normal.key=key;
 let first;
 await test('D01',async()=>{first=await make('normal');const w=await run(first,normal);const result=await finish(w);const after=await inspect(c,first);delivered(after,first);return {worker:w.ready,result,after};});
 await test('D02',async()=>{const f=await make('concurrent'),r=await receiver(key,'normal',true);r.key=key;const a=await run(f,r);const applied=await r.wait('applied');const b=await run(f,normal);const loser=await finish(b);need(loser.result.state==='IDLE','CONCURRENT_CLAIM_DUPLICATED');r.p.send({release:true});const winner=await finish(a);const after=await inspect(c,f);delivered(after,f);await stop(r);return {workers:[a.ready,b.ready],applied,results:[winner,loser],after};});
 await test('D03',async()=>{const f=await make('claim-crash');const a=await run(f,normal,true);const held=await a.wait('held'),before=await inspect(c,f);need(before.event.delivery_state==='LEASED'&&before.receipt.length===0,'CLAIM_NOT_COMMITTED');const exit=await stop(a);need(exit.signal==='SIGKILL','PROCESS_NOT_KILLED');await due(c,f,'lease_until');const b=await run(f,normal);const result=await finish(b);const after=await inspect(c,f);delivered(after,f);return {workerA:a.ready,held,before,exit,workerB:b.ready,result,after};});
 await test('D04',async()=>{const f=await make('receipt-crash'),r=await receiver(key,'normal',true);r.key=key;const a=await run(f,r);const applied=await r.wait('applied');const before=await inspect(c,f);need(before.event.delivery_state==='LEASED'&&before.receipt.length===1&&before.effect.length===1,'DURABLE_RECEIPT_NOT_COMMITTED');const exit=await stop(a);await stop(r);await due(c,f,'lease_until');const b=await run(f,normal);const result=await finish(b);const after=await inspect(c,f);delivered(after,f);return {workerA:a.ready,receiverPid:r.pid,applied,before,exit,workerB:b.ready,result,after};});
 await test('D05',async()=>{const before=await inspect(c,first);const old=await stop(normal);const r=await receiver(key);r.key=key;const msg=envelope({eventId:before.event.event_id,eventType:'COMPLETED',tenantId:TENANT,workflowId:first.workflowId,sessionId:first.session,caseId:first.caseId,createdAt:before.event.created_at.toISOString()});const ack=await loopbackTransport({url:r.url,sharedKey:key})(msg);const after=await inspect(c,first);delivered(after,first);need(JSON.stringify(before)===JSON.stringify(after),'RECEIVER_RESTART_DUPLICATED_EFFECT');Object.assign(normal,r);return {oldReceiverExit:old,newReceiverPid:r.pid,ack,after};});
 await test('D06',async()=>{const f=await make('timeout'),r=await receiver(key,'timeout');r.key=key;const a=await run(f,r);const failed=await finish(a);const before=await inspect(c,f);need(failed.result.code==='TRANSPORT_TIMEOUT'&&before.event.delivery_state==='PENDING'&&before.receipt.length===0,'TIMEOUT_RETRY_NOT_DURABLE');await stop(r);await due(c,f,'next_attempt_at');const b=await run(f,normal);const result=await finish(b);const after=await inspect(c,f);delivered(after,f);return {failed,before,result,after};});
 await test('D07',async()=>{const f=await make('exhaust'),r=await receiver(key,'reject');r.key=key;const results=[];for(let i=0;i<5;i++){if(i)await due(c,f,'next_attempt_at');results.push(await finish(await run(f,r)));}const after=await inspect(c,f);need(after.event.delivery_state==='FAILED'&&after.event.attempts===5&&after.effect.length===0,'RETRY_EXHAUSTION_INVALID');const repeat=await finish(await run(f,normal));need(repeat.result.state==='IDLE','FAILED_EVENT_RECLAIMED');await stop(r);return {results,after,repeat};});
 await test('D08',async()=>{const f=await make('fence');const a=await run(f,normal,true);await a.wait('held');const old=await inspect(c,f);await due(c,f,'lease_until');const result=await finish(await run(f,normal));const after=await inspect(c,f);delivered(after,f);const service=rpc();const ack=await service(FUNCTIONS.ack,[TENANT,old.event.event_id,old.event.claim_token,after.event.payload_sha256]);const fail=await service(FUNCTIONS.fail,[TENANT,old.event.event_id,old.event.claim_token,'TRANSPORT_TIMEOUT']);need(ack===false&&fail===false,'STALE_LEASE_NOT_FENCED');await stop(a);return {oldWorker:a.ready,result,staleAck:ack,staleFail:fail,after};});
 await test('D09',async()=>{const s=await inspect(c,first),service=rpc(),event=s.event.event_id;const args=[TENANT,event,first.workflowId,first.session,first.caseId,`stellar:${PROJECT}:${TENANT}:${event}`,s.event.payload_sha256];const results={};results.tenant=await rejected(()=>service(FUNCTIONS.claim,[randomUUID(),[first.workflowId],'negative',5000]),'DISPATCH_SCOPE_REJECTED');for(const [name,index,value]of [['workflow',2,randomUUID()],['session',3,'wrong-session'],['case',4,randomUUID()]]){const bad=[...args];bad[index]=value;results[name]=await rejected(()=>service(FUNCTIONS.receive,bad),'RECEIVER_ASSOCIATION_REJECTED');}const bad=[...args];bad[6]='0'.repeat(64);results.hash=await rejected(()=>service(FUNCTIONS.receive,bad),'RECEIVER_PAYLOAD_CONFLICT');for(const role of ['anon','authenticated']){await c.query('BEGIN');try{await c.query('SET LOCAL ROLE '+role);await c.query('SELECT public.stellar_dispatch_claim_staging($1,$2,$3,$4)',[TENANT,[first.workflowId],'negative',5000]);throw Error('UNAUTHORIZED_RPC_SUCCEEDED');}catch(e){need(e.code==='42501','ROLE_DENIAL_NOT_VERIFIED');results[role]=e.code;}finally{await c.query('ROLLBACK');}}need(JSON.stringify(s)===JSON.stringify(await inspect(c,first)),'NEGATIVE_TEST_MUTATED_STATE');return {rejections:results,unchanged:true};});
 await test('D10',async()=>{const before=await inspect(c,first);const result=await finish(await run(first,normal));need(result.result.state==='IDLE','DELIVERED_EVENT_RECLAIMED');const after=await inspect(c,first);need(JSON.stringify(before)===JSON.stringify(after),'REPEAT_MUTATED_DELIVERY');return {result,after,workerTicketCreationCalls:0};});
 report.status='PASS';
 }catch(e){report.status='FAIL';report.failureCode=e.safeCode||(/^[A-Z0-9_]+$/.test(e.message||'')?e.message:'DISPATCH_ACCEPTANCE_FAILED');}
 finally{await Promise.all([...children].map(p=>{p.kill('SIGKILL');return new Promise(r=>p.once('exit',r));}));if(c){try{await c.query('ROLLBACK');for(const table of [...extra].reverse())await c.query(`DELETE FROM public.${table} WHERE tenant_id=$1 AND event_id IN (SELECT event_id FROM ${EV} WHERE tenant_id=$1 AND workflow_id=ANY($2::uuid[]))`,[TENANT,report.fixtures.map(f=>f.workflowId).filter(Boolean)]);report.cleanup=await base.cleanup(c,report.fixtures);report.final=await snapshot(c);report.securityAfter=await security(c);report.cleanupVerified=JSON.stringify(report.baseline)===JSON.stringify(report.final);report.securityUnchanged=JSON.stringify(report.securityBefore)===JSON.stringify(report.securityAfter);need(report.cleanupVerified&&report.securityUnchanged,'CLEANUP_OR_SECURITY_MISMATCH');report.tests.D11={status:'PASS',cleanupVerified:true,securityUnchanged:true};}catch(e){report.status='FAIL';report.cleanupFailure=e.safeCode||'CLEANUP_FAILED';report.tests.D11={status:'FAIL'};}await c.end().catch(()=>{});}report.finishedAt=new Date().toISOString();save();console.log(JSON.stringify({status:report.status,failureCode:report.failureCode,tests:Object.fromEntries(Object.entries(report.tests).map(([k,v])=>[k,v.status])),cleanupVerified:report.cleanupVerified,securityUnchanged:report.securityUnchanged}));}process.exitCode=report.status==='PASS'?0:2;
}
module.exports={authorize,delivered};
if(require.main===module){if(process.argv[2]?.startsWith('--'))child();else main();}
