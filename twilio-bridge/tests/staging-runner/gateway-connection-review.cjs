'use strict';
// Read-only diagnostics for the rejected observer guard. No Auth fixture or business RPC.
const {fork}=require('node:child_process'),fs=require('node:fs');
const {Client}=require('pg');
const {config,databaseErrorCode,PROJECT,TENANT}=require('./access-check.cjs');
function assess(x){return {roleAccepted:x.role==='postgres',clientTlsVerified:x.clientEncrypted===true&&x.clientAuthorized===true&&x.rejectUnauthorized===true,originalObserverGuardAccepted:x.role==='postgres'&&x.databaseBackendTls===true};}
async function worker(){let c;try{
 const cfg=config();c=new Client(cfg.db);c.on('error',()=>{});await c.connect();await c.query('BEGIN READ ONLY');
 const row=(await c.query("SELECT pg_backend_pid() AS backend_pid,current_user AS role,clock_timestamp() AS observed_at,current_setting('transaction_read_only') AS read_only,(SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS database_backend_tls")).rows[0];
 const stream=c.connection.stream,observation={pid:process.pid,backendPid:row.backend_pid,role:row.role,observedAt:row.observed_at,readOnly:row.read_only,databaseBackendTls:row.database_backend_tls,clientEncrypted:stream.encrypted===true,clientAuthorized:stream.authorized===true,rejectUnauthorized:cfg.db.ssl.rejectUnauthorized===true,tlsProtocol:stream.getProtocol?.()||null};
 await c.query('ROLLBACK');await c.end();c=null;process.send({type:'observation',...observation,assessment:assess(observation)},()=>process.disconnect());
 }catch(e){if(c)await c.end().catch(()=>{});process.send?.({type:'failure',pid:process.pid,code:databaseErrorCode(e)},()=>process.disconnect());process.exitCode=2;}}
async function main(){const report={scope:'READ_ONLY_CONNECTION_REVIEW_NOT_ACCEPTANCE',project:PROJECT,tenant:TENANT,status:'BLOCKED',startedAt:new Date().toISOString(),observations:[],acceptanceExecuted:false,fixturesCreated:false};const workers=[];
 try{if(process.env.STAGING_CONNECTION_REVIEW_AUTHORIZED!=='READ_ONLY')throw Error('REVIEW_AUTHORIZATION_REQUIRED');config();
  report.observations=await Promise.all([0,1].map(()=>new Promise((resolve,reject)=>{
   const keys=['PATH','STELLAR_BRIDGE_STAGING','CSS_TENANT_ID','STAGING_SUPABASE_URL','STAGING_DATABASE_URL','STAGING_DATABASE_CA_PEM','STAGING_SUPABASE_SERVICE_ROLE_KEY'];
   const p=fork(__filename,['--worker'],{execArgv:[],env:Object.fromEntries(keys.filter(k=>process.env[k]!==undefined).map(k=>[k,process.env[k]])),stdio:['ignore','ignore','ignore','ipc']});workers.push(p);let observation;
   const timer=setTimeout(()=>{p.kill('SIGKILL');reject(Error('REVIEW_WORKER_TIMEOUT'));},20000);
   p.on('message',m=>{if(m.type==='observation')observation=m;else if(m.type==='failure'){clearTimeout(timer);reject(Error('REVIEW_WORKER_FAILED'));}});
   p.on('error',()=>{clearTimeout(timer);reject(Error('REVIEW_WORKER_START_FAILED'));});
   p.on('exit',code=>{clearTimeout(timer);code===0&&observation?resolve(observation):reject(Error('REVIEW_WORKER_FAILED'));});
  })));
  const [a,b]=report.observations;if(a.pid===b.pid||a.backendPid===b.backendPid)throw Error('INDEPENDENT_OBSERVERS_REQUIRED');
  // Do not relax the original guard. Record which predicate rejected the previous run.
  report.status=report.observations.every(x=>x.assessment.clientTlsVerified&&x.readOnly==='on')?'DIAGNOSTICS_CAPTURED':'BLOCKED';
  report.originalGuardAccepted=report.observations.every(x=>x.assessment.originalObserverGuardAccepted);
 }catch(e){report.code=['REVIEW_AUTHORIZATION_REQUIRED','INDEPENDENT_OBSERVERS_REQUIRED','REVIEW_WORKER_FAILED','REVIEW_WORKER_TIMEOUT','REVIEW_WORKER_START_FAILED'].includes(e.message)?e.message:'CONNECTION_REVIEW_FAILED';}
 finally{for(const p of workers)if(p.exitCode===null&&p.signalCode===null)p.kill('SIGKILL');report.finishedAt=new Date().toISOString();fs.writeFileSync('gateway-connection-review-evidence.json',JSON.stringify(report,null,2),{mode:0o600});console.log(JSON.stringify(report));process.exitCode=report.status==='DIAGNOSTICS_CAPTURED'?0:2;}}
module.exports={assess};
if(require.main===module){if(process.argv[2]==='--worker')worker();else main();}
