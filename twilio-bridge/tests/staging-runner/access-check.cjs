'use strict';
// Read-only access preparation. Never creates a workflow, ticket, or fixture.
const {fork}=require('node:child_process');
const PROJECT='hvzauakkhlivzeqatfqm';
const TENANT='5885a020-d363-4c27-910a-c035eda132f5';
const ENDPOINT=`https://${PROJECT}.supabase.co`;
const REQUIRED=['STAGING_DATABASE_URL','STAGING_SUPABASE_SERVICE_ROLE_KEY'];
function blocked(code,missing){const e=new Error(code);e.safeCode=code;if(missing)e.missing=missing;return e;}
function config(env=process.env){
 if(env.STELLAR_BRIDGE_STAGING!=='true')throw blocked('STAGING_ONLY_REQUIRED');
 if(env.CSS_TENANT_ID!==TENANT)throw blocked('STAGING_TENANT_REQUIRED');
 if(env.STAGING_SUPABASE_URL!==ENDPOINT)throw blocked('STAGING_ENDPOINT_REQUIRED');
 if(env.NODE_TLS_REJECT_UNAUTHORIZED==='0')throw blocked('TLS_VERIFICATION_REQUIRED');
 const missing=REQUIRED.filter(k=>!env[k]?.trim());
 if(missing.length)throw blocked('CREDENTIALS_NOT_CONFIGURED',missing);
 let u;try{u=new URL(env.STAGING_DATABASE_URL);}catch{throw blocked('INVALID_DATABASE_CONFIGURATION');}
 if(!['postgres:','postgresql:'].includes(u.protocol)||u.search||u.hash||u.pathname!=='/postgres'||(u.port&&u.port!=='5432'))throw blocked('DATABASE_TARGET_REJECTED');
 let user,password;try{user=decodeURIComponent(u.username);password=decodeURIComponent(u.password);}catch{throw blocked('INVALID_DATABASE_CONFIGURATION');}
 const direct=u.hostname===`db.${PROJECT}.supabase.co`&&user==='postgres';
 const sessionPooler=/^aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(u.hostname)&&user===`postgres.${PROJECT}`;
 if(!(direct||sessionPooler)||!password)throw blocked('DATABASE_TARGET_REJECTED');
 return {token:env.STAGING_SUPABASE_SERVICE_ROLE_KEY,db:{host:u.hostname,port:5432,user,password,database:'postgres',
  ssl:{rejectUnauthorized:true,...(env.STAGING_DATABASE_CA_PEM?{ca:env.STAGING_DATABASE_CA_PEM}:{})},
  connectionTimeoutMillis:8000,query_timeout:10000,statement_timeout:8000,application_name:'stellar-staging-access-check'}};
}
function safeFailure(e){return {status:'BLOCKED',code:e?.safeCode||'ACCESS_PROBE_FAILED',...(e?.missing?{missing:e.missing}:{}),acceptanceExecuted:false};}
async function child(){
 let client;
 try{
  const {db}=config();const {Client}=require('pg');client=new Client(db);
  client.on('error',()=>{process.send?.({type:'failure',code:'DATABASE_CONNECTION_FAILED'});});
  await client.connect();await client.query('BEGIN READ ONLY');
  await client.query('SET LOCAL ROLE service_role');
  const {rows}=await client.query("SELECT pg_backend_pid() AS backend_pid, clock_timestamp() AS ready_at, current_user AS effective_role, has_function_privilege(current_user,'public.stellar_orch_reconcile_case_staging(uuid)','EXECUTE') AS reconcile_allowed");
  if(rows[0]?.effective_role!=='service_role'||rows[0]?.reconcile_allowed!==true)throw blocked('DATABASE_ROLE_REJECTED');
  process.send({type:'ready',pid:process.pid,...rows[0]});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(blocked('BARRIER_TIMEOUT')),15000);process.once('message',m=>{clearTimeout(timer);m?.type==='go'?resolve():reject(blocked('BARRIER_MESSAGE_REJECTED'));});});
  const start=await client.query('SELECT clock_timestamp() AS started_at');
  await client.query('SELECT pg_sleep(1)');
  const end=await client.query('SELECT clock_timestamp() AS finished_at');
  await client.query('ROLLBACK');await client.end();client=null;
  process.send({type:'finished',pid:process.pid,backend_pid:rows[0].backend_pid,started_at:start.rows[0].started_at,finished_at:end.rows[0].finished_at},()=>process.disconnect());
 }catch(e){
  if(client)await client.end().catch(()=>{});
  process.send?.({type:'failure',code:e.safeCode||'DATABASE_PROBE_FAILED'},()=>process.disconnect());process.exitCode=2;
 }
}
async function restProbe(c,request=fetch){
 const res=await request(ENDPOINT+'/rest/v1/rpc/stellar_orch_reconcile_case_staging',{
  method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
  headers:{'content-type':'application/json',apikey:c.token,authorization:'Bearer '+c.token},
  body:JSON.stringify({p_workflow_id:'00000000-0000-0000-0000-000000000000'})});
 let body;try{body=await res.json();}catch{throw blocked('RPC_RESPONSE_INVALID');}
 if(res.ok||body?.message!=='STAGING_WORKFLOW_REJECTED'||body?.code!=='P0001')throw blocked('RPC_ACCESS_NOT_VERIFIED');
 return {authenticatedRejectionVerified:true,httpStatus:res.status};
}
async function databasePair(env=process.env){
 const allowed=['PATH','NODE_EXTRA_CA_CERTS','STELLAR_BRIDGE_STAGING','CSS_TENANT_ID','STAGING_SUPABASE_URL',...REQUIRED,'STAGING_DATABASE_CA_PEM'];
 const childEnv=Object.fromEntries(allowed.filter(k=>env[k]!==undefined).map(k=>[k,env[k]]));
 const workers=[],ready=[],done=[];
 try{return await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(blocked('DATABASE_PAIR_TIMEOUT')),25000);
  let settled=false;
  function fail(code){if(!settled){settled=true;clearTimeout(timer);reject(blocked(code));}}
  for(let i=0;i<2;i++){
   const w=fork(__filename,['--connection-probe'],{env:childEnv,execArgv:[],silent:true});workers.push(w);
   // Raw child output is deliberately not forwarded: never expose driver/URL errors.
   w.stdout.resume();w.stderr.resume();
   w.on('error',()=>fail('WORKER_PROCESS_FAILED'));
   w.on('exit',code=>{if(code!==0)fail('WORKER_PROCESS_FAILED');});
   w.on('message',m=>{
    if(m.type==='failure')return fail(m.code);
    if(m.type==='ready'){
     ready.push(m);
     if(ready.length===2){
      if(ready[0].backend_pid===ready[1].backend_pid||ready[0].pid===ready[1].pid)return fail('INDEPENDENT_CLIENTS_NOT_VERIFIED');
      for(const x of workers)x.send({type:'go'});
     }
    }
    if(m.type==='finished'){
     done.push(m);
     if(done.length===2&&!settled){
      const overlap=Math.max(...done.map(x=>Date.parse(x.started_at)))<Math.min(...done.map(x=>Date.parse(x.finished_at)));
      if(!overlap)return fail('READ_ONLY_PROBES_DID_NOT_OVERLAP');
      settled=true;clearTimeout(timer);resolve({ready,results:done,readOnlyProbeOverlap:true});
     }
    }
   });
  }
 });}finally{for(const w of workers)if(w.exitCode===null&&!w.killed)w.kill('SIGTERM');}
}
async function main(){
 try{
  const c=config();try{require.resolve('pg');}catch{throw blocked('POSTGRES_DRIVER_NOT_INSTALLED');}
  const rest=await restProbe(c);const database=await databasePair();
  return {status:'ACCESS_READY',project:PROJECT,...rest,...database,acceptanceExecuted:false,
   note:'Read-only connectivity preparation only; C1 and R1 still require fixture and restart acceptance.'};
 }catch(e){return safeFailure(e);}
}
module.exports={config,safeFailure,restProbe,PROJECT,TENANT,ENDPOINT};
if(require.main===module){
 if(process.argv[2]==='--connection-probe')child();
 else main().then(r=>{process.stdout.write(JSON.stringify(r,null,2)+'\n');process.exitCode=r.status==='ACCESS_READY'?0:2;});
}
